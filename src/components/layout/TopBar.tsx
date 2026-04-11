import React, { useState, useEffect, useCallback } from "react";
import { assets } from "../../assets/assets";
import { Bell, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import toast from "react-hot-toast";

interface TopBarProps {
  onMenuClick: () => void;
}

interface NotificationDoc {
  id: string;
  type: string;
  message: string;
  sentAt: any;
  [key: string]: any;
}

const TopBar: React.FC<TopBarProps> = React.memo(({ onMenuClick }) => {
  const { currentUser, userProfile, userRole } = useAuth();
  const [notifs, setNotifs] = useState<NotificationDoc[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "notifications"),
      orderBy("sentAt", "desc"),
      limit(5),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as NotificationDoc[];
        setNotifs(data);
      },
      (err) => {
        console.error("Notifs fetch error:", err);
      },
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Close notifications when clicking outside
  useEffect(() => {
    if (!showNotifs) return;
    const handleClick = () => setShowNotifs(false);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [showNotifs]);

  const deleteNotification = useCallback(async (id: string) => {
    if (!window.confirm("Delete this notification?")) return;
    try {
      await deleteDoc(doc(db, "notifications", id));
      toast.success("Notification deleted");
    } catch (err: any) {
      toast.error("Failed to delete notification");
    }
  }, []);

  return (
    <header
      className="h-16 overflow-visible shrink-0 relative z-30 px-3 sm:px-8 flex items-center justify-between transition-all duration-300 shadow-sm"
      style={{
        background: "linear-gradient(135deg, white 50%, #1e3a8a 50%)",
      }}
    >
      {" "}
      <div className="relative flex items-center gap-4 h-full">
        {/* Mobile Only Logo */}
        <img
          src={assets.herologo}
          alt="Logo"
          className="h-full max-h-12 object-contain block sm:hidden"
        />
      </div>
      {/* Gradient bottom accent */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px opacity-30"
        style={{ background: "var(--gradient-accent)" }}
      />
      <div className="flex items-center gap-4">
        {/* Placeholder or other left-side items can go here */}
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Notification Bell */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="p-2.5 rounded-xl text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all duration-200 relative group"
          >
            <Bell size={19} />
            {notifs.length > 0 && (
              <span
                className="absolute top-2 right-2 w-2 h-2 rounded-full border-2 border-white animate-breathe"
                style={{ background: "var(--gradient-accent)" }}
              />
            )}
          </button>

          {showNotifs && (
            <div className="absolute top-full -right-2 sm:right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-100/80 py-1 animate-scale-in z-50 overflow-hidden">
              {/* Gradient header strip */}
              <div
                className="h-[3px]"
                style={{ background: "var(--gradient-accent)" }}
              />
              <div className="px-5 py-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Notifications
                </h3>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider text-indigo-600 bg-indigo-50">
                  Latest
                </span>
              </div>
              <div className="space-y-0.5 max-h-80 overflow-y-auto">
                {notifs.map((n) => (
                  <div
                    key={n.id}
                    className="px-5 py-3 hover:bg-slate-50/80 transition-colors cursor-pointer group relative"
                  >
                    <p className="text-xs font-bold text-indigo-600 mb-0.5">
                      {n.type === "broadcast" ? "📢 BROADCAST" : "🔔 ALERT"}
                    </p>
                    <p className="text-sm text-slate-700 font-medium line-clamp-2 leading-tight group-hover:text-slate-900">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold uppercase tracking-tight">
                      {n.sentAt
                        ? n.sentAt.toDate
                          ? n.sentAt.toDate().toLocaleTimeString()
                          : n.sentAt._seconds
                            ? new Date(
                                n.sentAt._seconds * 1000,
                              ).toLocaleTimeString()
                            : new Date(n.sentAt).toLocaleTimeString()
                        : "Just now"}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(n.id);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-50 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-500 transition-all"
                      title="Delete notification"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {notifs.length === 0 && (
                  <div className="px-5 py-8 text-center">
                    <span className="text-3xl opacity-20 block mb-2">📭</span>
                    <p className="text-xs text-slate-400 font-medium">
                      No new notifications
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-slate-200/60 mx-1 hidden sm:block" />

        {/* User Info */}
        <div className="flex items-center gap-3 pl-1 group cursor-pointer">
          <div className="hidden md:block text-right">
            <p className="text-xs font-bold text-slate-800 leading-none group-hover:text-indigo-700 transition-colors tracking-tight">
              {userProfile?.name || currentUser?.displayName || "User"}
            </p>
            <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-widest mt-1">
              {userRole || "Member"}
            </p>
          </div>
          {userProfile?.photoURL || currentUser?.photoURL ? (
            <img
              src={userProfile?.photoURL || (currentUser?.photoURL as string)}
              alt=""
              className="w-9 h-9 rounded-xl object-cover ring-2 ring-transparent group-hover:ring-indigo-200 transition-all shadow-sm"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all"
              style={{ background: "var(--gradient-accent)" }}
            >
              {(
                userProfile?.name?.[0] ||
                currentUser?.displayName?.[0] ||
                "U"
              ).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </header>
  );
});

export default TopBar;
