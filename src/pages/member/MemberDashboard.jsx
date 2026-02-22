import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { CalendarDays, CreditCard, Package, Bell, Shield, Phone } from "lucide-react";
import { Link } from "react-router-dom";

const MemberDashboard = () => {
    const { userProfile } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [myProducts, setMyProducts] = useState([]);
    const [meetings, setMeetings] = useState([]);
    const { currentUser } = useAuth();

    useEffect(() => {
        if (!currentUser) return;
        const fetchData = async () => {
            const [notifSnap, prodSnap, meetSnap] = await Promise.all([
                getDocs(query(collection(db, "notifications"), orderBy("sentAt", "desc"), limit(5))),
                getDocs(query(collection(db, "products"), where("memberUID", "==", currentUser.uid))),
                getDocs(query(collection(db, "meetings"), orderBy("createdAt", "desc"), limit(3))),
            ]);
            setNotifications(notifSnap.docs.map(d => d.data()));
            setMyProducts(prodSnap.docs.map(d => d.data()));
            setMeetings(meetSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        };
        fetchData();
    }, [currentUser]);

    const totalDue = myProducts.reduce((s, p) => s + (p.remainingAmount || 0), 0);

    return (
        <div className="space-y-6 animate-fade-in pb-8">
            {/* Header with Premium Gradient & Glassmorphism */}
            <div className="relative overflow-hidden rounded-[2rem] p-8 sm:p-10 text-white shadow-xl shadow-slate-200/50 border border-white/20 isolate">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 -z-10"></div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full mix-blend-overlay filter blur-2xl translate-x-1/3 -translate-y-1/3 -z-10"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/10 rounded-full mix-blend-overlay filter blur-xl -translate-x-1/3 translate-y-1/3 -z-10"></div>

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10 w-full text-center sm:text-left">
                    {userProfile?.photoURL ? (
                        <div className="relative group">
                            <div className="absolute inset-0 bg-white rounded-3xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                            <img src={userProfile.photoURL} alt="" className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-white/30 shadow-2xl transition-transform duration-300 group-hover:scale-105" />
                        </div>
                    ) : (
                        <div className="relative group">
                            <div className="absolute inset-0 bg-white rounded-3xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                            <div className="relative w-24 h-24 sm:w-28 sm:h-28 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center text-4xl sm:text-5xl font-extrabold border-4 border-white/30 shadow-2xl transition-transform duration-300 group-hover:scale-105">
                                {userProfile?.name?.[0]}
                            </div>
                        </div>
                    )}
                    <div className="flex-1 mt-2 sm:mt-4">
                        <p className="text-blue-100/90 text-sm font-semibold tracking-wider uppercase mb-1 drop-shadow-sm">Welcome back</p>
                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight drop-shadow-md">{userProfile?.name} {userProfile?.surname}</h1>
                        <p className="font-mono text-blue-200/90 text-sm mt-2 bg-black/20 inline-block px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10">{userProfile?.memberId}</p>
                    </div>
                    <div className={`mt-4 sm:ml-auto px-4 py-2 rounded-xl text-sm font-bold shadow-lg backdrop-blur-md border border-white/20 capitalize ${userProfile?.status === "active" ? "bg-emerald-500/80 text-white" : "bg-red-500/80 text-white"}`}>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${userProfile?.status === "active" ? "bg-emerald-200 animate-pulse" : "bg-red-200"}`}></div>
                            {userProfile?.status}
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {[
                    { label: "Attendance", value: userProfile?.attendanceCount || 0, icon: CalendarDays, color: "from-blue-500/10 to-blue-600/5 text-blue-700 bg-blue-50", iconBg: "bg-blue-100 text-blue-600" },
                    { label: "Payment Status", value: userProfile?.paymentStatus || "unpaid", icon: CreditCard, color: "from-emerald-500/10 to-emerald-600/5 text-emerald-700 bg-emerald-50", iconBg: "bg-emerald-100 text-emerald-600" },
                    { label: "Products Taken", value: myProducts.length, icon: Package, color: "from-purple-500/10 to-purple-600/5 text-purple-700 bg-purple-50", iconBg: "bg-purple-100 text-purple-600" },
                    { label: "Total Due", value: `₹${totalDue}`, icon: Shield, color: "from-red-500/10 to-red-600/5 text-red-700 bg-red-50", iconBg: "bg-red-100 text-red-600" },
                ].map((s, i) => (
                    <div key={s.label} className={`relative overflow-hidden rounded-[1.5rem] p-5 sm:p-6 bg-gradient-to-br ${s.color} border border-white shadow-xl shadow-slate-200/50 hover:shadow-xl shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 group`} style={{ animationDelay: `${i * 0.1}s` }}>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${s.iconBg} mb-4 shadow-inner transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                            <s.icon size={22} className="opacity-90" />
                        </div>
                        <p className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1">{s.value}</p>
                        <p className="text-xs sm:text-sm font-bold opacity-70 uppercase tracking-wider">{s.label}</p>
                        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/40 rounded-full blur-2xl group-hover:bg-white/60 transition-colors duration-300"></div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Modern Action Cards */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Link to="/member/scan" className="relative overflow-hidden rounded-[1.5rem] bg-indigo-600 p-6 sm:p-8 text-white shadow-xl shadow-slate-200/50 hover:shadow-xl shadow-slate-200/50 border border-indigo-500 transition-all duration-300 hover:-translate-y-1.5 group">
                        <div className="absolute right-0 top-0 w-40 h-40 bg-indigo-500 rounded-full filter blur-3xl opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 shadow-inner text-2xl group-hover:rotate-12 transition-transform duration-300">
                                📷
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold mb-2 tracking-tight">Scan QR Code</h3>
                                <p className="text-indigo-100 font-medium text-sm leading-relaxed">Instantly verify your attendance at committee meetings or securely receive shop products.</p>
                            </div>
                        </div>
                    </Link>

                    <div className="flex flex-col gap-4">
                        <Link to="/member/complaint" className="flex items-center gap-5 p-5 bg-white/70 backdrop-blur-xl rounded-[1.5rem] border border-orange-100 shadow-sm hover:shadow-xl shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 group">
                            <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center text-orange-600 shadow-inner group-hover:scale-110 transition-transform duration-300">
                                <span className="text-2xl">📝</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 tracking-tight">Raise Complaint</h3>
                                <p className="text-xs text-slate-500 font-medium">Report issues directly to admins</p>
                            </div>
                        </Link>

                        <Link to="/member/emergency" className="flex items-center gap-5 p-5 bg-white/70 backdrop-blur-xl rounded-[1.5rem] border border-red-100 shadow-sm hover:shadow-xl shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 group">
                            <div className="w-14 h-14 bg-gradient-to-br from-red-100 to-rose-200 rounded-2xl flex items-center justify-center text-red-600 shadow-inner group-hover:scale-110 transition-transform duration-300">
                                <span className="text-2xl">🚨</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 tracking-tight">Emergency Help</h3>
                                <p className="text-xs text-slate-500 font-medium">Find hospitals & direct contact</p>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Notifications Panel */}
                <div className="card h-full flex flex-col">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2.5 tracking-tight">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                <Bell size={18} />
                            </div>
                            Notifications
                        </h2>
                        {notifications.length > 0 && <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Recent</span>}
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                        {notifications.map((n, i) => (
                            <div key={i} className="flex gap-4 group cursor-default">
                                <div className="relative pt-1">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0 shadow-sm border border-white transition-transform duration-300 group-hover:scale-110 ${n.type === "meeting" ? "bg-indigo-50 text-indigo-500" : n.type === "payment" ? "bg-emerald-50 text-emerald-500" : n.type === "emergency" ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500"}`}>
                                        {n.type === "meeting" ? "📅" : n.type === "payment" ? "💳" : n.type === "emergency" ? "🚨" : "📢"}
                                    </div>
                                </div>
                                <div className="pb-4 border-b border-slate-100/60 w-full group-last:border-0">
                                    <p className="text-sm font-bold text-slate-800 mb-0.5 leading-tight">{n.title}</p>
                                    <p className="text-[13px] text-slate-500 font-medium leading-relaxed">{n.body}</p>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 mt-2 tracking-wider">
                                        {n.sentAt?.toDate ? new Date(n.sentAt.toDate()).toLocaleDateString() : 'Recent'}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {notifications.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-40 text-center">
                                <span className="text-4xl mb-3 opacity-20">📭</span>
                                <p className="text-slate-400 font-medium text-sm">You're all caught up!<br />No new notifications.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Upcoming Meetings Section */}
            <div className="card">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3 tracking-tight">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm">
                            <CalendarDays size={20} />
                        </div>
                        Committee Meetings
                    </h2>
                    <Link to="/member/meetings" className="text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-xl transition-all">
                        View All Meetings &rarr;
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {meetings.map((m) => (
                        <div key={m.id} className="relative overflow-hidden p-6 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm hover:shadow-xl transition-all duration-300 group">
                            <div className="absolute top-0 right-0 p-3">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${m.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                    {m.status}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2 mt-2">{m.topic}</h3>
                            <p className="text-sm text-slate-500 line-clamp-2 mb-4 font-medium">{m.description}</p>

                            <div className="space-y-2 mb-6">
                                <div className="flex items-center gap-2.5 text-slate-500 font-bold text-xs uppercase tracking-wider">
                                    <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center"><CalendarDays size={14} /></div>
                                    {m.date?.toDate ? m.date.toDate().toLocaleDateString("en-IN") : m.date || "TBD"}
                                </div>
                                <div className="flex items-center gap-2.5 text-slate-500 font-bold text-xs uppercase tracking-wider">
                                    <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center"><span className="text-[14px]">⏰</span></div>
                                    {m.startTime} - {m.endTime || "TBD"}
                                </div>
                            </div>

                            <Link to="/member/scan" className="btn-primary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200">
                                📷 Scan to Attend
                            </Link>
                        </div>
                    ))}
                    {meetings.length === 0 && (
                        <div className="col-span-full py-10 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                            <p className="font-bold">No upcoming meetings scheduled</p>
                            <p className="text-xs mt-1">Check back later for updates</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MemberDashboard;
