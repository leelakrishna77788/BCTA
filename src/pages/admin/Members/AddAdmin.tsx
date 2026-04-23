import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Shield,
  UserPlus,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Mail,
  Lock,
} from "lucide-react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../../firebase/firebaseConfig";
import { adminApi } from "../../../services/adminService";

const AddAdmin: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const checkAuth = async () => {
      if (!auth.currentUser) {
        navigate("/login");
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (snap.exists()) {
          const role = snap.data().role;
          if (role !== "admin" && role !== "superadmin") {
            toast.error(t("addAdmin.unauthorized"));
            navigate("/dashboard");
            return;
          }
        }
      } catch (err) {
        console.error("Auth check error:", err);
      }
      setCheckingAuth(false);
    };
    checkAuth();
  }, [navigate]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const [provisionStage, setProvisionStage] = useState<string>("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (loading) return;

    if (!form.name.trim()) {
      toast.error(t("addAdmin.nameRequired"));
      return;
    }
    if (!form.email.trim()) {
      toast.error(t("addAdmin.emailRequired"));
      return;
    }
    if (form.password.length < 6) {
      toast.error(t("addAdmin.passwordMinLength"));
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error(t("addAdmin.passwordMismatch"));
      return;
    }

    setLoading(true);
    setProvisionStage(t("addAdmin.creatingSession"));

    const originalUid = auth.currentUser?.uid;

    const attempt = async (retryCount = 0): Promise<void> => {
      try {
        setProvisionStage(
          retryCount > 0
            ? t("addAdmin.retrying", { count: retryCount + 1 })
            : t("addAdmin.creating"),
        );

        await adminApi.createAdmin({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        });

        if (auth.currentUser?.uid !== originalUid) {
          console.warn(
            "[AddAdmin] Session displacement detected! Restoring...",
          );
          await auth.currentUser?.getIdToken(true);
        }

        setProvisionStage(t("addAdmin.provisioned"));

        toast.success(
          t("addAdmin.toastCreated"),
          { duration: 5000, icon: "🛡️" },
        );

        setForm({ name: "", email: "", password: "", confirmPassword: "" });
        console.log(
          "[AddAdmin] Account created. Session preserved — UID:",
          auth.currentUser?.uid,
        );
      } catch (err: any) {
        if (
          retryCount < 1 &&
          !err.message?.includes("email-already-in-use") &&
          !err.message?.includes("EMAIL_EXISTS")
        ) {
          console.warn(
            "[AddAdmin] First attempt failed, retrying:",
            err.message,
          );
          return attempt(retryCount + 1);
        }

        if (
          err.code === "auth/email-already-in-use" ||
          err.message?.includes("EMAIL_EXISTS")
        ) {
          toast.error(t("addAdmin.emailInUse"));
        } else {
          toast.error(err.message || t("addAdmin.createFailed"));
        }
      }
    };

    try {
      await attempt();
    } finally {
      setLoading(false);
      setProvisionStage("");
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-6 bg-slate-50/50">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-indigo-100 rounded-full"></div>
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] animate-pulse">
          {t("addAdmin.checkingAuth")}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* ══════════════════════════════════════
          MOBILE — fixed full screen, no scroll
          ══════════════════════════════════════ */}
      <div className="sm:hidden fixed inset-0 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center gap-4 px-4 pt-5 pb-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl  border border-slate-200 text-slate-500  transition-all shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
              {t("addAdmin.title")}
            </h1>
          </div>
          <div className="w-8 h-8 flex items-center justify-center rounded-xl">
            <Shield size={16} />
          </div>
        </div>

        {/* Form — flex-1 so it fills remaining height, buttons pushed to bottom */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 px-4 pb-6 justify-between"
        >
          {/* Fields */}
          <div
            className="bg-white rounded-2xl shadow-md border border-slate-200 
p-5 min-h-[320px] 
flex flex-col gap-4 w-full max-w-md mx-auto"
          >
            {" "}
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.18em] pl-0.5">
                {t("addAdmin.fullName")}
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder={t("addAdmin.namePlaceholder")}
                  required
                  className="w-full py-3 px-4 pl-10 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl font-semibold text-[13px] text-slate-700 transition-all outline-none placeholder:text-slate-300"
                />
                <UserPlus
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={15}
                />
              </div>
            </div>
            {/* Email */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.18em] pl-0.5">
                {t("addAdmin.email")}
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder={t("addAdmin.emailPlaceholder")}
                  required
                  className="w-full py-3 px-4 pl-10 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl font-semibold text-[13px] text-slate-700 transition-all outline-none placeholder:text-slate-300"
                />
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={15}
                />
              </div>
            </div>
            {/* Password + Confirm — side by side */}
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.18em] pl-0.5">
                  {t("addAdmin.password")}
                </label>
                <div className="relative">
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder={t("addAdmin.passwordPlaceholder")}
                    required
                    minLength={6}
                    className="w-full py-3 px-4 pl-10 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl font-semibold text-[13px] text-slate-700 transition-all outline-none placeholder:text-slate-300"
                  />
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={15}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.18em] pl-0.5">
                  {t("addAdmin.confirmPassword")}
                </label>
                <div className="relative">
                  <input
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder={t("addAdmin.passwordPlaceholder")}
                    required
                    minLength={6}
                    className="w-full py-3 px-4 pl-10 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl font-semibold text-[13px] text-slate-700 transition-all outline-none placeholder:text-slate-300"
                  />
                  <ShieldCheck
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={15}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Buttons — pinned to bottom via justify-between on parent */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={loading}
              className="bg-white border border-slate-200 text-slate-500 font-black uppercase tracking-[0.12em] text-[10px] py-3.5 rounded-xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {t("addAdmin.abort")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 text-white font-black uppercase tracking-[0.12em] text-[10px] py-3.5 rounded-xl shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <UserPlus size={14} />
              )}
              {loading ? provisionStage || t("common.processing") : t("addAdmin.createAdmin")}
            </button>
          </div>
        </form>
      </div>

      {/* ══════════════════════════════════════
          DESKTOP — completely unchanged
          ══════════════════════════════════════ */}
      <div className="hidden sm:block space-y-10 animate-fade-in pb-20 max-w-4xl mx-auto">
        <div className="flex items-center gap-5">
          <button
            onClick={() => navigate(-1)}
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-slate-300 transition-all shadow-sm"
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
              {t("addAdmin.title")}
            </h1>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-2 leading-none">
              {t("addAdmin.sectionSubtitleDesktop")}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-1 gap-10"
        >
          <div className="glass-card bg-white border border-slate-200/60 shadow-xl rounded-[2.5rem] p-8 sm:p-12 relative overflow-hidden">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-10 flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
              {t("addAdmin.sectionTitleDesktop")}
            </h2>

            <div className="space-y-8">
              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 group-focus-within:text-indigo-600 transition-colors">
                  {t("addAdmin.fullName")}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder={t("addAdmin.namePlaceholder")}
                    required
                    className="w-full py-4 px-6 pl-14 bg-slate-50/50 border border-slate-200/60 focus:bg-white focus:border-indigo-600 rounded-2xl font-bold text-slate-700 transition-all outline-none"
                  />
                  <UserPlus
                    className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"
                    size={20}
                  />
                </div>
              </div>

              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 group-focus-within:text-indigo-600 transition-colors">
                  {t("addAdmin.email")}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder={t("addAdmin.emailPlaceholder")}
                    required
                    className="w-full py-4 px-6 pl-14 bg-slate-50/50 border border-slate-200/60 focus:bg-white focus:border-indigo-600 rounded-2xl font-bold text-slate-700 transition-all outline-none"
                  />
                  <Mail
                    className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"
                    size={20}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2 group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 group-focus-within:text-indigo-600 transition-colors">
                    {t("addAdmin.password")}
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder={t("addAdmin.passwordPlaceholder")}
                      required
                      minLength={6}
                      className="w-full py-4 px-6 pl-14 bg-slate-50/50 border border-slate-200/60 focus:bg-white focus:border-indigo-600 rounded-2xl font-bold text-slate-700 transition-all outline-none"
                    />
                    <Lock
                      className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"
                      size={20}
                    />
                  </div>
                </div>
                <div className="space-y-2 group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 group-focus-within:text-indigo-600 transition-colors">
                    {t("addAdmin.confirmPassword")}
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder={t("addAdmin.passwordPlaceholder")}
                      required
                      minLength={6}
                      className="w-full py-4 px-6 pl-14 bg-slate-50/50 border border-slate-200/60 focus:bg-white focus:border-indigo-600 rounded-2xl font-bold text-slate-700 transition-all outline-none"
                    />
                    <ShieldCheck
                      className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"
                      size={20}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-7 flex flex-col sm:flex-row gap-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white font-black uppercase tracking-[0.2em] text-xs py-5 px-10 rounded-4xl shadow-2xl shadow-indigo-200 hover:shadow-indigo-400 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex-1 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <UserPlus size={20} />
                )}
                {loading
                  ? provisionStage || t("common.processing")
                  : t("addAdmin.confirmProvisioning")}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                disabled={loading}
                className="bg-white border border-slate-200 text-slate-500 font-black uppercase tracking-[0.2em] text-xs py-5 px-10 rounded-4xl hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("addAdmin.abort")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default AddAdmin;
