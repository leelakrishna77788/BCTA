import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import {
    LayoutDashboard, Users, CalendarDays, Store, CreditCard,
    MessageSquareWarning, Bell, ShieldAlert, LogOut, ChevronLeft,
    ChevronRight, Menu, X, Smartphone, Stethoscope, User
} from "lucide-react";

const adminLinks = [
    { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/admin/members", icon: Users, label: "Members" },
    { to: "/admin/meetings", icon: CalendarDays, label: "Meetings" },
    { to: "/admin/shops", icon: Store, label: "Shops & Products" },
    { to: "/admin/payments", icon: CreditCard, label: "Payments" },
    { to: "/admin/complaints", icon: MessageSquareWarning, label: "Complaints" },
    { to: "/admin/notifications", icon: Bell, label: "Notifications" },
];

const memberLinks = [
    { to: "/member/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/member/profile", icon: User, label: "My Profile" },
    { to: "/member/meetings", icon: CalendarDays, label: "My Meetings" },
    { to: "/member/scan", icon: Smartphone, label: "Scan QR" },
    { to: "/member/payments", icon: CreditCard, label: "My Payments" },
    { to: "/member/complaint", icon: MessageSquareWarning, label: "Raise Complaint" },
    { to: "/member/emergency", icon: Stethoscope, label: "Emergency" },
];

const Sidebar = ({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) => {
    const { userRole, userProfile, logout } = useAuth();
    const navigate = useNavigate();
    const links = userRole === "member" ? memberLinks : adminLinks;

    const handleLogout = async () => {
        await logout();
        toast.success("Logged out");
        navigate("/login");
    };

    return (
        <>
            {/* Desktop Sidebar */}
            <aside
                className={`hidden lg:flex flex-col h-screen border-r border-slate-200/50 transition-all duration-300 flex-shrink-0 sticky top-0 shadow-xl shadow-slate-200/50 z-30 ${collapsed ? "w-20" : "w-[260px]"}`}
            >
                <SidebarContent collapsed={collapsed} links={links} userProfile={userProfile} userRole={userRole} handleLogout={handleLogout} setCollapsed={setCollapsed} />
            </aside>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setMobileOpen(false)} />
                    <aside className="relative w-[280px] bg-white h-full shadow-2xl z-50 animate-fade-in translate-x-0" style={{ animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)', animationDuration: '0.4s' }}>
                        <SidebarContent collapsed={false} links={links} userProfile={userProfile} userRole={userRole} handleLogout={handleLogout} setCollapsed={setCollapsed} />
                    </aside>
                </div>
            )}
        </>
    );
};

const SidebarContent = ({ collapsed, links, userProfile, userRole, handleLogout, setCollapsed }) => (
    <div className="flex flex-col h-full bg-white/60 backdrop-blur-2xl">
        {/* Brand */}
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} px-5 py-6 border-b border-slate-200/50 relative overflow-hidden group`}>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xl shadow-slate-200/50 relative z-10 transition-transform group-hover:scale-105">
                <span className="text-white font-black text-sm tracking-tight">BC</span>
            </div>
            {!collapsed && (
                <div className="relative z-10">
                    <p className="font-extrabold text-slate-800 text-sm leading-tight tracking-tight">BCTA</p>
                    <p className="text-[11px] font-medium text-slate-500 leading-tight">Management Portal</p>
                </div>
            )}
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            {links.map(({ to, icon: Icon, label }) => (
                <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                        `sidebar-link ${isActive ? "active" : ""} ${collapsed ? "justify-center px-2 py-3" : ""}`
                    }
                    title={collapsed ? label : ""}
                >
                    <Icon size={20} className={`flex-shrink-0 transition-transform duration-300 ${collapsed ? "hover:scale-110" : ""}`} />
                    {!collapsed && <span>{label}</span>}
                </NavLink>
            ))}
        </nav>

        {/* User Mini Profile (Replacing bottom actions) */}
        <div className={`p-4 border-t border-slate-200/50 bg-slate-50/50 backdrop-blur-xl transition-all ${collapsed ? "flex flex-col items-center gap-3" : ""}`}>
            {!collapsed ? (
                <div className="flex items-center gap-3 bg-white border border-slate-200/60 rounded-2xl p-3 shadow-sm mb-3 group hover:border-blue-200 hover:shadow-md transition-all">
                    {userProfile?.photoURL ? (
                        <img src={userProfile.photoURL} alt="" className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center text-slate-600 font-bold">
                            {userProfile?.name?.[0] || "U"}
                        </div>
                    )}
                    <div className="overflow-hidden flex-1">
                        <p className="text-sm font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">{userProfile?.name || "User"}</p>
                        <p className="text-[11px] font-semibold text-blue-600/80 uppercase tracking-wider">{userRole}</p>
                    </div>
                </div>
            ) : (
                <div className="w-10 h-10 rounded-xl bg-slate-200/60 flex items-center justify-center mb-2" title={userProfile?.name}>
                    {userProfile?.name?.[0] || "U"}
                </div>
            )}

            <div className={`flex ${collapsed ? "flex-col" : "gap-2"}`}>
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className={`hidden lg:flex items-center justify-center w-full p-2.5 rounded-xl text-slate-500 hover:bg-white hover:text-slate-800 border border-transparent hover:border-slate-200/60 hover:shadow-sm transition-all focus:outline-none`}
                    title="Toggle Sidebar"
                >
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>

                <button
                    onClick={handleLogout}
                    className={`flex items-center justify-center p-2.5 rounded-xl text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 hover:text-red-600 hover:shadow-sm transition-all focus:outline-none ${!collapsed ? "flex-1 gap-2 bg-white" : "w-full hover:bg-red-500 hover:text-white"}`}
                    title="Logout"
                >
                    <LogOut size={18} />
                    {!collapsed && <span className="font-semibold text-sm">Logout</span>}
                </button>
            </div>
        </div>
    </div>
);

export default Sidebar;
