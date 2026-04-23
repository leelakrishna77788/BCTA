import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Menu,
  Smartphone,
  User,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";

interface MobileBottomNavProps {
  onMenuClick: () => void;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onMenuClick }) => {
  const { userRole } = useAuth();
  const { t } = useTranslation();
  const normalizedRole = userRole?.toLowerCase().trim() || "";
  const isAdmin = normalizedRole === "admin" || normalizedRole === "superadmin";

  const adminNav = [
    { to: "/admin/dashboard", icon: LayoutDashboard, label: t("bottomNav.home") },
    { to: "/admin/members", icon: Users, label: t("bottomNav.members") },
    { to: "/admin/payments", icon: CreditCard, label: t("bottomNav.payments") },
  ];

  const memberNav = [
    { to: "/member/dashboard", icon: LayoutDashboard, label: t("bottomNav.home") },
    { to: "/member/scan", icon: Smartphone, label: t("bottomNav.scan") },
    { to: "/member/profile", icon: User, label: t("bottomNav.profile") },
  ];

  const links = isAdmin ? adminNav : memberNav;

  return (
    <nav
      className="flex lg:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl border-t border-slate-200/60 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.04)]"
      style={{
        background: "linear-gradient(115deg, #1e3a8a 50%, #ffffff 50%)",
      }}
    >
      {/* ✅ CORRECT CONTAINER */}
      <div className="flex items-center h-16 px-6 w-full">
        {/* NAV LINKS */}
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-all duration-200 ${
                isActive ? "text-indigo-600 font-bold" : "text-slate-500"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`p-2 rounded-xl transition-all duration-300 ${
                    isActive ? "bg-indigo-50 text-indigo-600" : ""
                  }`}
                >
                  <link.icon
                    size={22}
                    className={isActive ? "animate-breathe" : ""}
                  />
                </div>
                <span className="text-[10px] tracking-wide">{link.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* MORE BUTTON */}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-all duration-200 text-slate-500 hover:text-slate-900 focus:outline-none"
        >
          <div className="p-2 rounded-xl transition-all duration-300">
            <Menu size={22} />
          </div>
          <span className="text-[10px] tracking-wide">{t("bottomNav.more")}</span>
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
