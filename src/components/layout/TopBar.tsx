import React, { useState, useEffect } from "react";
import { Menu, Bell, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { collection, query, orderBy, limit, onSnapshot, Timestamp, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import toast from "react-hot-toast";

interface TopBarProps {
  onMenuClick: () => void;
}

interface NotificationDoc {
  id: string;
  type: string;
  message: string;
  sentAt: any; // We'll handle the type variations in render
  [key: string]: any;
}

const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const { currentUser, userProfile, userRole } = useAuth();
  const [notifs, setNotifs] = useState<NotificationDoc[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "notifications"),
      orderBy("sentAt", "desc"),
      limit(5)
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
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const deleteNotification = async (id: string) => {
    if (!window.confirm("Delete this notification?")) return;
    try {
      await deleteDoc(doc(db, "notifications", id));
      toast.success("Notification deleted");
    } catch (err: any) {
      toast.error("Failed to delete notification");
    }
  };

  return (
    <header className="h-16 flex-shrink-0 bg-white border-b border-slate-200 z-30 px-4 sm:px-8 flex items-center justify-between transition-all duration-300">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-[#000080] transition-all relative group"
          >
            <Bell size={20} />
            {notifs.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
            )}
          </button>

          {showNotifs && (
            <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 py-4 animate-scale-in z-50">
              <div className="px-5 mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                <span className="text-[10px] font-bold text-[#000080] bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Latest
                </span>
              </div>
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {notifs.map((n) => (
                  <div
                    key={n.id}
                    className="px-5 py-3 hover:bg-slate-50 transition-colors cursor-pointer group relative"
                  >
                    <p className="text-xs font-bold text-[#000080] mb-0.5">
                      {n.type === "broadcast" ? "📢 BROADCAST" : "🔔 ALERT"}
                    </p>
                    <p className="text-sm text-slate-700 font-medium line-clamp-2 leading-tight group-hover:text-slate-900">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold uppercase tracking-tighter">
                      {n.sentAt ? (
                        n.sentAt.toDate ? (
                          n.sentAt.toDate().toLocaleTimeString()
                        ) : n.sentAt._seconds ? (
                          new Date(n.sentAt._seconds * 1000).toLocaleTimeString()
                        ) : (
                          new Date(n.sentAt).toLocaleTimeString()
                        )
                      ) : (
                        "Just now"
                      )}
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-50 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-100 transition-all"
                      title="Delete notification"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {notifs.length === 0 && (
                  <div className="px-5 py-8 text-center">
                    <p className="text-xs text-slate-400 font-medium">
                      No new notifications
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-slate-200 mx-1 sm:mx-0 hidden sm:block" />

        <div className="flex items-center gap-3 pl-2 group cursor-pointer">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-black text-slate-900 leading-none group-hover:text-[#000080] transition-colors uppercase tracking-wider">
              {userProfile?.name || currentUser?.displayName || "User"}
            </p>
            <p className="text-[10px] font-bold text-[#000080] uppercase tracking-widest mt-1">
              {userRole || "Member"}
            </p>
          </div>
          {userProfile?.photoURL || currentUser?.photoURL ? (
            <img
              src={userProfile?.photoURL || (currentUser?.photoURL as string)}
              alt=""
              className="w-10 h-10 rounded-xl object-cover ring-2 ring-transparent group-hover:ring-slate-200 transition-all shadow-sm"
            />
          ) : (
            <div className="w-10 h-10 bg-[#000080] rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-slate-200 group-hover:scale-105 transition-all">
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
};

export default TopBar;
