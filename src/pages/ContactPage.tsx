import React, { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Clock, Send } from "lucide-react";
import Navbar from "../components/shared/Navbar";
import Footer from "../components/shared/Footer";
import { useTranslation } from "react-i18next";

const ContactPage: React.FC = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    alert(t("contact.thankYou"));
    setFormData({ name: "", email: "", phone: "", message: "" });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-slate-50 to-indigo-100 scrollbar-hide">
      <Navbar />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-24 sm:py-28">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-4">
            {t("contact.getIn")} <span className="bg-linear-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">{t("contact.touch")}</span>
          </h2>
          <p className="text-slate-600/70 text-lg max-w-2xl mx-auto">
            {t("contact.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* Contact Information */}
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border-2 border-indigo-100">
              <h3 className="text-2xl font-black text-slate-900 mb-6">{t("contact.contactInfo")}</h3>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                    <MapPin size={24} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">{t("contact.address")}</h4>
                    <p className="text-slate-600/70">
                      {t("contact.bhimavaramAP")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                    <Phone size={24} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">{t("contact.phone")}</h4>
                    <p className="text-slate-600/70">+91 9000000000</p>
                    <p className="text-slate-600/70">+91 9000000001</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center shrink-0">
                    <Mail size={24} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">{t("contact.email")}</h4>
                    <p className="text-slate-600/70">info@bcta.org</p>
                    <p className="text-slate-600/70">support@bcta.org</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center shrink-0">
                    <Clock size={24} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">{t("contact.officeHours")}</h4>
                    <p className="text-slate-600/70">{t("contact.weekdays")}</p>
                    <p className="text-slate-600/70">{t("contact.sunday")}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-xl border-2 border-indigo-100 h-64">
              <div className="w-full h-full bg-indigo-100 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <MapPin size={48} className="text-indigo-600 mx-auto mb-2" />
                  <p className="text-slate-900 font-medium">{t("contact.mapLocation")}</p>
                  <p className="text-sm text-slate-600/70">Bhimavaram, Andhra Pradesh</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border-2 border-indigo-100">
            <h3 className="text-2xl font-black text-slate-900 mb-6">{t("contact.sendMessage")}</h3>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-slate-900 mb-2">
                  {t("contact.yourName")}
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white/50 backdrop-blur-sm transition"
                  placeholder={t("contact.namePlaceholder")}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-900 mb-2">
                  {t("contact.emailAddress")}
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white/50 backdrop-blur-sm transition"
                  placeholder={t("contact.emailPlaceholder")}
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-slate-900 mb-2">
                  {t("contact.phoneNumber")}
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white/50 backdrop-blur-sm transition"
                  placeholder={t("contact.phonePlaceholder")}
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-semibold text-slate-900 mb-2">
                  {t("contact.message")}
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white/50 backdrop-blur-sm transition resize-none"
                  placeholder={t("contact.messagePlaceholder")}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                {t("contact.sendBtn")} <Send size={18} />
              </button>
            </form>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 sm:p-12 border-2 border-indigo-200 text-center">
          <h3 className="text-2xl font-black text-slate-900 mb-4">{t("contact.needAssistance")}</h3>
          <p className="text-slate-600/70 mb-6 max-w-xl mx-auto">
            {t("contact.urgentMatters")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-lg"
            >
              {t("contact.loginToPortal")}
            </Link>
            <a
              href="tel:+919000000000"
              className="inline-flex items-center gap-2 border-2 border-indigo-600 text-slate-900 bg-white/40 backdrop-blur-sm font-bold px-8 py-3 rounded-xl hover:bg-white/60 transition-all"
            >
              <Phone size={18} />
              {t("contact.callNow")}
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ContactPage;
