import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase/firebaseConfig";
import toast from "react-hot-toast";
import { ArrowLeft, Store, MapPin, Phone, User, Sparkles } from "lucide-react";

interface ShopForm {
  shopName: string;
  ownerName: string;
  address: string;
  phone: string;
}

const AddShop: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [form, setForm] = useState<ShopForm>({
    shopName: "",
    ownerName: "",
    address: "",
    phone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const shopsRef = collection(db, "shops");
      await addDoc(shopsRef, {
        ...form,
        createdAt: serverTimestamp(),
      });
      toast.success(t("shopList.toasts.success"));
      navigate("/admin/shops");
    } catch (err: any) {
      toast.error(t("shopList.toasts.error", { error: err.message || "" }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen animate-fade-in pb-20">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-indigo-600 font-semibold mb-4 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>{t("Back") || "Back"}</span>
        </button>
        <div className="flex items-center gap-4 mb-2">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Store size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              {t("shopList.registerNew")}
            </h1>
            <p className="text-slate-500 font-medium text-sm mt-1">
              {t("Add a new shop to the directory") || "Add a new shop to the directory"}
            </p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="w-full">
        <div className="glass-card rounded-3xl border border-white/40 p-6 sm:p-8 premium-shadow relative overflow-hidden">
          {/* Background Decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-50 to-transparent rounded-full blur-3xl opacity-30 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-50 to-transparent rounded-full blur-3xl opacity-30 pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles size={16} className="text-indigo-600" />
              <h2 className="text-xs font-black text-indigo-600 tracking-[0.2em] uppercase">
                {t("shopList.form.title")}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Shop Name */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-widest">
                  <Store size={14} className="text-indigo-600" />
                  {t("shopList.form.shopName")}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.shopName}
                  onChange={(e) => setForm((p) => ({ ...p, shopName: e.target.value }))}
                  required
                  placeholder={t("shopList.form.placeholders.shopName")}
                  className="w-full h-12 px-5 rounded-xl bg-white border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-slate-800 placeholder:text-slate-400 shadow-sm hover:border-slate-300"
                />
              </div>

              {/* Owner Name */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-widest">
                  <User size={14} className="text-indigo-600" />
                  {t("shopList.form.proprietorName")}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.ownerName}
                  onChange={(e) => setForm((p) => ({ ...p, ownerName: e.target.value }))}
                  required
                  placeholder={t("shopList.form.placeholders.owner")}
                  className="w-full h-12 px-5 rounded-xl bg-white border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-slate-800 placeholder:text-slate-400 shadow-sm hover:border-slate-300"
                />
              </div>

              {/* Phone & Address Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Phone */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-widest">
                    <Phone size={14} className="text-indigo-600" />
                    {t("shopList.form.contact")}
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder={t("shopList.form.placeholders.phone")}
                    className="w-full h-12 px-5 rounded-xl bg-white border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-slate-800 placeholder:text-slate-400 shadow-sm hover:border-slate-300"
                  />
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-widest">
                    <MapPin size={14} className="text-indigo-600" />
                    {t("shopList.form.address")}
                  </label>
                  <input
                    value={form.address}
                    onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                    placeholder={t("shopList.form.placeholders.address")}
                    className="w-full h-12 px-5 rounded-xl bg-white border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-slate-800 placeholder:text-slate-400 shadow-sm hover:border-slate-300"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex-1 h-12 rounded-xl bg-white border-2 border-slate-200 text-slate-700 font-bold text-sm uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t("shopList.form.processing")}
                    </>
                  ) : (
                    <>
                      <Store size={18} />
                      {t("shopList.form.submit")}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddShop;
