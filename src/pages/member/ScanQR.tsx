import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Scanner, IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { doc, getDoc, collection, query, where, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import { recordAttendance } from "../../services/attendanceService";
import toast from "react-hot-toast";
import { CheckCircle, QrCode, RefreshCw, ScanLine, User, Zap, ZapOff, ShieldCheck, CreditCard } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const ScanQR: React.FC = () => {
    const { t } = useTranslation();
    const { userProfile } = useAuth();
    const [activeTab, setActiveTab] = useState<string>("scan");

    const TABS = [
        { id: "scan", label: t("scanQR.scanMeetingQR"), icon: ScanLine },
        { id: "myqr", label: t("scanQR.showMyQR"), icon: User },
    ];

interface ScanResult {
    type: string;
    success: boolean;
    alreadyScanned?: boolean;
    topic?: string;
    location?: string;
    shopName?: string;
    shopId?: string;
    memberId?: string;
    memberName?: string;
}


    const [scanning, setScanning] = useState<boolean>(false);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [processing, setProcessing] = useState<boolean>(false);
    const [permissionError, setPermissionError] = useState<string | null>(null);
    const [torchOn, setTorchOn] = useState<boolean>(false);
    const lastScanRef = React.useRef<number>(0);
    const meetingCacheRef = React.useRef<any>(null);

    const handleScanError = (error: any) => {
        console.error("QR Scan Error:", error);
        if (error?.name === "NotAllowedError") {
            setPermissionError(t("scanQR.toastCameraDenied"));
            setScanning(false);
        } else {
            toast.error(`${t("scanQR.toastCameraError")}: ${error?.message || "Unknown error"}`);
        }
    };

    // Direct Torch manipulation
    const [torchSupported, setTorchSupported] = useState<boolean>(false);
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    // 1. Initial configuration and capabilities check when scanning starts
    React.useEffect(() => {
        if (!scanning) {
            setTorchSupported(false);
            setTorchOn(false);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const video = document.querySelector('video');
                if (!video || !video.srcObject) return;
                
                const stream = video.srcObject as MediaStream;
                const track = stream.getVideoTracks()[0];
                if (!track) return;

                const caps = track.getCapabilities() as any;
                if (caps.torch) {
                    setTorchSupported(true);
                }
                
                // Always apply the stored torch state initially
                await track.applyConstraints({
                    advanced: [{ torch: torchOn }]
                } as any);
            } catch (e) {
                console.warn("Torch interaction error:", e);
            }
        }, 1500); // Increased delay for slower camera initialization

        return () => clearTimeout(timer);
    }, [scanning]);

    // 2. Instant toggle handling independently
    React.useEffect(() => {
        const toggleTorch = async () => {
            try {
                const video = document.querySelector('video');
                if (!video || !video.srcObject) return;
                
                const stream = video.srcObject as MediaStream;
                const track = stream.getVideoTracks()[0];
                if (!track) return;

                // Always apply the stored torch state initially
                await track.applyConstraints({
                    advanced: [{ torch: torchOn }]
                } as any);
            } catch (e) {
                console.warn("Torch toggle error:", e);
            }
        };

        if (scanning) {
            toggleTorch();
        }
    }, [torchOn, scanning]);

    const handleScan = (data: IDetectedBarcode[]) => {
        if (data && data.length > 0) {
            setScanning(false);
            processQR(data[0].rawValue);
        }
    };

    const processQR = async (raw: string) => {
        // 0. Offline Check (Avoid silent failures)
        if (!navigator.onLine) {
            toast.error(t("scanQR.toastNoInternet"));
            return;
        }

        // 1. Throttle Scanner (Avoid rapid re-reads)
        const nowMs = Date.now();
        if (nowMs - lastScanRef.current < 2500) return; 
        lastScanRef.current = nowMs;

        if (processing) return;
        setProcessing(true);
        try {
            let data: any;
            try { data = JSON.parse(raw); } catch { toast.error(t("scanQR.toastInvalidQR")); setProcessing(false); return; }

            // --- MEETING QR ---
            if (data.meetingId) {
                if (userProfile?.status === "blocked") {
                    toast.error(t("scanQR.toastBlockedMeeting"));
                    setProcessing(false); return;
                }

                try {
                    if (!userProfile?.uid) {
                        toast.error(t("scanQR.toastLoginRequired"));
                        setProcessing(false); return;
                    }
                    const status = await recordAttendance(data.meetingId, data.token, userProfile.uid);
                    
                    switch (status) {
                        case "SUCCESS":
                            toast.success(t("scanQR.toastAttendanceSuccess"));
                            setResult({ type: "meeting", success: true, alreadyScanned: false, topic: data.topic || "Meeting" });
                            break;
                        case "ALREADY_MARKED":
                            toast(t("scanQR.toastAlreadyMarked"), { icon: "👍" });
                            setResult({ type: "meeting", success: true, alreadyScanned: true, topic: data.topic || "Meeting" });
                            break;
                        case "EXPIRED":
                            toast.error(t("scanQR.toastQRExpired"));
                            break;
                        case "INVALID_TOKEN":
                            toast.error(t("scanQR.toastInvalidToken"));
                            break;
                        case "MEETING_NOT_ACTIVE":
                            toast.error(t("scanQR.toastMeetingNotActive"));
                            break;
                        case "OFFLINE":
                            toast.error(t("scanQR.toastOffline"));
                            break;
                        default:
                            toast.error(t("scanQR.toastFailedAttendance"));
                    }
                } catch (err: any) {
                    console.error("[ScanQR] Error:", err);
                    if (err.code === 'permission-denied') {
                         toast.error(t("scanQR.toastPermissionDenied"));
                    } else {
                         toast.error(t("scanQR.toastFailedRetry"));
                    }
                } finally {
                    setProcessing(false);
                }
            }

            // --- SHOP QR ---
            else if (data.type === "shop" && data.shopId) {
                if (!userProfile || userProfile.status !== "active") {
                    toast.error(t("scanQR.toastAccessDenied"));
                    setProcessing(false); return;
                }
                if (!userProfile.memberId) {
                    toast.error(t("scanQR.toastNoMemberId"));
                    setProcessing(false); return;
                }

                const shopSnap = await getDoc(doc(db, "shops", data.shopId));
                if (!shopSnap.exists()) { toast.error(t("scanQR.toastShopNotFound")); setProcessing(false); return; }
                const shop = shopSnap.data();

                // Log the scan activity
                try {
                    await addDoc(collection(db, "shopScans"), {
                        shopId: data.shopId,
                        shopName: shop.shopName,
                        memberUid: userProfile.uid,
                        memberId: userProfile.memberId,
                        memberName: `${userProfile.name} ${userProfile.surname}`,
                        scannedAt: serverTimestamp()
                    });
                } catch (err) {
                    console.warn("Could not log shop scan:", err);
                }

                toast.success(t("scanQR.toastQRVerified"));
                setResult({ 
                    type: "shop", 
                    success: true, 
                    shopName: shop.shopName, 
                    shopId: data.shopId,
                    memberId: userProfile.memberId,
                    memberName: `${userProfile.name} ${userProfile.surname}`
                });
            } else {
                toast.error(t("scanQR.toastUnknownQR"));
            }
        } catch (err) {
            toast.error(t("scanQR.toastErrorProcessing"));
            console.error(err);
        } finally {
            setProcessing(false);
        }
    };

    // Build member's personal QR data
    const memberQRData = userProfile
        ? JSON.stringify({ type: "member", uid: userProfile.uid, memberId: userProfile.memberId, name: `${userProfile.name || ""} ${userProfile.surname || ""}`.trim() })
        : null;

    return (
        <div className="space-y-5 animate-fade-in max-w-md mx-auto">
            <div>
                <h1 className="page-title mb-0">{t("scanQR.attendance")}</h1>
                <p className="text-slate-500 text-sm">{t("scanQR.scanOrShow")}</p>
            </div>

            {/* Blocked warning */}
            {userProfile?.status === "blocked" && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                    <p className="text-red-700 font-semibold">{t("scanQR.accountBlocked")}</p>
                    <p className="text-red-500 text-sm mt-1">{t("scanQR.cannotMarkAttendance")}</p>
                </div>
            )}

            {/* Premium Tab switcher */}
            <div className="relative flex p-1.5 bg-slate-100/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-inner">
                {/* Sliding indicator */}
                <div 
                    className="absolute h-[calc(100%-12px)] top-[6px] rounded-xl bg-white shadow-md transition-all duration-300 ease-out z-0"
                    style={{ 
                        width: 'calc(50% - 6px)', 
                        left: activeTab === 'scan' ? '6px' : 'calc(50% + 0px)' 
                    }}
                />
                
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setResult(null); setScanning(false); setPermissionError(null); }}
                        className={`relative flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-colors duration-200 z-10 ${
                            activeTab === tab.id
                                ? "text-[#4f46e5]"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                        }`}
                    >
                        <tab.icon size={18} className={activeTab === tab.id ? "animate-pulse" : ""} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── TAB: SCAN MEETING QR ── */}
            {activeTab === "scan" && (
                <>
                    {!result && (
                        <div className="card">
                            {!scanning ? (
                                <div className="space-y-4">
                                    {permissionError && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center animate-fade-in">
                                            <p className="text-amber-800 text-sm font-semibold mb-2">{t("scanQR.cameraBlocked")}</p>
                                            <p className="text-amber-600 text-xs mb-3">{permissionError}</p>
                                            <p className="text-amber-600 text-xs mb-3">
                                                {t("scanQR.switchToMyQR")}
                                            </p>
                                            <button onClick={() => setScanning(true)} className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-4 py-2 rounded-lg transition-colors font-bold">
                                                {t("scanQR.tryAgain")}
                                            </button>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => { setPermissionError(null); setScanning(true); }}
                                        disabled={userProfile?.status === "blocked"}
                                        className="btn-primary w-full flex items-center justify-center gap-2 py-4"
                                    >
                                        <ScanLine size={20} /> {permissionError ? t("scanQR.retryCameraAccess") : t("scanQR.startCameraAndScan")}
                                    </button>
                                </div>
                            ) : (
                                    <div className="space-y-4 animate-fade-in relative">
                                        <style>{`
                                            @keyframes scanLaser {
                                                0%, 100% { transform: translateY(0); opacity: 0.8; }
                                                50% { transform: translateY(240px); opacity: 1; }
                                            }
                                            .animate-scan-laser-paytm {
                                                animation: scanLaser 2s infinite ease-in-out;
                                            }
                                            .pulse-ring {
                                                animation: pulseRing 1.5s cubic-bezier(0.24, 0, 0.38, 1) infinite;
                                            }
                                            @keyframes pulseRing {
                                                0% { transform: scale(0.95); opacity: 0.5; }
                                                50% { transform: scale(1.05); opacity: 0.2; }
                                                100% { transform: scale(0.95); opacity: 0.5; }
                                            }
                                            @keyframes rotateConic {
                                                from { transform: rotate(0deg); }
                                                to { transform: rotate(360deg); }
                                            }
                                            .shimmering-border::before {
                                                content: "";
                                                position: absolute;
                                                inset: -4px;
                                                background: conic-gradient(from 0deg, transparent, #3b82f6, transparent, #8b5cf6, transparent);
                                                border-radius: 44px;
                                                animation: rotateConic 4s linear infinite;
                                            }
                                        `}</style>
                                    <div className="overflow-hidden rounded-[32px] relative bg-black h-[400px] sm:h-[450px] w-full shadow-2xl flex items-center justify-center border-4 border-slate-900/10">
                                        <Scanner
                                            onScan={handleScan}
                                            onError={handleScanError}
                                            styles={{ container: { height: '100%', width: '100%', backgroundColor: '#0f172a' } }}
                                            components={{
                                                onOff: false,
                                                torch: false,
                                                zoom: false,
                                                finder: false,
                                            }}
                                            constraints={{
                                                facingMode: "environment"
                                            }}
                                            allowMultiple={false}
                                            paused={!scanning}
                                        />
                                        
                                        {/* Paytm-style Overlay */}
                                        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col">
                                            {/* Top Overlay */}
                                            <div className="flex-1 bg-black/70 w-full transition-all" />
                                            
                                            {/* Middle Row with Scanner Box */}
                                            <div className="flex w-full shrink-0" style={{ height: '240px' }}>
                                                <div className="flex-1 bg-black/70 h-full transition-all" />
                                                <div className="w-[240px] h-[240px] relative shrink-0">
                                                    {/* Outer pulse effect */}
                                                    <div className="absolute -inset-4 border-2 border-indigo-400/20 rounded-[40px] pulse-ring" />
                                                    
                                                    {/* Corner brackets - sharp and thick */}
                                                    <div className="absolute top-0 left-0 w-12 h-12 border-t-[5px] border-l-[5px] border-white rounded-tl-3xl shadow-[0_0_15px_rgba(255,255,255,0.4)]" />
                                                    <div className="absolute top-0 right-0 w-12 h-12 border-t-[5px] border-r-[5px] border-white rounded-tr-3xl shadow-[0_0_15px_rgba(255,255,255,0.4)]" />
                                                    <div className="absolute bottom-0 left-0 w-12 h-12 border-b-[5px] border-l-[5px] border-white rounded-bl-3xl shadow-[0_0_15px_rgba(255,255,255,0.4)]" />
                                                    <div className="absolute bottom-0 right-0 w-12 h-12 border-b-[5px] border-r-[5px] border-white rounded-br-3xl shadow-[0_0_15px_rgba(255,255,255,0.4)]" />
                                                    
                                                    {/* Scanning laser animation with glow gradient */}
                                                    <div className="absolute top-0 left-0 w-full h-[3px] bg-linear-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_25px_8px_rgba(59,130,246,0.6)] animate-scan-laser-paytm" />
                                                </div>
                                                <div className="flex-1 bg-black/70 h-full transition-all" />
                                            </div>
                                            
                                            {/* Bottom Overlay */}
                                            <div className="flex-[1.2] bg-black/70 w-full flex flex-col items-center justify-start pt-8 transition-all px-6">
                                                <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-5 py-3 rounded-2xl flex flex-col items-center gap-2 max-w-[200px] text-center">
                                                    <div className="flex items-center gap-2 text-white">
                                                        <QrCode size={18} className="text-indigo-400" />
                                                        <span className="font-bold text-sm">{t("scanQR.scanningMode")}</span>
                                                    </div>
                                                    <span className="text-white/60 text-[10px] leading-tight">{t("scanQR.keepQRInFrame")}</span>
                                                </div>
                                                
                                                {/* Torch Toggle Button - Visible only on Mobile or if explicitly supported */}
                                                {(torchSupported || isMobile) && (
                                                    <button 
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            const newState = !torchOn;
                                                            setTorchOn(newState);
                                                            toast.success(newState ? t("scanQR.flashlightOn") : t("scanQR.flashlightOff"), { duration: 1000 });
                                                        }}
                                                        className={`mt-6 pointer-events-auto p-5 rounded-full transition-all duration-300 transform active:scale-90 ${torchOn ? 'bg-yellow-400 text-black shadow-[0_0_25px_rgba(250,204,21,0.6)] scale-110' : 'bg-white/10 text-white backdrop-blur-md border border-white/20'}`}
                                                        style={{ zIndex: 100 }}
                                                    >
                                                        {torchOn ? <Zap size={28} fill="currentColor" /> : <ZapOff size={28} />}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setScanning(false)} 
                                        className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-black/20"
                                    >
                                        {t("scanQR.cancelScan")}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Processing */}
                    {processing && (
                        <div className="card text-center py-10">
                            <div className="w-10 h-10 border-4 border-[#4f46e5] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                            <p className="text-slate-600 font-medium">{t("scanQR.processingQR")}</p>
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div className={`card text-center animate-fade-in ${result.success ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"}`}>
                            <CheckCircle size={48} className="text-emerald-500 mx-auto mb-3" />
                            {result.type === "meeting" && (
                                <>
                                    <p className="text-lg font-bold text-emerald-700">
                                        {result.alreadyScanned ? t("scanQR.alreadyScanned") : t("scanQR.attendanceMarked")}
                                    </p>
                                    <p className="text-slate-600 text-sm mt-1">{result.topic}</p>
                                    {result.location && <p className="text-slate-400 text-xs mt-0.5">📍 {result.location}</p>}
                                </>
                            )}
                            {result.type === "shop" && (
                                <div className="animate-slide-up">
                                    <p className="text-xl font-black text-emerald-700 uppercase tracking-wide mb-3">{t("scanQR.qrVerified")}</p>
                                    <div className="bg-emerald-100 border border-emerald-300 mt-2 p-4 rounded-2xl shadow-inner relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                            <ShieldCheck size={80} />
                                        </div>
                                        <div className="relative z-10 flex flex-col items-center">
                                            <p className="text-slate-500 text-[11px] font-black uppercase tracking-widest mb-1.5">{t("scanQR.authenticatedIdentity")}</p>
                                            <p className="text-lg font-bold text-slate-800 tracking-tight leading-none mb-3">{result.memberName}</p>
                                            <div className="flex flex-col sm:flex-row items-center gap-2 w-full justify-center">
                                                <div className="bg-emerald-50 border-2 border-emerald-400 px-4 py-2 rounded-xl text-center w-full sm:w-auto shadow-sm">
                                                    <p className="text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-0.5 opacity-80">{t("scanQR.bctaMemberId")}</p>
                                                    <p className="text-emerald-900 font-mono font-bold text-base tracking-widest">{result.memberId}</p>
                                                </div>
                                                <div className="bg-emerald-600 px-4 py-3 rounded-xl flex items-center justify-center gap-2 shadow-md w-full sm:w-auto">
                                                    <ShieldCheck size={20} className="text-white" />
                                                    <span className="text-white font-bold tracking-wide uppercase text-sm">{t("scanQR.verifiedUser")}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-emerald-200">
                                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">{t("scanQR.scannedAtLocation")}</p>
                                        <p className="text-emerald-800 font-semibold">{result.shopName}</p>
                                        <p className="text-xs text-slate-500 mt-2 bg-white/50 py-1.5 px-3 rounded-lg border border-slate-200 inline-block">{t("scanQR.showToShopOwner")}</p>
                                    </div>
                                </div>
                            )}
                            <button onClick={() => { setResult(null); }} className="btn-secondary mt-4 flex items-center gap-2 mx-auto">
                                <RefreshCw size={14} /> {t("scanQR.scanAnother")}
                            </button>
                        </div>
                    )}

                    {/* Instructions */}
                    {!scanning && !result && (
                        <div className="card">
                            <h3 className="text-sm font-semibold text-slate-700 mb-2">{t("scanQR.howToScan")}</h3>
                            <ol className="text-xs text-slate-500 space-y-1.5 list-decimal list-inside">
                                <li>{t("scanQR.step1")}</li>
                                <li>{t("scanQR.step2")}</li>
                                <li>{t("scanQR.step3")}</li>
                                <li>{t("scanQR.step4")}</li>
                            </ol>
                        </div>
                    )}
                </>
            )}

            {/* ── TAB: SHOW MY QR (High Level Member Card) ── */}
            {activeTab === "myqr" && (
                <div className="space-y-6 animate-fade-in">
                    <div className="relative overflow-hidden bg-linear-to-br from-[#1e1b4b] via-[#4f46e5] to-[#312e81] rounded-[32px] p-8 shadow-2xl text-white border-4 border-white/10">
                        {/* Decorative background patterns */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                        
                        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                            <div className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 flex items-center gap-2">
                                <ShieldCheck size={14} className="text-emerald-400" />
                                <span className="text-[10px] uppercase tracking-widest font-bold">{t("scanQR.officialMemberCard")}</span>
                            </div>

                            <div className="bg-white p-5 rounded-[40px] shadow-2xl relative shimmering-border overflow-hidden">
                                <div className="absolute inset-0 bg-white rounded-[40px] z-0" />
                                <div className="absolute -inset-2 border border-white/20 rounded-[48px] scale-105 opacity-30 z-0" />
                                {memberQRData ? (
                                    <div className="p-3 bg-white rounded-3xl relative z-10 flex items-center justify-center">
                                        <QRCodeSVG
                                            value={memberQRData}
                                            size={200}
                                            level="H"
                                            includeMargin={false}
                                            fgColor="#1e1b4b"
                                        />
                                        {/* Verified Floating Badge */}
                                        <div className="absolute -bottom-2 -right-2 bg-white/40 backdrop-blur-xl border border-white/60 p-1.5 rounded-2xl shadow-lg transform rotate-6 scale-90">
                                            <div className="bg-emerald-500 text-white rounded-xl p-1 shadow-sm">
                                                <ShieldCheck size={20} strokeWidth={3} />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-[200px] h-[200px] bg-slate-100 animate-pulse rounded-3xl relative z-10" />
                                )}
                            </div>

                            <div className="space-y-1">
                                <h2 className="text-2xl font-black tracking-tight uppercase">
                                    {userProfile?.name} {userProfile?.surname}
                                </h2>
                                <p className="text-indigo-300 text-xs font-semibold tracking-widest uppercase">{t("scanQR.memberProfile")}</p>
                            </div>

                            <div className="w-full flex gap-3 pt-2">
                                <div className="flex-1 bg-white/10 backdrop-blur-lg rounded-2xl p-4 text-left border border-white/10">
                                    <span className="text-[10px] text-indigo-200/60 uppercase font-bold block mb-1">{t("scanQR.idStatus")}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                        <span className="font-mono text-sm font-bold tracking-wider">{t("scanQR.activeStatus")}</span>
                                    </div>
                                </div>
                                <div className="flex-1 bg-white/10 backdrop-blur-lg rounded-2xl p-4 text-left border border-white/10">
                                    <span className="text-[10px] text-indigo-200/60 uppercase font-bold block mb-1">{t("memberDetail.memberId")}</span>
                                    <span className="font-mono text-sm font-bold tracking-widest overflow-hidden text-ellipsis block">
                                        {userProfile?.memberId || "GS1-992"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Bottom card logo/stripe */}
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-indigo-400 to-transparent opacity-30" />
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 flex items-start gap-4">
                        <div className="bg-[#4f46e5]/10 p-3 rounded-2xl">
                            <CreditCard className="text-[#4f46e5]" size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-800">{t("scanQR.swiftCheckin")}</h4>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                {t("scanQR.swiftCheckinDesc")}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScanQR;
