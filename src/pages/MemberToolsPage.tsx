import React from "react";
import { Link } from "react-router-dom";
import { ScanLine, CreditCard, MessageSquare, Droplet, CalendarDays, Shield, ArrowRight } from "lucide-react";
import Navbar from "../components/shared/Navbar";
import Footer from "../components/shared/Footer";
import { useTranslation } from "react-i18next";

const MemberToolsPage: React.FC = () => {
  const { t } = useTranslation();

  const MEMBER_FEATURES = [
    {
      icon: ScanLine,
      color: "bg-indigo-600",
      title: t("memberTools.scanQR"),
      desc: t("memberTools.scanQRDesc"),
      details: [
        t("memberTools.scanDetail1"),
        t("memberTools.scanDetail2"),
        t("memberTools.scanDetail3"),
        t("memberTools.scanDetail4"),
      ]
    },
    {
      icon: CreditCard,
      color: "bg-rose-600",
      title: t("memberTools.trackPayments"),
      desc: t("memberTools.trackPaymentsDesc"),
      details: [
        t("memberTools.payDetail1"),
        t("memberTools.payDetail2"),
        t("memberTools.payDetail3"),
        t("memberTools.payDetail4"),
      ]
    },
    {
      icon: MessageSquare,
      color: "bg-violet-600",
      title: t("memberTools.raiseComplaints"),
      desc: t("memberTools.raiseComplaintsDesc"),
      details: [
        t("memberTools.complainDetail1"),
        t("memberTools.complainDetail2"),
        t("memberTools.complainDetail3"),
        t("memberTools.complainDetail4"),
      ]
    },
    {
      icon: Droplet,
      color: "bg-red-600",
      title: t("memberTools.emergencyBlood"),
      desc: t("memberTools.emergencyBloodDesc"),
      details: [
        t("memberTools.bloodDetail1"),
        t("memberTools.bloodDetail2"),
        t("memberTools.bloodDetail3"),
        t("memberTools.bloodDetail4"),
      ]
    },
    {
      icon: CalendarDays,
      color: "bg-emerald-600",
      title: t("memberTools.viewMeetings"),
      desc: t("memberTools.viewMeetingsDesc"),
      details: [
        t("memberTools.meetingDetail1"),
        t("memberTools.meetingDetail2"),
        t("memberTools.meetingDetail3"),
        t("memberTools.meetingDetail4"),
      ]
    },
    {
      icon: Shield,
      color: "bg-slate-700",
      title: t("memberTools.securityStatus"),
      desc: t("memberTools.securityStatusDesc"),
      details: [
        t("memberTools.securityDetail1"),
        t("memberTools.securityDetail2"),
        t("memberTools.securityDetail3"),
        t("memberTools.securityDetail4"),
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-slate-50 to-indigo-100 scrollbar-hide">
      <Navbar />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-24 sm:py-28">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-6">
            {t("memberTools.forMembers")}
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-4">
            {t("memberTools.title")} <span className="bg-linear-to-r from-emerald-600 to-indigo-600 bg-clip-text text-transparent">{t("memberTools.titleHighlight")}</span>
          </h2>
          <p className="text-slate-600/70 text-lg max-w-2xl mx-auto">
            {t("memberTools.subtitle")}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {MEMBER_FEATURES.map((feature, i) => (
            <div
              key={i}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border-2 border-indigo-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
            >
              <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center mb-5 shadow-lg`}>
                <feature.icon size={28} className="text-white" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-600/70 text-sm mb-4 leading-relaxed">{feature.desc}</p>
              
              <div className="space-y-2 pt-4 border-t border-indigo-100">
                {feature.details.map((detail, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full mt-1.5 shrink-0"></div>
                    <span className="text-xs text-slate-600/70">{detail}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* How to Access */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 sm:p-12 shadow-xl border-2 border-indigo-100 mb-16">
          <h3 className="text-3xl font-black text-slate-900 mb-8 text-center">{t("memberTools.howToAccess")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: t("memberTools.step1Title"), desc: t("memberTools.step1Desc") },
              { step: "2", title: t("memberTools.step2Title"), desc: t("memberTools.step2Desc") },
              { step: "3", title: t("memberTools.step3Title"), desc: t("memberTools.step3Desc") }
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 bg-linear-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-black shadow-lg">
                  {item.step}
                </div>
                <h4 className="font-bold text-slate-900 mb-2 text-lg">{item.title}</h4>
                <p className="text-sm text-slate-600/70">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-white/60 backdrop-blur-sm rounded-2xl p-8 sm:p-12 border-2 border-indigo-200">
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-4">
            {t("memberTools.readyToStart")}
          </h3>
          <p className="text-slate-600/70 mb-6 max-w-xl mx-auto">
            {t("memberTools.readyToStartDesc")}
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-emerald-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-emerald-700 transition-all shadow-lg"
          >
            {t("memberTools.memberLogin")} <ArrowRight size={18} />
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default MemberToolsPage;
