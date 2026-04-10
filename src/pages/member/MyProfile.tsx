import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { collection, query, where, getDocs, DocumentData } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { Droplet, MapPin, User, Phone, CreditCard, ShieldCheck, X, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import LoadingSkeleton, { CardSkeleton } from "../../components/shared/LoadingSkeleton";

interface AttendanceRecord {
    [key: string]: any;
}

const MyProfile: React.FC = () => {
    const { userProfile, currentUser } = useAuth();
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [showID, setShowID] = useState<boolean>(false);

    useEffect(() => {
        if (!currentUser) return;
        getDocs(query(collection(db, "attendance"), where("memberUID", "==", currentUser.uid)))
            .then(snap => setAttendance(snap.docs.map(d => d.data() as AttendanceRecord)));
    }, [currentUser]);

    if (!userProfile) return (
        <div className="max-w-xl mx-auto space-y-5 animate-fade-in">
            <LoadingSkeleton height="2rem" width="150px" className="mb-4" />
            <CardSkeleton />
            <div className="card space-y-4">
                <LoadingSkeleton height="1rem" width="40%" />
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex justify-between">
                            <LoadingSkeleton height="0.75rem" width="30%" />
                            <LoadingSkeleton height="0.75rem" width="50%" />
                        </div>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
                <LoadingSkeleton height="80px" borderRadius="1rem" />
                <LoadingSkeleton height="80px" borderRadius="1rem" />
                <LoadingSkeleton height="80px" borderRadius="1rem" />
            </div>
        </div>
    );

    return (
        <div className="max-w-xl mx-auto space-y-5 animate-fade-in">
            <h1 className="page-title mb-0">My Profile</h1>

            {/* Profile Card */}
            <div className="bg-white rounded-xl p-6 text-center border border-slate-100 transition-all duration-300 hover:shadow-md"
              style={{ boxShadow: "var(--shadow-sm)" }}
            >
                {userProfile.photoURL ? (
                    <img src={userProfile.photoURL} alt="" className="w-24 h-24 rounded-2xl object-cover mx-auto ring-4 ring-indigo-50 shadow-lg" />
                ) : (
                    <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-white text-4xl font-bold mx-auto shadow-lg"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                        {userProfile.name?.[0]}
                    </div>
                )}
                <h2 className="text-xl font-bold text-slate-900 mt-3 tracking-tight">{userProfile.name} {userProfile.surname}</h2>
                <p className="font-mono text-indigo-600 text-sm font-semibold">{userProfile.memberId}</p>
                <div className="flex items-center justify-center gap-2 mt-2 mb-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${userProfile.status === "active" ? "badge-active" : "badge-blocked"}`}>
                        {userProfile.status}
                    </span>
                    <span className="bg-red-50 text-red-600 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 border border-red-100">
                        <Droplet size={10} /> {userProfile.bloodGroup}
                    </span>
                </div>
                
                <button 
                    onClick={() => setShowID(true)}
                    className="w-full py-3 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 shadow-lg active:scale-95 group overflow-hidden relative hover:-translate-y-0.5"
                    style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-md)" }}
                >
                    <QrCode size={18} className="text-indigo-300" />
                    <span>View Digital ID Card</span>
                </button>
            </div>

            {/* Premium Digital ID Card Modal */}
            {showID && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-fade-in">
                    <div className="w-full max-w-sm relative">
                        <button 
                            onClick={() => setShowID(false)}
                            className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white transition-colors bg-white/10 rounded-full backdrop-blur-sm"
                        >
                            <X size={24} />
                        </button>

                        <div className="relative group p-1 animate-scale-in">
                             <div className="absolute inset-0 rounded-[2.5rem] animate-spin-slow opacity-40 blur-sm"
                               style={{ background: "conic-gradient(from 0deg, #6366f1, #1e1b4b, #8b5cf6, #1e1b4b, #6366f1)" }}
                             />
                            
                            <div className="p-0 overflow-hidden border border-white/10 shadow-2xl rounded-[2.4rem] relative"
                              style={{ background: "linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)" }}
                            >
                                <div className="p-8 pb-4 flex items-center justify-between border-b border-white/5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm">
                                            <div className="w-4 h-4 rounded-sm rotate-45" style={{ background: "var(--gradient-accent)" }}></div>
                                        </div>
                                        <span className="text-[10px] font-black text-white/80 uppercase tracking-[0.2em]">BCTA EXECUTIVE</span>
                                    </div>
                                    <div className="px-2.5 py-1 bg-white/10 rounded-full border border-white/10 flex items-center gap-1.5 backdrop-blur-sm">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-breathe shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                                        <span className="text-[8px] font-black text-white/60 tracking-widest uppercase">Verified</span>
                                    </div>
                                </div>

                                <div className="p-8 space-y-8">
                                    <div className="flex items-center gap-6">
                                        <div className="w-24 h-24 rounded-2xl p-1 shadow-xl"
                                          style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.2), transparent)" }}
                                        >
                                            {userProfile.photoURL ? (
                                                <img src={userProfile.photoURL} alt="" className="w-full h-full rounded-xl object-cover border border-white/10" />
                                            ) : (
                                                <div className="w-full h-full rounded-xl flex items-center justify-center text-white text-3xl font-black"
                                                  style={{ background: "var(--gradient-primary)" }}
                                                >
                                                    {userProfile.name?.[0]}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-white tracking-tight leading-none mb-2">
                                                {userProfile.name}<br />{userProfile.surname}
                                            </h3>
                                            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] bg-indigo-500/10 px-2 py-1 rounded inline-block border border-indigo-500/10">
                                                {userProfile.memberId}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="relative group/qr flex justify-center py-4">
                                        <div className="absolute inset-0 bg-indigo-500/5 rounded-3xl blur-2xl group-hover/qr:bg-indigo-500/10 transition-all duration-500"></div>
                                        <div className="relative p-6 bg-white rounded-3xl shadow-2xl border border-white/5 group-hover/qr:scale-105 transition-transform duration-500">
                                            <QRCodeSVG
                                                value={JSON.stringify({ type: "member", uid: currentUser?.uid, memberId: userProfile.memberId })}
                                                size={160}
                                                level="H"
                                                includeMargin={false}
                                                fgColor="#1e1b4b"
                                            />
                                            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-indigo-200 rounded-tl-lg"></div>
                                            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-indigo-200 rounded-tr-lg"></div>
                                            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-indigo-200 rounded-bl-lg"></div>
                                            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-indigo-200 rounded-br-lg"></div>
                                        </div>
                                    </div>

                                    <p className="text-center text-[10px] text-white/30 font-bold uppercase tracking-widest leading-relaxed">
                                        🔒 SECURED THROUGH BCTA BLOCKCHAIN IDENTITY<br />
                                        VALID FOR {new Date().getFullYear()} FISCAL YEAR
                                    </p>
                                </div>
                                
                                {/* Security Strip */}
                                <div className="h-2 opacity-80"
                                  style={{ background: "linear-gradient(90deg, #1e1b4b, #6366f1, #1e1b4b)", boxShadow: "0 0 20px rgba(99,102,241,0.3)" }}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                             <button onClick={() => window.print()} className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all backdrop-blur-sm border border-white/5">
                                Save Passport
                             </button>
                             <button onClick={() => setShowID(false)} className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95 shadow-xl">
                                Close
                             </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Details */}
            <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-100"
              style={{ boxShadow: "var(--shadow-sm)" }}
            >
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <User size={14} className="text-indigo-600" /> Personal Details
                </h3>
                <dl className="space-y-3">
                    {[
                        { label: "Full Name", value: `${userProfile.surname || ""} ${userProfile.name}`.trim() },
                        { label: "Age", value: userProfile.age ? `${userProfile.age} years` : "Not set" },
                        { label: "Gender", value: userProfile.gender || "Not set" },
                        { label: "Blood Group", value: userProfile.bloodGroup || "Not set" },
                        { label: "Email", value: userProfile.email },
                        { label: "Aadhaar", value: `XXXX-XXXX-XXXX-${userProfile.aadhaarLast4}` },
                    ].map(d => (
                        <div key={d.label} className="flex justify-between border-b border-slate-50 pb-2 last:border-0">
                            <dt className="text-xs text-slate-400 font-medium">{d.label}</dt>
                            <dd className="text-sm font-semibold text-slate-800">{d.value || "—"}</dd>
                        </div>
                    ))}
                </dl>
            </div>

            {/* Shop & Nominee */}
            <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-100"
              style={{ boxShadow: "var(--shadow-sm)" }}
            >
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <MapPin size={14} className="text-indigo-600" /> Shop & Nominee
                </h3>
                <p className="text-sm text-slate-600 mb-2">{userProfile.shopAddress || "No address on file"}</p>
                {userProfile.nomineeDetails?.name && (
                    <div className="p-3 bg-indigo-50/50 rounded-xl text-sm border border-indigo-100/50">
                        <p className="font-semibold text-slate-800">{userProfile.nomineeDetails.name}</p>
                        <p className="text-xs text-slate-500">{userProfile.nomineeDetails.relation} • {userProfile.nomineeDetails.phone}</p>
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 stagger-children">
                <div className="bg-white rounded-xl p-4 text-center border border-slate-100 transition-all hover:shadow-md"
                  style={{ boxShadow: "var(--shadow-xs)" }}
                >
                    <p className="text-2xl font-bold gradient-text">{attendance.length}</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Meetings Attended</p>
                </div>
                <div className="bg-white rounded-xl p-4 text-center border border-slate-100 transition-all hover:shadow-md"
                  style={{ boxShadow: "var(--shadow-xs)" }}
                >
                    <p className={`text-2xl font-bold ${userProfile.paymentStatus === "paid" ? "text-emerald-600" : "text-amber-500"}`}>
                        {userProfile.paymentStatus}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Payment Status</p>
                </div>
                <div className="bg-white rounded-xl p-4 text-center border border-slate-100 transition-all hover:shadow-md"
                  style={{ boxShadow: "var(--shadow-xs)" }}
                >
                    <p className="text-2xl font-bold gradient-text">{new Date().getFullYear()}</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Member Since</p>
                </div>
            </div>
        </div>
    );
};

export default MyProfile;
