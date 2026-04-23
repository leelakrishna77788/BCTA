import React from "react";
import { Link } from "react-router-dom";
import { Users, Target, Award, Heart } from "lucide-react";
import { assets } from "../assets/assets";
import Navbar from "../components/shared/Navbar";
import Footer from "../components/shared/Footer";
import { useTranslation } from "react-i18next";

const AboutPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-slate-50 to-indigo-100 scrollbar-hide">
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
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-4">
            {t("about.title")}{" "}
            <span className="bg-linear-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              {t("about.association")}
            </span>
          </h2>
          <p className="text-slate-600/70 text-lg max-w-3xl mx-auto leading-relaxed">
            {t("about.subtitle")}
          </p>
        </div>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border-2 border-indigo-100">
            <div className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center mb-4">
              <Target size={28} className="text-white" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-3">
              {t("about.ourMission")}
            </h3>
            <p className="text-slate-600/70 leading-relaxed">
              {t("about.missionDesc")}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border-2 border-indigo-100">
            <div className="w-14 h-14 bg-violet-600 rounded-xl flex items-center justify-center mb-4">
              <Award size={28} className="text-white" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-3">
              {t("about.ourVision")}
            </h3>
            <p className="text-slate-600/70 leading-relaxed">
              {t("about.visionDesc")}
            </p>
          </div>
        </div>

        {/* Core Values */}
        <div className="px-4 sm:px-6 py-10 sm:py-14 mb-16">
          {" "}
          <h3 className="text-3xl font-black text-slate-900 mb-8 text-center">
            {t("about.coreValues")}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Users,
                title: t("about.unity"),
                desc: t("about.unityDesc"),
              },
              {
                icon: Award,
                title: t("about.excellence"),
                desc: t("about.excellenceDesc"),
              },
              {
                icon: Heart,
                title: t("about.integrity"),
                desc: t("about.integrityDesc"),
              },
              {
                icon: Target,
                title: t("about.growth"),
                desc: t("about.growthDesc"),
              },
            ].map((value, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 bg-linear-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <value.icon size={32} className="text-white" />
                </div>
                <h4 className="font-bold text-slate-900 mb-2">{value.title}</h4>
                <p className="text-sm text-slate-600/70">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mb-16">
          {/* ✅ MOBILE LAYOUT */}
          <div className="flex flex-col items-center gap-6 sm:hidden">
            {/* Top 2 */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              {[
                { label: t("about.activeMembers"), value: "260+" },
                { label: t("about.yearsOfService"), value: "6+" },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 text-center border-2 border-indigo-200"
                >
                  <div className="text-3xl font-black text-slate-900 mb-2">
                    {stat.value}
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Bottom Center */}
            <div className="w-full max-w-xs">
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 text-center border-2 border-indigo-200">
                <div className="text-5xl font-black text-slate-900 mb-2">
                  1000+
                </div>
                <p className="text-sm text-slate-600 font-medium">
                  {t("about.servicesProvided")}
                </p>
              </div>
            </div>
          </div>

          {/* ✅ DESKTOP LAYOUT */}
          <div className="hidden sm:grid grid-cols-3 gap-6">
            {[
              { label: t("about.activeMembers"), value: "260+" },
              { label: t("about.yearsOfService"), value: "6+" },
              { label: t("about.servicesProvided"), value: "1000+" },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 text-center border-2 border-indigo-200"
              >
                <div className="text-5xl font-black text-slate-900 mb-2">
                  {stat.value}
                </div>
                <p className="text-slate-600 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-white/60 backdrop-blur-sm rounded-2xl p-8 sm:p-12 border-2 border-indigo-200">
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-4">
            {t("about.joinCommunity")}
          </h3>
          <p className="text-slate-600/70 mb-6 max-w-xl mx-auto">
            {t("about.joinCommunityDesc")}
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-lg"
          >
            {t("about.loginToPortal")}
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AboutPage;
