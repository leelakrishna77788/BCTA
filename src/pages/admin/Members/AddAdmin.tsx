import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Shield, UserPlus, AlertCircle, Loader2 } from "lucide-react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../../../firebase/firebaseConfig";

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
                        setCheckingAuth(false);
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

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        
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
        try {
            const cred = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
            
            await setDoc(doc(db, "users", cred.user.uid), {
                name: form.name.trim(),
                email: form.email.trim(),
                role: "admin",
                status: "active",
                createdAt: serverTimestamp(),
            });

            toast.success(`Admin "${form.name}" created successfully!`);
            setForm({ name: "", email: "", password: "", confirmPassword: "" });
        } catch (err: any) {
            if (err.code === "auth/email-already-in-use") {
                toast.error("Email already in use by another account");
            } else {
                toast.error(err.message || "Failed to create admin");
            }
        } finally {
            setLoading(false);
        }
    };

    if (checkingAuth) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <Loader2 size={48} className="text-[#000080] animate-spin" />
                <p className="text-slate-500">Checking permissions...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in pb-12 max-w-3xl mx-auto">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200/60 text-slate-500 hover:text-[#000080] hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="page-title mb-1 drop-shadow-sm text-3xl">Add New Admin</h1>
                    <p className="text-slate-500 font-medium text-sm">Create a new administrator account</p>
                </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                        <Shield size={20} className="text-[#000080]" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white">Admin Privileges</h3>
                        <p className="text-slate-400 text-xs">This user will have full admin access to the portal</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    {["Member Management", "Meetings & Attendance", "Payments & Shops", "Notifications"].map((perm) => (
                        <div key={perm} className="bg-white/5 rounded-lg px-3 py-2 text-center">
                            <p className="text-xs text-slate-300 font-medium">{perm}</p>
                        </div>
                    ))}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="card bg-white border border-slate-200 shadow-sm rounded-xl">
                    <h2 className="text-sm font-bold text-slate-800 mb-6 tracking-tight uppercase flex items-center gap-2">
                        <UserPlus size={18} className="text-[#000080]" />
                        Admin Details
                    </h2>
                    <div className="space-y-5">
                        <div>
                            <label className="label">Full Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="Enter admin's full name"
                                required
                                className="input-field"
                            />
                        </div>
                        <div>
                            <label className="label">Email Address <span className="text-red-500">*</span></label>
                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="admin@example.com"
                                required
                                className="input-field"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label className="label">Password <span className="text-red-500">*</span></label>
                                <input
                                    type="password"
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    placeholder="Min 6 characters"
                                    required
                                    minLength={6}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="label">Confirm Password <span className="text-red-500">*</span></label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={form.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Re-enter password"
                                    required
                                    minLength={6}
                                    className="input-field"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-slate-200/60 sticky bottom-4 bg-white p-4 rounded-xl shadow-md border border-slate-200 z-20">
                    <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1 sm:flex-none py-3 font-semibold shadow-sm">
                        Cancel
                    </button>
                    <button type="submit" disabled={loading} className="btn-primary flex-1 py-3 font-semibold shadow-xl shadow-slate-200/50 hover:shadow-xl shadow-slate-200/50 transition-all flex items-center justify-center gap-2">
                        {loading ? (
                            <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating Admin...</>
                        ) : "Create Admin Account"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddAdmin;
