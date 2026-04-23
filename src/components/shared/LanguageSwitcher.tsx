import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Check } from "lucide-react";

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧", short: "EN" },
  { code: "te", label: "తెలుగు", flag: "🇮🇳", short: "తె" },
];

interface LanguageSwitcherProps {
  variant?: "light" | "dark";
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ variant = "light" }) => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  const switchLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  const isDark = variant === "dark";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
          isDark
            ? "text-slate-300 hover:text-white hover:bg-white/10"
            : "text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/80"
        }`}
        aria-label={t("common.switchLanguage")}
        title={t("common.switchLanguage")}
      >
        <Globe size={15} className={isDark ? "text-indigo-300" : "text-indigo-500"} />
        <span className="hidden sm:inline">{currentLang.short}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-44 rounded-xl overflow-hidden shadow-xl border z-50 animate-scale-in"
          style={{
            background: "rgba(255,255,255,0.97)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderColor: "rgba(226,232,240,0.8)",
          }}
        >
          {/* Gradient accent strip */}
          <div
            className="h-[3px]"
            style={{ background: "var(--gradient-accent)" }}
          />
          <div className="px-3 py-2.5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
              {t("common.language")}
            </p>
            {LANGUAGES.map((lang) => {
              const isActive = i18n.language === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => switchLanguage(lang.code)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-base">{lang.flag}</span>
                  <span className="flex-1 text-left">{lang.label}</span>
                  {isActive && (
                    <Check size={14} className="text-indigo-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
