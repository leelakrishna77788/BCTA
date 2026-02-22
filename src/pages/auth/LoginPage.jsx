import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";

const LoginPage = () => {
    const { login, userRole } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const cred = await login(email, password);
            // role is fetched inside login; navigate by reading the refreshed profile
            const docRef = doc(db, "users", cred.user.uid);
            const snap = await getDoc(docRef);

            const role = snap.exists() ? snap.data().role : "member";
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
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
            {/* Animated Background Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-indigo-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" style={{ animationDelay: '2s' }} />
            <div className="absolute top-[20%] right-[10%] w-72 h-72 bg-purple-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" style={{ animationDelay: '4s' }} />

            <div className="relative w-full max-w-5xl animate-fade-in flex bg-white/60 backdrop-blur-2xl rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white/80 overflow-hidden min-h-[600px] m-4">

                {/* Left Side - Brand & Branding Image/Gradient */}
                <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-12 flex-col justify-between relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-2xl"></div>

                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-6">
                            <span className="text-3xl">📱</span>
                        </div>
                        <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">
                            BCTA<br />Management<br />Portal
                        </h1>
                        <p className="text-blue-100/90 text-lg max-w-sm">
                            Bhimavaram Cell Phone Technicians Association's unified platform for members, meetings, and shops.
                        </p>
                    </div>

                    <div className="relative z-10">
                        <div className="flex -space-x-3 mb-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className={`w-10 h-10 rounded-full border-2 border-indigo-600 bg-white/20 flex items-center justify-center backdrop-blur-sm text-xs font-bold text-white z-[${5 - i}]`}>
                                    {i === 4 ? '+260' : '👤'}
                                </div>
                            ))}
                        </div>
                        <p className="text-sm text-blue-200 font-medium tracking-wide">Join 260+ active members</p>
                    </div>
                </div>

                {/* Right Side - Login Form */}
                <div className="w-full lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-center relative">
                    {/* Mobile Header (only visible on mobile) */}
                    <div className="flex lg:hidden flex-col items-center mb-10 text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
                            <span className="text-3xl">📱</span>
                        </div>
                        <h1 className="text-2xl font-extrabold text-slate-800">BCTA Portal</h1>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome back</h2>
                        <p className="text-slate-500 mt-2 text-sm font-medium">Please enter your credentials to access your account.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700 ml-1">Email Address</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">✉️</span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="name@example.com"
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between ml-1">
                                <label className="text-sm font-bold text-slate-700">Password</label>
                                <a href="#" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">Forgot password?</a>
                            </div>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔒</span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all duration-300 shadow-xl shadow-slate-200/50 hover:shadow-xl shadow-slate-200/50 active:scale-95 disabled:opacity-70 mt-4 relative overflow-hidden group"
                        >
                            <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></span>
                            <span className="relative flex items-center justify-center gap-2">
                                {loading ? (
                                    <>
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Authenticating...
                                    </>
                                ) : "Sign In to Portal"}
                            </span>
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
