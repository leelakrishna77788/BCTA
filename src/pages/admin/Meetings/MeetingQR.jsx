import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Scanner } from "@yudiel/react-qr-scanner";
import toast from "react-hot-toast";
import { ArrowLeft, RefreshCw, Clock, Shield, Play, Square, Download, ScanLine, QrCode, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { db } from "../../../firebase/firebase";
import { doc, onSnapshot, updateDoc, collection, addDoc, serverTimestamp, getDocs, query, where, increment, Timestamp } from "firebase/firestore";

// Simple robust UUID alternative to avoid ESM import issues with 'uuid' package
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

const TABS = [
    { id: "showqr", label: "Show Meeting QR", icon: QrCode },
    { id: "scanmember", label: "Scan Member QR", icon: ScanLine },
];

const MeetingQR = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("showqr");
    const [meeting, setMeeting] = useState(null);
    const [isActive, setIsActive] = useState(false);
    const [qrData, setQrData] = useState("");
    const [timeLeft, setTimeLeft] = useState(0);
    const [countdown, setCountdown] = useState(30);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Scan member state
    const [memberScanning, setMemberScanning] = useState(false);
    const [memberScanResult, setMemberScanResult] = useState(null);
    const [memberProcessing, setMemberProcessing] = useState(false);
    const [memberPermissionError, setMemberPermissionError] = useState(null);

    const rotationTimer = useRef(null);

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

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        console.log(`[MeetingQR] Subscribing: ${id}`);
        
        const docRef = doc(db, "meetings", id);
        const unsubscribe = onSnapshot(docRef, 
            (snap) => {
                if (snap.exists()) {
                    const data = { id: snap.id, ...snap.data() };
                    setMeeting(data);
                    setError(null);

                    if (data.status === "active" && data.qrExpiresAt) {
                        const expiry = data.qrExpiresAt instanceof Timestamp 
                            ? data.qrExpiresAt.toDate() 
                            : new Date(data.qrExpiresAt);
                        
                        const now = new Date();
                        if (now < expiry) {
                            setIsActive(true);
                            setQrData(JSON.stringify({
                                meetingId: id,
                                token: data.qrToken,
                                topic: data.topic,
                                t: Date.now()
                            }));
                            setTimeLeft(Math.round((expiry - now) / 1000));
                        } else {
                            stopAttendance();
                        }
                    } else {
                        setIsActive(false);
                        setQrData("");
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

    useEffect(() => {
        if (isActive) {
            rotationTimer.current = setInterval(() => {
                setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
                setCountdown(prev => {
                    if (prev <= 1) {
                        updateDoc(doc(db, "meetings", id), { qrToken: generateId() }).catch(console.error);
                        return 30;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(rotationTimer.current);
    }, [isActive, id]);

    const startAttendance = async () => {
        const durationStr = window.prompt("Enter duration (minutes):", "60");
        if (!durationStr) return;
        const duration = parseInt(durationStr);
        if (isNaN(duration) || duration <= 0) return;

        try {
            const expiryTime = new Date(Date.now() + duration * 60000);
            await updateDoc(doc(db, "meetings", id), {
                status: "active",
                qrToken: generateId(),
                qrExpiresAt: Timestamp.fromDate(expiryTime),
                qrDuration: duration
            });
            setCountdown(30);
            toast.success("Started!");
        } catch (err) {
            console.error("[MeetingQR] Start Flow ERROR:", err);
            const msg = err.code ? `[${err.code}] ${err.message}` : "Failed to start";
            toast.error(msg, { duration: 6000 });
        }
    };

    const processMemberQR = async (raw) => {
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
        } catch (err) {
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
                {TABS.map(t => (
                    <button key={t.id} onClick={() => { setActiveTab(t.id); setMemberScanResult(null); }}
                        className={`px-6 py-2 rounded-xl text-sm font-bold ${activeTab === t.id ? "bg-white shadow text-blue-600" : "text-slate-500"}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {activeTab === "showqr" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 card p-8 flex flex-col items-center justify-center min-h-[400px]">
                        {!isActive ? (
                            <button onClick={startAttendance} className="btn-primary px-10 h-14">Start Attendance Flow</button>
                        ) : (
                            <div className="text-center space-y-6">
                                <div className="relative p-6 border-2 border-slate-100 rounded-3xl bg-white shadow-xl">
                                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`} alt="QR" />
                                    <div className="absolute -top-3 -right-3 w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold">{countdown}s</div>
                                </div>
                                <button onClick={stopAttendance} className="btn-danger">Stop Session</button>
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
                        {isActive && <div className="text-3xl font-black text-blue-600">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</div>}
                    </div>
                </div>
            )}

            {activeTab === "scanmember" && (
                <div className="card p-8 min-h-[400px] flex flex-col items-center justify-center">
                    {!memberScanResult && !memberProcessing ? (
                        !memberScanning ? (
                            <button onClick={() => setMemberScanning(true)} className="btn-primary">Open Member QR Scanner</button>
                        ) : (
                            <div className="w-full max-w-sm space-y-4">
                                <div className="aspect-square bg-slate-900 rounded-2xl overflow-hidden border-4 border-white shadow-xl">
                                    <Scanner
                                        onScan={(data) => { if (data?.[0]?.rawValue) { setMemberScanning(false); processMemberQR(data[0].rawValue); } }}
                                        onError={(e) => { toast.error("Camera Error"); setMemberScanning(false); }}
                                    />
                                </div>
                                <button onClick={() => setMemberScanning(false)} className="btn-secondary w-full">Cancel</button>
                            </div>
                        )
                    ) : (
                        <div className="text-center space-y-4">
                            {memberScanResult?.success ? <CheckCircle size={60} className="text-emerald-500 mx-auto" /> : <AlertCircle size={60} className="text-rose-500 mx-auto" />}
                            <p className="text-xl font-bold">{memberScanResult?.memberName || "Process failed"}</p>
                            <button onClick={() => setMemberScanResult(null)} className="btn-secondary">Scan Next</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MeetingQR;
