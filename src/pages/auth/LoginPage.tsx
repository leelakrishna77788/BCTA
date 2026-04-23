import React, { useState, useEffect } from "react";
import { assets } from "../../assets/assets";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../../components/shared/LanguageSwitcher";

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const { login, currentUser, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetting, setResetting] = useState(false);

  // Auto-redirect if user is already authenticated (session persisted)
  useEffect(() => {
    if (!authLoading && currentUser && userRole) {
      const isAdmin = userRole === "admin" || userRole === "superadmin";
      const target = isAdmin ? "/admin/dashboard" : "/member/dashboard";
      
      // Navigate instantly. The App-level VersionHandler will handle any 
      // necessary reloads if a new code version was detected in the background.
      navigate(target, { replace: true });
    }
  }, [authLoading, currentUser, userRole, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cred = await login(email, password);

      const docRef = doc(db, "users", cred.user.uid);
      const snap = await getDoc(docRef);
      const data = snap.exists() ? snap.data() : null;
      const role = (data?.role?.toLowerCase() || "member") as string;
      const isAdmin = role === "admin" || role === "superadmin";

      toast.success(t("login.loginSuccess"));
      
      const destination = isAdmin ? "/admin/dashboard" : "/member/dashboard";
      navigate(destination, { replace: true });
    } catch (err: any) {
      console.error("Login detail err:", err);
      const msg =
        err.code === "auth/invalid-login-credentials"
          ? t("login.invalidCredentials")
          : err.message || t("login.loginFailed");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error(t("login.enterEmail"));
      return;
    }

    setResetting(true);
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, resetEmail);
      toast.success(t("login.resetSent"));
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (err: any) {
      console.error("Reset password error:", err);
      if (err.code === "auth/user-not-found") {
        toast.error(t("login.noAccount"));
      } else if (err.code === "auth/invalid-email") {
        toast.error(t("login.invalidEmail"));
      } else {
        toast.error(t("login.resetFailed"));
      }
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden scrollbar-hide" style={{ background: "var(--surface-base)" }}>
      {/* Show loading spinner while checking persisted session */}
      {authLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-50/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 text-sm font-medium">{t("login.restoringSession")}</p>
          </div>
        </div>
      )}
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20 animate-float"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)" }}
        />
        <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)", animation: "floatUp 4s ease-in-out infinite reverse" }}
        />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, rgba(167,139,250,0.5) 0%, transparent 70%)", animation: "floatUp 5s ease-in-out infinite 1s" }}
        />
      </div>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative z-10">
        {/* Login Card */}
        <div className="w-full max-w-[440px] rounded-2xl overflow-hidden animate-slide-up"
          style={{
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.3)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.1) inset",
          }}
        >

          {/* Header with gradient */}
          <div className="p-4 sm:p-4 pb-0 sm:pb-0 relative overflow-hidden">

            <div
              className="absolute inset-0 opacity-30"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.4) 0%, transparent 70%)"
              }}
            />

            {/* Home Button + Language Switcher */}
            <div className="relative z-10 flex justify-between items-center mb-4">
              <button
                onClick={() => navigate("/")}
                className="text-blue-900 font-medium hover:text-blue-700"
              >
                🏠︎ {t("login.home")}
              </button>
              <LanguageSwitcher variant="light" />
            </div>

            {/* Center Logo + Title */}
            <div className="relative z-10 text-center">
              <div className="flex items-center justify-center mx-auto mb-3">
                <img
                  src={assets.herologo}
                  alt="Hero Logo"
                  className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 object-contain"
                />
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-blue-900 tracking-tight">
                {t("login.bctaSystem")}
              </h1>
            </div>

          </div>

          {/* Form Section */}
          <div className="p-4 sm:p-8 pt-2 sm:pt-4">
            <div className="mb-4">
              <h2 className="text-xl sm:text-2xl text-center font-bold text-slate-900 tracking-tight">
                {t("login.welcomeBack")}
              </h2>
              <p className="text-slate-500 text-center mt-1 text-sm font-medium">
                {t("login.signInSubtitle")}
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  {t("login.emailAddress")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail size={17} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder={t("login.emailPlaceholder")}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all text-sm"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  {t("login.password")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={17} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder={t("login.passwordPlaceholder")}
                    className="w-full pl-11 pr-11 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? t("common.hidePass") : t("common.showPass")}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  {t("login.forgotPassword")}
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-70 flex items-center justify-center gap-2 hover:shadow-[0_0_24px_rgba(99,102,241,0.3)] hover:-translate-y-0.5 active:translate-y-0"
                style={{ background: "var(--gradient-primary)" }}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t("login.signingIn")}
                  </>
                ) : (
                  <>
                    {t("login.signIn")}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>


          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="w-full max-w-md overflow-hidden animate-scale-in rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(24px)",
              boxShadow: "0 25px 60px rgba(0,0,0,0.2)",
            }}
          >
            {/* Modal Header */}
            <div className="p-6 text-center relative overflow-hidden" style={{ background: "var(--gradient-primary)" }}>
              <div className="absolute inset-0 opacity-30" style={{
                background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.4) 0%, transparent 70%)"
              }} />
              <div className="relative z-10">
                <h3 className="text-xl font-bold text-white">{t("login.resetPassword")}</h3>
                <p className="text-indigo-200/80 text-sm mt-1 font-medium">
                  {t("login.resetSubtitle")}
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleForgotPassword} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  {t("login.emailAddress")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail size={17} />
                  </div>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    placeholder={t("login.registeredEmail")}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmail("");
                  }}
                  className="w-full sm:flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all"
                >
                  {t("login.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="w-full sm:flex-1 py-3 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-70 flex items-center justify-center gap-2 hover:shadow-[0_0_24px_rgba(99,102,241,0.3)]"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {resetting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t("login.sending")}
                    </>
                  ) : (
                    t("login.sendResetLink")
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
