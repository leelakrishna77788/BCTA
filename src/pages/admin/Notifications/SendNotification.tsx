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
import { db, auth } from "../../../firebase/firebaseConfig";
import toast from "react-hot-toast";
import axios from "axios";
import { Bell, Send, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

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
        color: "bg-slate-100 text-[#4f46e5]",
    },
    {
        value: "payment",
        color: "bg-amber-100 text-amber-700",
    },
    {
        value: "block",
        color: "bg-red-100 text-red-700",
    },
    {
        value: "emergency",
        color: "bg-rose-100 text-rose-700",
    },
    {
        value: "general",
        color: "bg-slate-100 text-slate-700",
    },
];

const SendNotification: React.FC = () => {
    const { t, i18n } = useTranslation();
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
            toast.error(t("notifications.toasts.categoryRequired"));
            return;
        }
        setSending(true);
        try {
            await addDoc(collection(db, "notifications"), {
                ...form,
                sentAt: serverTimestamp(),
                target: "all",
            });

            // FCM Broadcast via API
            try {
                const idToken = await auth.currentUser?.getIdToken();
                if (idToken) {
                    await axios.post('/api/admin', {
                        action: 'broadcastNotification',
                        title: form.title,
                        body: form.body,
                        data: { url: '/member/notifications' }
                    }, {
                        headers: { Authorization: `Bearer ${idToken}` }
                    });
                    console.log("[SendNotification] Push broadcast triggered successfully");
                }
            } catch (fcmErr) {
                console.error("[SendNotification] Push broadcast failed:", fcmErr);
                // We don't block the UI as Firestore doc is already added
            }

            toast.success(t("notifications.toasts.sent"));
            setForm({ title: "", body: "", type: "" });
        } catch (err: any) {
            console.error("Failed to send notification:", err);
            toast.error(t("notifications.toasts.error"));
        } finally {
            setSending(false);
        }
    };

    const deleteNotification = async (id: string) => {
        if (!window.confirm(t("notifications.history.deleteConfirm"))) return;
        try {
            await deleteDoc(doc(db, "notifications", id));
            toast.success(t("notifications.toasts.deleted"));
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
                t("notifications.history.clearAllConfirm", { count: sent.length })
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
            toast.success(t("notifications.toasts.cleared"));
        } catch (err: any) {
            console.error("[handleClearAll] Error:", err);
            toast.error(t("notifications.toasts.error"));
        } finally {
            setSending(false);
        }
    };

    const selectedType = NOTIFICATION_TYPES.find((t) => t.value === form.type);

    return (
        <div className="space-y-0 animate-fade-in pt-0 pb-4">
            <div>
                <h1 className="page-title text-2xl sm:text-3xl">{t("notifications.title")}</h1>
                <p className="text-slate-500 font-medium text-xs sm:text-sm tracking-tight mb-2 sm:mb-4">
                    {t("notifications.subtitle")}
                </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-0">
                {/* Send Form - Spans 3 columns on xl */}
                <div
                    className="xl:col-span-3 glass-card rounded-2xl border border-white/40 p-4 sm:p-6 premium-shadow flex flex-col h-full"
                    style={{ background: "rgba(255, 255, 255, 0.7)" }}
                >
                    <form
                        onSubmit={handleSend}
                        className="space-y-3 sm:space-y-4 flex flex-col"
                    >
                        <div className="space-y-2">
                            <div>
                                <label className="label text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] mb-2 block">
                                    {t("notifications.form.category")}
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {NOTIFICATION_TYPES.map((type) => (
                                        <button
                                            key={type.value}
                                            type="button"
                                            onClick={() => setForm((p) => ({ ...p, type: type.value }))}
                                            className={`text-[9px] sm:text-[10px] px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg font-bold uppercase tracking-wider border transition-all duration-300 ${form.type === type.value ? "border-indigo-200 shadow-sm " + type.color + " scale-105" : "border-slate-100 bg-white/50 text-slate-400 hover:text-indigo-600 shadow-sm"}`}
                                        >
                                            {t(`notifications.types.${type.value}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-1 space-y-2">
                                <div>
                                    <label className="label text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] mb-1 sm:mb-2 block">
                                        {t("notifications.form.heading")}
                                    </label>
                                    <input
                                        value={form.title}
                                        onChange={(e) =>
                                            setForm((p) => ({ ...p, title: e.target.value }))
                                        }
                                        required
                                        placeholder={t("notifications.form.placeholders.heading")}
                                        className="input-field rounded-xl bg-white/50 border-slate-200/50 focus:bg-white transition-all py-2 sm:py-3 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="label text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] mb-1 sm:mb-2 block">
                                        {t("notifications.form.content")}
                                    </label>
                                    <textarea
                                        value={form.body}
                                        onChange={(e) =>
                                            setForm((p) => ({ ...p, body: e.target.value }))
                                        }
                                        required
                                        rows={2}
                                        placeholder={t("notifications.form.placeholders.content")}
                                        className="input-field rounded-xl bg-white/50 border-slate-200/50 focus:bg-white transition-all py-2 sm:py-3 text-sm resize-none"
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
                                        {t("notifications.form.preview")}
                                    </p>
                                    <div
                                        className={`p-4 rounded-xl shadow-sm border overflow-hidden ${selectedType?.color || "bg-slate-100"} border-white/40`}
                                    >
                                        <p className="font-black text-sm tracking-tight break-words">
                                            {form.title}
                                        </p>
                                        <p className="text-xs mt-1 font-medium opacity-80 leading-relaxed break-words whitespace-pre-wrap">
                                            {form.body || t("notifications.form.previewPlaceholder")}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={sending}
                            className="group w-full py-3 sm:py-4 rounded-xl text-white font-bold text-sm uppercase tracking-wider transition-all duration-500 hover:shadow-[0_10px_25px_rgba(99,102,241,0.4)] hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
                            style={{ background: "var(--gradient-primary)" }}
                        >
                            <Send
                                size={16}
                                className="transition-transform group-hover:translate-x-1"
                            />
                            {sending ? t("notifications.form.processing") : t("notifications.form.submit")}
                        </button>
                    </form>
                </div>

                {/* History - Spans 2 columns on xl */}
                <div
                    className="xl:col-span-2 glass-card rounded-2xl sm:rounded-3xl border border-white/40 overflow-hidden flex flex-col premium-shadow h-full"
                    style={{ background: "rgba(255, 255, 255, 0.6)" }}
                >
                    <div className="flex items-center justify-between p-6 sm:p-8 border-b border-white/30">
                        <h2 className="text-base font-black text-slate-900 flex items-center gap-3 tracking-tight">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm">
                                <Bell size={18} />
                            </div>
                            {t("notifications.history.title")}
                        </h2>
                        {sent.length > 0 && (
                            <button
                                onClick={handleClearAll}
                                disabled={sending}
                                className="text-[10px] font-black text-rose-500 hover:bg-rose-500 hover:text-white uppercase tracking-[0.15em] px-4 py-2 rounded-xl transition-all border border-rose-100 disabled:opacity-50"
                            >
                                {t("notifications.history.clearAll")}
                            </button>
                        )}
                    </div>
                    <div className="flex-1 p-6 sm:p-8 space-y-4 overflow-y-auto min-h-0 scrollbar-hide">
                        {sent.map((n, i) => {
                            const typeInfo =
                                NOTIFICATION_TYPES.find((x) => x.value === n.type) ||
                                NOTIFICATION_TYPES[4];
                            return (
                                <div
                                    key={n.id}
                                    className="relative group/notif animate-slide-up"
                                    style={{ animationDelay: `${i * 0.05}s` }}
                                >
                                    <div
                                        className={`p-5 rounded-2xl border transition-all duration-300 hover:bg-white/80 ${typeInfo.color.split(" ")[1]} ${typeInfo.color.split(" ")[0]} border-white/60 relative premium-shadow overflow-hidden`}
                                    >
                                        <div className="flex justify-between items-start mb-2 min-w-0">
                                            <p className="font-black text-[15px] pr-8 tracking-tight leading-tight break-words min-w-0 overflow-hidden">
                                                {n.title}
                                            </p>
                                            <button
                                                onClick={() => deleteNotification(n.id)}
                                                className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-white text-red-500 hover:bg-red-50 hover:text-red-600 transition-all shadow-sm"
                                                title={t("common.delete")}
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                        <p className="text-[13px] font-medium opacity-80 leading-relaxed mb-4 break-words whitespace-pre-wrap">
                                            {n.body}
                                        </p>
                                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-auto pt-3 border-t border-white/20">
                                            <span className="bg-white/50 px-2.5 py-1 rounded-lg">
                                                🕒{" "}
                                                {n.sentAt?.toDate?.().toLocaleDateString(i18n.language === 'te' ? 'te-IN' : 'en-IN') ||
                                                    t("notifications.labels.online")}
                                            </span>
                                            <span className="bg-white/50 px-2.5 py-1 rounded-lg">
                                                {t("notifications.history.target")}: {n.target || t("notifications.labels.all")}
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
                                    {t("notifications.history.empty")}
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
