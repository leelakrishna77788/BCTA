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
                            Join<br />BCTA<br />Today
                        </h1>
                        <p className="text-slate-400 text-base max-w-sm font-medium leading-relaxed">
                            Become a part of the Bhimavaram Cell Phone Technicians Association and access exclusive resources.
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

                {/* Right Side - Registration Form */}
                <div className="w-full lg:w-1/2 p-8 sm:p-12 lg:p-14 flex flex-col justify-center bg-white">
                    {/* Mobile Header (only visible on mobile) */}
                    <div className="flex lg:hidden flex-col items-center mb-10 text-center">
                        <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm mb-4">
                            <span className="text-2xl text-white tracking-tight font-bold">BC</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Join BCTA</h1>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Create an account</h2>
                        <p className="text-slate-500 mt-2 text-sm font-medium">Please fill in the details below to register.</p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-700">Full Name</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                                required
                                placeholder="John Doe"
                                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-700">Email Address</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                                required
                                placeholder="name@example.com"
                                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors text-sm"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-slate-700">Password</label>
                                <input
                                    type="password"
                                    value={form.password}
                                    onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                                    required
                                    minLength={6}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-slate-700">Account Role</label>
                                <select
                                    value={form.role}
                                    onChange={(e) => setForm(p => ({ ...p, role: e.target.value }))}
                                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors text-sm appearance-none"
                                >
                                    <option value="member">Member (Technician)</option>
                                    <option value="shop">Shop Owner</option>
                                    <option value="admin">Administrator</option>
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors duration-200 mt-6 disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating Account...
                                </>
                            ) : "Register Now"}
                        </button>

                        <p className="text-center text-sm text-slate-600 mt-4 font-medium">
                            Already have an account?{" "}
                            <Link to="/login" className="text-blue-600 font-semibold hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
