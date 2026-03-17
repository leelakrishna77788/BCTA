import React, { useState, useEffect } from "react";
import { collection, query, addDoc, serverTimestamp, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import toast from "react-hot-toast";
import { Bell, Send } from "lucide-react";

const NOTIFICATION_TYPES = [
    { value: "meeting", label: "📅 Meeting Alert", color: "bg-blue-100 text-blue-700" },
    { value: "payment", label: "💳 Payment Reminder", color: "bg-amber-100 text-amber-700" },
    { value: "block", label: "🚫 Block Notice", color: "bg-red-100 text-red-700" },
    { value: "emergency", label: "🚨 Emergency Update", color: "bg-rose-100 text-rose-700" },
    { value: "general", label: "📢 General Announcement", color: "bg-slate-100 text-slate-700" },
];

const SendNotification = () => {
    const [form, setForm] = useState({ title: "", body: "", type: "general" });
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState([]);

    // Load sent notifications
    useEffect(() => {
        const q = query(collection(db, "notifications"), orderBy("sentAt", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            setSent(snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 20));
        });
        return unsub;
    }, []);

    const handleSend = async (e) => {
        e.preventDefault();
        setSending(true);
        try {
            await addDoc(collection(db, "notifications"), {
                ...form,
                sentAt: serverTimestamp(),
                target: "all"
            });
            toast.success("Notification sent to all members!");
            setForm({ title: "", body: "", type: "general" });
        } catch (err) {
            console.error("Failed to send notification:", err);
            toast.error("Failed to send notification");
        }
        finally { setSending(false); }
    };

    const selectedType = NOTIFICATION_TYPES.find(t => t.value === form.type);

    return (
        <div className="space-y-5 animate-fade-in">
            <div>
                <h1 className="page-title mb-0">Send Notification</h1>
                <p className="text-slate-500 text-sm">Broadcast messages to all members</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Send Form */}
                <div className="card">
                    <form onSubmit={handleSend} className="space-y-4">
                        <div>
                            <label className="label">Notification Type</label>
                            <div className="flex flex-wrap gap-2">
                                {NOTIFICATION_TYPES.map(t => (
                                    <button key={t.value} type="button"
                                        onClick={() => setForm(p => ({ ...p, type: t.value }))}
                                        className={`text-xs px-3 py-1.5 rounded-full font-medium border-2 transition-all ${form.type === t.value ? "border-blue-500 " + t.color : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="label">Title*</label>
                            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                                required placeholder="Notification title" className="input-field" />
                        </div>

                        <div>
                            <label className="label">Message*</label>
                            <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                                required rows={4} placeholder="Write your message..." className="input-field resize-none" />
                        </div>

                        {/* Preview */}
                        {form.title && (
                            <div className={`p-3 rounded-xl ${selectedType?.color || "bg-slate-100"} border border-slate-200`}>
                                <p className="text-xs font-semibold uppercase mb-1 opacity-60">Preview</p>
                                <p className="font-semibold text-sm">{form.title}</p>
                                <p className="text-xs mt-0.5 opacity-80">{form.body}</p>
                            </div>
                        )}

                        <button type="submit" disabled={sending} className="btn-primary w-full flex items-center justify-center gap-2">
                            <Send size={16} /> {sending ? "Sending..." : "Send to All Members"}
                        </button>
                    </form>
                </div>

                {/* Notification History */}
                <div className="card">
                    <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                        <Bell size={16} /> Recent Notifications
                    </h2>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                        {sent.map(n => {
                            const t = NOTIFICATION_TYPES.find(x => x.value === n.type) || NOTIFICATION_TYPES[4];
                            return (
                                <div key={n.id} className={`p-3 rounded-xl ${t.color} border border-current/10`}>
                                    <p className="font-semibold text-sm">{n.title}</p>
                                    <p className="text-xs mt-0.5 opacity-80">{n.body}</p>
                                    <p className="text-xs opacity-50 mt-1.5">
                                        {n.sentAt?.toDate?.().toLocaleString("en-IN") || "Just now"}
                                    </p>
                                </div>
                            );
                        })}
                        {sent.length === 0 && (
                            <p className="text-slate-400 text-sm text-center py-10">No notifications sent yet</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SendNotification;
