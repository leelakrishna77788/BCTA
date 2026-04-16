import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Scanner, IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import { ArrowLeft, RefreshCw, Clock, Shield, Play, Square, Download, ScanLine, QrCode, CheckCircle, AlertCircle, Loader2, Zap, ZapOff } from "lucide-react";
import { db } from "../../../firebase/firebaseConfig";
import { doc, onSnapshot, updateDoc, collection, addDoc, serverTimestamp, getDocs, query, where, increment, Timestamp } from "firebase/firestore";

// Simple robust UUID alternative to avoid ESM import issues with 'uuid' package
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

const TABS = [
    { id: "showqr", label: "Show Meeting QR", icon: QrCode },
    { id: "scanmember", label: "Scan Member QR", icon: ScanLine },
];

interface Meeting {
    id: string;
    topic: string;
    status: string;
    qrToken?: string;
    qrExpiresAt?: Timestamp | Date;
    [key: string]: any;
}

interface ScanResult {
    success: boolean;
    alreadyScanned?: boolean;
    memberName?: string;
    error?: string;
}

const MeetingQR: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("showqr");
    const [meeting, setMeeting] = useState<Meeting | null>(null);
    const [isActive, setIsActive] = useState(false);
    const [qrData, setQrData] = useState<string>("");
    const [timeLeft, setTimeLeft] = useState(0);
    const [countdown, setCountdown] = useState(30);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Scan member state
    const [memberScanning, setMemberScanning] = useState(false);
    const [memberScanResult, setMemberScanResult] = useState<ScanResult | null>(null);
    const [memberProcessing, setMemberProcessing] = useState(false);
    const [torchOn, setTorchOn] = useState(false);
    const [torchSupported, setTorchSupported] = useState(false);

    const rotationTimer = useRef<NodeJS.Timeout | null>(null);

    // Direct Torch manipulation
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    // 1. Initial configuration and capabilities check when scanning starts
    useEffect(() => {
        if (!memberScanning) {
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
    }, [memberScanning]);

    // 2. Instant toggle handling independently
    useEffect(() => {
        const toggleTorch = async () => {
            try {
                const video = document.querySelector('video');
                if (!video || !video.srcObject) return;
                
                const stream = video.srcObject as MediaStream;
                const track = stream.getVideoTracks()[0];
                if (!track) return;

                // Explicitly apply the current boolean state
                await track.applyConstraints({
                    advanced: [{ torch: torchOn }]
                } as any);
            } catch (e) {
                console.warn("Torch toggle error:", e);
            }
        };

        if (memberScanning) {
            toggleTorch();
        }
    }, [torchOn, memberScanning]);

    const stopAttendance = useCallback(async () => {
        if (!id) return;
        try {
            await updateDoc(doc(db, "meetings", id), {
                status: "expired",
                qrToken: null,
                qrExpiresAt: null
            });
            setIsActive(false);
            setQrData("");
        } catch (err) {
            console.error("[MeetingQR] Stop Error:", err);
        }
    }, [id]);

    const rotateToken = useCallback(async () => {
        if (!id) return;
        try {
            const TOKEN_EXPIRY_MS = 45 * 1000;
            await updateDoc(doc(db, "meetings", id), {
                qrToken: generateId(),
                qrExpiresAt: Timestamp.fromDate(new Date(Date.now() + TOKEN_EXPIRY_MS))
            });
        } catch (err) {
            console.error("Failed to rotate token:", err);
        }
    }, [id]);

    useEffect(() => {
        if (!isActive || !id) {
            if (rotationTimer.current) clearInterval(rotationTimer.current);
            return;
        }

        rotationTimer.current = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    rotateToken();
                    return 45; // Reset to 45s
                }
                return prev - 1;
            });
            setTimeLeft((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => {
            if (rotationTimer.current) clearInterval(rotationTimer.current);
        };
    }, [isActive, id, rotateToken]);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        console.log(`[MeetingQR] Subscribing: ${id}`);
        
        const docRef = doc(db, "meetings", id);
        const unsubscribe = onSnapshot(docRef, 
            (snap) => {
                if (snap.exists()) {
                    const data = { id: snap.id, ...snap.data() } as Meeting;
                    setMeeting(data);
                    setError(null);

                    if (data.status === "active" && data.qrExpiresAt) {
                        const expiry = data.qrExpiresAt instanceof Timestamp 
                            ? data.qrExpiresAt.toDate() 
                            : new Date(data.qrExpiresAt as any);
                            
                        const sessionExpiry = data.sessionExpiresAt instanceof Timestamp
                            ? data.sessionExpiresAt.toDate()
                            : data.sessionExpiresAt ? new Date(data.sessionExpiresAt as any) : null;
                        
                        const now = new Date();
                        if (sessionExpiry && now > sessionExpiry) {
                            stopAttendance();
                        } else if (now < expiry) {
                            setIsActive(true);
                            setQrData(JSON.stringify({
                                meetingId: id,
                                token: data.qrToken,
                                topic: data.topic,
                                t: Date.now()
                            }));
                            const secsLeft = Math.round((expiry.getTime() - now.getTime()) / 1000);
                            setTimeLeft(secsLeft);
                            setCountdown(Math.max(1, secsLeft));
                        } else {
                            stopAttendance();
                        }
                    } else {
                        setIsActive(false);
                        setQrData("");
                        setCountdown(45);
                    }
                } else {
                    setError("Meeting not found.");
                }
                setLoading(false);
            },
            (err) => {
                console.error("[MeetingQR] Error:", err);
                setError("Access Denied or Database Error");
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [id, stopAttendance]);

    const getStatus = useCallback(() => {
        if (!meeting || !meeting.date || !meeting.startTime) return "unknown";
        
        const now = new Date();
        
        let meetingStart: Date;
        let meetingEnd: Date;

        if (meeting.meetingStartUTC && meeting.meetingEndUTC) {
            meetingStart = meeting.meetingStartUTC instanceof Timestamp 
                ? meeting.meetingStartUTC.toDate() 
                : new Date((meeting.meetingStartUTC as any).seconds ? (meeting.meetingStartUTC as any).seconds * 1000 : meeting.meetingStartUTC);
            meetingEnd = meeting.meetingEndUTC instanceof Timestamp 
                ? meeting.meetingEndUTC.toDate() 
                : new Date((meeting.meetingEndUTC as any).seconds ? (meeting.meetingEndUTC as any).seconds * 1000 : meeting.meetingEndUTC);
        } else {
            const [year, month, day] = meeting.date.split('-').map(Number);
            const [startH, startM] = meeting.startTime.split(':').map(Number);
            meetingStart = new Date(year, month - 1, day, startH, startM);
            
            if (meeting.endTime) {
                const [endH, endM] = meeting.endTime.split(':').map(Number);
                meetingEnd = new Date(year, month - 1, day, endH, endM);
            } else {
                meetingEnd = new Date(meetingStart.getTime() + 4 * 60 * 60 * 1000); // 4h default
            }
        }

        if (meeting.status === "active") return "live";
        if (now < meetingStart) return meeting.status === "expired" ? "expired" : "scheduled";
        if (now >= meetingStart && now <= meetingEnd) return meeting.status === "expired" ? "expired" : "ready";
        return "past";
    }, [meeting]);

    const isConcluded = getStatus() === "past" || getStatus() === "expired";

    const startAttendance = async () => {
        if (!id || !meeting) return;
        
        // Strict Time Enforcement
        if (isConcluded) {
            toast.error("This meeting has already concluded. Attendance cannot be started.", { icon: "🚫" });
            return;
        }

        const now = new Date();
        
        let meetingStart: Date;
        let meetingEnd: Date;

        if (meeting.meetingStartUTC && meeting.meetingEndUTC) {
            meetingStart = meeting.meetingStartUTC instanceof Timestamp 
                ? meeting.meetingStartUTC.toDate() 
                : new Date((meeting.meetingStartUTC as any).seconds ? (meeting.meetingStartUTC as any).seconds * 1000 : meeting.meetingStartUTC);
            meetingEnd = meeting.meetingEndUTC instanceof Timestamp 
                ? meeting.meetingEndUTC.toDate() 
                : new Date((meeting.meetingEndUTC as any).seconds ? (meeting.meetingEndUTC as any).seconds * 1000 : meeting.meetingEndUTC);
        } else {
            const [year, month, day] = meeting.date.split('-').map(Number);
            const [startH, startM] = meeting.startTime.split(':').map(Number);
            meetingStart = new Date(year, month - 1, day, startH, startM);
            if (meeting.endTime) {
                const [endH, endM] = meeting.endTime.split(':').map(Number);
                meetingEnd = new Date(year, month - 1, day, endH, endM);
            } else {
                meetingEnd = new Date(meetingStart.getTime() + 4 * 60 * 60 * 1000); // 4h default
            }
        }

        console.log(`[MeetingQR] startAttendance checks - serverTime: ${now}, meetingStart: ${meetingStart}, meetingEnd: ${meetingEnd}`);

        if (now < meetingStart) {
            toast.error("Meeting has not started yet. Please wait until the exact start time.");
            return;
        }

        if (now > meetingEnd) {
            toast.error("Meeting has ended.");
            return;
        }

        try {
            const TOKEN_EXPIRY_MS = 45 * 1000; // First token valid for 45s

            await updateDoc(doc(db, "meetings", id), {
                status: "active",
                qrToken: generateId(),
                qrExpiresAt: Timestamp.fromDate(new Date(Date.now() + TOKEN_EXPIRY_MS)),
                sessionExpiresAt: Timestamp.fromDate(meetingEnd) // Keep track of full session
            });
            setCountdown(45);
            toast.success("Attendance terminal active!");
        } catch (err: any) {
            console.error("[MeetingQR] Start Flow ERROR:", err);
            const msg = err.code ? `[${err.code}] ${err.message}` : "Failed to start";
            toast.error(msg, { duration: 6000 });
        }
    };

    const processMemberQR = async (raw: string) => {
        if (!id) return;
        setMemberProcessing(true);
        try {
            const data = JSON.parse(raw);
            if (data.type !== "member" || !data.uid) throw new Error("Invalid member QR");

            const q = query(collection(db, "attendance"), where("meetingId", "==", id), where("memberUID", "==", data.uid));
            const existing = await getDocs(q);

            if (!existing.empty) {
                setMemberScanResult({ success: true, alreadyScanned: true, memberName: data.name });
                return;
            }

            await addDoc(collection(db, "attendance"), {
                meetingId: id, memberUID: data.uid, memberName: data.name,
                markedAt: serverTimestamp(), markedBy: "admin", method: "admin_scan"
            });

            await updateDoc(doc(db, "meetings", id), { attendanceCount: increment(1) });
            await updateDoc(doc(db, "users", data.uid), { attendanceCount: increment(1) });
            setMemberScanResult({ success: true, memberName: data.name });
        } catch (err: any) {
            setMemberScanResult({ success: false, error: err.message });
        } finally {
            setMemberProcessing(false);
        }
    };

    if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto mb-4" /> Loading Meeting QR Terminal...</div>;
    if (error || !meeting) return <div className="p-10 text-center text-rose-600 font-bold">{error || "Document load error"}</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4 animate-fade-in">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate("/admin/meetings")} className="p-2 border rounded-xl hover:bg-slate-50"><ArrowLeft size={20} /></button>
                <h1 className="text-2xl font-bold">{meeting.topic}</h1>
            </div>

            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
                {TABS.map(t => {
                    const Icon = t.icon;
                    return (
                        <button key={t.id} onClick={() => { setActiveTab(t.id); setMemberScanResult(null); }}
                            className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center justify-center ${activeTab === t.id ? "bg-white shadow text-[#4f46e5]" : "text-slate-500"}`}>
                            <Icon size={16} className="mr-2" />
                            {t.label}
                        </button>
                    )
                })}
            </div>

            {activeTab === "showqr" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 p-8 flex flex-col items-center justify-center min-h-[450px] relative overflow-hidden bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        {!isActive ? (
                            <div className="text-center space-y-6">
                                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                                    <QrCode size={40} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                                        {isConcluded ? "Session Concluded" : "Attendance Mode"}
                                    </h3>
                                    <p className="text-sm text-slate-500 max-w-xs mx-auto">
                                        {isConcluded 
                                            ? "This meeting has ended or explicitly expired. No further attendance can be marked."
                                            : "Generate a rolling QR code for members to mark their attendance."}
                                    </p>
                                </div>
                                {!isConcluded && (
                                    <button onClick={startAttendance} className="btn-primary px-10 h-14 w-full shadow-lg shadow-indigo-900/20 active:scale-95 transition-transform">
                                        <Play size={18} className="mr-2" /> Start Flow
                                    </button>
                                )}
                                {isConcluded && (
                                    <div className="flex items-center gap-2 justify-center py-3 px-6 bg-amber-50 rounded-xl border border-amber-100 text-amber-700 text-sm font-bold">
                                        <Clock size={16} /> Data Collection Locked
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center space-y-8 py-4 animate-fade-in relative z-10">
                                <div className="relative inline-block group">
                                     {/* Premium Shimmering Border Wrapper */}
                                    <div className="absolute -inset-[3px] bg-conic-to-r from-indigo-500 via-indigo-600 to-indigo-500 rounded-[32px] blur-[1px] opacity-75 animate-spin-slow group-hover:opacity-100 transition-opacity"></div>
                                    <div className="relative p-7 bg-white rounded-[30px] shadow-2xl">
                                        <QRCodeSVG
                                            value={qrData}
                                            size={220}
                                            level="H"
                                            includeMargin={false}
                                            imageSettings={{
                                                src: "/logo.png", // Fallback to centered logo placeholder if available
                                                x: undefined,
                                                y: undefined,
                                                height: 48,
                                                width: 48,
                                                excavate: true,
                                            }}
                                            fgColor="#1e1b4b"
                                        />
                                        
                                        {/* Status Indicators */}
                                        <div className="absolute -top-3 -right-3 w-14 h-14 bg-[#4f46e5] rounded-2xl border-4 border-white flex flex-col items-center justify-center text-white font-bold shadow-xl animate-pulse ring-4 ring-[#4f46e5]/10">
                                            <span className="text-xs leading-none opacity-80 mb-0.5">EST</span>
                                            <span className="text-base leading-none">{countdown}s</span>
                                        </div>
                                        
                                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-[2px] px-4 py-1.5 rounded-full shadow-lg border-2 border-white flex items-center gap-1.5 whitespace-nowrap">
                                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                                            Active Session
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                     <div className="flex flex-col gap-1 items-center">
                                        <p className="text-[#4f46e5] font-black text-sm uppercase tracking-widest flex items-center gap-2">
                                            <span className="w-2 h-0.5 bg-[#4f46e5]/30 rounded-full"></span>
                                            Meeting Access Pass
                                            <span className="w-2 h-0.5 bg-[#4f46e5]/30 rounded-full"></span>
                                        </p>
                                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Dynamic Token: {meeting?.qrToken?.substring(0, 8)}</p>
                                     </div>

                                    <button onClick={stopAttendance} className="btn-danger w-full py-4 rounded-xl flex items-center justify-center gap-2 group hover:bg-red-700 transition-colors shadow-lg shadow-red-900/10">
                                        <Square size={16} fill="white" className="group-hover:scale-110 transition-transform" /> 
                                        <span className="font-bold tracking-wide">Terminate Session</span>
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {/* Background Decor */}
                        {isActive && (
                             <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#4f46e5] rounded-full blur-[120px]"></div>
                             </div>
                        )}
                    </div>
                    <div className="card p-6 h-fit space-y-4">
                        <div className="flex items-center gap-3">
                            <Clock className={isActive ? "text-emerald-500" : "text-slate-300"} />
                            <div>
                                <p className="font-bold">{isActive ? "Flowing" : "Offline"}</p>
                                <p className="text-xs text-slate-500">Status</p>
                            </div>
                        </div>
                        {isActive && <div className="text-3xl font-black text-[#4f46e5]">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</div>}
                    </div>
                </div>
            )}

            {activeTab === "scanmember" && (
                <div className="card p-8 min-h-[450px] flex flex-col items-center justify-center relative overflow-hidden bg-slate-900 shadow-2xl border-slate-800">
                    {!memberScanResult && !memberProcessing ? (
                        !memberScanning ? (
                            <div className="text-center space-y-6 animate-fade-in relative z-10 w-full max-w-sm">
                                <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mx-auto text-indigo-400 border border-white/10 shadow-inner">
                                    <ScanLine size={48} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-white tracking-tight">
                                        {isConcluded ? "Verification Locked" : "Manual Verification"}
                                    </h3>
                                    <p className="text-sm text-slate-400 leading-relaxed">
                                        {isConcluded 
                                            ? "The verification terminal is disabled as this meeting has concluded."
                                            : "Open the secure camera terminal to scan a member's digital ID for instant verification."}
                                    </p>
                                </div>
                                {!isConcluded ? (
                                    <button onClick={() => setMemberScanning(true)} className="btn-primary w-full h-14 shadow-xl shadow-indigo-900/40 border border-white/10 active:scale-95 transition-transform font-bold">
                                        Open Secure Terminal
                                    </button>
                                ) : (
                                    <div className="w-full py-4 px-6 bg-slate-800/50 rounded-2xl border border-slate-700 text-slate-500 text-sm font-bold flex items-center justify-center gap-2">
                                        <Shield size={16} /> Restricted Access
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="w-full max-w-sm space-y-8 animate-fade-in">
                                <div className="relative aspect-square rounded-[36px] overflow-hidden border-4 border-slate-800 shadow-2xl group">
                                     {/* Premium Scanner Container */}
                                    <div className="absolute inset-0 z-10 pointer-events-none border-[12px] border-slate-900">
                                        {/* Glowing Corners */}
                                        <div className="absolute top-2 left-2 w-16 h-16 border-t-[5px] border-l-[5px] border-indigo-500 rounded-tl-2xl shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                                        <div className="absolute top-2 right-2 w-16 h-16 border-t-[5px] border-r-[5px] border-indigo-500 rounded-tr-2xl shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                                        <div className="absolute bottom-2 left-2 w-16 h-16 border-b-[5px] border-l-[5px] border-indigo-500 rounded-bl-2xl shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                                        <div className="absolute bottom-2 right-2 w-16 h-16 border-b-[5px] border-r-[5px] border-indigo-500 rounded-br-2xl shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                                        
                                        {/* Scanning Laser Line */}
                                        <div className="absolute top-0 left-0 w-full h-[3px] bg-linear-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_15px_rgba(96,165,250,0.8)] animate-scan-laser"></div>

                                        {/* Center Target */}
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-white/10 rounded-3xl"></div>
                                    </div>
                                    
                                    <Scanner
                                        onScan={((data: IDetectedBarcode[]) => { if (data?.[0]?.rawValue) { setMemberScanning(false); processMemberQR(data[0].rawValue); } }) as any}
                                        onError={(e) => { toast.error("Camera Error"); setMemberScanning(false); }}
                                        styles={{ container: { height: '100%', width: '100%', backgroundColor: '#0f172a' } }}
                                        constraints={{ facingMode: 'environment' }}
                                        components={{
                                            onOff: false,
                                            torch: false,
                                            zoom: false,
                                            finder: false,
                                        }}
                                    />
                                    
                                    {/* HUD Overlays */}
                                    <div className="absolute top-6 left-6 z-20 flex items-center gap-2 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                                        <div className="w-1.5 h-1.5 bg-indigo-50/500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                                        <span className="text-[10px] font-black text-white/90 uppercase tracking-widest">Scanning Mode</span>
                                    </div>

                                    {/* Torch Toggle Button - Visible only on Mobile or if explicitly supported */}
                                    {(torchSupported || isMobile) && (
                                        <button 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                const newState = !torchOn;
                                                setTorchOn(newState);
                                                toast.success(newState ? "Flashlight On" : "Flashlight Off", { duration: 1000 });
                                            }}
                                            className={`absolute bottom-6 right-6 z-20 p-5 rounded-full transition-all duration-300 transform active:scale-95 ${torchOn ? 'bg-yellow-400 text-black shadow-[0_0_25px_rgba(250,204,21,0.6)] scale-110' : 'bg-white/10 text-white backdrop-blur-md border border-white/20'}`}
                                        >
                                            {torchOn ? <Zap size={28} fill="currentColor" /> : <ZapOff size={28} />}
                                        </button>
                                    )}
                                </div>
                                <button onClick={() => setMemberScanning(false)} className="w-full py-4 text-slate-400 font-bold hover:text-white transition-colors flex items-center justify-center gap-2 text-sm uppercase tracking-widest active:scale-95">
                                    <Square size={14} /> Cancel Terminal
                                </button>
                            </div>
                        )
                    ) : (
                        <div className="text-center space-y-6 animate-scale-in py-8">
                             <div className="relative inline-block">
                                <div className={`absolute -inset-4 rounded-full blur-2xl opacity-20 ${memberScanResult?.success ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`}></div>
                                <div className={`relative w-24 h-24 rounded-full flex items-center justify-center ${memberScanResult?.success ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'} border border-white/10`}>
                                    {memberScanResult?.success ? <CheckCircle size={48} className="animate-scale-in" /> : <AlertCircle size={48} className="animate-scale-in" />}
                                </div>
                             </div>
                            
                            <div className="space-y-1.5">
                                <h3 className={`text-2xl font-bold ${memberScanResult?.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {memberScanResult?.success ? 'Verification Successful' : 'Scan Failed'}
                                </h3>
                                <p className="text-slate-400 font-medium">
                                    {memberScanResult?.success 
                                        ? (memberScanResult.alreadyScanned ? `${memberScanResult.memberName} already present` : `Confirmed: ${memberScanResult.memberName}`)
                                        : (memberScanResult?.error || "Unknown Error")}
                                </p>
                            </div>

                            <button onClick={() => setMemberScanResult(null)} className="btn-primary px-10 h-14 w-full shadow-lg shadow-indigo-900/40 font-bold">
                                Scan Next Member
                            </button>
                        </div>
                    )}
                    
                    {/* Background Overlay */}
                    <div className="absolute inset-0 bg-linear-to-b from-indigo-900/20 to-transparent pointer-events-none opacity-20"></div>
                </div>
            )}
        </div>
    );
};

export default MeetingQR;
