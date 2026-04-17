import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import Navbar from "../components/shared/Navbar";
import Footer from "../components/shared/Footer";

const SERVICES = [
  {
    id: 1,
    title: "Mobile Screen Replacement",
    description: "Expert screen replacement services for all smartphone brands. We use high-quality original and compatible displays with warranty coverage.",
    features: ["LCD/OLED Replacement", "Touch Digitizer Repair", "Gorilla Glass Installation", "Same Day Service"],
    color: "from-indigo-500 to-indigo-700",
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

const ServicesPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-slate-50 to-indigo-100 scrollbar-hide">
      <style>{`
        @keyframes shootBullet {
          0%   { width: 6px;  opacity: 0.5; }
          40%  { width: 40%;  opacity: 1;   }
          100% { width: 100%; opacity: 1;   }
        }
        .bullet-underline {
          height: 4px;
          border-radius: 999px;
          background: linear-gradient(to right, transparent, #6366f1 40%, #4f46e5 60%, transparent);
          width: 100%;
        }
      `}</style>

      <Navbar />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-24 sm:py-28">
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-4">
            Professional <span className="bg-linear-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Mobile Repair</span> Services
          </h2>
          <p className="text-slate-600/70 text-lg max-w-2xl mx-auto">
            Expert technicians providing quality repair services for all mobile devices
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 sm:gap-6 md:gap-8">
          {SERVICES.map((service, idx) => (
            <React.Fragment key={service.id}>
              <div
                className="relative bg-transparent shadow-none sm:bg-white/80 sm:shadow-xl sm:backdrop-blur-sm rounded-2xl border-0 sm:border-2 sm:border-indigo-100 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
              >


                <div className="px-4 pt-6 pb-8 sm:p-6 md:p-8">
                  {/* Icon & Number */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="text-5xl">{service.icon}</div>
                    <div className={`text-5xl font-black bg-linear-to-r ${service.color} bg-clip-text text-transparent`}>
                      0{service.id}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3">
                    {service.title}
                  </h3>

                  {/* Description */}
                  <p className="text-slate-600/70 text-base mb-6 leading-relaxed">
                    {service.description}
                  </p>

                  {/* Features */}
                  <div className="space-y-3">
                    {service.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <CheckCircle size={18} className="text-emerald-500 shrink-0" />
                        <span className="text-sm font-medium text-slate-900">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bullet underline separator — mobile only, between cards */}
              {idx < SERVICES.length - 1 && (
                <div className="block sm:hidden px-4 py-1">
                  <div className="bullet-underline" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center bg-white/60 backdrop-blur-sm rounded-2xl p-8 sm:p-12 border-2 border-indigo-200">
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-4">
            Need Professional Repair Service?
          </h3>
          <p className="text-slate-600/70 mb-6 max-w-xl mx-auto">
            Contact BCTA members for reliable and expert mobile repair services
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-lg"
          >
            Contact Us
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ServicesPage;