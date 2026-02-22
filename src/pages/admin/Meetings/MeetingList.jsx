import React, { useEffect, useState } from "react";
import {
    collection, query, orderBy, onSnapshot
} from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { Plus, CalendarDays, MapPin, Clock, Users, QrCode, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { meetingsApi } from "../../../services/api";
import { useAuth } from "../../../context/AuthContext";

const MeetingList = () => {
    const { userRole } = useAuth();
    const isAdmin = userRole === "admin" || userRole === "superadmin";
    const [meetings, setMeetings] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        topic: "", description: "", date: "", startTime: "", endTime: "",
        location: "", gpsLink: "", qrDuration: "30"
    });

    useEffect(() => {
        const unsub = onSnapshot(
            query(collection(db, "meetings"), orderBy("createdAt", "desc")),
            snap => { setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }
        );
        return unsub;
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await meetingsApi.create(form);
            toast.success("Meeting created successfully via API!");
            setShowForm(false);
            setForm({ topic: "", description: "", date: "", startTime: "", endTime: "", location: "", gpsLink: "", qrDuration: "30" });
        } catch (err) {
            toast.error(err.message || "Failed to create meeting");
        }
        finally { setSubmitting(false); }
    };

    const statusColor = (status) => ({
        active: "badge-active", upcoming: "badge-pending", expired: "badge-blocked"
    })[status] || "badge-pending";

    return (
        <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title mb-0">Committee Meetings</h1>
                    <p className="text-slate-500 text-sm">{meetings.length} meetings total</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className={`btn-primary flex items-center gap-2 ${isAdmin ? "" : "hidden"}`}>
                    <Plus size={16} /> Create Meeting
                </button>
            </div>

            {/* Create Form */}
            {showForm && (
                <div className="card animate-fade-in">
                    <h2 className="text-base font-semibold text-slate-700 mb-4">New Meeting Details</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="label">Topic*</label>
                                <input value={form.topic} onChange={e => setForm(p => ({ ...p, topic: e.target.value }))}
                                    required placeholder="Meeting topic" className="input-field" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="label">Description</label>
                                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                    rows={2} className="input-field resize-none" placeholder="Agenda / notes..." />
                            </div>
                            <div>
                                <label className="label">Date*</label>
                                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                                    required className="input-field" />
                            </div>
                            <div>
                                <label className="label">QR Active Duration</label>
                                <select value={form.qrDuration} onChange={e => setForm(p => ({ ...p, qrDuration: e.target.value }))}
                                    className="input-field">
                                    <option value="30">30 minutes</option>
                                    <option value="60">1 hour</option>
                                    <option value="90">90 minutes</option>
                                    <option value="120">2 hours</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Start Time*</label>
                                <input type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
                                    required className="input-field" />
                            </div>
                            <div>
                                <label className="label">End Time</label>
                                <input type="time" value={form.endTime} onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))}
                                    className="input-field" />
                            </div>
                            <div>
                                <label className="label">Location</label>
                                <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                                    placeholder="Venue name" className="input-field" />
                            </div>
                            <div>
                                <label className="label">GPS Map Link</label>
                                <input value={form.gpsLink} onChange={e => setForm(p => ({ ...p, gpsLink: e.target.value }))}
                                    placeholder="https://maps.google.com/..." className="input-field" />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                            <button type="submit" disabled={submitting} className="btn-primary">
                                {submitting ? "Creating..." : "Create Meeting"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Meetings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {meetings.map(m => (
                    <div key={m.id} className="card hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <CalendarDays size={18} className="text-blue-600" />
                            </div>
                            <span className={statusColor(m.status)}>{m.status}</span>
                        </div>
                        <h3 className="font-semibold text-slate-800 mb-1">{m.topic}</h3>
                        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{m.description}</p>
                        <div className="space-y-1.5 text-xs text-slate-500">
                            <div className="flex items-center gap-1.5">
                                <CalendarDays size={12} />
                                {m.date?.toDate ? m.date.toDate().toLocaleDateString("en-IN") : "—"}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock size={12} />
                                {m.startTime} – {m.endTime || "TBD"}
                            </div>
                            {m.location && <div className="flex items-center gap-1.5"><MapPin size={12} />{m.location}</div>}
                        </div>
                        {isAdmin && (
                            <div className="mt-4 flex gap-2">
                                <Link to={`/admin/meetings/${m.id}`}
                                    className="flex-1 btn-primary text-xs py-1.5 text-center flex items-center justify-center gap-1">
                                    <QrCode size={13} /> Manage QR
                                </Link>
                                <Link to={`/admin/meetings/${m.id}/attendance`}
                                    className="flex-1 btn-secondary text-xs py-1.5 text-center flex items-center justify-center gap-1">
                                    <Users size={13} /> Attendance
                                </Link>
                            </div>
                        )}
                        {!isAdmin && (
                            <div className="mt-4 pt-3 border-t border-slate-100">
                                <Link to="/member/scan" className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-2">
                                    <QrCode size={14} /> Scan to Attend
                                </Link>
                            </div>
                        )}
                    </div>
                ))}
                {!loading && meetings.length === 0 && (
                    <div className="card md:col-span-2 xl:col-span-3 text-center text-slate-400 py-16">
                        No meetings created yet. Click "Create Meeting" to get started.
                    </div>
                )}
            </div>
        </div>
    );
};

export default MeetingList;
