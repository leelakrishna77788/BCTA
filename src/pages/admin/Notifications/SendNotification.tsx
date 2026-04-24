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
import { Bell, Send, Trash2, AlertTriangle, X } from "lucide-react";
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
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
    const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
    const [deleteButtonPosition, setDeleteButtonPosition] = useState<{ top: number; left: number } | null>(null);

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

    // Lock background scroll when modal is open
    useEffect(() => {
        if (!showDeleteConfirm) return;

        const preventDefault = (e: Event) => e.preventDefault();

        window.addEventListener("wheel", preventDefault, { passive: false });
        window.addEventListener("touchmove", preventDefault, { passive: false });
        const blockKeys = (e: KeyboardEvent) => {
            const keys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Space", " "];
            if (keys.includes(e.key)) e.preventDefault();
        };
        window.addEventListener("keydown", blockKeys);

        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";

        return () => {
            window.removeEventListener("wheel", preventDefault);
            window.removeEventListener("touchmove", preventDefault);
            window.removeEventListener("keydown", blockKeys);
            document.body.style.overflow = "";
            document.documentElement.style.overflow = "";
        };
    }, [showDeleteConfirm]);

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

    const handleDelete = (event: React.MouseEvent<HTMLButtonElement>, id: string) => {
        const buttonRect = event.currentTarget.getBoundingClientRect();
        const buttonTop = buttonRect.top + window.scrollY;
        
        // Calculate which group of 3 rows this button belongs to
        const rowHeight = 150;
        const groupSize = 3;
        const groupIndex = Math.floor(buttonTop / (rowHeight * groupSize));
        
        // Position card at the center of this group
        const groupCenterY = (groupIndex * rowHeight * groupSize) + (rowHeight * groupSize / 2);
        
        setDeleteButtonPosition({
            top: groupCenterY,
            left: 0
        });
        setSelectedNotificationId(id);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!selectedNotificationId) return;
        setShowDeleteConfirm(false);
        setDeleteButtonPosition(null);

        try {
            await deleteDoc(doc(db, "notifications", selectedNotificationId));
            toast.success(t("notifications.toasts.deleted"));
        } catch (err: any) {
            console.error("[deleteNotification] Error:", err);
            toast.error(
                `Failed to delete notification: ${err.message || "Permission denied"}`,
            );
        } finally {
            setSelectedNotificationId(null);
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
        <div className="flex flex-col animate-fade-in xl:h-[calc(100vh-120px)]">
            <div className="shrink-0 mb-0 xl:mb-1">
                <h1 className="page-title text-2xl sm:text-3xl mb-0">{t("notifications.title")}</h1>
                <p className="text-slate-500 font-medium text-xs sm:text-sm tracking-tight">
                    {t("notifications.subtitle")}
                </p>
            </div>

            <div className="flex-1 grid grid-cols-1 xl:grid-cols-5 gap-4 min-h-0 xl:overflow-hidden pb-20 xl:pb-0">
                {/* Send Form - Spans 3 columns on xl */}
                <div
                    className="xl:col-span-3 glass-card rounded-2xl border border-white/40 p-6 sm:p-8 premium-shadow flex flex-col h-full min-h-[500px] xl:min-h-0 overflow-hidden"
                    style={{ background: "rgba(255, 255, 255, 0.7)" }}
                >
                    <form
                        onSubmit={handleSend}
                        className="flex flex-col h-full min-h-0 gap-2 xl:gap-2"
                    >
                        <div className="xl:flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-hide">
                            <div>
                                <label className="label text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] mb-3 block text-slate-500">
                                    {t("notifications.form.category")}
                                </label>
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                                    {NOTIFICATION_TYPES.map((type) => (
                                        <button
                                            key={type.value}
                                            type="button"
                                            onClick={() => setForm((p) => ({ ...p, type: type.value }))}
                                            className={`text-[11px] sm:text-xs px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl font-bold uppercase tracking-wider border transition-all duration-300 flex items-center justify-center text-center leading-tight ${form.type === type.value ? "border-indigo-300 shadow-md ring-2 ring-indigo-50 " + type.color + " scale-102" : "border-slate-100 bg-white/60 text-slate-400 hover:border-indigo-200 hover:text-indigo-600 shadow-sm"}`}
                                        >
                                            {t(`notifications.types.${type.value}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="label text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] mb-2 block text-slate-500">
                                        {t("notifications.form.heading")}
                                    </label>
                                    <input
                                        value={form.title}
                                        onChange={(e) =>
                                            setForm((p) => ({ ...p, title: e.target.value }))
                                        }
                                        required
                                        placeholder={t("notifications.form.placeholders.heading")}
                                        className="input-field rounded-2xl bg-white/60 border-slate-200/50 focus:bg-white transition-all py-3 sm:py-4 text-sm font-bold shadow-sm"
                                    />
                                </div>

                                <div>
                                    <label className="label text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] mb-2 block text-slate-500">
                                        {t("notifications.form.content")}
                                    </label>
                                    <textarea
                                        value={form.body}
                                        onChange={(e) =>
                                            setForm((p) => ({ ...p, body: e.target.value }))
                                        }
                                        required
                                        rows={3}
                                        placeholder={t("notifications.form.placeholders.content")}
                                        className="input-field rounded-2xl bg-white/60 border-slate-200/50 focus:bg-white transition-all py-3 sm:py-4 text-sm font-medium resize-none shadow-sm"
                                    />
                                </div>
                            </div>

                            {/* Preview */}
                            {form.title && (
                                <div
                                    className="p-6 rounded-2xl border border-dashed transition-all duration-500 opacity-100"
                                    style={{
                                        borderColor: selectedType?.color.split(" ")[1] || "#e2e8f0",
                                        background: "white",
                                    }}
                                >
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-slate-400 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        {t("notifications.form.preview")}
                                    </p>
                                    <div
                                        className={`p-5 rounded-2xl shadow-xl border overflow-hidden ${selectedType?.color || "bg-slate-100"} border-white/50`}
                                    >
                                        <p className="font-black text-base sm:text-lg tracking-tight break-all">
                                            {form.title}
                                        </p>
                                        <p className="text-sm mt-2 font-medium opacity-90 leading-relaxed break-all whitespace-pre-wrap">
                                            {form.body || t("notifications.form.previewPlaceholder")}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="shrink-0 pt-8 xl:pt-4">
                            <button
                                type="submit"
                                disabled={sending}
                                className="group w-full py-4 sm:py-5 rounded-2xl text-white font-black text-sm sm:text-base uppercase tracking-widest transition-all duration-500 hover:shadow-[0_12px_30px_rgba(79,70,229,0.4)] hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                                style={{ background: "var(--gradient-primary)" }}
                            >
                                <Send
                                    size={20}
                                    className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
                                />
                                {sending ? t("notifications.form.processing") : t("notifications.form.submit")}
                            </button>
                        </div>
                    </form>
                </div>

                {/* History - Spans 2 columns on xl */}
                <div
                    className="xl:col-span-2 glass-card rounded-2xl sm:rounded-3xl border border-white/40 overflow-hidden flex flex-col premium-shadow h-full min-h-0"
                    style={{ background: "rgba(255, 255, 255, 0.6)" }}
                >
                    <div className="shrink-0 flex items-center justify-between p-6 border-b border-white/30">
                        <h2 className="text-lg font-black text-slate-900 flex items-center gap-3 tracking-tight">
                            <div className="w-11 h-11 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                                <Bell size={20} />
                            </div>
                            {t("notifications.history.title")}
                        </h2>
                        {sent.length > 0 && (
                            <button
                                onClick={handleClearAll}
                                disabled={sending}
                                className="text-[10px] font-black text-rose-500 hover:bg-rose-500 hover:text-white uppercase tracking-[0.15em] px-5 py-2.5 rounded-xl transition-all border border-rose-100 disabled:opacity-50 shadow-sm"
                            >
                                {t("notifications.history.clearAll")}
                            </button>
                        )}
                    </div>
                    <div className="flex-1 p-6 space-y-4 overflow-y-auto min-h-0 scroll-smooth scrollbar-hide">
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
                                        className={`p-6 rounded-2xl border transition-all duration-300 hover:bg-white/90 ${typeInfo.color.split(" ")[1]} ${typeInfo.color.split(" ")[0]} border-white/60 relative shadow-sm hover:shadow-md overflow-hidden`}
                                    >
                                        <div className="flex justify-between items-start mb-2 gap-4">
                                            <p className="font-black text-base tracking-tight leading-tight break-all flex-1">
                                                {n.title}
                                            </p>
                                            <button
                                                onClick={(e) => handleDelete(e, n.id)}
                                                className="shrink-0 p-2.5 rounded-xl bg-white/80 text-red-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm border border-rose-100/50"
                                                title={t("common.delete")}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <p className="text-sm font-medium opacity-90 leading-relaxed mb-5 break-all whitespace-pre-wrap">
                                            {n.body}
                                        </p>
                                        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 pt-3 border-t border-white/30">
                                            <span className="bg-white/60 px-3 py-1.5 rounded-xl shadow-xs">
                                                🕒{" "}
                                                {n.sentAt?.toDate?.().toLocaleDateString(i18n.language === 'te' ? 'te-IN' : 'en-IN') ||
                                                    t("notifications.labels.online")}
                                            </span>
                                            <span className="bg-white/60 px-3 py-1.5 rounded-xl shadow-xs">
                                                {t("notifications.history.target")}: {n.target || t("notifications.labels.all")}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {sent.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 opacity-20">
                                <div className="w-20 h-20 rounded-full bg-slate-200/50 flex items-center justify-center mb-4">
                                    <Bell size={40} />
                                </div>
                                <p className="text-xs font-black uppercase tracking-widest">
                                    {t("notifications.history.empty")}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && deleteButtonPosition && (
                <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-lg animate-fade-in" onClick={() => { setShowDeleteConfirm(false); setDeleteButtonPosition(null); setSelectedNotificationId(null); }}>
                    <div 
                        className="fixed bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-scale-up mx-4"
                        style={{
                            top: `${deleteButtonPosition.top}px`,
                            left: '50%',
                            transform: 'translate(-50%, -50%)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100">
                            <AlertTriangle className="text-red-600" size={32} />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 text-center mb-3">
                            {t("notifications.history.deleteConfirm")}
                        </h2>
                        <p className="text-sm text-slate-600 text-center mb-6">
                            {t("memberDetail.deleteWarning") || "This action cannot be undone. The notification will be permanently removed."}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowDeleteConfirm(false); setDeleteButtonPosition(null); setSelectedNotificationId(null); }}
                                className="flex-1 px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                            >
                                {t("common.cancel") || "Cancel"}
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                            >
                                {t("common.delete") || "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SendNotification;
