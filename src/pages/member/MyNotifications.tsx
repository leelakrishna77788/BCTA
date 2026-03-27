import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { collection, query, orderBy, onSnapshot, updateDoc, doc, arrayUnion, writeBatch } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { Bell, Trash2, CheckCircle } from "lucide-react";
import LoadingSkeleton from "../../components/shared/LoadingSkeleton";
import toast from "react-hot-toast";

interface NotificationData {
    id: string;
    type: string;
    title: string;
    body: string;
    sentAt: any;
    dismissedBy?: string[];
    [key: string]: any;
}

const MyNotifications: React.FC = () => {
    const { currentUser } = useAuth();
    const [notifications, setNotifications] = useState<NotificationData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const q = query(
            collection(db, "notifications"),
            orderBy("sentAt", "desc")
        );

        const unsub = onSnapshot(q, (snap) => {
            setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as NotificationData)));
            setLoading(false);
        }, (err) => {
            console.error("Notifications error:", err);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    const deleteNotification = async (id: string) => {
        if (!currentUser) return;
        if (!window.confirm("Remove this notification from your view?")) return;
        try {
            await updateDoc(doc(db, "notifications", id), {
                dismissedBy: arrayUnion(currentUser.uid)
            });
            toast.success("Notification removed");
        } catch (err: any) {
            console.error("[deleteNotification] Error:", err);
            toast.error("Failed to remove notification");
        }
    };

    const deleteAllNotifications = async () => {
        if (!currentUser || notifications.length === 0) return;
        if (!window.confirm("Remove all notifications from your view? This action cannot be undone.")) return;
        
        try {
            const batch = writeBatch(db);
            const visibleNotifications = notifications.filter(n => !n.dismissedBy?.includes(currentUser.uid));
            
            visibleNotifications.forEach(n => {
                batch.update(doc(db, "notifications", n.id), {
                    dismissedBy: arrayUnion(currentUser.uid)
                });
            });
            
            await batch.commit();
            toast.success("All notifications removed from your view");
        } catch (err: any) {
            console.error("[deleteAllNotifications] Error:", err);
            toast.error("Failed to clear notifications");
        }
    };

    const formatDate = (date: any) => {
        if (!date) return "Unknown date";
        if (date.toDate) return date.toDate().toLocaleString("en-IN");
        if (date._seconds) return new Date(date._seconds * 1000).toLocaleString("en-IN");
        return new Date(date).toLocaleString("en-IN");
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "meeting": return "📅";
            case "payment": return "💳";
            case "emergency": return "🚨";
            case "block": return "🚫";
            case "product": return "📦";
            default: return "📢";
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case "meeting": return "bg-indigo-50 text-indigo-600 border-indigo-100";
            case "payment": return "bg-emerald-50 text-emerald-600 border-emerald-100";
            case "emergency": return "bg-red-50 text-red-600 border-red-100";
            case "block": return "bg-rose-50 text-rose-600 border-rose-100";
            case "product": return "bg-amber-50 text-amber-600 border-amber-100";
            default: return "bg-slate-50 text-slate-600 border-slate-100";
        }
    };

    const visibleNotifications = notifications.filter(n => 
        !n.dismissedBy?.includes(currentUser?.uid || "")
    );

    if (loading) return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-end mb-6">
                <div className="space-y-2">
                    <LoadingSkeleton width="180px" height="2rem" />
                    <LoadingSkeleton width="100px" height="1rem" />
                </div>
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card p-5 flex gap-4">
                    <LoadingSkeleton width="3rem" height="3rem" borderRadius="0.75rem" />
                    <div className="flex-1 space-y-2">
                        <LoadingSkeleton width="40%" height="1rem" />
                        <LoadingSkeleton width="80%" height="0.875rem" />
                        <LoadingSkeleton width="20%" height="0.75rem" className="mt-2" />
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title mb-0">My Notifications</h1>
                    <p className="text-slate-500 text-sm">{visibleNotifications.length} notifications</p>
                </div>
                {visibleNotifications.length > 0 && (
                    <button
                        onClick={deleteAllNotifications}
                        className="btn-danger flex items-center gap-2"
                    >
                        <Trash2 size={16} />
                        Clear All
                    </button>
                )}
            </div>

            {visibleNotifications.length === 0 ? (
                <div className="card text-center py-16">
                    <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Bell size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">No Notifications</h3>
                    <p className="text-slate-500 text-sm">You're all caught up! Check back later for updates.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {visibleNotifications.map((n) => (
                        <div
                            key={n.id}
                            className={`card p-5 flex gap-4 group relative border-l-4 ${getTypeColor(n.type)}`}
                        >
                            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-2xl shrink-0 shadow-sm">
                                {getTypeIcon(n.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-bold text-slate-900 text-sm mb-1">{n.title}</p>
                                        <p className="text-slate-600 text-sm leading-relaxed">{n.body}</p>
                                    </div>
                                    <button
                                        onClick={() => deleteNotification(n.id)}
                                        className="p-2 rounded-lg bg-white text-red-500 hover:bg-red-50 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100 shadow-sm shrink-0"
                                        title="Delete notification"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400 mt-3 font-medium">
                                    {formatDate(n.sentAt)}
                                </p>
                            </div>
                            <div className="absolute top-3 right-12 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${getTypeColor(n.type)}`}>
                                    {n.type}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyNotifications;
