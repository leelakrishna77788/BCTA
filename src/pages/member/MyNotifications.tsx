import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  arrayUnion,
  writeBatch,
  deleteDoc,
} from "firebase/firestore";
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
  const { currentUser, userRole } = useAuth();
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState<boolean>(false);

  useEffect(() => {
    const q = query(collection(db, "notifications"), orderBy("sentAt", "desc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        setNotifications(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as NotificationData),
        );
        setLoading(false);
      },
      (err) => {
        console.error("Notifications error:", err);
        setLoading(false);
      },
    );

    return () => unsub();
  }, []);

  const deleteNotification = async (id: string) => {
    if (!currentUser) return;

    try {
      if (userRole === "admin" || userRole === "superadmin") {
        // ✅ ADMIN → delete for everyone
        await deleteDoc(doc(db, "notifications", id));
        toast.success(t("myNotifications.toastDeletedSingle"));
      } else {
        // ✅ MEMBER → hide only for self
        await updateDoc(doc(db, "notifications", id), {
          dismissedBy: arrayUnion(currentUser.uid),
        });
        toast.success(t("myNotifications.toastRemovedSingle"));
      }
      setDeleteConfirm(null);
    } catch (err) {
      console.error("[deleteNotification] Error:", err);
      toast.error(t("myNotifications.toastDeleteFailed"));
    }
  };
  const deleteAllNotifications = async () => {
    if (!currentUser || notifications.length === 0) return;

    try {
      const batch = writeBatch(db);

      if (userRole === "admin" || userRole === "superadmin") {
        // ✅ ADMIN → delete all globally
        notifications.forEach((n) => {
          batch.delete(doc(db, "notifications", n.id));
        });

        await batch.commit();
        toast.success(t("myNotifications.toastDeletedAll"));
      } else {
        // ✅ MEMBER → hide only for self
        const visibleNotifications = notifications.filter(
          (n) => !n.dismissedBy?.includes(currentUser.uid),
        );

        visibleNotifications.forEach((n) => {
          batch.update(doc(db, "notifications", n.id), {
            dismissedBy: arrayUnion(currentUser.uid),
          });
        });

        await batch.commit();
        toast.success(t("myNotifications.toastRemovedAll"));
      }
      setDeleteAllConfirm(false);
    } catch (err) {
      console.error("[deleteAllNotifications] Error:", err);
      toast.error(t("myNotifications.toastClearFailed"));
    }
  };

  const formatDate = (date: any) => {
    if (!date) return t("myNotifications.unknownDate");
    if (date.toDate) return date.toDate().toLocaleString("en-IN");
    if (date._seconds)
      return new Date(date._seconds * 1000).toLocaleString("en-IN");
    return new Date(date).toLocaleString("en-IN");
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "meeting":
        return "📅";
      case "payment":
        return "💳";
      case "emergency":
        return "🚨";
      case "block":
        return "🚫";
      case "product":
        return "📦";
      default:
        return "📢";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "meeting":
        return "bg-indigo-50 text-indigo-600 border-indigo-100";
      case "payment":
        return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case "emergency":
        return "bg-red-50 text-red-600 border-red-100";
      case "block":
        return "bg-rose-50 text-rose-600 border-rose-100";
      case "product":
        return "bg-amber-50 text-amber-600 border-amber-100";
      default:
        return "bg-slate-50 text-slate-600 border-slate-100";
    }
  };

  const visibleNotifications = notifications.filter(
    (n) => !n.dismissedBy?.includes(currentUser?.uid || ""),
  );

  if (loading)
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex justify-between items-end mb-6">
          <div className="space-y-2">
            <LoadingSkeleton width="180px" height="2rem" />
            <LoadingSkeleton width="100px" height="1rem" />
          </div>
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5 flex gap-4">
            <LoadingSkeleton
              width="3rem"
              height="3rem"
              borderRadius="0.75rem"
            />
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
    <div className="flex flex-col animate-fade-in md:h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="page-title mb-0">{t("myNotifications.title")}</h1>
          <p className="text-slate-500 text-sm">
            {visibleNotifications.length} {t("myNotifications.notifications")}
          </p>
        </div>
        {visibleNotifications.length > 0 && (
          <button
            onClick={() => setDeleteAllConfirm(true)}
            className="btn-danger flex items-center gap-2"
          >
            <Trash2 size={16} />
            {t("myNotifications.clearAll")}
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 scroll-smooth scrollbar-hide">
        {visibleNotifications.length === 0 ? (
          <div className="card text-center py-16">
            <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bell size={32} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">
              {t("myNotifications.noNotifications")}
            </h3>
            <p className="text-slate-500 text-sm">
              {t("myNotifications.allCaughtUp")}
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-8">
            {visibleNotifications.map((n) => (
              <div
                key={n.id}
                className={`card p-5 flex gap-4 group relative border-l-4 ${getTypeColor(n.type)}`}
              >
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-2xl shrink-0 shadow-sm">
                  {getTypeIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="min-w-0 overflow-hidden">
                    <p className="font-bold text-slate-900 text-sm mb-1 break-all">
                      {n.title}
                    </p>
                    <p className="text-slate-600 text-sm leading-relaxed break-all whitespace-pre-wrap">
                      {n.body}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-slate-400 font-medium">
                      {formatDate(n.sentAt)}
                    </p>
                    <button
                      onClick={() => setDeleteConfirm(n.id)}
                      className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="absolute top-3 right-12 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${getTypeColor(n.type)}`}
                  >
                    {n.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Single Notification Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-100 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scale-in">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <Trash2 size={24} className="text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">
              {t("myNotifications.deleteNotification")}
            </h3>
            <p className="text-sm text-slate-600 text-center mb-6">
              {t("myNotifications.deleteConfirmMsg")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => deleteNotification(deleteConfirm)}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all"
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Notifications Confirmation Modal */}
      {deleteAllConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-100 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scale-in">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <Trash2 size={24} className="text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">
              {t("myNotifications.clearAllNotifications")}
            </h3>
            <p className="text-sm text-slate-600 text-center mb-6">
              {t("myNotifications.clearAllConfirmMsg", { count: visibleNotifications.length })}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteAllConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={deleteAllNotifications}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all"
              >
                {t("myNotifications.clearAll")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyNotifications;
