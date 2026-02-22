import React, { useEffect, useState, useRef } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { useParams, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";
import { ArrowLeft, RefreshCw, Clock, Shield, Play, Square, Download } from "lucide-react";

const MeetingQR = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [meeting, setMeeting] = useState(null);
    const [qrData, setQrData] = useState("");
    const [timeLeft, setTimeLeft] = useState(30);
    const [isActive, setIsActive] = useState(false);
    const [expiry, setExpiry] = useState(null);
    const [totalExpiry, setTotalExpiry] = useState(null);
    const refreshRef = useRef(null);
    const countdownRef = useRef(null);

    useEffect(() => {
        const fetchMeeting = async () => {
            const snap = await getDoc(doc(db, "meetings", id));
            if (snap.exists()) {
                const data = { id: snap.id, ...snap.data() };
                setMeeting(data);
                setQrData(JSON.stringify({ meetingId: id, token: data.qrToken, t: Date.now() }));
                // If already active
                if (data.qrExpiresAt?.toDate && new Date() < data.qrExpiresAt.toDate()) {
                    setIsActive(true);
                    setExpiry(data.qrExpiresAt.toDate());
                }
            }
        };
        fetchMeeting();
        return () => { clearInterval(refreshRef.current); clearInterval(countdownRef.current); };
    }, [id]);

    const startQR = async () => {
        if (!meeting) return;
        const expiryTime = new Date(Date.now() + meeting.qrDuration * 60000);
        const token = uuidv4();
        await updateDoc(doc(db, "meetings", id), {
            status: "active",
            qrToken: token,
            qrExpiresAt: expiryTime,
        });
        setMeeting(p => ({ ...p, qrToken: token, status: "active" }));
        setExpiry(expiryTime);
        setTotalExpiry(expiryTime);
        setIsActive(true);
        setQrData(JSON.stringify({ meetingId: id, token, t: Date.now() }));
        toast.success("QR Attendance started! QR refreshes every 30s.");

        // Refresh QR token every 30 seconds
        let countdown = 30;
        refreshRef.current = setInterval(async () => {
            if (new Date() > expiryTime) {
                clearInterval(refreshRef.current);
                clearInterval(countdownRef.current);
                setIsActive(false);
                await updateDoc(doc(db, "meetings", id), { status: "expired" });
                toast("Meeting QR has expired", { icon: "⏰" });
                return;
            }
            const newToken = uuidv4();
            await updateDoc(doc(db, "meetings", id), { qrToken: newToken });
            setMeeting(p => ({ ...p, qrToken: newToken }));
            setQrData(JSON.stringify({ meetingId: id, token: newToken, t: Date.now() }));
            countdown = 30;
        }, 30000);

        // Countdown tick
        countdownRef.current = setInterval(() => {
            countdown--;
            setTimeLeft(countdown <= 0 ? 30 : countdown);
        }, 1000);
    };

    const stopQR = async () => {
        clearInterval(refreshRef.current);
        clearInterval(countdownRef.current);
        await updateDoc(doc(db, "meetings", id), { status: "expired" });
        setIsActive(false);
        toast("QR stopped");
    };

    const downloadQR = () => {
        const svg = document.getElementById("meeting-qr");
        const serializer = new XMLSerializer();
        const svgStr = serializer.serializeToString(svg);
        const a = document.createElement("a");
        a.href = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
        a.download = `meeting-qr-${id}.svg`;
        a.click();
    };

    if (!meeting) return (
        <div className="flex justify-center h-64 items-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="page-title mb-0">Meeting QR Code</h1>
                    <p className="text-slate-500 text-sm">{meeting.topic}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* QR Display */}
                <div className="card text-center">
                    <div className="relative inline-block">
                        <div className={`p-6 bg-white rounded-2xl border-4 transition-colors duration-300 ${isActive ? "border-emerald-400 shadow-lg shadow-emerald-100" : "border-slate-200"}`}>
                            <QRCodeSVG
                                id="meeting-qr"
                                value={qrData || "BCTA-QR"}
                                size={220}
                                level="H"
                                includeMargin
                                imageSettings={{
                                    src: "",
                                    x: undefined, y: undefined,
                                    height: 0, width: 0, excavate: false,
                                }}
                            />
                        </div>
                        {isActive && (
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full animate-pulse" />
                        )}
                    </div>

                    {isActive && (
                        <div className="mt-4">
                            <div className="flex items-center justify-center gap-2 text-sm text-slate-600 mb-2">
                                <RefreshCw size={14} className="animate-spin" />
                                Refreshes in <span className="font-bold text-blue-600">{timeLeft}s</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 mx-auto max-w-xs">
                                <div
                                    className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                                    style={{ width: `${(timeLeft / 30) * 100}%` }}
                                />
                            </div>
                            {expiry && (
                                <p className="text-xs text-slate-400 mt-2">
                                    Expires at {expiry.toLocaleTimeString()}
                                </p>
                            )}
                        </div>
                    )}

                    {!isActive && (
                        <p className="mt-4 text-sm text-slate-400">Click "Start QR" to activate attendance scanning</p>
                    )}
                </div>

                {/* Controls */}
                <div className="space-y-4">
                    <div className="card">
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">Meeting Info</h3>
                        <dl className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-slate-500">Topic:</dt>
                                <dd className="font-medium text-slate-800">{meeting.topic}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-slate-500">Date:</dt>
                                <dd className="font-medium">{meeting.date?.toDate?.().toLocaleDateString("en-IN")}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-slate-500">Time:</dt>
                                <dd className="font-medium">{meeting.startTime} – {meeting.endTime || "TBD"}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-slate-500">QR Duration:</dt>
                                <dd className="font-medium">{meeting.qrDuration} min</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-slate-500">Status:</dt>
                                <dd>
                                    <span className={
                                        meeting.status === "active" ? "badge-active" :
                                            meeting.status === "upcoming" ? "badge-pending" : "badge-blocked"
                                    }>{meeting.status}</span>
                                </dd>
                            </div>
                        </dl>
                    </div>

                    <div className="card">
                        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                            <Shield size={15} /> Security
                        </h3>
                        <ul className="text-xs text-slate-500 space-y-1.5">
                            <li className="flex items-center gap-1.5">✅ QR token rotates every 30 seconds</li>
                            <li className="flex items-center gap-1.5">✅ Blocked members cannot scan</li>
                            <li className="flex items-center gap-1.5">✅ QR expires after {meeting.qrDuration} minutes</li>
                            <li className="flex items-center gap-1.5">✅ Duplicate scan prevention</li>
                        </ul>
                    </div>

                    <div className="flex gap-3">
                        {!isActive ? (
                            <button onClick={startQR} className="btn-success flex-1 flex items-center justify-center gap-2">
                                <Play size={16} /> Start QR Attendance
                            </button>
                        ) : (
                            <button onClick={stopQR} className="btn-danger flex-1 flex items-center justify-center gap-2">
                                <Square size={16} /> Stop QR
                            </button>
                        )}
                        <button onClick={downloadQR} className="btn-secondary flex items-center gap-2">
                            <Download size={16} /> Save QR
                        </button>
                    </div>

                    <button
                        onClick={() => navigate(`/admin/meetings/${id}/attendance`)}
                        className="btn-secondary w-full flex items-center justify-center gap-2"
                    >
                        View Attendance Dashboard →
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MeetingQR;
