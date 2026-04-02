import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetting, setResetting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cred = await login(email, password);

      const docRef = doc(db, "users", cred.user.uid);
      const snap = await getDoc(docRef);
      const data = snap.exists() ? snap.data() : null;
      const role = data?.role?.toLowerCase() || "member";

      toast.success("Welcome back!");
      if (role === "admin" || role === "superadmin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/member/dashboard");
      }
    } catch (err: any) {
      console.error("Login detail err:", err);
      const msg =
        err.code === "auth/invalid-login-credentials"
          ? "Invalid email or password. Please try again."
          : err.message || "Login failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error("Please enter your email address");
      return;
    }

    setResetting(true);
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, resetEmail);
      toast.success("Password reset email sent! Check your inbox.");
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (err: any) {
      console.error("Reset password error:", err);
      if (err.code === "auth/user-not-found") {
        toast.error("No account found with this email address");
      } else if (err.code === "auth/invalid-email") {
        toast.error("Invalid email address");
      } else {
        toast.error("Failed to send reset email. Please try again.");
      }
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF5B] flex flex-col">
      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        {/* Login Card */}
        <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-xl border border-slate-100 animate-fade-in overflow-hidden">

          {/* Header with Logo */}
          <div className="bg-[#000080] p-6 sm:p-8 text-center">
            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mx-auto shadow-lg mb-3">
              <span className="text-[#000080] text-3xl font-bold tracking-tight">BC</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              BCTA Management System
            </h1>
            <p className="text-blue-200 text-xs sm:text-sm mt-1">
              Bhimavaram Cell Phone Technicians Association
            </p>
          </div>

          {/* Form Section */}
          <div className="p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Welcome Back seikanth
              </h2>
              <p className="text-slate-500 mt-1 text-sm">
                Sign in to access your account
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-[#000080] focus:ring-1 focus:ring-[#000080] transition-colors text-sm"
                />
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-[#000080] focus:ring-1 focus:ring-[#000080] transition-colors text-sm"
                />
              </div>

              {/* Forgot Password Link */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs font-semibold text-[#000080] hover:text-[#000066] transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#000080] hover:bg-[#000066] text-white font-medium rounded-lg transition-colors duration-200 mt-2 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            {/* Register Link */}
            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-600">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="text-[#000080] font-bold hover:underline"
                >
                  Register Now
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} BCTA — All rights reserved
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="bg-[#000080] p-6 text-center">
              <h3 className="text-xl font-bold text-white">Reset Password</h3>
              <p className="text-blue-200 text-sm mt-1">
                Enter your email to receive a reset link
              </p>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleForgotPassword} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  placeholder="Enter your registered email"
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-[#000080] focus:ring-1 focus:ring-[#000080] transition-colors text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmail("");
                  }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="flex-1 py-3 bg-[#000080] hover:bg-[#000066] text-white font-medium rounded-lg transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {resetting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
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
