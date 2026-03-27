import React, { useState, useEffect } from "react";
import { collection, query, addDoc, serverTimestamp, onSnapshot, orderBy, deleteDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "../../../firebase/firebaseConfig";
import toast from "react-hot-toast";
import { Bell, Send, Trash2 } from "lucide-react";

interface NotificationForm {
    title: string;
    body: string;
    type: string;
}

interface Notification {
    id: string;
    title: string;
    body: string;
    type: string;
    sentAt: any;
    target?: string;
}

const NOTIFICATION_TYPES = [
    { value: "meeting", label: "📅 Meeting Alert", color: "bg-slate-100 text-[#000080]" },
    { value: "payment", label: "💳 Payment Reminder", color: "bg-amber-100 text-amber-700" },
    { value: "block", label: "🚫 Block Notice", color: "bg-red-100 text-red-700" },
    { value: "emergency", label: "🚨 Emergency Update", color: "bg-rose-100 text-rose-700" },
    { value: "general", label: "📢 General Announcement", color: "bg-slate-100 text-slate-700" },
];

const SendNotification: React.FC = () => {
    const [form, setForm] = useState<NotificationForm>({ title: "", body: "", type: "general" });
    const [sending, setSending] = useState<boolean>(false);
    const [sent, setSent] = useState<Notification[]>([]);

    // Load sent notifications
    useEffect(() => {
        const q = query(collection(db, "notifications"), orderBy("sentAt", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            setSent(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)).slice(0, 20));
        });
        return unsub;
    }, []);

    const handleSend = async (e: React.FormEvent) => {
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
        } catch (err: any) {
            console.error("Failed to send notification:", err);
            toast.error("Failed to send notification");
        }
        finally { setSending(false); }
    };

    const deleteNotification = async (id: string) => {
        if (!window.confirm("Delete this notification?")) return;
        try {
            await deleteDoc(doc(db, "notifications", id));
            toast.success("Notification deleted successfully");
        } catch (err: any) {
            console.error("[deleteNotification] Error:", err);
            toast.error(`Failed to delete notification: ${err.message || 'Permission denied'}`);
        }
    };

    const handleClearAll = async () => {
        if (sent.length === 0) return;
        if (!window.confirm(`Are you sure you want to clear all ${sent.length} notifications? This cannot be undone.`)) return;

        setSending(true);
        try {
            const batch = writeBatch(db);
            sent.forEach((n) => {
                batch.delete(doc(db, "notifications", n.id));
            });
            await batch.commit();
            toast.success("All notifications cleared!");
        } catch (err: any) {
            console.error("[handleClearAll] Error:", err);
            toast.error("Failed to clear notifications");
        } finally {
            setSending(false);
        }
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
                                        className={`text-xs px-3 py-1.5 rounded-full font-medium border-2 transition-all ${form.type === t.value ? "border-[#000080] " + t.color : "border-slate-200 bg-slate-50 text-slate-600"}`}>
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
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <Bell size={16} /> Recent Notifications
                        </h2>
                        {sent.length > 0 && (
                            <button 
                                onClick={handleClearAll}
                                disabled={sending}
                                className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-widest px-2 py-1 rounded-lg hover:bg-red-50 transition-all disabled:opacity-50"
                            >
                                Clear All
                            </button>
                        )}
                    </div>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                        {sent.map(n => {
                            const t = NOTIFICATION_TYPES.find(x => x.value === n.type) || NOTIFICATION_TYPES[4];
                            return (
                                <div key={n.id} className={`p-3 rounded-xl ${t.color} border border-current/10 relative group`}>
                                    <p className="font-semibold text-sm pr-8">{n.title}</p>
                                    <p className="text-xs mt-0.5 opacity-80">{n.body}</p>
                                    <p className="text-xs opacity-50 mt-1.5">
                                        {n.sentAt?.toDate?.().toLocaleString("en-IN") || "Just now"}
                                    </p>
                                    <button
                                        onClick={() => deleteNotification(n.id)}
                                        className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/50 text-red-500 hover:bg-red-50 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"
                                        title="Delete notification"
                                    >
                                        <Trash2 size={14} />
                                    </button>
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
