import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, User, Mail, Phone, Lock, CreditCard } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const generateMemberId = () => {
    const year = new Date().getFullYear();
    const num = Math.floor(Math.random() * 900) + 100;
    return `BCTA-${year}-${num}`;
  };

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
      // 1. Create Firebase Auth user
      const userCredential = await register(formData.email, formData.password);
      const user = userCredential.user;

      // 2. Add profile data to Firestore
      // Note: By default, new users register as "member" with "pending" status.
      // An Admin must approve them to change status to "active".
      const memberId = generateMemberId();
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: "member",
        status: "pending", // Requires admin approval
        memberId: memberId, // Auto-generated member ID
        joinDate: Timestamp.now(),
        lastActive: Timestamp.now(),
        aadhaarLast4: formData.aadhaar,
        profileImage: "", // Can be uploaded later
        barcode: `BCTA-${formData.phone}`, // Simplified barcode generation
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col py-10 px-4 sm:px-6">
      <div className="w-full max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-6 transition-colors">
            <ArrowLeft size={16} className="mr-1.5" /> Back to Home
          </Link>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-[#000080] rounded-xl flex items-center justify-center shadow-md">
              <span className="text-xl text-white font-bold tracking-tight">BC</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create your account</h1>
              <p className="text-slate-500 text-sm">Join the Bhimavaram Cellphone Technicians Association</p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-10">
          <form onSubmit={handleRegister} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Enter full name"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-[#000080] focus:ring-1 focus:ring-[#000080] outline-none transition-colors text-sm"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-[#000080] focus:ring-1 focus:ring-[#000080] outline-none transition-colors text-sm"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone size={18} />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-[#000080] focus:ring-1 focus:ring-[#000080] outline-none transition-colors text-sm"
                  />
                </div>
              </div>

              {/* Aadhaar */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Aadhaar (Last 4 Digits)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <CreditCard size={18} />
                  </div>
                  <input
                    type="text"
                    name="aadhaar"
                    value={formData.aadhaar}
                    onChange={handleChange}
                    required
                    maxLength={4}
                    placeholder="e.g. 5678"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-colors text-sm font-mono"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-[#000080] focus:ring-1 focus:ring-[#000080] outline-none transition-colors text-sm"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    minLength={6}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-[#000080] focus:ring-1 focus:ring-[#000080] outline-none transition-colors text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-start gap-3 mb-6">
                <div className="flex items-center h-5">
                  <input
                    id="terms"
                    type="checkbox"
                    required
                    className="w-4 h-4 rounded border-slate-300 text-[#000080] focus:ring-[#000080]"
                  />
                </div>
                <label htmlFor="terms" className="text-xs text-slate-600 leading-relaxed">
                  I agree to the <a href="#" className="text-[#000080] font-medium hover:underline">Terms and Conditions</a> and <a href="#" className="text-[#000080] font-medium hover:underline">Privacy Policy</a> of BCTA. I understand that my account requires admin approval before I can access member features.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#000080] hover:bg-[#000066] text-white font-medium rounded-xl transition-colors duration-200 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-slate-500 border-t-white rounded-full animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Register as Member"
                )}
              </button>
            </div>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-slate-600">
          Already a member? <Link to="/login" className="font-bold text-[#000080] hover:underline">Sign in here</Link>
        </p>

      </div>
    </div>
  );
};

export default RegisterPage;
