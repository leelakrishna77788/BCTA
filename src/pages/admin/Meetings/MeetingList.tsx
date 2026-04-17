import React, { useEffect, useState } from "react";
import { Plus, CalendarDays, MapPin, Clock, Users, QrCode, Loader2, AlertCircle, RefreshCw, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../firebase/firebaseConfig";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, deleteDoc, Timestamp } from "firebase/firestore";

interface Meeting {
    id: string;
    topic: string;
    description?: string;
    date: string;
    startTime: string;
    endTime?: string;
    location?: string;
    gpsLink?: string;
    qrDuration?: number;
    status: "upcoming" | "active" | "expired" | string;
    meetingStartUTC?: any;
    meetingEndUTC?: any;
    createdAt?: any;
    attendanceCount?: number;
    createdBy?: string;
}

interface MeetingForm {
    topic: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    gpsLink: string;
    qrDuration: string;
}

const MeetingList: React.FC = () => {
    const { userRole } = useAuth();
    const normalizedRole = userRole?.toLowerCase().trim() || "";
    const isAdmin = normalizedRole === "admin" || normalizedRole === "superadmin";
    
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState<MeetingForm>({
        topic: "", description: "", date: "", startTime: "", endTime: "",
        location: "", gpsLink: "", qrDuration: "30"
    });

    useEffect(() => {
        setLoading(true);
        console.log(`[MeetingList] Subscribing to meetings (Role: ${normalizedRole})`);
        
        const meetingsRef = collection(db, "meetings");
        const q = query(meetingsRef, orderBy("createdAt", "desc"));

        const unsubscribe = onSnapshot(q, 
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Meeting[];
                console.log(`[MeetingList] Fetched ${data.length} meetings`);
                setMeetings(data);
                setLoading(false);
                setError(null);
            }, 
            (err: any) => {
                console.error("[MeetingList] Firestore Subscription Error:", err);
                setError(err.message || "Failed to load meetings");
                setLoading(false);
                if (err.code === 'permission-denied') {
                    toast.error("Access Denied: Check Firebase Permissions");
                }
            }
        );

        return () => unsubscribe();
    }, [normalizedRole]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.topic || !form.date || !form.startTime) {
            toast.error("Please fill all required fields");
            return;
        }

        setSubmitting(true);
        try {
            const [year, month, day] = form.date.split('-').map(Number);
            const [startH, startM] = form.startTime.split(':').map(Number);
            const meetingStart = new Date(year, month - 1, day, startH, startM);
            
            let meetingEnd: Date;
            if (form.endTime) {
                const [endH, endM] = form.endTime.split(':').map(Number);
                meetingEnd = new Date(year, month - 1, day, endH, endM);
                if (meetingEnd <= meetingStart) {
                    toast.error("End time must be after start time");
                    setSubmitting(false);
                    return;
                }
            } else {
                meetingEnd = new Date(meetingStart.getTime() + 4 * 60 * 60 * 1000); // 4 hours default
            }

            const meetingData = {
                topic: form.topic.trim(),
                description: form.description?.trim() || "",
                date: form.date,
                startTime: form.startTime,
                endTime: form.endTime || "",
                location: form.location?.trim() || "",
                gpsLink: form.gpsLink?.trim() || "",
                qrDuration: parseInt(form.qrDuration || "30"),
                status: "upcoming",
                meetingStartUTC: Timestamp.fromDate(meetingStart),
                meetingEndUTC: Timestamp.fromDate(meetingEnd),
                createdAt: serverTimestamp(),
                attendanceCount: 0,
                createdBy: "admin"
            };

            await addDoc(collection(db, "meetings"), meetingData);
            toast.success("Meeting created successfully!");
            setShowForm(false);
            setForm({
                topic: "", description: "", date: "", startTime: "", endTime: "",
                location: "", gpsLink: "", qrDuration: "30"
            });
        } catch (err: any) {
            console.error("[MeetingList] Create Error:", err);
            const errorMsg = err.code === 'permission-denied' 
                ? "Permission denied. Check Firestore rules." 
                : "Failed to create meeting";
            toast.error(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string, topic: string) => {
        if (!window.confirm(`Are you sure you want to delete the meeting: "${topic}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await deleteDoc(doc(db, "meetings", id));
            toast.success("Meeting deleted successfully");
        } catch (err: any) {
            console.error("[MeetingList] Delete Error:", err);
            toast.error(err.code === 'permission-denied' 
                ? "Permission denied to delete meeting." 
                : "Failed to delete meeting");
        }
    };

    const getMeetingTimeStatus = (m: Meeting) => {
        if (!m.date || !m.startTime) return "unknown";
        
        const now = new Date();
        
        let meetingStart: Date;
        let meetingEnd: Date;

        if (m.meetingStartUTC && m.meetingEndUTC) {
            meetingStart = m.meetingStartUTC instanceof Timestamp 
                ? m.meetingStartUTC.toDate() 
                : new Date((m.meetingStartUTC as any).seconds ? (m.meetingStartUTC as any).seconds * 1000 : m.meetingStartUTC);
            meetingEnd = m.meetingEndUTC instanceof Timestamp 
                ? m.meetingEndUTC.toDate() 
                : new Date((m.meetingEndUTC as any).seconds ? (m.meetingEndUTC as any).seconds * 1000 : m.meetingEndUTC);
        } else {
            const [year, month, day] = m.date.split('-').map(Number);
            const [startH, startM] = m.startTime.split(':').map(Number);
            meetingStart = new Date(year, month - 1, day, startH, startM);
            
            if (m.endTime) {
                const [endH, endM] = m.endTime.split(':').map(Number);
                meetingEnd = new Date(year, month - 1, day, endH, endM);
            } else {
                meetingEnd = new Date(meetingStart.getTime() + 4 * 60 * 60 * 1000); // 4h default
            }
        }

        if (m.status === "active") return "live";
        if (now < meetingStart) return m.status === "expired" ? "expired" : "scheduled";
        if (now >= meetingStart && now <= meetingEnd) return m.status === "expired" ? "expired" : "ready";
        return "past";
    };

    const statusColor = (status: string) => {
        const colors: Record<string, string> = {
            live: "bg-emerald-100 text-emerald-700 border-emerald-200",
            ready: "bg-indigo-100 text-indigo-700 border-indigo-200 animate-pulse",
            scheduled: "bg-slate-100 text-slate-600 border-slate-200",
            past: "bg-amber-100 text-amber-700 border-amber-200",
            expired: "bg-rose-100 text-rose-700 border-rose-200",
            active: "bg-emerald-100 text-emerald-700 border-emerald-200",
            upcoming: "bg-slate-100 text-slate-600 border-slate-200"
        };
        return `px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${colors[status] || "bg-slate-100 text-slate-600 border-slate-200"}`;
    };

    if (loading && meetings.length === 0) {
        return (
            <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-[#4f46e5]" />
                <p className="font-medium animate-pulse">Loading meetings list...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Meetings & Sessions</h1>
                    <p className="text-slate-500 text-sm font-medium">
                        {isAdmin ? "Manage and create committee meetings" : "View your upcoming BCTA meetings"}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {isAdmin && (
                        <Link 
                            to="/admin/meetings/attendance/all"
                            className="btn-secondary flex items-center gap-2"
                        >
                            <Users size={18} />
                            <span className="hidden sm:inline">Global Attendance</span>
                        </Link>
                    )}
                    {isAdmin && (
                        <button 
                            onClick={() => setShowForm(!showForm)} 
                            className="btn-primary"
                        >
                            <Plus size={18} /> 
                            <span className="hidden sm:inline">Create Meeting</span>
                            <span className="sm:hidden">New</span>
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-6 flex flex-col items-center gap-4 text-center">
                    <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center">
                        <AlertCircle className="text-rose-600 w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-rose-900 font-bold">Access Issue Detected</h3>
                        <p className="text-rose-600/80 text-sm mt-1 max-w-md">{error}</p>
                    </div>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="btn-secondary text-rose-700 border-rose-200 hover:bg-rose-100/50"
                    >
                        <RefreshCw size={16} /> Force Reload
                    </button>
                </div>
            )}

            {/* Create Form */}
            {showForm && (
                <div className="card border-slate-200 bg-slate-50/50 animate-fade-in">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 bg-[#4f46e5] rounded-lg flex items-center justify-center text-white">
                            <Plus size={18} />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Create New Meeting</h2>
                    </div>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="label">Meeting Topic*</label>
                            <input value={form.topic} onChange={e => setForm(p => ({ ...p, topic: e.target.value }))}
                                required placeholder="e.g., Monthly General Body Meeting" className="input-field" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="label">Agenda / Description</label>
                            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                rows={3} className="input-field resize-none" placeholder="What will be discussed?" />
                        </div>
                        <div>
                            <label className="label">Meeting Date*</label>
                            <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                                required className="input-field" />
                        </div>
                        <div>
                            <label className="label">QR Logic Mode</label>
                            <select value={form.qrDuration} onChange={e => setForm(p => ({ ...p, qrDuration: e.target.value }))}
                                className="input-field">
                                <option value="30">30 minutes auto-expire</option>
                                <option value="60">1 hour auto-expire</option>
                                <option value="120">2 hours auto-expire</option>
                                <option value="0">Manual End Only</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Start Time*</label>
                            <input type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
                                required className="input-field" />
                        </div>
                        <div>
                            <label className="label">End Time (Estimated)</label>
                            <input type="time" value={form.endTime} onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))}
                                className="input-field" />
                        </div>
                        <div>
                            <label className="label">Venue / Location</label>
                            <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                                placeholder="Meeting hall name" className="input-field" />
                        </div>
                        <div>
                            <label className="label">Google Maps Link</label>
                            <input value={form.gpsLink} onChange={e => setForm(p => ({ ...p, gpsLink: e.target.value }))}
                                placeholder="https://maps.google.com/..." className="input-field" />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-3 pt-4">
                            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                            <button type="submit" disabled={submitting} className="btn-primary min-w-[140px]">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Session"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Meetings List */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {meetings.map(m => (
                    <div key={m.id} className="card group hover:border-slate-300 hover:shadow-lg transition-all duration-300">
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-slate-100 group-hover:text-[#4f46e5] transition-colors">
                                <CalendarDays size={24} />
                            </div>
                            <div className="flex gap-2">
                                <span className={statusColor(getMeetingTimeStatus(m))}>
                                    {getMeetingTimeStatus(m)}
                                </span>
                                {isAdmin && (
                                    <button 
                                        onClick={(e) => { e.preventDefault(); handleDelete(m.id, m.topic); }}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                        title="Delete Meeting"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        <h3 className="font-bold text-slate-900 group-hover:text-[#4f46e5] transition-colors mb-2 leading-tight">
                            {m.topic}
                        </h3>
                        {m.description && (
                                <p className="text-sm text-slate-500 line-clamp-2 mb-4 font-medium">
                                {m.description}
                            </p>
                        )}
                        
                        <div className="space-y-2.5 pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-3 text-slate-600 text-sm font-medium">
                                <CalendarDays size={16} className="text-slate-400" />
                                {new Date(m.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                            <div className="flex items-center gap-3 text-slate-600 text-sm font-medium">
                                <Clock size={16} className="text-slate-400" />
                                {m.startTime} {m.endTime ? `– ${m.endTime}` : '(TBD)'}
                            </div>
                            {m.location && (
                                <div className="flex items-center gap-3 text-slate-600 text-sm font-medium">
                                    <MapPin size={16} className="text-slate-400" />
                                    <span className="truncate">{m.location}</span>
                                </div>
                            )}
                        </div>

                        {isAdmin ? (
                            <div className="mt-6 flex gap-3">
                                {(() => {
                                    const status = getMeetingTimeStatus(m);
                                    const isWorkable = status !== "past" && status !== "expired";
                                    return isWorkable ? (
                                        <Link to={`/admin/meetings/${m.id}`}
                                            className="flex-1 btn-primary text-xs h-10 px-0 flex justify-center items-center">
                                            <QrCode size={14} className="mr-1" /> Manage QR
                                        </Link>
                                    ) : (
                                        <button disabled
                                            className="flex-1 bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed text-xs h-10 px-0 flex justify-center items-center rounded-xl font-bold">
                                            <Clock size={14} className="mr-1" /> Session Locked
                                        </button>
                                    );
                                })()}
                                <Link to={`/admin/meetings/${m.id}/attendance`}
                                    className="flex-1 btn-secondary text-xs h-10 px-0 flex justify-center items-center transition-all">
                                    <Users size={14} className="mr-1" /> Stats
                                </Link>
                            </div>
                        ) : (
                            <div className="mt-6">
                                {(() => {
                                    const status = getMeetingTimeStatus(m);
                                    const isWorkable = status !== "past" && status !== "expired";
                                    return isWorkable ? (
                                        <Link to="/member/scan" className="btn-primary w-full h-11 text-sm font-bold shadow-lg shadow-slate-200 active:scale-95 transition-transform flex justify-center items-center px-4 py-2 rounded-xl">
                                            <QrCode size={18} className="mr-1" /> Mark Attendance
                                        </Link>
                                    ) : (
                                        <button disabled className="w-full h-11 bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed text-sm font-bold flex justify-center items-center rounded-xl opacity-75">
                                            <Clock size={18} className="mr-1" /> Session Ended
                                        </button>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                ))}
                
                {!loading && meetings.length === 0 && !error && (
                    <div className="md:col-span-2 xl:col-span-3 card border-dashed border-2 border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <CalendarDays className="text-slate-300 w-8 h-8" />
                        </div>
                        <h3 className="text-slate-900 font-bold text-lg">No meetings scheduled</h3>
                        <p className="text-slate-500 text-sm mt-1 max-w-xs">
                            {isAdmin ? "Click 'Create Meeting' above to start your first session." : "There are currently no upcoming committee meetings."}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MeetingList;
