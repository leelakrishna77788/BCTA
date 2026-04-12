import React, { useEffect, useRef } from "react";
import { Calendar, Award, Users, TrendingUp, ChevronDown } from "lucide-react";
import { presidents } from "../assets/assets";
import Navbar from "../components/shared/Navbar";
import Footer from "../components/shared/Footer";

const ERA_COLORS = [
  { bg: "from-amber-400 to-orange-500", light: "bg-amber-50", border: "border-amber-200", text: "text-amber-600", dot: "bg-amber-500", badge: "bg-amber-100 text-amber-700" },
  { bg: "from-sky-400 to-blue-600", light: "bg-sky-50", border: "border-sky-200", text: "text-sky-600", dot: "bg-sky-500", badge: "bg-sky-100 text-sky-700" },
  { bg: "from-violet-400 to-purple-600", light: "bg-violet-50", border: "border-violet-200", text: "text-violet-600", dot: "bg-violet-500", badge: "bg-violet-100 text-violet-700" },
  { bg: "from-emerald-400 to-teal-600", light: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-600", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700" },
];

const DESCRIPTIONS = [
  "Led BCTA through its founding years, establishing the foundation for a strong community of mobile repair technicians. Pioneered the first member registration system and organized initial training workshops.",
  "Expanded BCTA's reach across Bhimavaram, introducing quality standards and professional ethics. Launched the first annual technical conference and strengthened member collaboration.",
  "Modernized BCTA operations with digital tools and online platforms. Implemented the QR-based attendance system and enhanced member communication channels for better connectivity.",
  "Currently leading BCTA towards innovation and excellence. Focusing on skill development programs, industry partnerships, and leveraging technology to empower all members.",
];

const MEMBERS = ["50+ Members", "120+ Members", "200+ Members", "260+ Members"];
const ERAS = ["Foundation Era", "Growth Phase", "Digital Transform", "Innovation Era"];

const PresidentsPage: React.FC = () => {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-in");
          }
        });
      },
      { threshold: 0.15 }
    );
    cardRefs.current.forEach((ref) => ref && observer.observe(ref));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-indigo-100 font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500;600&display=swap');

        .font-display { font-family: 'Playfair Display', serif; }
        .font-body { font-family: 'DM Sans', sans-serif; }

        .observe-card {
          opacity: 1;
          transform: translateY(30px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .observe-card.animate-in {
          opacity: 1;
          transform: translateY(0);
        }

        .hero-line {
          overflow: hidden;
        }
        .hero-line span {
          display: inline-block;
          animation: slideUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
          transform: translateY(100%);
        }
        .hero-line:nth-child(2) span { animation-delay: 0.15s; }
        .hero-line:nth-child(3) span { animation-delay: 0.3s; }
        @keyframes slideUp {
          to { opacity: 1; transform: translateY(0); }
        }

        .card-hover {
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .card-hover:hover {
          transform: translateY(-6px);
          box-shadow: 0 24px 60px rgba(0,0,0,0.12);
        }

        .image-zoom img {
          transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .image-zoom:hover img {
          transform: scale(1.07);
        }

        .stat-card {
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .stat-card:hover {
          transform: translateY(-8px) rotate(-1deg);
        }

        .timeline-dot {
          transition: all 0.3s ease;
        }
        .timeline-item:hover .timeline-dot {
          transform: scale(1.5);
        }
      `}</style>

      <Navbar />

      {/* ── HERO ── */}
      <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-24 px-4 overflow-hidden font-body">
        {/* Floating color blobs */}
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-amber-300/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-96 h-96 rounded-full bg-violet-300/20 blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto relative">
          <div className="flex flex-col lg:flex-row lg:items-end gap-8 lg:gap-16">
            <div className="flex-1">
              {/* Label */}
              <div className="inline-flex items-center gap-2 border border-slate-300 rounded-full px-4 py-1.5 mb-8 bg-white/60 backdrop-blur-sm">
                <Award size={14} className="text-amber-500" />
                <span className="text-xs font-semibold text-slate-600 tracking-widest uppercase">BCTA Leadership</span>
              </div>

              {/* Big heading */}
              <h1 className="font-display text-[clamp(3rem,8vw,7rem)] font-black leading-[0.92] text-slate-900 mb-8">
                <div className="hero-line"><span>The</span></div>
                <div className="hero-line"><span className="text-amber-500">Presidents</span></div>
                <div className="hero-line"><span>of BCTA</span></div>
              </h1>

              <p className="font-body text-slate-500 text-base sm:text-lg max-w-md leading-relaxed">
                Four leaders. One vision. The dedicated presidents who have shaped BCTA into a thriving community of mobile repair professionals since its founding.
              </p>
            </div>

            {/* Stats stack */}
            <div className="flex flex-row lg:flex-col gap-4 lg:gap-3 lg:pb-4 lg:min-w-[200px]">
              {[
                { value: "6+", label: "Years Active", color: "bg-amber-400" },
                { value: "4", label: "Presidents", color: "bg-violet-500" },
                { value: "260+", label: "Members", color: "bg-emerald-500" },
              ].map((s, i) => (
                <div key={i} className="flex-1 lg:flex-none bg-white rounded-2xl px-5 py-4 border border-slate-200 shadow-sm flex lg:flex-row items-center gap-3 stat-card">
                  <div className={`w-2 h-8 rounded-full ${s.color} shrink-0`} />
                  <div>
                    <div className="font-display text-2xl font-black text-slate-900 leading-none">{s.value}</div>
                    <div className="text-xs text-slate-400 font-medium mt-0.5">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scroll hint */}
          <div className="mt-12 flex items-center gap-3 text-slate-400">
            <div className="w-12 h-px bg-slate-300" />
            <ChevronDown size={16} className="animate-bounce" />
            <span className="text-xs tracking-widest uppercase">Scroll to explore</span>
          </div>
        </div>
      </section>

      {/* ── PRESIDENTS CARDS ── */}
      <section className="max-w-6xl mx-auto px-4 py-16 sm:py-24 space-y-8 font-body">
        {presidents.map((president, index) => {
          const color = ERA_COLORS[index % ERA_COLORS.length];
          const isLast = index === presidents.length - 1;

          return (
            <div
              key={index}
              ref={(el) => { cardRefs.current[index] = el; }}
              className={`observe-card card-hover bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-md`}
              style={{ transitionDelay: `${index * 0.08}s` }}
            >
              <div className="flex flex-col sm:flex-row">

                {/* Left: number + image */}
                <div className="relative sm:w-64 shrink-0">


                  {/* Current badge */}
                  {isLast && (
                    <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-emerald-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      Current
                    </div>
                  )}

                  {/* Image */}
                  <div className="image-zoom w-full h-72 sm:h-full min-h-[280px] overflow-hidden">
                    <img
                      src={president.image}
                      alt={president.name}
                      className="w-full h-full object-cover object-top"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t from-black/40 to-transparent`} />
                  </div>
                </div>

                {/* Right: content */}
                <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between">
                  <div>
                    {/* Era badge + year */}
                    <div className="hidden sm:flex items-center gap-3 mb-4 flex-wrap">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${color.badge}`}>
                        {ERAS[index]}
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-400 text-sm font-medium">
                        <Calendar size={13} />
                        {president.year}
                      </span>
                    </div>

                    {/* Name */}
                    <h2 className="font-display text-3xl sm:text-4xl font-black text-slate-900 leading-tight mb-1">
                      {president.name}
                    </h2>
                    {/* Year — visible on mobile only */}
                    <div className="flex sm:hidden items-center gap-1.5 text-slate-400 text-sm font-medium mb-1">
                      <Calendar size={13} />
                      <span>{president.year}</span>
                    </div>
                    <p className={`hidden sm:block text-sm font-semibold ${color.text} mb-5`}>President, BCTA</p>

                    {/* Description */}
                    <p className="hidden sm:block text-slate-500 text-sm sm:text-base leading-relaxed">
                      {DESCRIPTIONS[index]}
                    </p>
                  </div>

                  {/* Footer row */}
                  <div className={`hidden sm:flex mt-6 pt-5 border-t ${color.border} flex-wrap items-center gap-3`}>
                    <div className={`flex items-center gap-2 ${color.light} rounded-xl px-4 py-2`}>
                      <Users size={14} className={color.text} />
                      <span className={`text-xs font-black ${color.text}`}>{MEMBERS[index]}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-2">
                      <TrendingUp size={14} className="text-slate-500" />
                      <span className="text-xs font-black text-slate-600">{ERAS[index]}</span>
                    </div>
                    {isLast && (
                      <div className="ml-auto flex items-center gap-1.5 text-emerald-600 text-xs font-black">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        In office
                      </div>
                    )}
                  </div>
                </div>
              </div>


            </div>
          );
        })}
      </section>

      {/* ── TIMELINE ── */}
      <section className="py-16 sm:py-24 px-4 font-body overflow-hidden relative">
        <div className="max-w-4xl mx-auto relative">
          <div className="text-center mb-14">
            <span className="text-xs font-black uppercase tracking-widest text-indigo-500">History</span>
            <h2 className="font-display text-4xl sm:text-5xl font-black text-slate-900 mt-3">
              Leadership Timeline
            </h2>
          </div>

          {/* Vertical line */}
          <div className="relative">
            <div className="absolute left-6 sm:left-1/2 top-0 bottom-0 w-px bg-slate-200 sm:-translate-x-1/2" />

            <div className="space-y-10">
              {presidents.map((president, index) => {
                const color = ERA_COLORS[index % ERA_COLORS.length];
                const isRight = index % 2 !== 0;

                return (
                  <div key={index} className={`timeline-item relative flex items-center gap-6 sm:gap-0 ${isRight ? "sm:flex-row-reverse" : "sm:flex-row"}`}>
                    {/* Content */}
                    <div className={`flex-1 pl-16 sm:pl-0 ${isRight ? "sm:pl-10" : "sm:pr-10"}`}>
                      <div className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-slate-300 shadow-sm transition-colors">
                        <div className={`text-[10px] font-black uppercase tracking-widest mb-2 ${color.text}`}>{ERAS[index]}</div>
                        <div className="font-display text-xl font-black text-slate-900">{president.name}</div>
                        <div className="flex items-center gap-1.5 mt-1.5 text-slate-400 text-sm">
                          <Calendar size={12} />
                          <span>{president.year}</span>
                        </div>
                      </div>
                    </div>

                    {/* Center dot */}
                    <div className={`absolute left-6 sm:left-1/2 sm:-translate-x-1/2 z-10 timeline-dot w-4 h-4 rounded-full bg-gradient-to-br ${color.bg} border-4 border-white shadow-lg`} />

                    {/* Image — right side on desktop */}
                    <div className="hidden sm:flex flex-1 items-center justify-center">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-xl">
                        <img src={president.image} alt={president.name} className="w-full h-full object-cover" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PresidentsPage;