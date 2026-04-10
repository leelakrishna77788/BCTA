import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, User, Mail, Phone, Lock, CreditCard, ArrowRight } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();



  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    aadhaar: "",
    password: "",
    confirmPassword: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.aadhaar.length !== 4) {
      toast.error("Please enter the last 4 digits of Aadhaar");
      return;
    }

    if (formData.phone.length !== 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await register(formData.email, formData.password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: "member",
        status: "pending",
        memberId: "", // ID will be assigned centrally upon admin approval
        joinDate: Timestamp.now(),
        lastActive: Timestamp.now(),
        aadhaarLast4: formData.aadhaar,
        profileImage: "",
        barcode: `BCTA-${formData.phone}`,
        address: "",
        emergencyContact: "",
        bloodGroup: "",
        attendanceCount: 0,
        paymentStatus: "unpaid"
      });

      toast.success("Registration successful! Please wait for admin approval.");
      navigate("/login");
      
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Failed to register account");
    } finally {
      setLoading(false);
    }
  };

  const inputFields = [
    { name: "name", label: "Full Name", type: "text", icon: User, placeholder: "Enter full name", maxLength: undefined },
    { name: "email", label: "Email Address", type: "email", icon: Mail, placeholder: "name@example.com", maxLength: undefined },
    { name: "phone", label: "Phone Number", type: "tel", icon: Phone, placeholder: "10-digit mobile number", maxLength: 10 },
    { name: "aadhaar", label: "Aadhaar (Last 4 Digits)", type: "text", icon: CreditCard, placeholder: "e.g. 5678", maxLength: 4, mono: true },
    { name: "password", label: "Password", type: "password", icon: Lock, placeholder: "Minimum 6 characters", maxLength: undefined, minLength: 6 },
    { name: "confirmPassword", label: "Confirm Password", type: "password", icon: Lock, placeholder: "Re-enter password", maxLength: undefined, minLength: 6 },
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: "var(--gradient-primary)" }}>
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)" }}
        />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)" }}
        />
      </div>

      <div className="flex-1 flex items-start justify-center py-8 sm:py-12 px-4 sm:px-6 relative z-10">
        <div className="w-full max-w-2xl animate-slide-up">
          
          {/* Header */}
          <div className="mb-6">
            <Link to="/" className="inline-flex items-center text-sm font-medium text-indigo-200/70 hover:text-white mb-5 transition-colors duration-200 group">
              <ArrowLeft size={16} className="mr-1.5 transition-transform group-hover:-translate-x-1" /> Back to Home
            </Link>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg border border-white/10"
                style={{ background: "var(--gradient-accent)" }}
              >
                <span className="text-xl text-white font-bold tracking-tight">BC</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Create your account</h1>
                <p className="text-indigo-200/60 text-sm font-medium">Join the Bhimavaram Cellphone Technicians Association</p>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="rounded-2xl p-6 sm:p-10 overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.93)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.3)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1) inset",
            }}
          >
            <form onSubmit={handleRegister} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {inputFields.map(({ name, label, type, icon: Icon, placeholder, maxLength, mono, minLength }) => (
                  <div key={name} className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-700">{label}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Icon size={17} />
                      </div>
                      <input
                        type={type}
                        name={name}
                        value={formData[name as keyof typeof formData]}
                        onChange={handleChange}
                        required
                        maxLength={maxLength}
                        minLength={minLength}
                        placeholder={placeholder}
                        className={`w-full pl-11 pr-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all text-sm outline-none ${mono ? "font-mono" : ""}`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-start gap-3 mb-6">
                  <div className="flex items-center h-5 mt-0.5">
                    <input
                      id="terms"
                      type="checkbox"
                      required
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  <label htmlFor="terms" className="text-xs text-slate-600 leading-relaxed">
                    I agree to the <a href="#" className="text-indigo-600 font-semibold hover:underline">Terms and Conditions</a> and <a href="#" className="text-indigo-600 font-semibold hover:underline">Privacy Policy</a> of BCTA. I understand that my account requires admin approval before I can access member features.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-70 flex items-center justify-center gap-2 hover:shadow-[0_0_24px_rgba(99,102,241,0.3)] hover:-translate-y-0.5 active:translate-y-0"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {loading ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Register as Member
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <p className="text-center mt-6 text-sm text-indigo-200/60 font-medium">
            Already a member? <Link to="/login" className="font-bold text-white hover:underline">Sign in here</Link>
          </p>

        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
