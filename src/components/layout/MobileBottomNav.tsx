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

interface MobileBottomNavProps {
  onMenuClick: () => void;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onMenuClick }) => {
  const { userRole } = useAuth();
  const normalizedRole = userRole?.toLowerCase().trim() || "";
  const isAdmin = normalizedRole === "admin" || normalizedRole === "superadmin";

  const adminNav = [
    { to: "/admin/dashboard", icon: LayoutDashboard, label: "Home" },
    { to: "/admin/members", icon: Users, label: "Members" },
    { to: "/admin/payments", icon: CreditCard, label: "Payments" },
  ];

  const memberNav = [
    { to: "/member/dashboard", icon: LayoutDashboard, label: "Home" },
    { to: "/member/scan", icon: Smartphone, label: "Scan" },
    { to: "/member/profile", icon: User, label: "Profile" },
  ];

  const links = isAdmin ? adminNav : memberNav;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl border-t border-slate-200/60 pb-safe md:hidden shadow-[0_-4px_24px_rgba(0,0,0,0.04)]"
      style={{
        background: "linear-gradient(120deg, #1e3a8a 50%, #ffffff 50%)",
      }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 ${
                isActive
                  ? "text-indigo-600 font-bold translate-y-[-2px]"
                  : "text-slate-500 hover:text-slate-900"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`p-1.5 rounded-xl transition-all duration-300 ${
                    isActive ? "bg-indigo-50 text-indigo-600 shadow-sm" : ""
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

        {/* More / Menu Menu trigger */}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 text-slate-500 hover:text-slate-900 focus:outline-none"
        >
          <div className="p-1.5 rounded-xl transition-all duration-300">
            <Menu size={22} />
          </div>
          <span className="text-[10px] tracking-wide">More</span>
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
