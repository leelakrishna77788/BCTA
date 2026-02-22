import React from "react";
import { Menu, Bell, Search } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const TopBar = ({ setMobileOpen }) => {
    const { userProfile, userRole } = useAuth();

    return (
        <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 py-3.5 px-4 md:px-6 flex items-center gap-4 flex-shrink-0 shadow-xl shadow-slate-200/50">
            {/* Mobile menu toggle */}
            <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 rounded-xl hover:bg-slate-100/80 text-slate-600 transition-all active:scale-95"
            >
                <Menu size={22} />
            </button>

            {/* Search bar */}
            <div className="flex-1 max-w-md hidden md:flex items-center gap-2.5 bg-slate-100/50 hover:bg-slate-100 border border-transparent hover:border-slate-200/60 rounded-xl px-4 py-2.5 transition-all duration-300 group focus-within:bg-white focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-500/10">
                <Search size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                    type="text"
                    placeholder="Search records..."
                    className="flex-1 bg-transparent text-sm font-medium text-slate-700 placeholder-slate-400 outline-none w-full"
                />
            </div>

            <div className="flex-1 md:flex-none" />

            {/* Role Badge */}
            <span className="hidden sm:inline-flex items-center px-4 py-1.5 bg-blue-50/80 border border-blue-200/60 text-blue-700 text-xs font-bold rounded-full capitalize shadow-xl shadow-slate-200/50">
                {userRole}
            </span>

            {/* Notifications bell */}
            <button className="relative p-2.5 rounded-xl hover:bg-slate-100/80 text-slate-600 transition-all active:scale-95 group">
                <Bell size={20} className="group-hover:text-blue-600 transition-colors" />
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full animate-pulse-ring" />
            </button>

            {/* Avatar */}
            <div className="flex items-center gap-3 pl-2 sm:border-l sm:border-slate-200/60 transition-all">
                {userProfile?.photoURL ? (
                    <img src={userProfile.photoURL} alt="" className="w-10 h-10 rounded-xl object-cover border-2 border-white shadow-sm" />
                ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-xl shadow-slate-200/50">
                        {userProfile?.name?.[0]?.toUpperCase() || "U"}
                    </div>
                )}
                <div className="hidden sm:block">
                    <p className="text-sm font-bold text-slate-800 leading-tight">{userProfile?.name || "User"}</p>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">{userProfile?.memberId || ""}</p>
                </div>
            </div>
        </header>
    );
};

export default TopBar;
