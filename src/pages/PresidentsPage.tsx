import React from "react";
import { Link } from "react-router-dom";
import { Calendar } from "lucide-react";
import { presidents } from "../assets/assets";
import Navbar from "../components/shared/Navbar";
import Footer from "../components/shared/Footer";

const PresidentsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-300 via-blue-150 to-yellow-400">
      <Navbar />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-24 sm:py-28">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-black text-blue-900 mb-4">
            BCTA <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">Presidents</span>
          </h2>
          <p className="text-blue-800/70 text-lg max-w-3xl mx-auto leading-relaxed">
            Meet the leaders who have shaped BCTA into the thriving community it is today.
          </p>
        </div>

        {/* Presidents Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16 max-w-5xl mx-auto">
          {presidents.map((president, index) => (
            <div
              key={index}
              className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border-2 border-blue-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="aspect-square relative">
                <img
                  src={president.image}
                  alt={president.name}
                  className="w-full h-full object-cover"
                />
                {index === presidents.length - 1 && (
                  <div className="absolute top-3 right-3 bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
                    Current
                  </div>
                )}
              </div>
              
              <div className="p-4 text-center">
                <h3 className="text-lg font-black text-blue-900 mb-1.5">
                  {president.name}
                </h3>
                <div className="flex items-center justify-center gap-1.5 text-blue-600 mb-2.5">
                  <Calendar size={14} />
                  <span className="font-semibold text-xs">{president.year}</span>
                </div>
                <div className="inline-block bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                  <span className="text-xs font-bold text-blue-900">President</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
          {[
            { label: "Years of Leadership", value: "6+" },
            { label: "Presidents Served", value: "4" },
            { label: "Members Grown", value: "260+" }
          ].map((stat, i) => (
            <div key={i} className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 text-center border-2 border-blue-200">
              <div className="text-5xl font-black text-blue-900 mb-2">{stat.value}</div>
              <p className="text-blue-800 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center bg-white/60 backdrop-blur-sm rounded-2xl p-8 sm:p-12 border-2 border-blue-200">
          <h3 className="text-2xl sm:text-3xl font-black text-blue-900 mb-4">
            Join Our Growing Community
          </h3>
          <p className="text-blue-800/70 mb-6 max-w-xl mx-auto">
            Be part of BCTA's continued success story under strong leadership
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg"
          >
            Login to Portal
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PresidentsPage;
