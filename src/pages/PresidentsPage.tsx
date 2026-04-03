import React from "react";
import { Link } from "react-router-dom";
import { Calendar, Award, Users, TrendingUp } from "lucide-react";
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
        <div className="text-center mb-16 sm:mb-20">
          <div className="inline-block mb-6">
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-2 border-blue-200 rounded-full px-5 py-2 shadow-lg">
              <Award className="text-blue-600" size={20} />
              <span className="text-sm font-bold text-blue-900">Leadership Excellence</span>
            </div>
          </div>
          <h2 className="text-4xl sm:text-6xl font-black text-blue-900 mb-6 leading-tight">
            Meet Our
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
              Visionary Leaders
            </span>
          </h2>
          <p className="text-blue-800/80 text-lg sm:text-xl max-w-3xl mx-auto leading-relaxed">
            The dedicated presidents who have shaped BCTA into a thriving community of mobile repair professionals.
          </p>
        </div>

        {/* Presidents Grid */}
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 mb-16 sm:mb-20">
          {presidents.map((president, index) => (
            <div
              key={index}
              className="group relative bg-white/90 backdrop-blur-md rounded-3xl shadow-xl border-2 border-white/50 overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-500"
            >
              {/* Current Badge */}
              {index === presidents.length - 1 && (
                <div className="absolute top-6 right-6 z-20">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    CURRENT
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row">
                {/* Image Container */}
                <div className="relative w-full sm:w-56 h-56 flex-shrink-0 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-900/60 via-transparent to-transparent z-10"></div>
                  <img
                    src={president.image}
                    alt={president.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                </div>
                
                {/* Info Section */}
                <div className="flex-1 p-6 sm:p-8">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-black text-blue-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {president.name}
                      </h3>
                      <div className="flex items-center gap-2 text-blue-600 mb-4">
                        <Calendar size={18} />
                        <span className="font-bold text-sm">{president.year}</span>
                      </div>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-violet-50 border-2 border-blue-200 rounded-xl px-4 py-2 mb-4">
                    <Award size={18} className="text-blue-600" />
                    <span className="text-sm font-black text-blue-900">President</span>
                  </div>

                  <p className="text-blue-800/70 leading-relaxed text-sm sm:text-base">
                    {index === 0 && "Led BCTA through its founding years, establishing the foundation for a strong community of mobile repair technicians. Pioneered the first member registration system and organized initial training workshops."}
                    {index === 1 && "Expanded BCTA's reach across Bhimavaram, introducing quality standards and professional ethics. Launched the first annual technical conference and strengthened member collaboration."}
                    {index === 2 && "Modernized BCTA operations with digital tools and online platforms. Implemented the QR-based attendance system and enhanced member communication channels for better connectivity."}
                    {index === 3 && "Currently leading BCTA towards innovation and excellence. Focusing on skill development programs, industry partnerships, and leveraging technology to empower all members with modern repair techniques."}
                  </p>

                  {/* Achievements */}
                  <div className="mt-6 pt-6 border-t-2 border-blue-100">
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 bg-blue-50 rounded-lg px-3 py-1.5">
                        <Users size={14} className="text-blue-600" />
                        <span className="text-xs font-bold text-blue-900">
                          {index === 0 && "50+ Members"}
                          {index === 1 && "120+ Members"}
                          {index === 2 && "200+ Members"}
                          {index === 3 && "260+ Members"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-violet-50 rounded-lg px-3 py-1.5">
                        <TrendingUp size={14} className="text-violet-600" />
                        <span className="text-xs font-bold text-violet-900">
                          {index === 0 && "Foundation Era"}
                          {index === 1 && "Growth Phase"}
                          {index === 2 && "Digital Transform"}
                          {index === 3 && "Innovation Era"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative Corner */}
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-400/10 to-transparent rounded-tr-full"></div>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 mb-16 sm:mb-20">
          {[
            { icon: Calendar, label: "Years of Leadership", value: "6+", color: "from-blue-500 to-blue-600" },
            { icon: Award, label: "Presidents Served", value: "4", color: "from-violet-500 to-purple-600" },
            { icon: TrendingUp, label: "Members Grown", value: "260+", color: "from-emerald-500 to-teal-600" }
          ].map((stat, i) => (
            <div key={i} className="group bg-white/90 backdrop-blur-md rounded-3xl p-8 sm:p-10 text-center border-2 border-white/50 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
              <div className={`w-16 h-16 bg-gradient-to-br ${stat.color} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                <stat.icon size={32} className="text-white" />
              </div>
              <div className="text-5xl sm:text-6xl font-black bg-gradient-to-r from-blue-900 to-blue-600 bg-clip-text text-transparent mb-3">
                {stat.value}
              </div>
              <p className="text-blue-800 font-bold text-base">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Leadership Timeline */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-8 sm:p-12 shadow-xl border-2 border-white/50 mb-16 sm:mb-20">
          <div className="text-center mb-10">
            <h3 className="text-3xl sm:text-4xl font-black text-blue-900 mb-4">
              Leadership <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">Timeline</span>
            </h3>
            <p className="text-blue-800/70 text-base sm:text-lg">A journey of excellence and dedication</p>
          </div>

          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 via-violet-400 to-purple-400 hidden lg:block"></div>

            {/* Timeline Items */}
            <div className="space-y-8">
              {presidents.map((president, index) => (
                <div key={index} className={`flex items-center gap-6 ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'}`}>
                  {/* Content */}
                  <div className={`flex-1 ${index % 2 === 0 ? 'lg:text-right' : 'lg:text-left'}`}>
                    <div className="bg-gradient-to-br from-blue-50 to-violet-50 rounded-2xl p-6 border-2 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
                      <h4 className="text-xl font-black text-blue-900 mb-2">{president.name}</h4>
                      <div className="flex items-center gap-2 text-blue-600 justify-center lg:justify-start">
                        <Calendar size={16} />
                        <span className="font-bold text-sm">{president.year}</span>
                      </div>
                    </div>
                  </div>

                  {/* Center Dot */}
                  <div className="hidden lg:block relative z-10">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-violet-600 rounded-full border-4 border-white shadow-lg"></div>
                  </div>

                  {/* Image */}
                  <div className="flex-1 hidden lg:block">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white shadow-xl mx-auto">
                      <img src={president.image} alt={president.name} className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-violet-600 to-purple-600 rounded-3xl p-10 sm:p-16 text-center shadow-2xl">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-5 py-2 mb-6">
              <Users className="text-white" size={20} />
              <span className="text-sm font-bold text-white">Join Our Community</span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-black text-white mb-4">
              Be Part of BCTA's Success Story
            </h3>
            <p className="text-white/90 text-base sm:text-lg mb-8 max-w-2xl mx-auto">
              Join our growing community under strong leadership and connect with fellow mobile repair professionals
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-white text-blue-600 font-black px-8 py-4 rounded-xl hover:bg-blue-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
              >
                Login to Portal
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border-2 border-white text-white font-black px-8 py-4 rounded-xl hover:bg-white/30 transition-all"
              >
                Register Now
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PresidentsPage;
