import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { assets } from "../../assets/assets";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";

  const navLinks = [
    { to: "/", label: t("nav.home") },
    { to: "/about", label: t("nav.about") },
    { to: "/services", label: t("nav.services") },
    { to: "/presidents", label: t("nav.presidents") },
    { to: "/contact", label: t("nav.contact") },
  ];

  useEffect(() => {
    const handleScroll = (): void => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/80 backdrop-blur-xl shadow-[0_1px_3px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.04)]"
          : "bg-white/50 backdrop-blur-md"
      }`}
    >
      {/* Gradient bottom border */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-[2px] transition-opacity duration-500 ${
          scrolled ? "opacity-100" : "opacity-0"
        }`}
        style={{ background: "var(--gradient-accent)" }}
      />

      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative">
        {/* LOGO */}
        <div className="flex items-center ml-1">
          <Link
            to="/"
            className="flex items-center group"
            style={{
              transform: isHome
                ? "scale(1.5) translateY(10px)"
                : "scale(1) translateY(0px)",
              filter: isHome
                ? "drop-shadow(0 0 20px rgba(99,102,241,0.4))"
                : "none",
              transition: "all 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
              willChange: "transform",
              display: "inline-flex",
            }}
          >
            <img
              src={assets.logo}
              alt="BCTA Logo"
              className="w-10 h-10 sm:w-14 sm:h-14 object-contain rounded-xl transition-transform duration-300 group-hover:scale-105 shadow-sm"
            />
          </Link>
        </div>

        {/* DESKTOP NAV */}
        <nav className="hidden md:flex gap-1 lg:gap-2 absolute left-1/2 -translate-x-1/2">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`relative px-4 py-2 rounded-lg text-sm lg:text-[15px] font-medium transition-all duration-300 ${
                  isActive
                    ? "text-indigo-700 bg-indigo-50/80"
                    : "text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/50"
                }`}
              >
                {link.label}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-full"
                    style={{ background: "var(--gradient-accent)" }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* RIGHT SECTION */}
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher variant="light" />

          <Link
            to="/login"
            className="relative inline-flex items-center justify-center px-5 sm:px-6 py-2 text-sm font-semibold text-white rounded-xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_20px_rgba(99,102,241,0.25)] hover:-translate-y-0.5 active:translate-y-0"
            style={{ background: "var(--gradient-primary)" }}
          >
            <span className="relative z-10">{t("nav.login")}</span>
          </Link>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-all duration-200"
            aria-label={t("common.toggleMenu")}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-400 ${
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
        style={{
          transitionTimingFunction: "var(--ease-out-expo)",
        }}
      >
        <nav className="px-4 pb-4 pt-1 space-y-1 bg-white/90 backdrop-blur-xl border-t border-slate-100/80">
          {navLinks.map((link, i) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center px-4 py-3 rounded-xl font-medium text-[15px] transition-all duration-200 ${
                  isActive
                    ? "text-indigo-700 bg-indigo-50/80"
                    : "text-slate-600 hover:text-indigo-700 hover:bg-slate-50"
                }`}
                style={{
                  animationDelay: menuOpen ? `${i * 50}ms` : "0ms",
                }}
              >
                {isActive && (
                  <span
                    className="w-1.5 h-1.5 rounded-full mr-3"
                    style={{ background: "var(--gradient-accent)" }}
                  />
                )}
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
