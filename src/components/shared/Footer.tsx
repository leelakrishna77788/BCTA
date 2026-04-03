import React from "react";
import { Link } from "react-router-dom";
import { MapPin, Star } from "lucide-react";

const Footer: React.FC = () => {
  return (
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
  );
};

export default Footer;
