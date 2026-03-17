import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";

const LoginPage = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const cred = await login(email, password);
            
            // Wait for a small delay to allow AuthContext to sync, or manually fetch role for immediate navigation
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
        } catch (err) {
            console.error("Login detail err:", err);
            const msg = err.code === "auth/invalid-login-credentials"
                ? "Invalid email or password. Please try again."
                : (err.message || "Login failed");
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl flex overflow-hidden min-h-[600px] border border-slate-100 animate-fade-in">

                {/* Left Side - Brand Display */}
                <div className="hidden lg:flex w-1/2 bg-slate-900 p-12 flex-col justify-between relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>

                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg mb-8">
                            <span className="text-3xl text-white font-bold tracking-tight">BC</span>
                        </div>
                        <h1 className="text-4xl font-bold text-white leading-tight mb-4 tracking-tight">
                            BCTA<br />Management<br />System
                        </h1>
                        <p className="text-slate-400 text-base max-w-sm font-medium leading-relaxed">
                            Bhimavaram Cell Phone Technicians Association's unified platform for members, meetings, and shops.
                        </p>
                    </div>

                    <div className="relative z-10">
                        <div className="flex -space-x-3 mb-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className={`w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 z-[${5 - i}]`}>
                                    {i === 4 ? '+260' : 'U'}
                                </div>
                            ))}
                        </div>
                        <p className="text-sm text-slate-400 font-medium">Join 260+ active technicians</p>
                    </div>
                </div>

                {/* Right Side - Login Form */}
                <div className="w-full lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-white">
                    {/* Mobile Header (only visible on mobile) */}
                    <div className="flex lg:hidden flex-col items-center mb-10 text-center">
                        <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm mb-4">
                            <span className="text-2xl text-white tracking-tight font-bold">BC</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">BCTA System</h1>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Sign in</h2>
                        <p className="text-slate-500 mt-2 text-sm font-medium">Please enter your credentials to access your account.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-700">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="name@example.com"
                                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium text-slate-700">Password</label>
                                <a href="#" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">Forgot password?</a>
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors text-sm"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors duration-200 mt-6 disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-slate-500 border-t-white rounded-full animate-spin" />
                                    Authenticating...
                                </>
                            ) : "Sign in"}
                        </button>
                    </form>
                    <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center gap-4">
                        <p className="text-center text-sm text-slate-600 font-medium">
                            Don't have an account?{" "}
                            <Link to="/register" className="text-blue-600 font-bold hover:underline">
                                Register Now
                            </Link>
                        </p>
                        <p className="text-slate-400 text-xs text-center font-medium">
                            © {new Date().getFullYear()} BCTA — All rights reserved
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
