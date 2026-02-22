import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";

const RegisterPage = () => {
    const { registerUser } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        role: "member"
    });
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await registerUser(form.email, form.password, form.name, form.role);
            toast.success("Account created successfully!");
            if (form.role === "member" || form.role === "shop") navigate("/member/dashboard");
            else navigate("/admin/dashboard");
        } catch (err) {
            console.error("Registration detail err:", err);
            const msg = err.code === "auth/email-already-in-use"
                ? "This email is already registered. Please login instead."
                : (err.message || "Registration failed");
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
            {/* Animated Background Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-teal-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" style={{ animationDelay: '2s' }} />
            <div className="absolute top-[20%] right-[10%] w-72 h-72 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" style={{ animationDelay: '4s' }} />

            <div className="relative w-full max-w-5xl animate-fade-in flex bg-white/60 backdrop-blur-2xl rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white/80 overflow-hidden min-h-[600px] m-4">

                {/* Left Side - Brand & Branding Image/Gradient */}
                <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-12 flex-col justify-between relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-2xl"></div>

                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-6">
                            <span className="text-3xl">📝</span>
                        </div>
                        <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">
                            Join<br />BCTA<br />Today
                        </h1>
                        <p className="text-emerald-100/90 text-lg max-w-sm">
                            Become a part of the Bhimavaram Cell Phone Technicians Association and access exclusive resources.
                        </p>
                    </div>

                    <div className="relative z-10">
                        <div className="flex -space-x-3 mb-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className={`w-10 h-10 rounded-full border-2 border-teal-600 bg-white/20 flex items-center justify-center backdrop-blur-sm text-xs font-bold text-white z-[${5 - i}]`}>
                                    {i === 4 ? '+260' : '👤'}
                                </div>
                            ))}
                        </div>
                        <p className="text-sm text-emerald-200 font-medium tracking-wide">Join 260+ active members</p>
                    </div>
                </div>

                {/* Right Side - Registration Form */}
                <div className="w-full lg:w-1/2 p-8 sm:p-12 lg:p-14 flex flex-col justify-center relative">
                    {/* Mobile Header (only visible on mobile) */}
                    <div className="flex lg:hidden flex-col items-center mb-8 text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
                            <span className="text-3xl">📝</span>
                        </div>
                        <h1 className="text-2xl font-extrabold text-slate-800">Join BCTA</h1>
                    </div>

                    <div className="mb-6">
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Create an account</h2>
                        <p className="text-slate-500 mt-2 text-sm font-medium">Please fill in the details below to register.</p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700 ml-1">Full Name</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">👤</span>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                                    required
                                    placeholder="John Doe"
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700 ml-1">Email Address</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">✉️</span>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                                    required
                                    placeholder="name@example.com"
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5 border-none">
                                <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔒</span>
                                    <input
                                        type="password"
                                        value={form.password}
                                        onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                                        required
                                        minLength={6}
                                        placeholder="••••••••"
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all font-medium"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700 ml-1">Account Role</label>
                                <div className="relative">
                                    <select
                                        value={form.role}
                                        onChange={(e) => setForm(p => ({ ...p, role: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all font-medium appearance-none"
                                    >
                                        <option value="member">Member (Technician)</option>
                                        <option value="shop">Shop Owner</option>
                                        <option value="admin">Administrator</option>
                                    </select>
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">⌄</span>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl transition-all duration-300 shadow-xl shadow-slate-200/50 hover:shadow-xl shadow-slate-200/50 active:scale-95 disabled:opacity-70 mt-2 relative overflow-hidden group"
                        >
                            <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></span>
                            <span className="relative flex items-center justify-center gap-2">
                                {loading ? (
                                    <>
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Creating Account...
                                    </>
                                ) : "Register Now"}
                            </span>
                        </button>

                        <p className="text-center text-sm text-slate-600 mt-4 font-medium">
                            Already have an account?{" "}
                            <Link to="/login" className="text-teal-600 font-bold hover:underline">
                                Sign In
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
