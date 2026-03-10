import React, { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { doc, getDoc, getDocs, updateDoc, addDoc, collection, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import { CheckCircle, QrCode, RefreshCw } from "lucide-react";

const ScanQR = () => {
    const { currentUser, userProfile } = useAuth();
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [permissionError, setPermissionError] = useState(null);

    const handleScanError = (error) => {
        console.error("QR Scan Error:", error);
        if (error?.name === "NotAllowedError") {
            setPermissionError("Camera access denied. Please allow permissions.");
            setScanning(false);
        }
    };

    const processQR = async (raw) => {
        setProcessing(true);
        try {
            let data;
            try { data = JSON.parse(raw); } catch { toast.error("Invalid QR code"); setProcessing(false); return; }

            // --- MEETING QR ---
            if (data.meetingId) {
                if (userProfile.status === "blocked") {
                    toast.error("You are blocked from attending meetings!");
                    setProcessing(false); return;
                }

                try {
                    const res = await meetingsApi.markAttendance({
                        meetingId: data.meetingId,
                        token: data.token
                    });

                    if (res.alreadyScanned) {
                        toast("Already marked present!", { icon: "👍" });
                    } else {
                        toast.success("Attendance marked successfully! ✅");
                    }

                    setResult({
                        type: "meeting",
                        success: true,
                        alreadyScanned: !!res.alreadyScanned,
                        topic: data.topic || "Meeting"
                    });
                } catch (err) {
                    toast.error(err.message || "Failed to mark attendance");
                }
            }

            // --- SHOP QR ---
            else if (data.type === "shop" && data.shopId) {
                if (userProfile.status === "blocked") {
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

    return (
        <div className="space-y-5 animate-fade-in max-w-md mx-auto">
            <div>
                <h1 className="page-title mb-0">Scan QR Code</h1>
                <p className="text-slate-500 text-sm">Scan meeting or shop QR codes</p>
            </div>

            {/* Member Info */}
            {userProfile?.status === "blocked" && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                    <p className="text-red-700 font-semibold">⚠️ Your account is blocked</p>
                    <p className="text-red-500 text-sm mt-1">You cannot scan QR codes. Contact admin.</p>
                </div>
            )}

            {/* Scanner */}
            {!result && (
                <div className="card">
                    {!scanning ? (
                        <div className="space-y-4">
                            {permissionError && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center animate-fade-in">
                                    <p className="text-amber-800 text-sm font-semibold mb-2">Camera Access Blocked</p>
                                    <p className="text-amber-600 text-xs mb-3">{permissionError}</p>
                                    <button onClick={() => setScanning(true)} className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-4 py-2 rounded-lg transition-colors font-bold">
                                        Try Again
                                    </button>
                                </div>
                            )}
                            <button onClick={() => { setPermissionError(null); setScanning(true); }} disabled={userProfile?.status === "blocked"}
                                className="btn-primary w-full flex items-center justify-center gap-2 py-4">
                                <QrCode size={20} /> {permissionError ? "Retry Camera Access" : "Start Camera & Scan"}
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
                                    <div className="w-full h-1 bg-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-scanner-beam absolute top-1/2 -translate-y-1/2"></div>
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
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
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
                        <li>Point your camera at the QR code</li>
                        <li>For meetings: QR must be active and not expired</li>
                        <li>For shops: Scan the fixed QR at the shop entrance</li>
                    </ol>
                </div>
            )}
        </div>
    );
};

export default ScanQR;
