import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";
import { ArrowLeft, RefreshCw, Clock, Shield, Play, Square, Download } from "lucide-react";
import { meetingsApi } from "../../../services/api";

const MeetingQR = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [meeting, setMeeting] = useState(null);
    const [isActive, setIsActive] = useState(false);
    const [qrData, setQrData] = useState("");
    const [expiry, setExpiry] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [countdown, setCountdown] = useState(30);

    const refreshRef = useRef();
    const countdownRef = useRef();

    useEffect(() => {
        const fetchMeeting = async () => {
            try {
                const data = await meetingsApi.getById(id);
                setMeeting(data);

                // If already active in DB
                if (data.status === "active" && data.qrExpiresAt) {
                    const exp = new Date(data.qrExpiresAt);
                    if (new Date() < exp) {
                        setIsActive(true);
                        setExpiry(exp);
                        setQrData(JSON.stringify({ meetingId: id, token: data.qrToken, t: Date.now() }));
                        startIntervals(exp);
                    } else {
                        // Mark as expired if time passed
                        await meetingsApi.stop(id);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch meeting:", err);
                toast.error("Failed to load meeting details");
            }
        };
        fetchMeeting();
        return () => {
            clearInterval(refreshRef.current);
            clearInterval(countdownRef.current);
        };
    }, [id]);

    const startIntervals = (expiryTime) => {
        clearInterval(refreshRef.current);
        clearInterval(countdownRef.current);

        // 1. Rotation Logic (Every 30s)
        refreshRef.current = setInterval(async () => {
            if (new Date() > expiryTime) {
                stopAttendance();
                return;
            }
            const newToken = uuidv4();
            try {
                await meetingsApi.refreshQR(id, newToken);
                setQrData(JSON.stringify({ meetingId: id, token: newToken, t: Date.now() }));
                setCountdown(30);
            } catch (err) {
                console.error("Refresh fail:", err);
            }
        }, 30000);

        // 2. Local Countdowns
        countdownRef.current = setInterval(() => {
            const now = new Date();
            const diff = Math.max(0, Math.floor((expiryTime - now) / 1000));
            setTimeLeft(diff);
            setCountdown(prev => prev > 0 ? prev - 1 : 30);
        }, 1000);
    };

    const startAttendance = async () => {
        const duration = parseInt(window.prompt("Enter duration in minutes:", "60"));
        if (!duration || isNaN(duration)) return;

        try {
            const expiryTime = new Date(Date.now() + duration * 60000);
            await meetingsApi.start(id, { durationMinutes: duration });

            setMeeting(p => ({ ...p, status: "active" }));
            setIsActive(true);
            setExpiry(expiryTime);
            startIntervals(expiryTime);
            toast.success("Attendance started!");
        } catch (err) {
            toast.error("Failed to start attendance");
        }
    };

    const stopAttendance = async () => {
        try {
            await meetingsApi.stop(id);
            clearInterval(refreshRef.current);
            clearInterval(countdownRef.current);
            setIsActive(false);
            setMeeting(p => ({ ...p, status: "expired" }));
            toast("Attendance stopped", { icon: "🛑" });
        } catch (err) {
            toast.error("Failed to stop");
        }
    };

    if (!meeting) return <div className="p-10 text-center">Loading meeting...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate("/admin/meetings")} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{meeting.topic}</h1>
                    <p className="text-slate-500 font-medium">Attendance Management</p>
                </div>
                <div className="ml-auto flex gap-2">
                    <button onClick={() => navigate(`/admin/meetings/${id}/attendance`)} className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold border border-indigo-100 hover:bg-indigo-100 transition-colors">
                        Attendance Dashboard
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* QR Display */}
                <div className="md:col-span-2 card flex flex-col items-center justify-center p-8 min-h-[450px]">
                    {!isActive ? (
                        <div className="text-center space-y-4">
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                                <Shield size={40} />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800">QR Attendance Inactive</h2>
                            <p className="text-slate-500 max-w-xs mx-auto text-sm">Start the attendance flow to generate a secure, rotating QR code for members.</p>
                            <button onClick={startAttendance} className="btn-primary mt-4 flex items-center gap-2 px-8">
                                <Play size={18} /> Start QR Attendance
                            </button>
                        </div>
                    ) : (
                        <div className="w-full text-center space-y-8 animate-scale-in">
                            <div className="relative inline-block p-6 bg-white rounded-3xl shadow-xl border border-slate-100">
                                {qrData ? (
                                    <div className="bg-white p-4 rounded-xl border-2 border-slate-50">
                                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`} alt="Meeting QR" className="mx-auto" />
                                    </div>
                                ) : (
                                    <div className="w-[250px] h-[250px] bg-slate-50 animate-pulse rounded-xl" />
                                )}
                                <div className="absolute -top-3 -right-3 w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                                    {countdown}s
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center justify-center gap-2">
                                    <RefreshCw size={18} className="text-blue-500 animate-spin-slow" />
                                    Dynamic Security Active
                                </h3>
                                <p className="text-sm text-slate-500">QR token refreshes every 30 seconds to prevent fraudulent scans.</p>
                            </div>

                            <div className="flex gap-3 justify-center">
                                <button onClick={stopAttendance} className="px-6 py-2.5 bg-rose-50 text-rose-600 rounded-xl font-bold text-sm border border-rose-100 hover:bg-rose-100 transition-colors flex items-center gap-2">
                                    <Square size={16} /> Stop Attendance
                                </button>
                                <button className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors flex items-center gap-2">
                                    <Download size={16} /> Save QR
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Status & Info */}
                <div className="space-y-6">
                    <div className="card p-6 border-l-4 border-l-blue-500">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Live Status</h4>
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">{isActive ? "Flowing" : "Stopped"}</p>
                                    <p className="text-xs text-slate-500">Attendance State</p>
                                </div>
                            </div>

                            {isActive && (
                                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100/50">
                                    <p className="text-2xl font-black text-blue-700 tabular-nums">
                                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                    </p>
                                    <p className="text-xs font-bold text-blue-600 uppercase tracking-tighter mt-1">Time Remaining</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="card p-6 grayscale">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Meeting Details</h4>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm font-bold text-slate-800">{meeting.date}</p>
                                <p className="text-xs text-slate-500">Scheduled Date</p>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">{meeting.startTime}</p>
                                <p className="text-xs text-slate-500">Start Time</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg text-center text-xs text-slate-400 font-mono">
                                ID: {id}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MeetingQR;
