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
  Upload,
} from "lucide-react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../../firebase/firebaseConfig";
import { adminApi } from "../../../services/adminService";
import { uploadImage, ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "../../../utils/cloudinary";

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

  // Photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

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

  const handlePhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, and WEBP images are allowed");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image size must be less than 2MB");
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

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
        let imageUrl = undefined;
        let imagePublicId = undefined;

        if (photoFile) {
          setProvisionStage(t("addAdmin.uploadingPhoto") || "Uploading photo...");
          try {
            const uploaded = await uploadImage(photoFile, "admins");
            imageUrl = uploaded.url;
            imagePublicId = uploaded.publicId;
          } catch (uploadErr) {
            console.error("[AddAdmin] Photo upload failed:", uploadErr);
            throw new Error("Photo upload failed. Please try again.");
          }
        }

        setProvisionStage(
          retryCount > 0
            ? t("addAdmin.retrying", { count: retryCount + 1 })
            : t("addAdmin.creating"),
        );

        await adminApi.createAdmin({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          imageUrl,
          imagePublicId,
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
        setPhotoFile(null);
        setPhotoPreview(null);
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
          MOBILE — scrollable, fits any screen
          ══════════════════════════════════════ */}
      <div className="sm:hidden min-h-[100dvh] space-y-5 pb-8 animate-fade-in">
        {/* Top bar */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-all shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              {t("addAdmin.title")}
            </h1>
          </div>
          <Shield size={18} className="text-slate-400" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-5 flex flex-col gap-4">
            {/* Photo Upload */}
            <div className="flex items-center gap-4 pb-2 border-b border-slate-100 mb-2">
              <div className="h-20 w-20 overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50 flex-shrink-0">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <Upload size={22} />
                  </div>
                )}
              </div>
              <label className="w-auto whitespace-nowrap inline-flex cursor-pointer items-center justify-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-indigo-600 px-2.5 py-1.5 sm:px-4 sm:py-2.5 text-[10px] sm:text-[11px] font-bold sm:font-black uppercase tracking-widest text-white shadow-md shadow-indigo-100 active:scale-95 transition-all">
                <Upload size={12} className="sm:hidden" />
                <Upload size={14} className="hidden sm:block" />
                {photoPreview ? "Replace Photo" : "Upload Photo"}
                <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
              </label>
            </div>

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
                <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
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
                  autoComplete="new-email"
                  className="w-full py-3 px-4 pl-10 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl font-semibold text-[13px] text-slate-700 transition-all outline-none placeholder:text-slate-300"
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              </div>
            </div>
            {/* Password */}
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
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              </div>
            </div>
            {/* Confirm Password */}
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
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 text-white font-black uppercase tracking-[0.12em] text-[12px] py-4 rounded-xl shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
              {loading ? provisionStage || t("common.processing") : t("addAdmin.createAdmin")}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={loading}
              className="bg-white border border-slate-200 text-slate-500 font-black uppercase tracking-[0.12em] text-[12px] py-4 rounded-xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {t("addAdmin.abort")}
            </button>
          </div>
        </form>
      </div>

      {/* ══════════════════════════════════════
          DESKTOP — completely unchanged
          ══════════════════════════════════════ */}
      <div className="hidden sm:flex items-center justify-center h-full animate-fade-in">
        <div className="w-full max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-slate-300 transition-all shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              {t("addAdmin.title")}
            </h1>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1 leading-none">
              {t("addAdmin.sectionSubtitleDesktop")}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="glass-card bg-white border border-slate-200/60 shadow-xl rounded-3xl p-8 relative overflow-hidden">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
              {t("addAdmin.sectionTitleDesktop")}
            </h2>

            {/* Photo Upload Section */}
            <div className="mb-8 flex items-center gap-6 p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
              <div className="h-20 w-20 overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-white shadow-inner flex-shrink-0">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <Upload size={24} />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Profile Identity Photo
                </p>
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white hover:bg-indigo-700 hover:-translate-y-0.5 transition-all active:scale-95 shadow-lg shadow-indigo-100">
                  <Upload size={16} /> {photoPreview ? "Replace Photo" : "Upload Photo"}
                  <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                </label>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5 group">
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
                    className="w-full py-3 px-5 pl-12 bg-slate-50/50 border border-slate-200/60 focus:bg-white focus:border-indigo-600 rounded-2xl font-bold text-slate-700 transition-all outline-none"
                  />
                  <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                </div>
              </div>

              <div className="space-y-1.5 group">
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
                    autoComplete="new-email"
                    className="w-full py-3 px-5 pl-12 bg-slate-50/50 border border-slate-200/60 focus:bg-white focus:border-indigo-600 rounded-2xl font-bold text-slate-700 transition-all outline-none"
                  />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5 group">
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
                      className="w-full py-3 px-5 pl-12 bg-slate-50/50 border border-slate-200/60 focus:bg-white focus:border-indigo-600 rounded-2xl font-bold text-slate-700 transition-all outline-none"
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                  </div>
                </div>
                <div className="space-y-1.5 group">
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
                      className="w-full py-3 px-5 pl-12 bg-slate-50/50 border border-slate-200/60 focus:bg-white focus:border-indigo-600 rounded-2xl font-bold text-slate-700 transition-all outline-none"
                    />
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 text-white font-black uppercase tracking-[0.2em] text-xs py-4 px-8 rounded-2xl shadow-lg shadow-indigo-200 hover:shadow-indigo-400 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex-1 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                {loading ? provisionStage || t("common.processing") : t("addAdmin.confirmProvisioning")}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                disabled={loading}
                className="bg-white border border-slate-200 text-slate-500 font-black uppercase tracking-[0.2em] text-xs py-4 px-8 rounded-2xl hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("addAdmin.abort")}
              </button>
            </div>
          </div>
        </form>
        </div>
      </div>
    </>
  );
};

export default AddAdmin;
