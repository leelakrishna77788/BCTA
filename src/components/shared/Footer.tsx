import React from "react";
import { Link } from "react-router-dom";
import {
  MapPin,
  Star,
  Phone,
  Mail,
  Facebook,
  Instagram,
  Youtube,
  MessageCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer
      id="footer"
      className="relative bg-slate-950 text-white px-5 sm:px-8 py-12 sm:py-20 overflow-hidden"
    >
      {/* Gradient top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-[4px]"
        style={{
          background:
            "linear-gradient(to right, var(--color-indigo-500), var(--color-violet-500))",
        }}
      />

      {/* Background glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[100px]" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* MAIN GRID */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-white/5">
          {/* Section 1 */}
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-4 sm:space-y-6">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20"
                style={{ background: "var(--gradient-accent)" }}
              >
                <span className="text-white font-black text-sm">BCTA</span>
              </div>
              <div>
                <span className="font-black text-lg">{t("footer.bctaPortal")}</span>
                    <p className="text-slate-600/70">
                      {t("contact.bhimavaramAP")}
                    </p>
              </div>
            </div>

            <p className="text-sm text-slate-400 max-w-xs">
              {t("footer.tagline")}
            </p>

            {/* Social */}
            <div className="flex justify-center sm:justify-start gap-4">
              {[Facebook, MessageCircle, Instagram, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Section 2 + 3 Wrapper (Mobile Side-by-Side) */}
          <div className="grid grid-cols-2 gap-6 items-start md:contents">
            {" "}
            {/* Section 2 */}
            <div className="flex flex-col items-start text-left w-full">
              <h4 className="text-xs font-black uppercase mb-3">{t("footer.platform")}</h4>
              <div className="space-y-2 w-full">
                {[
                  { to: "/", label: t("footer.home") },
                  { to: "/services", label: t("footer.ourServices") },
                  { to: "/about", label: t("footer.aboutBCTA") },
                  { to: "/presidents", label: t("footer.leadership") },
                ].map((link) => (
                  <Link
                    key={link.to + link.label}
                    to={link.to}
                    className="block text-slate-400 hover:text-white text-sm"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            {/* Section 3 */}
            <div className="flex flex-col items-start text-left w-full">
              <h4 className="text-xs font-black uppercase mb-3">
                {t("footer.systemAccess")}
              </h4>
              <div className="space-y-2 w-full">
                {[
                  { to: "/login", label: t("footer.memberLogin") },
                  { to: "/login", label: t("footer.adminConsole") },
                  { to: "/register", label: t("footer.registerMember") },
                  { to: "/contact", label: t("footer.getSupport") },
                ].map((link) => (
                  <Link
                    key={link.label}
                    to={link.to}
                    className="block text-slate-400 hover:text-white text-sm"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4 */}
          <div className="flex flex-col items-center text-center sm:items-start sm:text-left space-y-4">
            <h4 className="text-xs font-black uppercase mb-6">{t("footer.contact")}</h4>

            <a href="#" className="text-slate-400 text-sm">
              support@bcta.in
            </a>
            <a href="#" className="text-slate-400 text-sm">
              +91 98765 43210
            </a>

            <p className="text-xs text-slate-500">{t("footer.location")}</p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-center md:justify-between gap-4 pt-8 text-xs text-slate-500 text-center">
          <p>{t("footer.copyright")}</p>
          <p>{t("footer.motto")}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
