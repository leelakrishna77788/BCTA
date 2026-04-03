import React from "react";
import { Link } from "react-router-dom";
import { Users, Target, Award, Heart } from "lucide-react";
import { assets } from "../assets/assets";
import Navbar from "../components/shared/Navbar";
import Footer from "../components/shared/Footer";

const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-300 via-blue-150 to-yellow-400">
      <Navbar />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-24 sm:py-28">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="mb-8">
            <img
              src={assets.logo}
              alt="BCTA Logo"
              className="w-32 h-32 mx-auto rounded-2xl shadow-2xl border-4 border-white"
            />
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-blue-900 mb-4">
            Bhimavaram Cell Technician <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">Association</span>
          </h2>
          <p className="text-blue-800/70 text-lg max-w-3xl mx-auto leading-relaxed">
            A unified platform bringing together mobile repair technicians in Bhimavaram, 
            fostering collaboration, skill development, and professional growth since 2018.
          </p>
        </div>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border-2 border-blue-100">
            <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
              <Target size={28} className="text-white" />
            </div>
            <h3 className="text-2xl font-black text-blue-900 mb-3">Our Mission</h3>
            <p className="text-blue-800/70 leading-relaxed">
              To empower mobile technicians with modern tools, knowledge sharing, and a 
              collaborative platform that enhances service quality and professional standards 
              across Bhimavaram.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border-2 border-blue-100">
            <div className="w-14 h-14 bg-violet-600 rounded-xl flex items-center justify-center mb-4">
              <Award size={28} className="text-white" />
            </div>
            <h3 className="text-2xl font-black text-blue-900 mb-3">Our Vision</h3>
            <p className="text-blue-800/70 leading-relaxed">
              To become the leading association for mobile repair professionals, setting 
              industry standards and creating opportunities for growth, innovation, and 
              excellence in mobile technology services.
            </p>
          </div>
        </div>

        {/* Core Values */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 sm:p-12 shadow-xl border-2 border-blue-100 mb-16">
          <h3 className="text-3xl font-black text-blue-900 mb-8 text-center">Our Core Values</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Users, title: "Unity", desc: "Stronger together as a community" },
              { icon: Award, title: "Excellence", desc: "Commitment to quality service" },
              { icon: Heart, title: "Integrity", desc: "Honest and ethical practices" },
              { icon: Target, title: "Growth", desc: "Continuous learning and improvement" }
            ].map((value, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <value.icon size={32} className="text-white" />
                </div>
                <h4 className="font-bold text-blue-900 mb-2">{value.title}</h4>
                <p className="text-sm text-blue-800/70">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
          {[
            { label: "Active Members", value: "260+" },
            { label: "Years of Service", value: "6+" },
            { label: "Services Provided", value: "1000+" }
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
            Join Our Community
          </h3>
          <p className="text-blue-800/70 mb-6 max-w-xl mx-auto">
            Become part of BCTA and connect with fellow mobile repair professionals
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

export default AboutPage;
