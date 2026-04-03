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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { assets, presidents } from "../assets/assets";

/* ─── Intersection Observer reveal ─── */
function useReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.1): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
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

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
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
    description: "Expert screen replacement services for all smartphone brands. We use high-quality original and compatible displays with warranty coverage.",
    features: ["LCD/OLED Replacement", "Touch Digitizer Repair", "Gorilla Glass Installation", "Same Day Service"],
    color: "from-blue-500 to-blue-700",
    icon: "📱"
  },
  {
    id: 2,
    title: "Battery Replacement & Repair",
    description: "Professional battery replacement for all mobile devices. Restore your phone's battery life with genuine and high-capacity batteries.",
    features: ["Original Batteries", "Fast Charging Support", "Battery Health Check", "Instant Replacement"],
    color: "from-emerald-500 to-teal-700",
    icon: "🔋"
  },
  {
    id: 3,
    title: "Motherboard & IC Repair",
    description: "Advanced motherboard-level repairs including IC replacement, reballing, and circuit repair. We fix charging issues, network problems, and boot failures.",
    features: ["IC Replacement", "BGA Reballing", "Circuit Repair", "Water Damage Recovery"],
    color: "from-violet-500 to-purple-700",
    icon: "🔧"
  },
  {
    id: 4,
    title: "Software & Unlocking Services",
    description: "Complete software solutions including OS installation, unlocking, data recovery, and virus removal. Keep your device running smoothly.",
    features: ["OS Installation", "Pattern/FRP Unlock", "Data Recovery", "Software Updates"],
    color: "from-amber-500 to-orange-700",
    icon: "💻"
  }
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

    try {
      // Members count
      const membersQuery = query(
        collection(db, "users"),
        where("role", "==", "member"),
        where("status", "==", "active")
      );
      unsubs.push(
        onSnapshot(
          membersQuery,
          (snap) => setStats((s) => ({ ...s, members: snap.size })),
          handleError("users")
        )
      );

      // Meetings count
      unsubs.push(
        onSnapshot(
          collection(db, "meetings"),
          (snap) => setStats((s) => ({ ...s, meetings: snap.size })),
          handleError("meetings")
        )
      );

      // Total Attendance Scans
      unsubs.push(
        onSnapshot(
          collection(db, "attendance"),
          (snap) => setStats((s) => ({ ...s, scans: snap.size })),
          handleError("attendance")
        )
      );

      // Total Payments/Distribution Records
      unsubs.push(
        onSnapshot(
          collection(db, "payments"),
          (snap) => setStats((s) => ({ ...s, payments: snap.size })),
          handleError("payments")
        )
      );
    } catch (error) {
      console.error('[LandingPage] Error setting up Firestore listeners:', error);
    }

    return () => {
      unsubs.forEach((unsub) => {
        try {
          unsub();
        } catch (err) {
          console.warn('[LandingPage] Error unsubscribing:', err);
        }
      });
    };
  }, []);

  return stats;
}

/* ═══════════════════════════════════════════════════ */
const LandingPage: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState("next");
  const platformStats = usePlatformStats();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  // Auto-slide services with 3D effect
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setDirection("next");
        setCurrentSlide((prev) => (prev + 1) % SERVICES.length);
        setIsTransitioning(false);
      }, 1500);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const nextSlide = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setDirection("next");
      setCurrentSlide((prev) => (prev + 1) % SERVICES.length);
      setIsTransitioning(false);
    }, 1500);
  };

  const prevSlide = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setDirection("prev");
      setCurrentSlide((prev) => (prev - 1 + SERVICES.length) % SERVICES.length);
      setIsTransitioning(false);
    }, 1500);
  };

  const goToSlide = (index: number) => {
    if (index !== currentSlide) {
      setIsTransitioning(true);
      setTimeout(() => {
        setDirection(index > currentSlide ? "next" : "prev");
        setCurrentSlide(index);
        setIsTransitioning(false);
      }, 1500);
    }
  };

  const nextIndex = (currentSlide + 1) % SERVICES.length;

  return (
    <>
      <style>{`
          @keyframes slideIn {
            from {
              transform: translate3d(-100%, 0, -400px) rotateY(90deg) scale(0.8);
              opacity: 0;
            }
            to {
              transform: translate3d(0, 0, 0) rotateY(0deg) scale(1);
              opacity: 1;
            }
          }
          @keyframes slideOut {
            from {
              transform: translate3d(0, 0, 0) rotateY(0deg) scale(1);
              opacity: 1;
            }
            to {
              transform: translate3d(100%, 0, -400px) rotateY(-90deg) scale(0.8);
              opacity: 0;
            }
          }
          .animate-slideIn {
            animation: slideIn 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          }
          .animate-slideOut {
            animation: slideOut 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          }
          .preserve-3d {
            transform-style: preserve-3d;
          }
          .backface-hidden {
            backface-visibility: hidden;
          }
          .animate-marquee {
            animation: marqueeScroll 30s linear infinite;
          }
          @keyframes marqueeScroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-blue-300 via-blue-150 to-yellow-400 text-slate-900 overflow-x-hidden">
        {/* ── NAVBAR ── */}
        <header
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
            scrolled ? "bg-white shadow-md" : "bg-white/90 backdrop-blur"
          }`}
        >
          <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between relative">
            {/* LOGO */}
            <div className="relative flex items-center">
              {/* Floating Logo */}
              <div className="fixed top-2 left-2 sm:top-4 sm:left-4 z-[60] rounded-xl border-2 border-blue-200 shadow-2xl hover:shadow-blue-200/50 transition-all duration-700 ease-in-out hover:scale-105 overflow-hidden p-0 w-16 sm:w-20 md:w-24">
                <Link to="/" className="block">
                  <img
                    src={assets.logo}
                    alt="BCTA Logo"
                    className="w-full h-auto transition-all duration-700 ease-in-out"
                  />
                </Link>
              </div>
            </div>

            {/* MENU */}
            <nav className="hidden md:flex gap-6 lg:gap-10 font-medium text-blue-900 absolute left-1/2 -translate-x-1/2">
              <Link to="/" className="hover:text-blue-600 transition text-sm lg:text-base">
                Home
              </Link>
              <Link to="/about" className="hover:text-blue-600 transition text-sm lg:text-base">
                About
              </Link>
              <Link to="/services" className="hover:text-blue-600 transition text-sm lg:text-base">
                Services
              </Link>
              <Link to="/presidents" className="hover:text-blue-600 transition text-sm lg:text-base">
                Presidents
              </Link>
              <Link to="/contact" className="hover:text-blue-600 transition text-sm lg:text-base">
                Contact
              </Link>
            </nav>

            {/* MOBILE MENU & LOGIN */}
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-blue-700 transition text-sm sm:text-base"
              >
                Login
              </Link>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden p-2 text-blue-900 hover:bg-blue-50 rounded-lg transition"
              >
                {menuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {menuOpen && (
            <div className="md:hidden bg-white border-t border-blue-100 shadow-lg">
              <nav className="flex flex-col px-4 py-4 space-y-2">
                <Link to="/" onClick={() => setMenuOpen(false)} className="px-4 py-3 text-blue-900 hover:bg-blue-50 rounded-lg transition font-medium">
                  Home
                </Link>
                <Link to="/about" onClick={() => setMenuOpen(false)} className="px-4 py-3 text-blue-900 hover:bg-blue-50 rounded-lg transition font-medium">
                  About
                </Link>
                <Link to="/services" onClick={() => setMenuOpen(false)} className="px-4 py-3 text-blue-900 hover:bg-blue-50 rounded-lg transition font-medium">
                  Services
                </Link>
                <Link to="/presidents" onClick={() => setMenuOpen(false)} className="px-4 py-3 text-blue-900 hover:bg-blue-50 rounded-lg transition font-medium">
                  Presidents
                </Link>
                <Link to="/contact" onClick={() => setMenuOpen(false)} className="px-4 py-3 text-blue-900 hover:bg-blue-50 rounded-lg transition font-medium">
                  Contact
                </Link>
              </nav>
            </div>
          )}
        </header>

        {/* ================= HERO ================= */}
        <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 pt-24 sm:pt-32 overflow-hidden">
          <img
            src={assets.herologo}
            alt="watermark"
            className="absolute w-[400px] sm:w-[650px] md:w-[800px] opacity-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ mixBlendMode: 'multiply' }}
          />

          <div className="text-center max-w-5xl relative z-10">
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-blue-900 mb-4 sm:mb-6 leading-tight px-2">
              Welcome to
              <br/>
              <span className="text-blue-600">
                Bhimavaram Cell Technician Association
              </span>
            </h1>

            <p className="text-blue-800/70 max-w-2xl mx-auto mb-8 sm:mb-10 text-base sm:text-lg px-4">
              A digital platform to manage members, meetings, attendance,
              payments and communication for BCTA members.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 sm:px-7 py-3 rounded-lg hover:bg-blue-700 transition"
              >
                Open Portal <ArrowRight size={18}/>
              </Link>

              <a
                href="#services"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-blue-600 border border-blue-600 px-6 sm:px-7 py-3 rounded-lg hover:bg-blue-50 transition"
              >
                Learn More
              </a>
            </div>
          </div>
        </section>

        {/* ================= PRESIDENTS ================= */}
        <section id="presidents" className="py-16 sm:py-24 overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl sm:text-4xl font-black text-blue-900 text-center mb-12 sm:mb-16">
              BCTA Presidents
            </h2>

            <div className="flex gap-6 sm:gap-8 animate-marquee">
              {[...presidents, ...presidents].map((p, i) => (
                <Link
                  key={i}
                  to="/presidents"
                  className="min-w-[200px] sm:min-w-[250px] bg-white/80 backdrop-blur-sm rounded-xl shadow hover:shadow-xl hover:-translate-y-2 transition p-4 sm:p-6 text-center border border-blue-100 cursor-pointer"
                >
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-20 h-20 sm:w-28 sm:h-28 mx-auto rounded-full object-cover mb-3 sm:mb-4"
                  />

                  <h3 className="font-bold text-base sm:text-lg text-blue-900">
                    {p.name}
                  </h3>

                  <p className="text-xs sm:text-sm text-blue-800/70">
                    {p.year}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

       

        {/* ================= SERVICES SECTION ================= */}
        <section id="services" className="py-16 sm:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-5xl font-black text-blue-900 mb-3 sm:mb-4">
                Our <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">Services</span>
              </h2>
              <p className="text-blue-800/70 text-base sm:text-lg max-w-2xl mx-auto px-4">
                Professional mobile repair services by expert technicians
              </p>
            </div>

            {/* Slider Container */}
            <div className="relative" style={{ perspective: "1500px" }}>
              {/* Slides */}
              <div className="relative h-[450px] sm:h-[500px]">
                {isTransitioning ? (
                  <>
                    <div
                      key={currentSlide}
                      className="absolute inset-0 animate-slideOut preserve-3d backface-hidden"
                    >
                      <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-blue-100 p-6 sm:p-10 md:p-14 h-full flex flex-col">
                        {/* Icon */}
                        <div className="flex items-center justify-center mb-6 sm:mb-8">
                          <div className="text-4xl sm:text-6xl">{SERVICES[currentSlide].icon}</div>
                        </div>

                        {/* Title */}
                        <h3 className="text-2xl sm:text-4xl font-black text-blue-900 mb-3 sm:mb-4 text-center">
                          {SERVICES[currentSlide].title}
                        </h3>

                        {/* Description */}
                        <p className="text-blue-800/70 text-sm sm:text-lg mb-6 sm:mb-8 leading-relaxed text-center">
                          {SERVICES[currentSlide].description}
                        </p>

                        {/* Features */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-auto">
                          {SERVICES[currentSlide].features.map((feature, i) => (
                            <div key={i} className="flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-2 sm:py-3">
                              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${SERVICES[currentSlide].color}`}></div>
                              <span className="text-xs sm:text-sm font-semibold text-blue-900">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div
                      key={nextIndex}
                      className="absolute inset-0 animate-slideIn preserve-3d backface-hidden"
                    >
                      <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-blue-100 p-6 sm:p-10 md:p-14 h-full flex flex-col">
                        {/* Icon */}
                        <div className="flex items-center justify-center mb-6 sm:mb-8">
                          <div className="text-4xl sm:text-6xl">{SERVICES[nextIndex].icon}</div>
                        </div>

                        {/* Title */}
                        <h3 className="text-2xl sm:text-4xl font-black text-blue-900 mb-3 sm:mb-4 text-center">
                          {SERVICES[nextIndex].title}
                        </h3>

                        {/* Description */}
                        <p className="text-blue-800/70 text-sm sm:text-lg mb-6 sm:mb-8 leading-relaxed text-center">
                          {SERVICES[nextIndex].description}
                        </p>

                        {/* Features */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-auto">
                          {SERVICES[nextIndex].features.map((feature, i) => (
                            <div key={i} className="flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-2 sm:py-3">
                              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${SERVICES[nextIndex].color}`}></div>
                              <span className="text-xs sm:text-sm font-semibold text-blue-900">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div
                    key={currentSlide}
                    className="absolute inset-0 preserve-3d backface-hidden transition-shadow duration-500 hover:shadow-2xl"
                  >
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-blue-100 p-6 sm:p-10 md:p-14 h-full flex flex-col">
                      {/* Icon */}
                      <div className="flex items-center justify-center mb-6 sm:mb-8">
                        <div className="text-4xl sm:text-6xl">{SERVICES[currentSlide].icon}</div>
                      </div>

                      {/* Title */}
                      <h3 className="text-2xl sm:text-4xl font-black text-blue-900 mb-3 sm:mb-4 text-center">
                        {SERVICES[currentSlide].title}
                      </h3>

                      {/* Description */}
                      <p className="text-blue-800/70 text-sm sm:text-lg mb-6 sm:mb-8 leading-relaxed text-center">
                        {SERVICES[currentSlide].description}
                      </p>

                      {/* Features */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-auto">
                        {SERVICES[currentSlide].features.map((feature, i) => (
                          <div key={i} className="flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-2 sm:py-3">
                            <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${SERVICES[currentSlide].color}`}></div>
                            <span className="text-xs sm:text-sm font-semibold text-blue-900">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dots Navigation */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 mt-8 sm:mt-12">
              {SERVICES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`transition-all duration-300 rounded-full ${
                    index === currentSlide
                      ? "w-8 sm:w-12 h-2.5 sm:h-3 bg-blue-600"
                      : "w-2.5 sm:w-3 h-2.5 sm:h-3 bg-blue-200 hover:bg-blue-400"
                  }`}
                />
              ))}
            </div>

            {/* View All Services Button */}
            <div className="text-center mt-8">
              <Link
                to="/services"
                className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg"
              >
                View All Services <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/*  STATS                                                     */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section
          id="stats"
          className="py-28 px-5 sm:px-8"
        >
          <div className="max-w-5xl mx-auto">
            <Reveal className="text-center mb-16">
              <p className="text-blue-900 font-semibold text-[11px] uppercase tracking-[0.2em] mb-4">
                By the numbers
              </p>
              <h2 className="text-4xl sm:text-5xl font-black text-blue-900 tracking-tight">
                BCTA's growing impact
              </h2>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
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
                <Reveal key={s.label} delay={i * 0.1}>
                  <div className="text-center bg-white/40 backdrop-blur-sm border border-blue-200 rounded-2xl p-8 sm:p-10 hover:bg-white/50 transition-colors">
                    <div className="text-5xl sm:text-6xl font-black text-blue-900 mb-3 tracking-tight tabular-nums">
                      <Counter end={s.end} suffix={s.suffix} />
                    </div>
                    <p className="text-blue-800 text-base font-medium">
                      {s.label}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/*  CTA BANNER                                                */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section
          className="py-28 px-5 sm:px-8 relative overflow-hidden"
        >
          <Reveal className="relative z-10 max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/40 backdrop-blur-sm border border-blue-300 rounded-full px-4 py-1.5 text-sm font-medium mb-7">
              <Zap size={13} className="text-blue-900" /> Ready to transform
              your association?
            </div>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-5 text-blue-900">
              Go digital with BCTA
            </h2>
            <p className="text-blue-800 text-lg leading-relaxed mb-10 max-w-xl mx-auto">
              Log in to the BCTA Portal and start managing your association with
              real-time data, QR attendance, and instant notifications.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login"
                className="group inline-flex items-center gap-2.5 bg-blue-600 text-white font-bold px-8 py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-2xl text-base hover:-translate-y-1"
              >
                Open the Portal{" "}
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 border-2 border-blue-600 text-blue-900 bg-white/40 backdrop-blur-sm font-medium px-8 py-4 rounded-2xl hover:bg-white/60 transition-all text-base"
              >
                Register as Member
              </Link>
            </div>
          </Reveal>
        </section>

        {/* ── FOOTER ── */}
        <footer id="footer" className="bg-slate-950 text-white px-5 sm:px-8 py-14">
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
                    <Link
                      to="/services"
                      className="block text-slate-400 hover:text-white transition-colors"
                    >
                      Services
                    </Link>
                    <Link
                      to="/about"
                      className="block text-slate-400 hover:text-white transition-colors"
                    >
                      About Us
                    </Link>
                    <Link
                      to="/presidents"
                      className="block text-slate-400 hover:text-white transition-colors"
                    >
                      Presidents
                    </Link>
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
