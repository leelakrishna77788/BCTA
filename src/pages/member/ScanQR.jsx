import React, { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { doc, getDoc, getDocs, updateDoc, addDoc, collection, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import { CheckCircle, QrCode, RefreshCw } from "lucide-react";

const ScanQR = () => {
    const { currentUser, userProfile } = useAuth();
    const scannerRef = useRef(null);
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [permissionError, setPermissionError] = useState(null);

    const startScanner = async () => {
        if (scannerRef.current) return;
        setPermissionError(null);

        try {
            // Check if mediaDevices API is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                const msg = "Camera access is not supported by your browser or connection. Please ensure you are using a secure connection (HTTPS).";
                setPermissionError(msg);
                toast.error(msg);
                return;
            }

            // Explicitly request camera permission first
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            // Stop the tracks immediately after permission is granted
            stream.getTracks().forEach(track => track.stop());
        } catch (err) {
            console.error("Camera permission error:", err);
            let message = "Camera access denied. Please allow camera permissions in your browser settings.";
            if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
                message = "No camera found on this device.";
            } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
                message = "Camera is already in use by another application.";
            }
            setPermissionError(message);
            toast.error(message);
            return;
        }

        setScanning(true);
        setResult(null);

        setTimeout(() => {
            const scanner = new Html5QrcodeScanner("reader", {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
                showTorchButtonIfSupported: true,
            }, false);

            scanner.render(
                async (decoded) => {
                    scanner.clear().catch(() => { });
                    scannerRef.current = null;
                    setScanning(false);
                    await processQR(decoded);
                },
                (err) => {
                    // Ignore transient scanning errors
                }
            );
            scannerRef.current = scanner;
        }, 100);
    };

    const stopScanner = () => {
        if (scannerRef.current) {
            scannerRef.current.clear().catch(() => { });
            scannerRef.current = null;
        }
        setScanning(false);
    };

    useEffect(() => () => stopScanner(), []);

    const processQR = async (raw) => {
        setProcessing(true);
        try {
            let data;
            try { data = JSON.parse(raw); } catch { toast.error("Invalid QR code"); setProcessing(false); return; }

            // --- MEETING QR ---
            if (data.meetingId) {
                const meetingRef = doc(db, "meetings", data.meetingId);
                const meetingSnap = await getDoc(meetingRef);
                if (!meetingSnap.exists()) { toast.error("Meeting not found"); setProcessing(false); return; }
                const meeting = meetingSnap.data();

                // Validate token
                if (meeting.qrToken !== data.token) {
                    toast.error("QR code expired! Ask admin to refresh.");
                    setProcessing(false); return;
                }

                // Check expiry
                if (meeting.qrExpiresAt?.toDate && new Date() > meeting.qrExpiresAt.toDate()) {
                    toast.error("Meeting QR has expired!");
                    setProcessing(false); return;
                }

                // Check member status
                if (userProfile.status === "blocked") {
                    toast.error("You are blocked from attending meetings!");
                    setProcessing(false); return;
                }

                // Check duplicate scan
                const dupQ = query(collection(db, "attendance"),
                    where("meetingId", "==", data.meetingId),
                    where("memberUID", "==", currentUser.uid));
                const dupSnap = await getDocs(dupQ);
                if (!dupSnap.empty) { toast("Already marked present!", { icon: "👍" }); setResult({ type: "meeting", success: true, alreadyScanned: true, topic: meeting.topic }); setProcessing(false); return; }

                // Mark attendance
                await addDoc(collection(db, "attendance"), {
                    meetingId: data.meetingId,
                    memberId: userProfile.memberId,
                    memberUID: currentUser.uid,
                    memberName: `${userProfile.name} ${userProfile.surname}`,
                    scannedAt: serverTimestamp(),
                    status: "present",
                });

                // Increment count
                await updateDoc(doc(db, "users", currentUser.uid), {
                    attendanceCount: (userProfile.attendanceCount || 0) + 1
                });

                toast.success("Attendance marked successfully! ✅");
                setResult({ type: "meeting", success: true, topic: meeting.topic, location: meeting.location });
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
                    <div id="reader" className="w-full" />
                    {!scanning ? (
                        <div className="space-y-4">
                            {permissionError && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center animate-fade-in">
                                    <p className="text-amber-800 text-sm font-semibold mb-2">Camera Access Blocked</p>
                                    <p className="text-amber-600 text-xs mb-3">{permissionError}</p>
                                    <button onClick={startScanner} className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-4 py-2 rounded-lg transition-colors font-bold">
                                        Try Again
                                    </button>
                                </div>
                            )}
                            <button onClick={startScanner} disabled={userProfile?.status === "blocked"}
                                className="btn-primary w-full flex items-center justify-center gap-2 py-4">
                                <QrCode size={20} /> {permissionError ? "Retry Camera Access" : "Start Camera & Scan"}
                            </button>
                        </div>
                    ) : (
                        <button onClick={stopScanner} className="btn-secondary w-full mt-4">
                            Cancel Scan
                        </button>
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
