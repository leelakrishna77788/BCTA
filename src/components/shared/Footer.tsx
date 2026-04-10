import React from "react";
import { Link } from "react-router-dom";
import { MapPin, Star, Phone, Mail, Facebook, Instagram, Youtube, MessageCircle } from "lucide-react";

const Footer: React.FC = () => {
  return (
    <footer id="footer" className="relative bg-slate-950 text-white px-5 sm:px-8 py-16 sm:py-20 overflow-hidden">
      {/* Gradient top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-[4px]"
        style={{ background: "linear-gradient(to right, var(--color-indigo-500), var(--color-violet-500))" }}
      />
      
      {/* Subtle background glow elements */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 sm:gap-8 pb-16 border-b border-white/5">
          
          {/* Section 1: Branding & Description */}
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-6">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20"
                style={{ background: "var(--gradient-accent)" }}
              >
                <span className="text-white font-black text-sm tracking-tighter">BCTA</span>
              </div>
              <div className="flex flex-col">
                <span className="font-black text-lg tracking-tight leading-none">BCTA Portal</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Management System</span>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              Empowering Bhimavaram's technicians with digital unity, real-time communication, and smart association management tools.
            </p>
            {/* Social Icons Integrated Here for Mobile Balance */}
            <div className="flex items-center gap-4 pt-2">
              {[
                { icon: Facebook, href: "#", color: "hover:text-blue-500" },
                { icon: MessageCircle, href: "#", color: "hover:text-emerald-500" }, // WhatsApp placeholder
                { icon: Instagram, href: "#", color: "hover:text-pink-500" },
                { icon: Youtube, href: "#", color: "hover:text-red-500" },
              ].map((social, i) => (
                <a key={i} href={social.href} className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 transition-all duration-300 ${social.color} hover:bg-white/10 hover:-translate-y-1`}>
                  <social.icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Section 2: Quick Links */}
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
            <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-8">Platform</h4>
            <div className="space-y-4">
              {[
                { to: "/", label: "Home" },
                { to: "/services", label: "Our Services" },
                { to: "/about", label: "About BCTA" },
                { to: "/presidents", label: "Leadership" }
              ].map(link => (
                <Link key={link.label} to={link.to} className="block text-slate-400 hover:text-white font-medium text-[15px] transition-all duration-200 hover:translate-x-1">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Section 3: Access */}
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
            <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-8">System Access</h4>
            <div className="space-y-4">
              {[
                { to: "/login", label: "Member Login" },
                { to: "/login", label: "Admin Console" },
                { to: "/register", label: "Register Member" },
                { to: "/contact", label: "Get Support" }
              ].map(link => (
                <Link key={link.label} to={link.to} className="block text-slate-400 hover:text-white font-medium text-[15px] transition-all duration-200 hover:translate-x-1">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Section 4: Contact & Location */}
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
            <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-8">Contact Us</h4>
            <div className="space-y-6">
              <div className="space-y-3">
                <a href="mailto:support@bcta.in" className="flex items-center gap-3 text-slate-400 hover:text-indigo-400 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-indigo-500/10 transition-colors">
                    <Mail size={14} />
                  </div>
                  <span className="text-sm font-medium">support@bcta.in</span>
                </a>
                <a href="tel:+919876543210" className="flex items-center gap-3 text-slate-400 hover:text-indigo-400 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-indigo-500/10 transition-colors">
                    <Phone size={14} />
                  </div>
                  <span className="text-sm font-medium">+91 98765 43210</span>
                </a>
              </div>
              
              <div className="pt-4 space-y-3 border-t border-white/5 w-full">
                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 justify-center sm:justify-start">
                  <MapPin size={12} className="text-indigo-500" /> Bhimavaram, AP
                </p>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <div className="flex">
                    {[1,2,3,4,5].map(i => <Star key={i} size={10} className="text-amber-500 fill-amber-500" />)}
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Est. 2018</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-10 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
            <p>© 2026 BCTA Management Portal</p>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-800" />
            <p>Terms of Privacy</p>
          </div>
          <p className="text-slate-600">
            Professional Unity • Technical Excellence • BCTA
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

