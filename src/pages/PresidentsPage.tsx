import React, { useEffect, useRef, useState } from "react";
import { Calendar, Crown, Award, ChevronDown, ChevronUp } from "lucide-react";
import Navbar from "../components/shared/Navbar";
import Footer from "../components/shared/Footer";
import { useTranslation } from "react-i18next";
import { subscribePresidents } from "../services/presidentsService";
import type { President } from "../types/president.types";

const ERA_COLORS = [
  { bg: "from-amber-400 to-orange-500",   border: "border-amber-200", text: "text-amber-600",  badge: "bg-amber-100 text-amber-700",   bar: "from-amber-400 to-orange-400",   glow: "shadow-amber-200"   },
  { bg: "from-sky-400 to-blue-600",       border: "border-sky-200",   text: "text-sky-600",    badge: "bg-sky-100 text-sky-700",       bar: "from-sky-400 to-blue-500",       glow: "shadow-sky-200"     },
  { bg: "from-violet-400 to-purple-600",  border: "border-violet-200",text: "text-violet-600", badge: "bg-violet-100 text-violet-700", bar: "from-violet-400 to-purple-500",  glow: "shadow-violet-200"  },
  { bg: "from-emerald-400 to-teal-600",   border: "border-emerald-200",text:"text-emerald-600",badge: "bg-emerald-100 text-emerald-700",bar: "from-emerald-400 to-teal-500",   glow: "shadow-emerald-200" },
];

const PresidentsPage: React.FC = () => {
  const { t } = useTranslation();
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [presidents, setPresidents] = useState<President[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => subscribePresidents(setPresidents), []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("animate-in")),
      { threshold: 0.08 }
    );
    cardRefs.current.forEach((ref) => ref && observer.observe(ref));
    return () => observer.disconnect();
  }, [presidents]);

  const reversed = [...presidents].reverse();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-100 scrollbar-hide">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Playfair Display', serif; }
        .font-body    { font-family: 'DM Sans', sans-serif; }

        .observe-card { opacity: 0; transform: translateY(32px); transition: opacity 0.65s cubic-bezier(0.22,1,0.36,1), transform 0.65s cubic-bezier(0.22,1,0.36,1); }
        .observe-card.animate-in { opacity: 1; transform: translateY(0); }

        .hero-word { display: inline-block; animation: wordUp 0.8s cubic-bezier(0.16,1,0.3,1) forwards; opacity: 0; transform: translateY(60px); }
        .hero-word:nth-child(2) { animation-delay: 0.1s; }
        .hero-word:nth-child(3) { animation-delay: 0.2s; }
        @keyframes wordUp { to { opacity:1; transform:translateY(0); } }

        .pcard { transition: transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s ease; }
        .pcard:hover { transform: translateY(-3px); box-shadow: 0 20px 50px rgba(0,0,0,0.10); }

        .img-pan img { transition: transform 0.6s cubic-bezier(0.16,1,0.3,1); }
        .img-pan:hover img { transform: scale(1.05); }

        .stat-pill { transition: transform 0.25s ease; }
        .stat-pill:hover { transform: translateY(-3px); }

        .tl-dot { transition: transform 0.25s ease; }
        .tl-item:hover .tl-dot { transform: translateX(-50%) scale(1.35); }
      `}</style>

      <Navbar />

      {/* ══════════════ HERO ══════════════ */}
      <section className="relative pt-20 pb-8 sm:pt-28 sm:pb-14 px-5 overflow-hidden font-body">
        <div className="absolute -top-10 -left-10 w-72 h-72 rounded-full bg-indigo-300/20 blur-[70px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-amber-300/15 blur-[70px] pointer-events-none" />

        <div className="max-w-6xl mx-auto relative">

          {/* Pill label */}
          <div className="inline-flex items-center gap-2 bg-white border border-indigo-100 rounded-full px-4 py-1.5 mb-5 shadow-sm">
            <Crown size={12} className="text-indigo-500" />
            <span className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.16em]">BCTA Leadership</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end gap-8 lg:gap-16">
            {/* Title */}
            <div className="flex-1">
              <h1 className="font-display font-black leading-[0.88] text-slate-900 mb-4" style={{ fontSize: "clamp(2.6rem,7vw,5rem)" }}>
                <span className="hero-word block">{t("presidents.the")}</span>
                <span className="hero-word block bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">{t("presidents.presidentsTitle")}</span>
                <span className="hero-word block">{t("presidents.ofBCTA")}</span>
              </h1>
              <p className="text-slate-500 text-base sm:text-lg max-w-md leading-relaxed">{t("presidents.subtitle")}</p>
            </div>

            {/* Stats */}
            <div className="flex flex-row lg:flex-col gap-3 lg:min-w-[170px]">
              {[
                { v: "6+",                       l: t("presidents.yearsActive"),     g: "from-amber-400 to-orange-400"  },
                { v: String(presidents.length),  l: t("presidents.presidentsLabel"), g: "from-indigo-500 to-violet-500" },
                { v: "260+",                     l: t("presidents.membersLabel"),    g: "from-emerald-400 to-teal-500"  },
              ].map((s, i) => (
                <div key={i} className="stat-pill flex-1 lg:flex-none bg-white rounded-2xl px-4 py-3 border border-slate-100 shadow-sm">
                  <div className={`font-display text-2xl lg:text-3xl font-black leading-none bg-gradient-to-r ${s.g} bg-clip-text text-transparent`}>{s.v}</div>
                  <div className="text-[10px] text-slate-400 font-semibold mt-1 uppercase tracking-wider leading-tight">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ MOBILE CARDS ══════════════ */}
      <section className="sm:hidden px-4 pb-12 space-y-5 font-body">
        {reversed.map((president, index) => {
          const color = ERA_COLORS[index % ERA_COLORS.length];
          const isFirst = index === 0;
          const isOpen = expanded === president.id;

          return (
            <div key={president.id} className="bg-white rounded-3xl overflow-hidden shadow-md border border-slate-100">

              {/* Image — tall portrait */}
              <div className="relative h-64 img-pan overflow-hidden">
                <img src={president.imageUrl} alt={president.name} className="w-full h-full object-cover object-top" />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                {/* Top badges */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  {isFirst ? (
                    <div className="flex items-center gap-1.5 bg-emerald-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      {t("presidents.current")}
                    </div>
                  ) : <div />}
                  <div className={`text-[10px] font-black px-2.5 py-1 rounded-full ${color.badge} shadow-sm`}>
                    #{reversed.length - index}
                  </div>
                </div>

                {/* Name + year at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-display text-2xl font-black text-white leading-tight">{president.name}</h3>
                  <div className="flex items-center gap-1.5 text-white/70 text-xs font-semibold mt-1.5">
                    <Calendar size={11} />
                    <span>{president.year}</span>
                  </div>
                </div>
              </div>

              {/* Description toggle */}
              <button
                onClick={() => setExpanded(isOpen ? null : president.id)}
                className="w-full flex items-center justify-between px-4 py-3 border-t border-slate-100 text-left"
              >
                <span className={`text-[11px] font-black uppercase tracking-widest ${color.text}`}>
                  {t("presidents.presidentBCTA")}
                </span>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <span className="text-[11px] font-semibold">{isOpen ? "Less" : "Read more"}</span>
                  {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              {/* Expandable description */}
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-60" : "max-h-0"}`}>
                <div className="px-4 pb-5">
                  <p className="text-slate-500 text-sm leading-relaxed">{president.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* ══════════════ DESKTOP CARDS ══════════════ */}
      <section className="hidden sm:block max-w-6xl mx-auto px-4 py-10 font-body space-y-5">
        {reversed.map((president, index) => {
          const color = ERA_COLORS[index % ERA_COLORS.length];
          const isFirst = index === 0;
          return (
            <div
              key={president.id}
              ref={(el) => { cardRefs.current[index] = el; }}
              className="observe-card pcard bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm"
              style={{ transitionDelay: `${index * 0.06}s` }}
            >
              <div className="flex">
                {/* Left accent bar */}
                <div className={`w-1.5 shrink-0 bg-gradient-to-b ${color.bar}`} />

                {/* Image */}
                <div className="relative w-52 lg:w-64 shrink-0 img-pan overflow-hidden">
                  <img src={president.imageUrl} alt={president.name} className="w-full h-full min-h-[280px] object-cover object-top" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                  {/* Number badge */}
                  <div className={`absolute top-4 left-4 w-8 h-8 rounded-xl bg-gradient-to-br ${color.bg} flex items-center justify-center shadow-md`}>
                    <span className="text-white font-black text-sm">{reversed.length - index}</span>
                  </div>

                  {isFirst && (
                    <div className="absolute bottom-4 left-4 flex items-center gap-1.5 bg-emerald-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      {t("presidents.current")}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 p-7 lg:p-9 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${color.badge}`}>
                        {t("presidents.presidentBCTA")}
                      </span>
                      <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                        <Calendar size={12} />
                        <span className="font-medium">{president.year.includes("Present") ? president.year.replace("Present", t("presidents.present")) : president.year}</span>
                      </div>
                    </div>

                    <h2 className="font-display text-3xl lg:text-4xl font-black text-slate-900 leading-tight mb-2">{president.name}</h2>
                    <div className={`w-10 h-1 rounded-full bg-gradient-to-r ${color.bar} mb-4`} />
                    <p className="text-slate-500 text-[15px] leading-relaxed">{president.description}</p>
                  </div>

                  <div className={`flex mt-6 pt-5 border-t ${color.border} items-center gap-3 flex-wrap`}>
                    <div className={`flex items-center gap-2 bg-gradient-to-r ${color.bg} bg-opacity-10 rounded-xl px-4 py-2`}>
                      <Award size={13} className={color.text} />
                      <span className={`text-xs font-black ${color.text}`}>{t("presidents.presidentBCTA")}</span>
                    </div>
                    {isFirst && (
                      <div className="ml-auto flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-black text-emerald-600">{t("presidents.inOffice")}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* ══════════════ TIMELINE (desktop only) ══════════════ */}
      {presidents.length > 0 && (
        <section className="hidden sm:block py-20 px-4 font-body relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-50/30 to-transparent pointer-events-none" />
          <div className="max-w-4xl mx-auto relative">
            <div className="text-center mb-14">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-500">{t("presidents.history")}</span>
              <h2 className="font-display text-4xl sm:text-5xl font-black text-slate-900 mt-2">{t("presidents.leadershipTimeline")}</h2>
              <div className="w-14 h-1 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full mx-auto mt-4" />
            </div>

            <div className="relative">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-slate-200 to-transparent -translate-x-1/2" />
              <div className="space-y-10">
                {presidents.map((president, index) => {
                  const color = ERA_COLORS[index % ERA_COLORS.length];
                  const isRight = index % 2 !== 0;
                  return (
                    <div key={president.id} className={`tl-item relative flex items-center ${isRight ? "flex-row-reverse" : "flex-row"}`}>
                      <div className={`flex-1 ${isRight ? "pl-12" : "pr-12"}`}>
                        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all">
                          <div className={`text-[10px] font-black uppercase tracking-widest mb-1.5 ${color.text}`}>{president.year}</div>
                          <div className="font-display text-xl font-black text-slate-900">{president.name}</div>
                          <p className="text-slate-400 text-sm mt-1.5 line-clamp-2 leading-relaxed">{president.description}</p>
                        </div>
                      </div>
                      <div className={`absolute left-1/2 -translate-x-1/2 z-10 tl-dot w-5 h-5 rounded-full bg-gradient-to-br ${color.bg} border-4 border-white shadow-lg ${color.glow}`} />
                      <div className="flex-1 flex items-center justify-center">
                        <div className={`w-20 h-20 rounded-2xl overflow-hidden border-2 ${color.border} shadow-lg`}>
                          <img src={president.imageUrl} alt={president.name} className="w-full h-full object-cover" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default PresidentsPage;
