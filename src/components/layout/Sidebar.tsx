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

  const normalizedRole = userRole?.toLowerCase().trim() || "";
  const links =
    normalizedRole === "member" ? memberLinks : normalizedRole ? adminLinks : [];

  const handleLogout = useCallback(async () => {
    await logout();
    setMobileOpen(false);
    toast.success("Logged out");
    navigate("/login");
  }, [logout, navigate, setMobileOpen]);

  if (loading) return null;

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col h-screen transition-all duration-300 shrink-0 sticky top-0 z-30 ${
          collapsed ? "w-20" : "w-[260px]"
        }`}
        style={{
          background: "linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)",
        }}
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
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="relative w-[280px] h-full shadow-2xl z-50 animate-slide-left"
            style={{
              background: "linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)",
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
  <div className="flex flex-col h-full text-slate-300">
    {/* Brand */}
    <div
      className={`flex items-center ${
        collapsed ? "justify-center" : "gap-3"
      } px-5 py-6 border-b border-white/6 relative overflow-hidden`}
    >
      {/* Subtle gradient glow behind logo */}
      <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 30% 50%, rgba(99,102,241,0.15) 0%, transparent 70%)"
      }} />
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative z-10 transition-transform duration-300 hover:scale-105 shadow-lg"
        style={{ background: "var(--gradient-accent)" }}
      >
        <span className="text-white font-bold text-sm tracking-tight text-center">
          BCTA
        </span>
      </div>
      {!collapsed && (
        <div className="relative z-10">
          <p className="font-bold text-white text-sm leading-tight tracking-tight">
            Management System
          </p>
          <p className="text-[11px] font-medium text-indigo-300/60 leading-tight tracking-wider uppercase">
            Bhimavaram
          </p>
        </div>
      )}
    </div>

    {/* Nav Links */}
    <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
      {links.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          onClick={() => setMobileOpen?.(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm relative group ${
              isActive
                ? "text-white font-semibold"
                : "text-slate-400 hover:text-white"
            } ${collapsed ? "justify-center" : ""}`
          }
          style={({ isActive }) =>
            isActive
              ? {
                  background:
                    "linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.12) 100%)",
                  boxShadow: "inset 0 0 0 1px rgba(99,102,241,0.12)",
                }
              : undefined
          }
          title={collapsed ? label : ""}
        >
          {({ isActive }) => (
            <>
              {/* Active indicator bar */}
              {isActive && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                  style={{ background: "var(--gradient-accent)" }}
                />
              )}
              <Icon
                size={19}
                className={`shrink-0 transition-all duration-300 ${
                  collapsed ? "group-hover:scale-110" : ""
                } ${isActive ? "text-indigo-300" : ""}`}
              />
              {!collapsed && <span>{label}</span>}
            </>
          )}
        </NavLink>
      ))}
    </nav>

    {/* User Mini Profile */}
    <div
      className={`p-4 border-t border-white/6 transition-all ${
        collapsed ? "flex flex-col items-center gap-3" : ""
      }`}
    >
      {!collapsed ? (
        <div className="flex items-center gap-3 rounded-xl p-3 mb-3 transition-colors"
          style={{ background: "rgba(255,255,255,0.04)" }}
        >
          {userProfile?.photoURL ? (
            <img
              src={userProfile.photoURL}
              alt=""
              className="w-10 h-10 rounded-lg object-cover ring-2 ring-indigo-500/20"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-inner"
              style={{ background: "var(--gradient-accent)" }}
            >
              {userProfile?.name?.[0] || "U"}
            </div>
          )}
          <div className="overflow-hidden flex-1">
            <p className="text-sm font-semibold text-white truncate">
              {userProfile?.name || "User"}
            </p>
            <p className="text-xs text-indigo-300/60 capitalize font-medium">{userRole}</p>
          </div>
        </div>
      ) : (
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center mb-2 text-white font-bold"
          title={userProfile?.name}
          style={{ background: "var(--gradient-accent)" }}
        >
          {userProfile?.name?.[0] || "U"}
        </div>
      )}

      <div className={`flex ${collapsed ? "flex-col" : "gap-2"}`}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center w-full p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/6 transition-all focus:outline-none"
          title="Toggle Sidebar"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        <button
          onClick={handleLogout}
          className={`flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-white transition-all focus:outline-none ${
            !collapsed ? "flex-1 gap-2" : "w-full"
          }`}
          style={{ background: "transparent" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.15)";
            e.currentTarget.style.color = "#fca5a5";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "";
          }}
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
