import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  QrCode,
  Users,
  CreditCard,
  Shield,
  Bell,
  Smartphone,
  ChevronDown,
  CheckCircle,
  ArrowRight,
  MapPin,
  Star,
  Clock,
  MessageSquare,
  Droplet,
  ScanLine,
  Package,
  Zap,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { assets, presidents } from "../assets/assets";
import Navbar from "../components/shared/Navbar";
import Footer from "../components/shared/Footer";

/* ─── Intersection Observer reveal ─── */
function useReveal<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.1,
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/* ─── Animated counter ─── */
interface CounterProps {
  end: number;
  suffix?: string;
}
function Counter({ end, suffix = "" }: CounterProps) {
  const [count, setCount] = useState(0);
  const [ref, visible] = useReveal<HTMLSpanElement>();

  useEffect(() => {
    if (!visible) return;
    let n = 0;
    const step = Math.ceil(end / 60);
    const t = setInterval(() => {
      n = Math.min(n + step, end);
      setCount(n);
      if (n >= end) clearInterval(t);
    }, 22);
    return () => clearInterval(t);
  }, [visible, end]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ─── Generic reveal wrapper ─── */
interface RevealProps {
  children: React.ReactNode;
  className?: string;
  dx?: number;
  dy?: number;
  delay?: number;
}
function Reveal({
  children,
  className = "",
  dx = 0,
  dy = 28,
  delay = 0,
}: RevealProps) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translate(0,0)" : `translate(${dx}px,${dy}px)`,
        transition: `opacity 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

const SERVICES = [
  {
    id: 1,
    title: "Mobile Screen Replacement",
    description:
      "Expert screen replacement services for all smartphone brands. We use high-quality original and compatible displays with warranty coverage.",
    features: [
      "LCD/OLED Replacement",
      "Touch Digitizer Repair",
      "Gorilla Glass Installation",
      "Same Day Service",
    ],
    gradient: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    icon: "📱",
  },
  {
    id: 2,
    title: "Battery Replacement & Repair",
    description:
      "Professional battery replacement for all mobile devices. Restore your phone's battery life with genuine and high-capacity batteries.",
    features: [
      "Original Batteries",
      "Fast Charging Support",
      "Battery Health Check",
      "Instant Replacement",
    ],
    gradient: "linear-gradient(135deg, #10b981, #059669)",
    icon: "🔋",
  },
  {
    id: 3,
    title: "Motherboard & IC Repair",
    description:
      "Advanced motherboard-level repairs including IC replacement, reballing, and circuit repair. We fix charging issues, network problems, and boot failures.",
    features: [
      "IC Replacement",
      "BGA Reballing",
      "Circuit Repair",
      "Water Damage Recovery",
    ],
    gradient: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
    icon: "🔧",
  },
  {
    id: 4,
    title: "Software & Unlocking Services",
    description:
      "Complete software solutions including OS installation, unlocking, data recovery, and virus removal. Keep your device running smoothly.",
    features: [
      "OS Installation",
      "Pattern/FRP Unlock",
      "Data Recovery",
      "Software Updates",
    ],
    gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
    icon: "💻",
  },
];

/* ── Live Stats Hook ── */
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

function usePlatformStats() {
  const [stats, setStats] = useState({
    members: 0,
    meetings: 0,
    scans: 0,
    payments: 0,
  });

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    const handleError = (collectionName: string) => (err: any) => {
      console.warn(
        `[LandingPage] Could not load stats for ${collectionName}:`,
        err.message,
      );
    };

    try {
      const membersQuery = query(
        collection(db, "users"),
        where("role", "==", "member"),
        where("status", "==", "active"),
      );
      unsubs.push(
        onSnapshot(
          membersQuery,
          (snap) => setStats((s) => ({ ...s, members: snap.size })),
          handleError("users"),
        ),
      );

      unsubs.push(
        onSnapshot(
          collection(db, "meetings"),
          (snap) => setStats((s) => ({ ...s, meetings: snap.size })),
          handleError("meetings"),
        ),
      );

      unsubs.push(
        onSnapshot(
          collection(db, "attendance"),
          (snap) => setStats((s) => ({ ...s, scans: snap.size })),
          handleError("attendance"),
        ),
      );

      unsubs.push(
        onSnapshot(
          collection(db, "payments"),
          (snap) => setStats((s) => ({ ...s, payments: snap.size })),
          handleError("payments"),
        ),
      );
    } catch (error) {
      console.error(
        "[LandingPage] Error setting up Firestore listeners:",
        error,
      );
    }

    return () => {
      unsubs.forEach((unsub) => {
        try {
          unsub();
        } catch (err) {
          /* noop */
        }
      });
    };
  }, []);

  return stats;
}

/* ═══════════════════════════════════════════════════ */
const LandingPage: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const platformStats = usePlatformStats();

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % SERVICES.length);
        setIsTransitioning(false);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const goToSlide = (index: number) => {
    if (index !== currentSlide && !isTransitioning) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlide(index);
        setIsTransitioning(false);
      }, 400);
    }
  };

  const service = SERVICES[currentSlide];

  return (
    <>
      <style>{`
          .animate-marquee {
            animation: marqueeScroll 40s linear infinite;
          }
          @keyframes marqueeScroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .mesh-gradient {
            background-color: #f8fafc;
            background-image: 
              radial-gradient(at 0% 0%, hsla(224,71%,90%,1) 0, transparent 50%), 
              radial-gradient(at 50% 0%, hsla(258,61%,92%,1) 0, transparent 50%), 
              radial-gradient(at 100% 0%, hsla(224,81%,94%,1) 0, transparent 50%),
              radial-gradient(at 0% 100%, hsla(224,91%,94%,1) 0, transparent 50%),
              radial-gradient(at 50% 100%, hsla(258,61%,92%,1) 0, transparent 50%),
              radial-gradient(at 100% 100%, hsla(224,71%,90%,1) 0, transparent 50%);
            background-size: 200% 200%;
            animation: mesh-move 20s ease infinite;
          }
          @keyframes mesh-move {
            0% { background-position: 0% 0%; }
            50% { background-position: 100% 100%; }
            100% { background-position: 0% 0%; }
          }
          .glass-card {
            background: rgba(255, 255, 255, 0.6);
            backdrop-filter: blur(12px) saturate(180%);
            -webkit-backdrop-filter: blur(12px) saturate(180%);
            border: 1px solid rgba(255, 255, 255, 0.4);
          }
          .premium-shadow {
            box-shadow: 0 20px 50px rgba(30, 27, 75, 0.08);
          }
      `}</style>

      <div
        className="min-h-screen text-slate-900 overflow-x-hidden"
        style={{ background: "var(--surface-base)" }}
      >
        <Navbar />

        {/* ================= HERO ================= */}
        <section className="relative min-h-[85vh] flex items-center justify-center px-4 sm:px-6 pt-16 sm:pt-32 pb-4 sm:pb-12 overflow-hidden mesh-gradient">
          {" "}
          {/* Decorative elements */}
          <div className="absolute top-1/4 -left-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute bottom-1/4 -right-12 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "2s" }}
          />
          <img
            src={assets.herologo}
            alt=""
            loading="lazy"
            className="absolute w-[400px] sm:w-[550px] md:w-[700px] opacity-[0.10] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ mixBlendMode: "multiply" }}
          />
          <div
            className="text-center max-w-5xl relative z-10"
            style={{
              fontFamily:
                '"Lucida Sans", "Lucida Grande", "Lucida Sans Unicode", "Times New Roman", serif',
            }}
          >
            <Reveal dy={20} delay={0.2}>
              <h1 className="text-4xl sm:text-6xl md:text-8xl font-black mb-6 sm:mb-8 leading-[1.05] px-2 tracking-tighter">
                <span className="text-slate-900 drop-shadow-sm">
                  The digital platform for
                </span>
                <br />
                <span className="gradient-text bg-linear-to-r from-indigo-700 via-violet-700 to-indigo-800 bg-clip-text text-transparent lucida">
                  Bhimavaram Cellphones Technicians
                </span>
              </h1>
            </Reveal>
            <Reveal dy={20} delay={0.4}>
              <p className="text-slate-600 max-w-2xl mx-auto mb-10 sm:mb-12 text-lg sm:text-xl md:text-2xl px-4 font-medium leading-relaxed opacity-90">
                A unified association portal designed for professional unity,
                instant communication, and association management.
              </p>
            </Reveal>
            <Reveal
              dy={30}
              delay={0.6}
              className="flex flex-row items-center justify-center gap-4 px-4"
            >
              <Link
                to="/login"
                className="group w-auto inline-flex items-center justify-center gap-3 text-white px-6 py-4 rounded-2xl font-black transition-all duration-500 hover:shadow-[0_20px_50px_rgba(99,102,241,0.4)] hover:-translate-y-2 active:scale-95 text-sm sm:text-lg"
                style={{ background: "var(--gradient-primary)" }}
              >
                Portal
                <ArrowRight
                  size={20}
                  className="transition-transform duration-500 group-hover:translate-x-2"
                />
              </Link>

              <a
                href="#services"
                className="w-auto inline-flex items-center justify-center gap-3 bg-white/40 backdrop-blur-xl text-slate-900 border border-white/80 px-6 py-4 rounded-2xl font-bold hover:bg-white/80 transition-all duration-500 hover:-translate-y-1 shadow-lg active:scale-95 text-sm sm:text-lg"
              >
                Services
              </a>
            </Reveal>
          </div>
          {/* Bottom curve */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-white to-transparent pointer-events-none" />
        </section>

        {/* ================= PRESIDENTS ================= */}
        <section id="presidents" className="py-6 sm:py-16 overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <Reveal className="text-center mb-10 sm:mb-14">
              <p className="text-indigo-600 font-semibold text-[11px] uppercase tracking-[0.2em] mb-3">
                Leadership
              </p>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                BCTA Presidents
              </h2>
            </Reveal>

            {/* Mobile: Horizontal Scroll */}
            <div className="md:hidden overflow-x-auto scrollbar-hide pb-4">
              <div className="flex gap-4 px-2">
                {presidents.map((p, i) => (
                  <Link
                    key={i}
                    to="/presidents"
                    className="min-w-[200px] bg-white/90 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-4 text-center border border-slate-100 shrink-0"
                  >
                    <img
                      src={p.image}
                      alt={p.name}
                      loading="lazy"
                      className="w-20 h-20 mx-auto rounded-full object-cover mb-3 ring-2 ring-indigo-50"
                    />
                    <h3 className="font-bold text-base text-slate-900">
                      {p.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {p.year}
                    </p>
                  </Link>
                ))}
              </div>
            </div>

            {/* Desktop: Marquee Animation */}
            <div className="hidden md:flex gap-6 sm:gap-8 animate-marquee">
              {[...presidents, ...presidents].map((p, i) => (
                <Link
                  key={i}
                  to="/presidents"
                  className="min-w-[200px] sm:min-w-[250px] bg-white/90 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 p-4 sm:p-6 text-center border border-slate-100 cursor-pointer"
                >
                  <img
                    src={p.image}
                    alt={p.name}
                    loading="lazy"
                    className="w-20 h-20 sm:w-28 sm:h-28 mx-auto rounded-full object-cover mb-3 sm:mb-4 ring-4 ring-indigo-50"
                  />
                  <h3 className="font-bold text-base sm:text-lg text-slate-900">
                    {p.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">
                    {p.year}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ================= SERVICES SECTION ================= */}
        <section id="services" className="py-6 sm:py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <Reveal className="text-center mb-12 sm:mb-16">
              <p className="text-indigo-600 font-semibold text-[11px] uppercase tracking-[0.2em] mb-3">
                What We Do
              </p>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 mb-3 sm:mb-4 tracking-tight">
                Our{" "}
                <span
                  className="gradient-text"
                  style={{
                    background: "var(--gradient-accent)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Services
                </span>
              </h2>
              <p className="text-slate-500 text-base sm:text-lg max-w-2xl mx-auto px-4 font-medium">
                Professional mobile repair services by expert technicians
              </p>
            </Reveal>

            {/* Slider Container */}
            <div className="relative max-w-4xl mx-auto">
              <div
                className={`relative transition-all duration-500 ${isTransitioning ? "opacity-0 translate-y-4 scale-[0.98]" : "opacity-100 translate-y-0 scale-100"}`}
              >
                <div
                  className="glass-card rounded-2xl sm:rounded-3xl border border-white/40 p-6 sm:p-10 md:p-14 flex flex-col overflow-hidden premium-shadow"
                  style={{ minHeight: "400px" }}
                >
                  <div className="flex items-center justify-center mb-6 sm:mb-8">
                    <div
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-4xl sm:text-5xl shadow-lg border border-white/50"
                      style={{ background: service.gradient }}
                    >
                      <span className="drop-shadow-lg">{service.icon}</span>
                    </div>
                  </div>

                  <h3 className="text-2xl sm:text-4xl font-black text-slate-900 mb-3 sm:mb-4 text-center tracking-tight">
                    {service.title}
                  </h3>

                  <p className="text-slate-500 text-sm sm:text-lg mb-6 sm:mb-8 leading-relaxed text-center max-w-2xl mx-auto font-medium">
                    {service.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-auto">
                    {service.features.map((feature, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 bg-slate-50/80 backdrop-blur-sm rounded-xl px-4 py-3 border border-slate-100/60"
                      >
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: service.gradient }}
                        />
                        <span className="text-xs sm:text-sm font-semibold text-slate-700">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Dots Navigation */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 mt-8 sm:mt-12">
              {SERVICES.map((s, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className="transition-all duration-300 rounded-full"
                  style={{
                    width: index === currentSlide ? "2.5rem" : "0.625rem",
                    height: "0.625rem",
                    background:
                      index === currentSlide
                        ? "var(--gradient-accent)"
                        : "#cbd5e1",
                  }}
                />
              ))}
            </div>

            <div className="text-center mt-8">
              <Link
                to="/services"
                className="group inline-flex items-center gap-2 text-white font-bold px-8 py-3.5 rounded-xl transition-all duration-300 shadow-lg hover:shadow-[0_0_30px_rgba(99,102,241,0.25)] hover:-translate-y-0.5"
                style={{ background: "var(--gradient-primary)" }}
              >
                View All Services{" "}
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
            </div>
          </div>
        </section>

        {/* ═══════ STATS ═══════ */}
        <section id="stats" className="py-10 sm:py-16 px-5 sm:px-8">
          <div className="max-w-5xl mx-auto">
            <Reveal className="text-center mb-12 sm:mb-16">
              <p className="text-indigo-600 font-semibold text-[11px] uppercase tracking-[0.2em] mb-3">
                By the numbers
              </p>
              <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                BCTA's growing impact
              </h2>
            </Reveal>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto items-stretch">
              {[
                {
                  label: "Active Members",
                  end: Math.max(platformStats.members, 0),
                  suffix: "",
                },
                {
                  label: "Meetings Tracked",
                  end: Math.max(platformStats.meetings, 0),
                  suffix: "",
                },
              ].map((s, i) => (
                <Reveal key={s.label} delay={i * 0.1} className="h-full">
                  <div
                    className="h-full flex flex-col justify-center text-center glass-card border border-white/40 rounded-2xl p-4 sm:p-10 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 premium-shadow"
                    style={{ background: "rgba(255,255,255,0.7)" }}
                  >
                    <div
                      className="text-3xl sm:text-6xl font-black mb-2 sm:mb-3 tracking-tight tabular-nums gradient-text"
                      style={{
                        background: "var(--gradient-accent)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      <Counter end={s.end} suffix={s.suffix} />
                    </div>
                    <p className="text-xs sm:text-base font-semibold text-slate-500">
                      {s.label}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ CTA BANNER ═══════ */}
        <section className="py-10 sm:py-16 px-5 sm:px-8 relative overflow-hidden">
          {/* Background gradient */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 50%, #faf5ff 100%)",
            }}
          />

          <Reveal className="relative z-10 max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2.5 bg-white/60 backdrop-blur-md border border-white/50 rounded-full px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.15em] mb-8 text-indigo-700 shadow-xl shadow-indigo-500/5 ring-4 ring-indigo-500/5">
              <Zap size={14} className="text-indigo-600" /> Ready to transform
              your association?
            </div>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-5 text-slate-900">
              Go digital with BCTA
            </h2>
            <p className="text-slate-500 text-lg leading-relaxed mb-10 max-w-xl mx-auto font-medium">
              Log in to the BCTA Portal and start managing your association with
              real-time data, QR attendance, and instant notifications.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login"
                className="group inline-flex items-center gap-3 text-white font-black px-10 py-5 rounded-2xl transition-all duration-500 hover:shadow-[0_20px_50px_rgba(99,102,241,0.4)] text-lg hover:-translate-y-2"
                style={{ background: "var(--gradient-primary)" }}
              >
                Open the Portal{" "}
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
            </div>
          </Reveal>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default LandingPage;
