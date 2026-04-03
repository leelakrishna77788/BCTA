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

const ServicesPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-300 via-blue-150 to-yellow-400">
      <Navbar />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-24 sm:py-28">
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-black text-blue-900 mb-4">
            Professional <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">Mobile Repair</span> Services
          </h2>
          <p className="text-blue-800/70 text-lg max-w-2xl mx-auto">
            Expert technicians providing quality repair services for all mobile devices
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {SERVICES.map((service) => (
            <div
              key={service.id}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border-2 border-blue-100 p-6 sm:p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
            >
              {/* Icon & Number */}
              <div className="flex items-center justify-between mb-6">
                <div className="text-5xl">{service.icon}</div>
                <div className={`text-5xl font-black bg-gradient-to-r ${service.color} bg-clip-text text-transparent`}>
                  0{service.id}
                </div>
              </div>

              {/* Title */}
              <h3 className="text-2xl sm:text-3xl font-black text-blue-900 mb-3">
                {service.title}
              </h3>

              {/* Description */}
              <p className="text-blue-800/70 text-base mb-6 leading-relaxed">
                {service.description}
              </p>

              {/* Features */}
              <div className="space-y-3">
                {service.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-blue-900">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center bg-white/60 backdrop-blur-sm rounded-2xl p-8 sm:p-12 border-2 border-blue-200">
          <h3 className="text-2xl sm:text-3xl font-black text-blue-900 mb-4">
            Need Professional Repair Service?
          </h3>
          <p className="text-blue-800/70 mb-6 max-w-xl mx-auto">
            Contact BCTA members for reliable and expert mobile repair services
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg"
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
