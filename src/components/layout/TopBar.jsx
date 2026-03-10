import React, { useState, useEffect } from "react";
import { Menu, Bell, Search } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { notificationsApi } from "../../services/api";

const TopBar = ({ onMenuClick }) => {
    const { currentUser } = useAuth();
    const [notifs, setNotifs] = useState([]);
    const [showNotifs, setShowNotifs] = useState(false);

    useEffect(() => {
        if (!currentUser) return;
        const fetchNotifs = async () => {
            try {
                const data = await notificationsApi.getAll();
                // Take latest 5
                setNotifs(data.slice(0, 5));
            } catch (err) {
                console.log("Notifs fetch error:", err);
            }
        };
        fetchNotifs();
        const interval = setInterval(fetchNotifs, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [currentUser]);

    return (
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 fixed top-0 right-0 left-0 lg:left-64 z-30 px-4 sm:px-8 flex items-center justify-between transition-all duration-300">
            <div className="flex items-center gap-4">
                <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600">
                    <Menu size={20} />
                </button>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-slate-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all border border-transparent focus-within:border-blue-200">
                    <Search size={16} />
                    <input type="text" placeholder="Search anything..." className="bg-transparent border-none outline-none text-sm text-slate-600 w-48 lg:w-64" />
                </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
                <div className="relative">
                    <button
                        onClick={() => setShowNotifs(!showNotifs)}
                        className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-all relative group"
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
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Latest</span>
                            </div>
                            <div className="space-y-1 max-h-80 overflow-y-auto">
                                {notifs.map(n => (
                                    <div key={n.id} className="px-5 py-3 hover:bg-slate-50 transition-colors cursor-pointer group">
                                        <p className="text-xs font-bold text-blue-600 mb-0.5">{n.type === 'broadcast' ? '📢 BROADCAST' : '🔔 ALERT'}</p>
                                        <p className="text-sm text-slate-700 font-medium line-clamp-2 leading-tight group-hover:text-slate-900">{n.message}</p>
                                        <p className="text-[10px] text-slate-400 mt-1 font-semibold uppercase tracking-tighter">
                                            {n.sentAt ? (
                                                n.sentAt.toDate ? n.sentAt.toDate().toLocaleTimeString() :
                                                    n.sentAt._seconds ? new Date(n.sentAt._seconds * 1000).toLocaleTimeString() :
                                                        new Date(n.sentAt).toLocaleTimeString()
                                            ) : "Just now"}
                                        </p>
                                    </div>
                                ))}
                                {notifs.length === 0 && (
                                    <div className="px-5 py-8 text-center">
                                        <p className="text-xs text-slate-400 font-medium">No new notifications</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-8 w-px bg-slate-200 mx-1 sm:mx-0 hidden sm:block" />

                <div className="flex items-center gap-3 pl-2 group cursor-pointer">
                    <div className="hidden sm:block text-right">
                        <p className="text-xs font-black text-slate-900 leading-none group-hover:text-blue-600 transition-colors uppercase tracking-wider">
                            {currentUser?.displayName || "Super Admin"}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {currentUser?.role || "Admin"}
                        </p>
                    </div>
                    {currentUser?.photoURL ? (
                        <img src={currentUser.photoURL} alt="" className="w-10 h-10 rounded-xl object-cover ring-2 ring-transparent group-hover:ring-blue-100 transition-all shadow-sm" />
                    ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-100 group-hover:scale-105 transition-all">
                            {currentUser?.displayName?.[0] || "A"}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default TopBar;
