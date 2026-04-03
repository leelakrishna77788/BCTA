import React, { useCallback } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Store,
  CreditCard,
  MessageSquareWarning,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Stethoscope,
  User,
  ShieldPlus,
} from "lucide-react";
import type { Member, UserRole } from "../../types/member.types";

const adminLinks = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/members", icon: Users, label: "Members" },
  { to: "/admin/admins/add", icon: ShieldPlus, label: "Add Admin" },
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
  { to: "/member/notifications", icon: Bell, label: "Notifications" },
  { to: "/member/complaint", icon: MessageSquareWarning, label: "Raise Complaint" },
  { to: "/member/emergency", icon: Stethoscope, label: "Emergency" },
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}) => {
  const { userRole, userProfile, logout, loading } = useAuth();
  const navigate = useNavigate();

  // Normalize role and select links
  const normalizedRole = userRole?.toLowerCase().trim() || "";
  const links =
    normalizedRole === "member" ? memberLinks : normalizedRole ? adminLinks : [];

  const handleLogout = useCallback(async () => {
    await logout();
    setMobileOpen(false);
    toast.success("Logged out");
    navigate("/login");
  }, [logout, navigate, setMobileOpen]);

  if (loading) return null; // Let Parent Layout handle loading view

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col h-screen bg-white border-r border-slate-200 transition-all duration-300 flex-shrink-0 sticky top-0 z-30 ${
          collapsed ? "w-20" : "w-[260px]"
        }`}
      >
        <SidebarContent
          collapsed={collapsed}
          links={links}
          userProfile={userProfile}
          userRole={userRole}
          handleLogout={handleLogout}
          setCollapsed={setCollapsed}
          setMobileOpen={setMobileOpen}
        />
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/50 animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="relative w-[280px] bg-white h-full shadow-lg z-50 animate-fade-in translate-x-0"
            style={{
              animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
              animationDuration: "0.4s",
            }}
          >
            <SidebarContent
              collapsed={false}
              links={links}
              userProfile={userProfile}
              userRole={userRole}
              handleLogout={handleLogout}
              setCollapsed={setCollapsed}
              setMobileOpen={setMobileOpen}
            />
          </aside>
        </div>
      )}
    </>
  );
};

interface SidebarContentProps {
  collapsed: boolean;
  links: typeof adminLinks;
  userProfile: Member | null;
  userRole: UserRole | null;
  handleLogout: () => void;
  setCollapsed: (collapsed: boolean) => void;
  setMobileOpen: (open: boolean) => void;
}

const SidebarContent: React.FC<SidebarContentProps> = React.memo(({
  collapsed,
  links,
  userProfile,
  userRole,
  handleLogout,
  setCollapsed,
  setMobileOpen,
}) => (
  <div className="flex flex-col h-full bg-slate-900 text-slate-300">
    {/* Brand */}
    <div
      className={`flex items-center ${
        collapsed ? "justify-center" : "gap-3"
      } px-5 py-6 border-b border-slate-800 relative overflow-hidden group`}
    >
      <div className="w-10 h-10 bg-[#000080] rounded-lg flex items-center justify-center flex-shrink-0 relative z-10 transition-transform group-hover:scale-105">
        <span className="text-white font-bold text-sm tracking-tight text-center">
          BCTA
        </span>
      </div>
      {!collapsed && (
        <div className="relative z-10">
          <p className="font-bold text-white text-sm leading-tight tracking-tight">
            Management System
          </p>
          <p className="text-[11px] font-medium text-slate-400 leading-tight tracking-wider uppercase">
            Bhimavaram
          </p>
        </div>
      )}
    </div>

    {/* Nav Links */}
    <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
      {links.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          onClick={() => setMobileOpen?.(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 font-medium text-sm ${
              isActive
                ? "bg-slate-800 text-white font-semibold"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            } ${collapsed ? "justify-center" : ""}`
          }
          title={collapsed ? label : ""}
        >
          <Icon
            size={20}
            className={`flex-shrink-0 transition-transform duration-300 ${
              collapsed ? "hover:scale-110" : ""
            }`}
          />
          {!collapsed && <span>{label}</span>}
        </NavLink>
      ))}
    </nav>

    {/* User Mini Profile */}
    <div
      className={`p-4 border-t border-slate-800 bg-slate-900 transition-all ${
        collapsed ? "flex flex-col items-center gap-3" : ""
      }`}
    >
      {!collapsed ? (
        <div className="flex items-center gap-3 bg-slate-800 rounded-lg p-3 mb-3 hover:bg-slate-700 transition-colors">
          {userProfile?.photoURL ? (
            <img
              src={userProfile.photoURL}
              alt=""
              className="w-10 h-10 rounded-md object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-slate-700 rounded-md flex items-center justify-center text-slate-300 font-bold">
              {userProfile?.name?.[0] || "U"}
            </div>
          )}
          <div className="overflow-hidden flex-1">
            <p className="text-sm font-semibold text-white truncate">
              {userProfile?.name || "User"}
            </p>
            <p className="text-xs text-slate-400 capitalize">{userRole}</p>
          </div>
        </div>
      ) : (
        <div
          className="w-10 h-10 rounded-md bg-slate-800 flex items-center justify-center mb-2"
          title={userProfile?.name}
        >
          {userProfile?.name?.[0] || "U"}
        </div>
      )}

      <div className={`flex ${collapsed ? "flex-col" : "gap-2"}`}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`hidden lg:flex items-center justify-center w-full p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none`}
          title="Toggle Sidebar"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        <button
          onClick={handleLogout}
          className={`flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white hover:bg-red-500/80 transition-colors focus:outline-none ${
            !collapsed ? "flex-1 gap-2" : "w-full"
          }`}
          title="Logout"
        >
          <LogOut size={18} />
          {!collapsed && <span className="font-medium text-sm">Logout</span>}
        </button>
      </div>
    </div>
  </div>
));

export default Sidebar;
