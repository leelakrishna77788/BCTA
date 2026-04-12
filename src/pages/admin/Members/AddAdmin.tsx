import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Shield, UserPlus, AlertCircle, Loader2, ShieldCheck, Mail, Lock } from "lucide-react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../../firebase/firebaseConfig";
import { adminApi } from "../../../services/adminService";

const AddAdmin: React.FC = () => {
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
                        toast.error("Unauthorized access");
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
        setForm(p => ({ ...p, [e.target.name]: e.target.value }));

    const [provisionStage, setProvisionStage] = useState<string>("");

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        
        // Prevent double-submit
        if (loading) return;

        if (!form.name.trim()) {
            toast.error("Name is required");
            return;
        }
        if (!form.email.trim()) {
            toast.error("Email is required");
            return;
        }
        if (form.password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }
        if (form.password !== form.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setLoading(true);
        setProvisionStage("Authenticating session...");

        // Retry wrapper for transient failures
        const attempt = async (retryCount = 0): Promise<void> => {
            try {
                setProvisionStage(retryCount > 0 ? `Retrying... (attempt ${retryCount + 1})` : "Creating admin account...");
                
                await adminApi.createAdmin({
                    name: form.name.trim(),
                    email: form.email.trim(),
                    password: form.password
                });
                
                setProvisionStage("Account provisioned!");
                
                toast.success(`Administrator account for "${form.name}" has been provisioned successfully!`, {
                    duration: 5000,
                    icon: '🛡️'
                });

                // Reset form for next admin
                setForm({ name: "", email: "", password: "", confirmPassword: "" });
                console.log("[AddAdmin] Account created. Current session UID:", auth.currentUser?.uid);
            } catch (err: any) {
                // Auto-retry once on network/transient errors
                if (retryCount < 1 && !err.message?.includes("email-already-in-use") && !err.message?.includes("EMAIL_EXISTS")) {
                    console.warn("[AddAdmin] First attempt failed, retrying:", err.message);
                    return attempt(retryCount + 1);
                }
                
                if (err.code === "auth/email-already-in-use" || err.message?.includes("EMAIL_EXISTS")) {
                    toast.error("Email already in use by another account");
                } else {
                    toast.error(err.message || "Failed to create admin");
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
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] animate-pulse">Verifying Security Credentials...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-fade-in pb-20 max-w-4xl mx-auto px-4 sm:px-0">
            {/* Header */}
            <div className="flex items-center gap-5">
                <button
                    onClick={() => navigate(-1)}
                    className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-slate-300 transition-all shadow-sm"
                >
                    <ArrowLeft size={22} />
                </button>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Provision Admin</h1>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-2 leading-none">Security Privilege Configuration</p>
                </div>
            </div>

            {/* Info Card */}
            <div className="glass-card bg-slate-900 rounded-[2.5rem] p-8 sm:p-10 text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-10 text-indigo-500 group-hover:scale-110 transition-transform duration-700">
                    <Shield size={160} />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black tracking-tight">Privileged Access</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Full System Authority</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                        {["Member Registry", "Financial Ledger", "QR Ecosystem", "Push Service"].map((perm) => (
                            <div key={perm} className="bg-white/5 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10">
                                <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest text-center">{perm}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-1 gap-10">
                <div className="glass-card bg-white border border-slate-200/60 shadow-xl rounded-[2.5rem] p-8 sm:p-12 relative overflow-hidden">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-10 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                        Administrator Credentials
                    </h2>
                    
                    <div className="space-y-8">
                        <div className="space-y-2 group">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 group-focus-within:text-indigo-600 transition-colors">
                                Full Name <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    placeholder="e.g. Administrator"
                                    required
                                    className="w-full py-4 px-6 pl-14 bg-slate-50/50 border border-slate-200/60 focus:bg-white focus:border-indigo-600 rounded-2xl font-bold text-slate-700 transition-all outline-none"
                                />
                                <UserPlus className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                            </div>
                        </div>

                        <div className="space-y-2 group">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 group-focus-within:text-indigo-600 transition-colors">
                                Email Address <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="admin@bcta.in"
                                    required
                                    className="w-full py-4 px-6 pl-14 bg-slate-50/50 border border-slate-200/60 focus:bg-white focus:border-indigo-600 rounded-2xl font-bold text-slate-700 transition-all outline-none"
                                />
                                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div className="space-y-2 group">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 group-focus-within:text-indigo-600 transition-colors">
                                    Access Password <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        name="password"
                                        value={form.password}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                        className="w-full py-4 px-6 pl-14 bg-slate-50/50 border border-slate-200/60 focus:bg-white focus:border-indigo-600 rounded-2xl font-bold text-slate-700 transition-all outline-none"
                                    />
                                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                                </div>
                            </div>
                            <div className="space-y-2 group">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 group-focus-within:text-indigo-600 transition-colors">
                                    Confirm Password <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={form.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                        className="w-full py-4 px-6 pl-14 bg-slate-50/50 border border-slate-200/60 focus:bg-white focus:border-indigo-600 rounded-2xl font-bold text-slate-700 transition-all outline-none"
                                    />
                                    <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 flex flex-col sm:flex-row gap-4">
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="bg-indigo-600 text-white font-black uppercase tracking-[0.2em] text-xs py-5 px-10 rounded-4xl shadow-2xl shadow-indigo-200 hover:shadow-indigo-400 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex-1 flex items-center justify-center gap-3"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
                            {loading ? (provisionStage || "Processing...") : "Confirm Provisioning"}
                        </button>
                        <button 
                            type="button" 
                            onClick={() => navigate(-1)}
                            disabled={loading}
                            className="bg-white border border-slate-200 text-slate-500 font-black uppercase tracking-[0.2em] text-xs py-5 px-10 rounded-4xl hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Abort Process
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default AddAdmin;
