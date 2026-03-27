import React, { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { doc, getDoc, collection, query, where, addDoc, serverTimestamp, updateDoc, increment, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import { CheckCircle, QrCode, RefreshCw, ScanLine, User } from "lucide-react";

const TABS = [
    { id: "scan", label: "Scan Meeting QR", icon: ScanLine },
    { id: "myqr", label: "Show My QR", icon: User },
];

interface ScanResult {
    type: string;
    success: boolean;
    alreadyScanned?: boolean;
    topic?: string;
    location?: string;
    shopName?: string;
    shopId?: string;
}

const ScanQR: React.FC = () => {
    const { userProfile } = useAuth();
    const [activeTab, setActiveTab] = useState<string>("scan");
    const [scanning, setScanning] = useState<boolean>(false);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [processing, setProcessing] = useState<boolean>(false);
    const [permissionError, setPermissionError] = useState<string | null>(null);

    const handleScanError = (error: any) => {
        console.error("QR Scan Error:", error);
        if (error?.name === "NotAllowedError") {
            setPermissionError("Camera access denied. Please allow permissions.");
            setScanning(false);
        }
    };

    const processQR = async (raw: string) => {
        setProcessing(true);
        try {
            let data: any;
            try { data = JSON.parse(raw); } catch { toast.error("Invalid QR code"); setProcessing(false); return; }

            // --- MEETING QR ---
            if (data.meetingId) {
                if (userProfile?.status === "blocked") {
                    toast.error("You are blocked from attending meetings!");
                    setProcessing(false); return;
                }

                try {
                    // 1. Verify Meeting Directly from Firestore
                    const meetingRef = doc(db, "meetings", data.meetingId);
                    const meetingSnap = await getDoc(meetingRef);

                    if (!meetingSnap.exists() || meetingSnap.data().status !== "active") {
                        toast.error("Meeting is no longer active");
                        setProcessing(false); return;
                    }

                    const meetingData = meetingSnap.data();
                    const now = new Date();
                    const expiry = meetingData.qrExpiresAt?.toDate?.() || new Date(meetingData.qrExpiresAt);

                    if (now > expiry) {
                        toast.error("QR Code expired");
                        setProcessing(false); return;
                    }

                    if (meetingData.qrToken !== data.token) {
                        toast.error("Invalid or outdated QR token");
                        setProcessing(false); return;
                    }

                    if(!userProfile) return;

                    // 2. Check for existing attendance
                    const attendanceRef = collection(db, "attendance");
                    const q = query(attendanceRef,
                        where("meetingId", "==", data.meetingId),
                        where("memberUID", "==", userProfile.uid)
                    );
                    const existing = await getDocs(q);

                    if (!existing.empty) {
                        toast("Already marked present!", { icon: "👍" });
                        setResult({
                            type: "meeting",
                            success: true,
                            alreadyScanned: true,
                            topic: meetingData.topic
                        });
                        setProcessing(false); return;
                    }

                    // 3. Mark Attendance
                    await addDoc(collection(db, "attendance"), {
                        meetingId: data.meetingId,
                        memberUID: userProfile.uid,
                        memberName: `${userProfile.name} ${userProfile.surname}`,
                        markedAt: serverTimestamp(),
                        method: "member_scan"
                    });

                    // 4. Increment counts
                    await updateDoc(meetingRef, { attendanceCount: increment(1) });
                    await updateDoc(doc(db, "users", userProfile.uid), { attendanceCount: increment(1) });

                    toast.success("Attendance marked successfully! ✅");
                    setResult({
                        type: "meeting",
                        success: true,
                        alreadyScanned: false,
                        topic: meetingData.topic
                    });
                } catch (err) {
                    console.error(err);
                    toast.error("Failed to mark attendance");
                }
            }

            // --- SHOP QR ---
            else if (data.type === "shop" && data.shopId) {
                if (userProfile?.status === "blocked") {
                    toast.error("You are blocked from shop access!");
                    setProcessing(false); return;
                }
                const shopSnap = await getDoc(doc(db, "shops", data.shopId));
                if (!shopSnap.exists()) { toast.error("Shop not found"); setProcessing(false); return; }
                const shop = shopSnap.data();
                toast.success(`Shop QR scanned: ${shop.shopName}`);
                setResult({ type: "shop", success: true, shopName: shop.shopName, shopId: data.shopId });
            } else {
                toast.error("Unknown QR format");
            }
        } catch (err) {
            toast.error("Error processing QR");
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
                <h1 className="page-title mb-0">Attendance</h1>
                <p className="text-slate-500 text-sm">Scan meeting QR or show your personal QR code</p>
            </div>

            {/* Blocked warning */}
            {userProfile?.status === "blocked" && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                    <p className="text-red-700 font-semibold">⚠️ Your account is blocked</p>
                    <p className="text-red-500 text-sm mt-1">You cannot mark attendance. Contact admin.</p>
                </div>
            )}

            {/* Tab switcher */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setResult(null); setScanning(false); setPermissionError(null); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                            activeTab === tab.id
                                ? "bg-white shadow text-[#000080]"
                                : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        <tab.icon size={16} />
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
                                            <p className="text-amber-800 text-sm font-semibold mb-2">Camera Access Blocked</p>
                                            <p className="text-amber-600 text-xs mb-3">{permissionError}</p>
                                            <p className="text-amber-600 text-xs mb-3">
                                                💡 Tip: Switch to <strong>Show My QR</strong> tab and let the admin scan your code instead.
                                            </p>
                                            <button onClick={() => setScanning(true)} className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-4 py-2 rounded-lg transition-colors font-bold">
                                                Try Again
                                            </button>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => { setPermissionError(null); setScanning(true); }}
                                        disabled={userProfile?.status === "blocked"}
                                        className="btn-primary w-full flex items-center justify-center gap-2 py-4"
                                    >
                                        <ScanLine size={20} /> {permissionError ? "Retry Camera Access" : "Start Camera & Scan"}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-fade-in relative">
                                    <div className="overflow-hidden rounded-xl border-2 border-slate-200 aspect-square relative bg-slate-900">
                                        <Scanner
                                            onScan={(data) => {
                                                if (data && data.length > 0) {
                                                    setScanning(false);
                                                    processQR(data[0].rawValue);
                                                }
                                            }}
                                            onError={handleScanError}
                                            components={{
                                                audio: false,
                                                onOff: true,
                                                torch: true,
                                                zoom: true,
                                                finder: true,
                                            }}
                                            styles={{
                                                container: { width: "100%", height: "100%" }
                                            }}
                                        />
                                        {/* Scanning Overlay Animation */}
                                        <div className="absolute inset-0 pointer-events-none">
                                            <div className="w-full h-1 bg-[#000080]/50 shadow-[0_0_15px_rgba(0,0,128,0.5)] animate-scanner-beam absolute top-1/2 -translate-y-1/2"></div>
                                        </div>
                                    </div>
                                    <button onClick={() => setScanning(false)} className="btn-secondary w-full">
                                        Cancel Scan
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Processing */}
                    {processing && (
                        <div className="card text-center py-10">
                            <div className="w-10 h-10 border-4 border-[#000080] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                            <p className="text-slate-600 font-medium">Processing QR code...</p>
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div className={`card text-center animate-fade-in ${result.success ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"}`}>
                            <CheckCircle size={48} className="text-emerald-500 mx-auto mb-3" />
                            {result.type === "meeting" && (
                                <>
                                    <p className="text-lg font-bold text-emerald-700">
                                        {result.alreadyScanned ? "Already Scanned!" : "Attendance Marked! ✅"}
                                    </p>
                                    <p className="text-slate-600 text-sm mt-1">{result.topic}</p>
                                    {result.location && <p className="text-slate-400 text-xs mt-0.5">📍 {result.location}</p>}
                                </>
                            )}
                            {result.type === "shop" && (
                                <>
                                    <p className="text-lg font-bold text-emerald-700">Shop Verified!</p>
                                    <p className="text-slate-600 text-sm mt-1">{result.shopName}</p>
                                    <p className="text-xs text-slate-400 mt-1">Show your profile to the shop owner to receive products</p>
                                </>
                            )}
                            <button onClick={() => { setResult(null); }} className="btn-secondary mt-4 flex items-center gap-2 mx-auto">
                                <RefreshCw size={14} /> Scan Another
                            </button>
                        </div>
                    )}

                    {/* Instructions */}
                    {!scanning && !result && (
                        <div className="card">
                            <h3 className="text-sm font-semibold text-slate-700 mb-2">How to scan</h3>
                            <ol className="text-xs text-slate-500 space-y-1.5 list-decimal list-inside">
                                <li>Tap "Start Camera" above</li>
                                <li>Point your camera at the QR code shown by admin</li>
                                <li>For meetings: QR must be active and not expired</li>
                                <li>For shops: Scan the fixed QR at the shop entrance</li>
                            </ol>
                        </div>
                    )}
                </>
            )}

            {/* ── TAB: SHOW MY QR ── */}
            {activeTab === "myqr" && (
                <div className="space-y-4">
                    <div className="card flex flex-col items-center text-center p-8 space-y-5">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Your Personal QR Code</h2>
                            <p className="text-sm text-slate-500 mt-1">Show this QR to the admin so they can mark your attendance</p>
                        </div>

                        {memberQRData ? (
                            <div className="relative inline-block">
                                <div className="bg-white p-4 rounded-2xl shadow-xl border-2 border-slate-100">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(memberQRData)}`}
                                        alt="My Member QR"
                                        className="rounded-xl"
                                    />
                                </div>
                                {/* Live badge */}
                                <div className="absolute -top-3 -right-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse inline-block" />
                                    LIVE
                                </div>
                            </div>
                        ) : (
                            <div className="w-[220px] h-[220px] bg-slate-100 animate-pulse rounded-2xl" />
                        )}

                        {/* Member details */}
                        <div className="bg-slate-50 rounded-xl px-6 py-4 w-full text-left space-y-1.5">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-medium">Name</span>
                                <span className="text-slate-700 font-bold">
                                    {userProfile?.name} {userProfile?.surname}
                                </span>
                            </div>
                            {userProfile?.memberId && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400 font-medium">Member ID</span>
                                    <span className="text-slate-700 font-mono font-bold">{userProfile.memberId}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="text-sm font-semibold text-slate-700 mb-2">How this works</h3>
                        <ol className="text-xs text-slate-500 space-y-1.5 list-decimal list-inside">
                            <li>Show this QR code to the admin or on the scanning device</li>
                            <li>Admin scans it using their "Scan Member QR" option</li>
                            <li>Your attendance will be automatically marked and updated</li>
                            <li>Use this when your camera can't scan the meeting QR</li>
                        </ol>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScanQR;
