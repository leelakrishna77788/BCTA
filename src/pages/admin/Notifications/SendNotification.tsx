import React, { useState, useEffect } from "react";
import {
    collection,
    query,
    addDoc,
    serverTimestamp,
    onSnapshot,
    orderBy,
    deleteDoc,
    doc,
    writeBatch,
} from "firebase/firestore";
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
    {
        value: "meeting",
        label: "📅 Meeting Alert",
        color: "bg-slate-100 text-[#4f46e5]",
    },
    {
        value: "payment",
        label: "💳 Payment Reminder",
        color: "bg-amber-100 text-amber-700",
    },
    {
        value: "block",
        label: "🚫 Block Notice",
        color: "bg-red-100 text-red-700",
    },
    {
        value: "emergency",
        label: "🚨 Emergency Update",
        color: "bg-rose-100 text-rose-700",
    },
    {
        value: "general",
        label: "📢 General Announcement",
        color: "bg-slate-100 text-slate-700",
    },
];

const SendNotification: React.FC = () => {
    const [form, setForm] = useState<NotificationForm>({
        title: "",
        body: "",
        type: "",
    });
    const [sending, setSending] = useState<boolean>(false);
    const [sent, setSent] = useState<Notification[]>([]);

    // Load sent notifications
    useEffect(() => {
        const q = query(collection(db, "notifications"), orderBy("sentAt", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            setSent(
                snap.docs
                    .map((d) => ({ id: d.id, ...d.data() }) as Notification)
                    .slice(0, 20),
            );
        });
        return unsub;
    }, []);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.type) {
            toast.error("Please select a notification category");
            return;
        }
        setSending(true);
        try {
            await addDoc(collection(db, "notifications"), {
                ...form,
                sentAt: serverTimestamp(),
                target: "all",
            });
            toast.success("Notification sent to all members!");
            setForm({ title: "", body: "", type: "" });
        } catch (err: any) {
            console.error("Failed to send notification:", err);
            toast.error("Failed to send notification");
        } finally {
            setSending(false);
        }
    };

    const deleteNotification = async (id: string) => {
        if (!window.confirm("Delete this notification?")) return;
        try {
            await deleteDoc(doc(db, "notifications", id));
            toast.success("Notification deleted successfully");
        } catch (err: any) {
            console.error("[deleteNotification] Error:", err);
            toast.error(
                `Failed to delete notification: ${err.message || "Permission denied"}`,
            );
        }
    };

    const handleClearAll = async () => {
        if (sent.length === 0) return;
        if (
            !window.confirm(
                `Are you sure you want to clear all ${sent.length} notifications? This cannot be undone.`,
            )
        )
            return;

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

    const selectedType = NOTIFICATION_TYPES.find((t) => t.value === form.type);

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div>
                <h1 className="page-title mb-1 text-3xl sm:text-4xl">Notifications</h1>
                <p className="text-slate-500 font-medium text-sm tracking-tight">
                    Broadcast platform-wide alerts and updates
                </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                {/* Send Form - Spans 3 columns on xl */}
                <div
                    className="xl:col-span-3 glass-card rounded-2xl sm:rounded-3xl border border-white/40 p-6 sm:p-10 premium-shadow flex flex-col h-full"
                    style={{ background: "rgba(255, 255, 255, 0.7)" }}
                >
                    <form
                        onSubmit={handleSend}
                        className="space-y-6 flex flex-col flex-1"
                    >
                        <div className="flex-1 space-y-6">
                            <div>
                                <label className="label text-[10px] font-black uppercase tracking-[0.2em] mb-4 block">
                                    Select Category
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                    {NOTIFICATION_TYPES.map((t) => (
                                        <button
                                            key={t.value}
                                            type="button"
                                            onClick={() => setForm((p) => ({ ...p, type: t.value }))}
                                            className={`text-xs px-4 py-2.5 rounded-xl font-black uppercase tracking-widest border transition-all duration-300 ${form.type === t.value ? "border-indigo-200 shadow-lg " + t.color + " scale-105" : "border-slate-100 bg-white/50 text-slate-400 hover:text-indigo-600 shadow-sm"}`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <label className="label text-[10px] font-black uppercase tracking-[0.2em] mb-2 block">
                                        Heading*
                                    </label>
                                    <input
                                        value={form.title}
                                        onChange={(e) =>
                                            setForm((p) => ({ ...p, title: e.target.value }))
                                        }
                                        required
                                        placeholder="What is this about?"
                                        className="input-field rounded-2xl bg-white/50 border-slate-200/50 focus:bg-white transition-all py-4"
                                    />
                                </div>

                                <div>
                                    <label className="label text-[10px] font-black uppercase tracking-[0.2em] mb-2 block">
                                        Content*
                                    </label>
                                    <textarea
                                        value={form.body}
                                        onChange={(e) =>
                                            setForm((p) => ({ ...p, body: e.target.value }))
                                        }
                                        required
                                        rows={5}
                                        placeholder="Write the main message here..."
                                        className="input-field rounded-2xl bg-white/50 border-slate-200/50 focus:bg-white transition-all py-4 resize-none"
                                    />
                                </div>
                            </div>

                            {/* Preview */}
                            {form.title && (
                                <div
                                    className="p-6 rounded-2xl border border-dashed transition-all duration-500 opacity-100 translate-y-0"
                                    style={{
                                        borderColor: selectedType?.color.split(" ")[1] || "#e2e8f0",
                                        background: "rgba(255,255,255,0.4)",
                                    }}
                                >
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-3 text-slate-400">
                                        Live Preview
                                    </p>
                                    <div
                                        className={`p-4 rounded-xl shadow-sm border ${selectedType?.color || "bg-slate-100"} border-white/40`}
                                    >
                                        <p className="font-black text-sm tracking-tight">
                                            {form.title}
                                        </p>
                                        <p className="text-xs mt-1 font-medium opacity-80 leading-relaxed">
                                            {form.body || "Message body will appear here..."}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={sending}
                            className="group w-full py-5 rounded-2xl text-white font-black uppercase tracking-widest transition-all duration-500 hover:shadow-[0_20px_50px_rgba(99,102,241,0.4)] hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 mt-auto"
                            style={{ background: "var(--gradient-primary)" }}
                        >
                            <Send
                                size={18}
                                className="transition-transform group-hover:translate-x-1"
                            />
                            {sending ? "Processing..." : "Broadcast to All"}
                        </button>
                    </form>
                </div>

                {/* History - Spans 2 columns on xl */}
                <div
                    className="xl:col-span-2 glass-card rounded-2xl sm:rounded-3xl border border-white/40 overflow-hidden flex flex-col premium-shadow"
                    style={{ background: "rgba(255, 255, 255, 0.6)" }}
                >
                    <div className="flex items-center justify-between p-6 sm:p-8 border-b border-white/30">
                        <h2 className="text-base font-black text-slate-900 flex items-center gap-3 tracking-tight">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm">
                                <Bell size={18} />
                            </div>
                            Feed History
                        </h2>
                        {sent.length > 0 && (
                            <button
                                onClick={handleClearAll}
                                disabled={sending}
                                className="text-[10px] font-black text-rose-500 hover:bg-rose-500 hover:text-white uppercase tracking-[0.15em] px-4 py-2 rounded-xl transition-all border border-rose-100 disabled:opacity-50"
                            >
                                Clear all
                            </button>
                        )}
                    </div>
                    <div className="flex-1 p-6 sm:p-8 space-y-4 overflow-y-auto min-h-[400px] xl:max-h-none max-h-[600px] scrollbar-hide">
                        {sent.map((n, i) => {
                            const t =
                                NOTIFICATION_TYPES.find((x) => x.value === n.type) ||
                                NOTIFICATION_TYPES[4];
                            return (
                                <div
                                    key={n.id}
                                    className="relative group/notif animate-slide-up"
                                    style={{ animationDelay: `${i * 0.05}s` }}
                                >
                                    <div
                                        className={`p-5 rounded-2xl border transition-all duration-300 hover:bg-white/80 ${t.color.split(" ")[1]} ${t.color.split(" ")[0]} border-white/60 relative premium-shadow`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="font-black text-[15px] pr-8 tracking-tight leading-tight">
                                                {n.title}
                                            </p>
                                            <button
                                                onClick={() => deleteNotification(n.id)}
                                                className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-white text-red-500 hover:bg-red-50 hover:text-red-600 transition-all shadow-sm"
                                                title="Delete"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                        <p className="text-[13px] font-medium opacity-80 leading-relaxed mb-4">
                                            {n.body}
                                        </p>
                                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-auto pt-3 border-t border-white/20">
                                            <span className="bg-white/50 px-2.5 py-1 rounded-lg">
                                                🕒{" "}
                                                {n.sentAt?.toDate?.().toLocaleDateString("en-IN") ||
                                                    "Online"}
                                            </span>
                                            <span className="bg-white/50 px-2.5 py-1 rounded-lg">
                                                Target: {n.target || "All"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {sent.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 opacity-30">
                                <Bell size={48} className="mb-4" />
                                <p className="text-sm font-black uppercase tracking-widest">
                                    No sent logs
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SendNotification;
