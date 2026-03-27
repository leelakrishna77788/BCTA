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
  Menu,
  X,
  CalendarDays,
} from "lucide-react";

/* ─── Intersection Observer reveal ─── */
function useReveal(threshold = 0.1): [React.RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
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
      { threshold }
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
  const [ref, visible] = useReveal();
  
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

  return <span ref={ref as React.RefObject<HTMLSpanElement>}>{count.toLocaleString()}{suffix}</span>;
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

/* ─── Marquee ticker ─── */
function Marquee({ items }: { items: string[] }) {
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden relative">
      <div
        style={{
          display: "flex",
          animation: "marquee 30s linear infinite",
          width: "max-content",
        }}
      >
        {doubled.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2 text-slate-400 text-sm font-medium mr-10 whitespace-nowrap"
          >
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0" />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Process step ─── */
interface StepCardProps {
  num: number;
  title: string;
  desc: string;
  delay: number;
}
function StepCard({ num, title, desc, delay }: StepCardProps) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className="flex gap-5 items-start"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-30px)",
        transition: `opacity 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
      }}
    >
      <div className="relative flex-shrink-0">
        <div className="w-11 h-11 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm shadow-lg">
          {num}
        </div>
        {num < 4 && (
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-px h-8 bg-slate-200 mt-1" />
        )}
      </div>
      <div className="pt-1.5">
        <h4 className="font-bold text-slate-900 mb-1.5 text-base">{title}</h4>
        <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

/* ════ DATA ════ */
const TICKER_ITEMS = [
  "QR Code Attendance",
  "Member Profiles",
  "Payment Tracking",
  "Shop Distribution",
  "Emergency Contacts",
  "Blood Group Search",
  "Complaint Management",
  "Instant Notifications",
  "Role-based Access",
  "Firestore Real-time",
  "Mobile-first Portal",
  "Admin Dashboard",
];

const ADMIN_FEATURES = [
  {
    num: "01",
    icon: Users,
    color: "bg-blue-600",
    textColor: "text-blue-600",
    lightBg: "bg-blue-50",
    tag: "Member Management",
    title: "Full Member Lifecycle Control",
    desc: "Register members with photos, Aadhaar last-4, blood group, shop address and nominee details. Block or unblock with a single click — access revoked system-wide instantly.",
    points: [
      "Add, view & edit member profiles",
      "Block/Unblock with instant effect",
      "Search, filter by status & payment",
    ],
  },
  {
    num: "02",
    icon: QrCode,
    color: "bg-violet-600",
    textColor: "text-violet-600",
    lightBg: "bg-violet-50",
    tag: "Attendance",
    title: "Dynamic QR Code Attendance",
    desc: "Launch attendance and generate a secure QR that rotates every 30 seconds. A live dashboard tracks who scanned in real time — no manual roll calls, ever again.",
    points: [
      "Token rotates every 30 seconds",
      "Blocked members auto-rejected",
      "Duplicate scan prevention built-in",
    ],
  },
  {
    num: "03",
    icon: Package,
    color: "bg-emerald-600",
    textColor: "text-emerald-600",
    lightBg: "bg-emerald-50",
    tag: "Shops & Products",
    title: "Shop Registration & Distribution",
    desc: "Register technician shops and log product distributions per member. Track total amount vs. paid amount, and the member's payment status updates automatically.",
    points: [
      "Register shops with unique QR",
      "Log product distributions per member",
      "Auto-update member payment status",
    ],
  },
  {
    num: "04",
    icon: Bell,
    color: "bg-amber-500",
    textColor: "text-amber-600",
    lightBg: "bg-amber-50",
    tag: "Communications",
    title: "Broadcast Notifications",
    desc: "Push meeting alerts, payment reminders, emergency notices or general announcements to all members instantly. Choose from 5 types with colour-coded previews.",
    points: [
      "5 notification types (meeting, urgent, etc.)",
      "Real-time delivery to all members",
      "Full history of sent notifications",
    ],
  },
];

const MEMBER_FEATURES = [
  {
    icon: ScanLine,
    color: "bg-blue-600",
    title: "Scan QR to Attend",
    desc: "Point your phone at the meeting QR. Attendance logged to Firestore in under a second.",
  },
  {
    icon: CreditCard,
    color: "bg-rose-600",
    title: "Track Your Payments",
    desc: "See all product purchases, dues, and payment history. Know exactly what you owe.",
  },
  {
    icon: MessageSquare,
    color: "bg-violet-600",
    title: "Raise Complaints",
    desc: "Submit grievances with photo attachment. Track whether it's open or resolved.",
  },
  {
    icon: Droplet,
    color: "bg-red-600",
    title: "Emergency Blood Search",
    desc: "Search by blood group across all members to find the nearest donor instantly.",
  },
  {
    icon: CalendarDays,
    color: "bg-emerald-600",
    title: "View Meetings",
    desc: "Browse upcoming and past meetings with date, time, location, and GPS link.",
  },
  {
    icon: Shield,
    color: "bg-slate-700",
    title: "Your Security Status",
    desc: "See your live account status and Member ID. Blocked members lose all access immediately.",
  },
];

const STEPS = [
  {
    num: 1,
    title: "Admin registers a member",
    desc: "Upload photo, enter details, generate a Member ID. Secure Firebase credentials created automatically.",
  },
  {
    num: 2,
    title: "Meeting is scheduled & QR activated",
    desc: "Admin creates a meeting and starts attendance — a secure QR token rotates every 30 seconds.",
  },
  {
    num: 3,
    title: "Members scan to attend",
    desc: "Members open the app on their phone, tap 'Start Camera', point at the screen — done.",
  },
  {
    num: 4,
    title: "Payments tracked automatically",
    desc: "Product distributions from shops flow into member profiles with outstanding dues in real time.",
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
      console.warn(`[LandingPage] Could not load stats for ${collectionName}:`, err.message);
    };

    // Members count
    unsubs.push(
      onSnapshot(
        query(
          collection(db, "users"),
          where("role", "==", "member"),
          where("status", "==", "active")
        ),
        (snap) => setStats((s) => ({ ...s, members: snap.size })),
        handleError("users")
      )
    );

    // Meetings count
    unsubs.push(
      onSnapshot(collection(db, "meetings"), 
        (snap) => setStats((s) => ({ ...s, meetings: snap.size })),
        handleError("meetings")
      )
    );

    // Total Attendance Scans
    unsubs.push(
      onSnapshot(collection(db, "attendance"), 
        (snap) => setStats((s) => ({ ...s, scans: snap.size })),
        handleError("attendance")
      )
    );

    // Total Payments/Distribution Records
    unsubs.push(
      onSnapshot(collection(db, "payments"), 
        (snap) => setStats((s) => ({ ...s, payments: snap.size })),
        handleError("payments")
      )
    );

    return () => unsubs.forEach((u) => u());
  }, []);

  return stats;
}

/* ═══════════════════════════════════════════════════ */
const LandingPage: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const platformStats = usePlatformStats();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  // Auto-cycle hero feature highlight
  useEffect(() => {
    const t = setInterval(() => setActiveFeature((p) => (p + 1) % 4), 2800);
    return () => clearInterval(t);
  }, []);

  const heroHighlights = [
    { icon: QrCode, label: "QR Attendance", color: "text-blue-400" },
    { icon: Users, label: "Member Profiles", color: "text-emerald-400" },
    { icon: CreditCard, label: "Payment Tracking", color: "text-violet-400" },
    { icon: Bell, label: "Notifications", color: "text-amber-400" },
  ];

  return (
    <>
      <style>{`
          @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
          @keyframes heroGlow { 0%,100% { opacity: 0.15; transform: scale(1); } 50% { opacity: 0.25; transform: scale(1.08); } }
          @keyframes borderGlow { 0%,100% { box-shadow: 0 0 0 1px rgba(99,102,241,0.3); } 50% { box-shadow: 0 0 0 3px rgba(99,102,241,0.15), 0 0 20px rgba(99,102,241,0.1); } }
          @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
          @keyframes ripple { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(2.2); opacity: 0; } }
          @keyframes scanLine { 0%,100% { top: 8px; } 50% { top: calc(100% - 8px); } }
          .shimmer-text {
              background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 40%, #f472b6 70%, #60a5fa 100%);
              background-size: 300% auto;
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              animation: shimmer 5s linear infinite;
          }
          .card-glow:hover { animation: borderGlow 2s ease-in-out infinite; }
      `}</style>

      <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
        {/* ── NAVBAR ── */}
        <header
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
            scrolled
              ? "bg-white/95 backdrop-blur-xl shadow-sm border-b border-slate-100"
              : "bg-transparent"
          }`}
        >
          <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-slate-800 to-slate-950 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-black text-xs tracking-tight">
                  BC
                </span>
              </div>
              <div>
                <span
                  className={`font-bold tracking-tight text-sm transition-colors duration-300 ${
                    scrolled ? "text-slate-900" : "text-white"
                  }`}
                >
                  BCTA Portal
                </span>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              {[
                ["#admin-features", "Admin Tools"],
                ["#member-features", "Member Tools"],
                ["#how-it-works", "How It Works"],
                ["#stats", "Stats"],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    scrolled
                      ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      : "text-white/75 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-2.5">
              <Link
                to="/login"
                className={`hidden md:inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
                  scrolled
                    ? "border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                    : "border-white/25 text-white hover:bg-white/10"
                }`}
              >
                Log in
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-200 shadow-md shadow-blue-600/30 hover:shadow-lg hover:shadow-blue-600/40 hover:-translate-y-px"
              >
                Get Started <ArrowRight size={14} />
              </Link>
              <button
                className={`md:hidden p-2 rounded-lg transition-colors ${
                  scrolled
                    ? "text-slate-700 hover:bg-slate-100"
                    : "text-white hover:bg-white/10"
                }`}
                onClick={() => setMenuOpen(!menuOpen)}
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
          {menuOpen && (
            <div className="md:hidden bg-white/98 backdrop-blur-xl border-t border-slate-100 px-6 py-5 space-y-1 animate-slide-up shadow-xl">
              {[
                ["#admin-features", "Admin Tools"],
                ["#member-features", "Member Tools"],
                ["#how-it-works", "How It Works"],
                ["#stats", "Stats"],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="block px-3 py-2.5 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-50"
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </a>
              ))}
              <div className="pt-3 border-t border-slate-100">
                <Link
                  to="/login"
                  className="block w-full bg-blue-600 text-white text-center text-sm font-semibold py-3 rounded-xl"
                  onClick={() => setMenuOpen(false)}
                >
                  Log in to Portal →
                </Link>
              </div>
            </div>
          )}
        </header>

        {/* ══════════════════════════════════════════════════════════ */}
        {/*  HERO                                                      */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section className="relative min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white overflow-hidden px-6 pt-16">
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          <div
            className="absolute top-1/4 -left-32 w-[600px] h-[600px] rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)",
              animation: "heroGlow 8s ease-in-out infinite",
            }}
          />
          <div
            className="absolute bottom-1/4 -right-32 w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)",
              animation: "heroGlow 10s ease-in-out infinite reverse",
            }}
          />
          <div
            className="absolute top-2/3 left-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)",
              animation: "heroGlow 12s ease-in-out infinite 2s",
            }}
          />

          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/20 rounded-full pointer-events-none"
              style={{
                left: `${(i * 137.5) % 100}%`,
                top: `${(i * 97.3) % 100}%`,
                animation: `floatUp ${4 + (i % 4)}s ease-in-out infinite ${
                  (i * 0.4) % 3
                }s`,
                opacity: 0.1 + (i % 5) * 0.06,
              }}
            />
          ))}

          <div className="relative z-10 max-w-5xl mx-auto text-center">
            <div
              className="inline-flex items-center gap-2.5 bg-white/8 border border-white/15 rounded-full px-5 py-2 text-sm font-medium mb-8 animate-fade-in"
              style={{ backdropFilter: "blur(8px)" }}
            >
              <div className="relative">
                <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                <div
                  className="absolute inset-0 w-2 h-2 bg-emerald-400 rounded-full"
                  style={{ animation: "ripple 2s ease-out infinite" }}
                />
              </div>
              <span className="text-white/90">
                Bhimavaram Cellphone Technicians Association
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black tracking-[-0.03em] leading-[1] mb-6 animate-slide-up">
              <span className="block text-white mb-1">The Modern</span>
              <span className="shimmer-text">Association</span>
              <span className="block text-white mt-1">Platform</span>
            </h1>

            <p
              className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10 animate-slide-up"
              style={{ animationDelay: "0.15s" }}
            >
              QR attendance, member management, payments, complaints, and
              real-time notifications — everything BCTA needs, in one unified
              portal.
            </p>

            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up"
              style={{ animationDelay: "0.3s" }}
            >
              <Link
                to="/login"
                className="group inline-flex items-center gap-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl transition-all text-base shadow-2xl shadow-blue-600/40 hover:shadow-blue-500/50 hover:-translate-y-1"
              >
                Open the Portal
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
              <a
                href="#admin-features"
                className="inline-flex items-center gap-2.5 border border-white/20 text-white/80 hover:text-white hover:border-white/40 hover:bg-white/5 font-medium px-8 py-4 rounded-2xl transition-all text-base"
                style={{ backdropFilter: "blur(8px)" }}
              >
                Explore Features <ChevronDown size={18} />
              </a>
            </div>

            <div
              className="flex justify-center gap-3 flex-wrap animate-fade-in"
              style={{ animationDelay: "0.45s" }}
            >
              {heroHighlights.map((h, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-500 ${
                    activeFeature === i
                      ? "bg-white/12 border-white/30 text-white scale-105"
                      : "bg-white/5 border-white/10 text-white/50"
                  }`}
                  style={{ backdropFilter: "blur(8px)" }}
                >
                  <h.icon size={15} className={h.color} />
                  {h.label}
                </div>
              ))}
            </div>
          </div>

          <div className="absolute bottom-32 right-6 sm:right-16 hidden lg:block animate-float">
            <div className="bg-white/8 border border-white/12 rounded-2xl px-5 py-3.5 text-right backdrop-blur-md shadow-2xl">
              <p className="text-2xl font-black text-white">260+</p>
              <p className="text-xs text-white/50 font-medium mt-0.5">
                Active Members
              </p>
            </div>
          </div>
          <div
            className="absolute bottom-52 left-6 sm:left-16 hidden lg:block animate-float"
            style={{ animationDelay: "1.4s" }}
          >
            <div className="bg-white/8 border border-white/12 rounded-2xl px-5 py-3.5 backdrop-blur-md shadow-2xl">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <p className="text-xs text-white/60 font-medium">QR Active Now</p>
              </div>
              <p className="text-sm font-bold text-white">
                Rotating every 30s
              </p>
            </div>
          </div>
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 animate-bounce">
            <ChevronDown size={22} className="text-white/25" />
          </div>
        </section>

        {/* ── TICKER MARQUEE ── */}
        <div className="bg-slate-100 border-y border-slate-200/80 py-4">
          <Marquee items={TICKER_ITEMS} />
        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/*  ADMIN TOOLS                                               */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section id="admin-features" className="py-28 bg-white">
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <Reveal className="mb-16 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">
                  <Shield size={12} /> For Administrators
                </div>
                <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-none">
                  Admin<br />
                  <span
                    style={{
                      background: "linear-gradient(135deg,#1e40af,#7c3aed)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    Tools
                  </span>
                </h2>
                <p className="text-slate-500 mt-4 max-w-md text-base">
                  Four core modules that give the BCTA committee full control
                  over the association.
                </p>
              </div>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-5 py-3 rounded-xl transition-all shadow-md self-start sm:self-auto"
              >
                Admin Login <ArrowRight size={15} />
              </Link>
            </Reveal>

            <div className="space-y-5">
              {ADMIN_FEATURES.map((f, i) => (
                <Reveal key={f.num} delay={i * 0.06}>
                  <div className="group relative bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-7 sm:p-9 flex flex-col sm:flex-row gap-7 hover:shadow-xl transition-all duration-300 card-glow overflow-hidden">
                    <div
                      className={`absolute inset-0 opacity-0 group-hover:opacity-[0.025] transition-opacity duration-500 ${f.color}`}
                    />

                    <div className="flex flex-row sm:flex-col items-center gap-4 sm:gap-3 sm:w-20 flex-shrink-0">
                      <span className="text-[11px] font-black text-slate-300 tracking-[0.2em]">
                        {f.num}
                      </span>
                      <div
                        className={`w-13 h-13 ${f.color} w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-3deg]`}
                      >
                        <f.icon size={22} className="text-white" />
                      </div>
                    </div>

                    <div className="hidden sm:block w-px bg-slate-100 self-stretch flex-shrink-0" />

                    <div className="flex-1">
                      <span
                        className={`inline-flex items-center text-[10px] font-black uppercase tracking-[0.18em] px-2.5 py-1 rounded-lg ${f.lightBg} ${f.textColor} mb-3`}
                      >
                        {f.tag}
                      </span>
                      <h3 className="text-xl font-bold text-slate-900 mb-2.5 leading-snug">
                        {f.title}
                      </h3>
                      <p className="text-slate-500 text-sm leading-relaxed mb-5 max-w-xl">
                        {f.desc}
                      </p>
                      <div className="flex flex-wrap gap-x-8 gap-y-2">
                        {f.points.map((p) => (
                          <div
                            key={p}
                            className="flex items-center gap-2 text-sm text-slate-700"
                          >
                            <CheckCircle
                              size={15}
                              className="text-emerald-500 flex-shrink-0"
                            />
                            {p}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/*  MEMBER TOOLS                                              */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section id="member-features" className="py-28 bg-slate-50">
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <Reveal className="mb-16 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">
                  <Smartphone size={12} /> For Members
                </div>
                <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-none">
                  Member<br />
                  <span
                    style={{
                      background: "linear-gradient(135deg,#059669,#0284c7)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    Tools
                  </span>
                </h2>
                <p className="text-slate-500 mt-4 max-w-md text-base">
                  All the features a member needs, optimised for use on a mobile
                  phone.
                </p>
              </div>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-3 rounded-xl transition-all shadow-md self-start sm:self-auto"
              >
                Member Login <ArrowRight size={15} />
              </Link>
            </Reveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {MEMBER_FEATURES.map((f, i) => (
                <Reveal key={f.title} delay={i * 0.07}>
                  <div className="group bg-white border border-slate-200 rounded-2xl p-7 hover:shadow-xl hover:border-slate-300 hover:-translate-y-1 transition-all duration-300 h-full">
                    <div
                      className={`w-12 h-12 ${f.color} rounded-2xl flex items-center justify-center mb-5 shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-3deg]`}
                    >
                      <f.icon size={20} className="text-white" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-base mb-2">
                      {f.title}
                    </h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      {f.desc}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/*  STATS                                                     */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section
          id="stats"
          className="py-28 px-5 sm:px-8"
          style={{
            background:
              "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
          }}
        >
          <div className="max-w-5xl mx-auto">
            <Reveal className="text-center mb-16">
              <p className="text-blue-400 font-semibold text-[11px] uppercase tracking-[0.2em] mb-4">
                By the numbers
              </p>
              <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                BCTA's growing impact
              </h2>
            </Reveal>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
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
                {
                  label: "QR Scans Logged",
                  end: Math.max(platformStats.scans, 0),
                  suffix: "",
                },
                {
                  label: "Payment Records",
                  end: Math.max(platformStats.payments, 0),
                  suffix: "",
                },
              ].map((s, i) => (
                <Reveal key={s.label} delay={i * 0.1}>
                  <div className="text-center bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 hover:bg-white/8 transition-colors">
                    <div className="text-4xl sm:text-5xl font-black text-white mb-2.5 tracking-tight tabular-nums">
                      <Counter end={s.end} suffix={s.suffix} />
                    </div>
                    <p className="text-slate-400 text-sm font-medium">
                      {s.label}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/*  HOW IT WORKS                                              */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section id="how-it-works" className="py-28 px-5 sm:px-8 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-start">
              <div>
                <Reveal className="mb-12">
                  <div className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">
                    <Clock size={12} /> Process
                  </div>
                  <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                    How it<br />works
                  </h2>
                  <p className="text-slate-500 mt-4 text-base leading-relaxed">
                    From registration to real-time tracking in four seamless
                    steps.
                  </p>
                </Reveal>
                <div className="space-y-10">
                  {STEPS.map((s, i) => (
                    <StepCard key={s.num} {...s} delay={i * 0.1} />
                  ))}
                </div>
                <Reveal delay={0.45} className="mt-12">
                  <Link
                    to="/login"
                    className="group inline-flex items-center gap-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-7 py-3.5 rounded-2xl transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 hover:-translate-y-0.5"
                  >
                    Get Started{" "}
                    <ArrowRight
                      size={17}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </Link>
                </Reveal>
              </div>

              {/* Dashboard preview */}
              <Reveal dx={40} dy={0} delay={0.2}>
                <div className="relative">
                  <div className="absolute -inset-4 bg-gradient-to-br from-blue-500/15 via-violet-500/10 to-emerald-500/10 rounded-3xl blur-2xl" />
                  <div className="relative bg-slate-950 rounded-3xl p-7 text-white shadow-2xl border border-white/8">
                    <div className="flex items-center justify-between mb-7 pb-5 border-b border-white/10">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md">
                          <span className="text-white font-black text-[10px]">
                            BC
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-sm">BCTA Admin</p>
                          <p className="text-[10px] text-slate-500">
                            Dashboard
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-[11px] text-emerald-400 font-medium">
                          Live
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-5">
                      {[
                        {
                          label: "Members",
                          value: "260+",
                          color: "from-blue-500 to-blue-700",
                        },
                        {
                          label: "Meetings",
                          value: "48",
                          color: "from-violet-500 to-purple-700",
                        },
                        {
                          label: "Pending Dues",
                          value: "₹12.4K",
                          color: "from-rose-500 to-red-700",
                        },
                        {
                          label: "Attendance",
                          value: "86%",
                          color: "from-emerald-500 to-teal-700",
                        },
                      ].map((card) => (
                        <div
                          key={card.label}
                          className="bg-white/5 rounded-2xl p-4 border border-white/8"
                        >
                          <p className="text-xs text-slate-400 mb-2">
                            {card.label}
                          </p>
                          <p
                            className={`text-xl font-black bg-gradient-to-r ${card.color} bg-clip-text`}
                            style={{
                              WebkitBackgroundClip: "text",
                              WebkitTextFillColor: "transparent",
                            }}
                          >
                            {card.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 bg-blue-600/20 border border-blue-500/20 rounded-2xl px-4 py-3.5 mb-4">
                      <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <QrCode size={18} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-blue-300 font-medium">
                          QR Active
                        </p>
                        <p className="text-sm font-bold text-white leading-tight">
                          Monthly Meeting — Mar 2026
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400">
                          Expires in
                        </p>
                        <p className="text-sm font-bold text-emerald-400">
                          28:43
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
                        Recent Scans
                      </p>
                      {["Ravi Sharma", "Suresh Kumar", "Anil Reddy"].map(
                        (name) => (
                          <div
                            key={name}
                            className="flex items-center gap-3 bg-white/3 rounded-xl px-3.5 py-2.5 border border-white/5"
                          >
                            <div className="w-8 h-8 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                              {name[0]}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">
                                {name}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                Just scanned in
                              </p>
                            </div>
                            <CheckCircle
                              size={15}
                              className="text-emerald-500"
                            />
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/*  CTA BANNER                                                */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section
          className="py-28 px-5 sm:px-8 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #1e40af 0%, #7c3aed 50%, #1d4ed8 100%)",
            backgroundSize: "200% 200%",
          }}
        >
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-black/10 rounded-full blur-3xl pointer-events-none" />
          <Reveal className="relative z-10 max-w-3xl mx-auto text-center text-white">
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-7">
              <Zap size={13} className="text-yellow-300" /> Ready to transform
              your association?
            </div>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-5">
              Go digital with BCTA
            </h2>
            <p className="text-blue-100 text-lg leading-relaxed mb-10 max-w-xl mx-auto">
              Log in to the BCTA Portal and start managing your association with
              real-time data, QR attendance, and instant notifications.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login"
                className="group inline-flex items-center gap-2.5 bg-white text-blue-700 font-bold px-8 py-4 rounded-2xl hover:bg-blue-50 transition-all shadow-2xl shadow-black/30 text-base hover:-translate-y-1"
              >
                Open the Portal{" "}
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 border border-white/30 text-white font-medium px-8 py-4 rounded-2xl hover:bg-white/10 transition-all text-base"
              >
                Register as Member
              </Link>
            </div>
          </Reveal>
        </section>

        {/* ── FOOTER ── */}
        <footer className="bg-slate-950 text-white px-5 sm:px-8 py-14">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-start justify-between gap-10 pb-10 border-b border-white/8">
              <div className="max-w-xs">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-black text-xs">BC</span>
                  </div>
                  <span className="font-bold text-base">BCTA Portal</span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">
                  The official management portal for BCTA — Bhimavaram Cellphone
                  Technicians Association.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
                <div>
                  <p className="font-semibold text-white mb-3">Platform</p>
                  <div className="space-y-2.5">
                    <a
                      href="#admin-features"
                      className="block text-slate-400 hover:text-white transition-colors"
                    >
                      Admin Tools
                    </a>
                    <a
                      href="#member-features"
                      className="block text-slate-400 hover:text-white transition-colors"
                    >
                      Member Tools
                    </a>
                    <a
                      href="#how-it-works"
                      className="block text-slate-400 hover:text-white transition-colors"
                    >
                      How It Works
                    </a>
                    <a
                      href="#stats"
                      className="block text-slate-400 hover:text-white transition-colors"
                    >
                      Stats
                    </a>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-white mb-3">Access</p>
                  <div className="space-y-2.5">
                    <Link
                      to="/login"
                      className="block text-slate-400 hover:text-white transition-colors"
                    >
                      Admin Login
                    </Link>
                    <Link
                      to="/login"
                      className="block text-slate-400 hover:text-white transition-colors"
                    >
                      Member Login
                    </Link>
                    <Link
                      to="/register"
                      className="block text-slate-400 hover:text-white transition-colors"
                    >
                      Register
                    </Link>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-white mb-3">Association</p>
                  <div className="space-y-2.5">
                    <p className="text-slate-500 text-xs flex items-start gap-1.5">
                      <MapPin size={12} className="mt-0.5 flex-shrink-0" />{" "}
                      Bhimavaram, Andhra Pradesh
                    </p>
                    <p className="text-slate-500 text-xs flex items-start gap-1.5">
                      <Star size={12} className="mt-0.5 flex-shrink-0" /> Est. 2018
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-xs text-slate-600">
              <p>© 2026 BCTA Management Portal. All rights reserved.</p>
              <p>Built for Bhimavaram Cellphone Technicians Association</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LandingPage;
