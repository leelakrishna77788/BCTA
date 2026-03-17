import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { collection, query, orderBy, limit, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { CalendarDays, CreditCard, Package, Bell, Shield, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

const MemberDashboard = () => {
    const { userProfile, currentUser } = useAuth();

    // Real-time state
    const [notifications, setNotifications] = useState([]);
    const [myProducts, setMyProducts] = useState([]);
    const [meetings, setMeetings] = useState([]);
    const [myAttendanceCount, setMyAttendanceCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;
        const unsubs = [];

        // 1. Notifications — latest 5, live
        const notifUnsub = onSnapshot(
            query(collection(db, "notifications"), orderBy("sentAt", "desc"), limit(5)),
            snap => {
                setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                setLoading(false);
            },
            err => { console.error("notifications:", err); setLoading(false); }
        );
        unsubs.push(notifUnsub);

        // 2. Products assigned to this member — live
        const prodUnsub = onSnapshot(
            query(collection(db, "products"), where("memberUID", "==", currentUser.uid)),
            snap => setMyProducts(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
            err => console.error("products:", err)
        );
        unsubs.push(prodUnsub);

        // 3. Meetings — latest 3, live
        const meetUnsub = onSnapshot(
            query(collection(db, "meetings"), orderBy("createdAt", "desc"), limit(3)),
            snap => setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
            err => console.error("meetings:", err)
        );
        unsubs.push(meetUnsub);

        // 4. Attendance count for this member — live
        const attUnsub = onSnapshot(
            query(collection(db, "attendance"), where("uid", "==", currentUser.uid)),
            snap => setMyAttendanceCount(snap.size),
            err => console.error("attendance:", err)
        );
        unsubs.push(attUnsub);

        return () => unsubs.forEach(u => u());
    }, [currentUser]);

    const totalDue = myProducts.reduce((s, p) => s + (p.remainingAmount || 0), 0);
    const totalPaid = myProducts.reduce((s, p) => s + (p.paidAmount || 0), 0);

    if (loading) return (
        <div className="flex items-center justify-center h-64 mt-20">
            <div className="flex flex-col items-center gap-4">
                <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
                </div>
                <p className="text-slate-500 font-medium animate-pulse">Loading your dashboard...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in pb-8">
            {/* Member Profile Header */}
            <div className="relative overflow-hidden rounded-2xl p-8 sm:p-10 text-white shadow-sm border border-slate-800 bg-slate-900 isolate">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10 w-full text-center sm:text-left">
                    {userProfile?.photoURL ? (
                        <img src={userProfile.photoURL} alt="" className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-slate-800 shadow-lg" />
                    ) : (
                        <div className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-800 rounded-2xl flex items-center justify-center text-4xl sm:text-5xl font-bold border-4 border-slate-700 shadow-lg">
                            {userProfile?.name?.[0]}
                        </div>
                    )}
                    <div className="flex-1 mt-2 sm:mt-4">
                        <p className="text-slate-400 text-sm font-semibold tracking-wider uppercase mb-1">Welcome back</p>
                        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{userProfile?.name} {userProfile?.surname}</h1>
                        <p className="font-mono text-slate-300 text-sm mt-2 bg-slate-800 inline-block px-3 py-1 rounded-md border border-slate-700">{userProfile?.memberId}</p>
                    </div>
                    <div className={`mt-4 sm:ml-auto px-4 py-2 rounded-lg text-sm font-semibold capitalize ${userProfile?.status === "active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${userProfile?.status === "active" ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`}></div>
                            {userProfile?.status}
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {[
                    {
                        label: "Meetings Attended",
                        value: myAttendanceCount,
                        icon: CalendarDays,
                        iconColor: "text-blue-600",
                        iconBg: "bg-blue-50",
                        sub: "Attendance logged"
                    },
                    {
                        label: "Payment Status",
                        value: userProfile?.paymentStatus || "unpaid",
                        icon: CreditCard,
                        iconColor: userProfile?.paymentStatus === "paid" ? "text-emerald-600" : "text-amber-600",
                        iconBg: userProfile?.paymentStatus === "paid" ? "bg-emerald-50" : "bg-amber-50",
                        sub: totalPaid > 0 ? `₹${totalPaid.toLocaleString()} paid` : undefined
                    },
                    {
                        label: "Products Taken",
                        value: myProducts.length,
                        icon: Package,
                        iconColor: "text-purple-600",
                        iconBg: "bg-purple-50",
                        sub: myProducts.length > 0 ? `${myProducts.length} item${myProducts.length > 1 ? "s" : ""}` : undefined
                    },
                    {
                        label: "Total Due",
                        value: `₹${totalDue.toLocaleString()}`,
                        icon: Shield,
                        iconColor: totalDue > 0 ? "text-rose-600" : "text-emerald-600",
                        iconBg: totalDue > 0 ? "bg-rose-50" : "bg-emerald-50",
                        sub: totalDue === 0 ? "All clear!" : "Outstanding"
                    },
                ].map((s) => (
                    <div key={s.label} className="relative overflow-hidden rounded-xl p-5 sm:p-6 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 group">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
                                <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{s.value}</p>
                                {s.sub && <p className="text-xs font-medium text-slate-400 mt-1">{s.sub}</p>}
                            </div>
                            <div className={`w-12 h-12 rounded-lg ${s.iconBg} flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3`}>
                                <s.icon size={22} className={s.iconColor} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Action Cards */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Link to="/member/scan" className="relative overflow-hidden rounded-xl bg-blue-600 p-6 sm:p-8 text-white shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 group border border-blue-700">
                        <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-30 transition-transform duration-700 group-hover:scale-150"></div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-6 text-xl transition-transform duration-300 group-hover:-rotate-6">
                                📷
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-2 tracking-tight">Scan QR Code</h3>
                                <p className="text-blue-100 font-medium text-sm leading-relaxed">Verify attendance at meetings or scan shop product QR codes.</p>
                            </div>
                        </div>
                    </Link>

                    <div className="flex flex-col gap-4">
                        <Link to="/member/complaint" className="flex items-center gap-4 p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 group">
                            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600 transition-transform duration-300 group-hover:scale-105">
                                <span className="text-xl">📝</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 tracking-tight">Raise Complaint</h3>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">Report issues directly to admins</p>
                            </div>
                        </Link>
                        <Link to="/member/emergency" className="flex items-center gap-4 p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 group">
                            <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center text-red-600 transition-transform duration-300 group-hover:scale-105">
                                <span className="text-xl">🚨</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 tracking-tight">Emergency Help</h3>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">Find hospitals &amp; direct contact</p>
                            </div>
                        </Link>
                        <Link to="/member/payments" className="flex items-center gap-4 p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 group">
                            <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 transition-transform duration-300 group-hover:scale-105">
                                <CreditCard size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 tracking-tight">My Payments</h3>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">View all dues and history</p>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Notifications Panel */}
                <div className="card h-full flex flex-col bg-white border border-slate-200 shadow-sm rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2.5 tracking-tight">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                                <Bell size={16} />
                            </div>
                            Notifications
                        </h2>
                        {notifications.length > 0 && (
                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                Live
                            </span>
                        )}
                    </div>
                    <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                        {notifications.map((n, i) => (
                            <div key={n.id || i} className="flex gap-4 group cursor-default">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 transition-transform duration-300 group-hover:scale-105 ${n.type === "meeting" ? "bg-indigo-50 text-indigo-600" : n.type === "payment" ? "bg-emerald-50 text-emerald-600" : n.type === "emergency" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>
                                    {n.type === "meeting" ? "📅" : n.type === "payment" ? "💳" : n.type === "emergency" ? "🚨" : "📢"}
                                </div>
                                <div className="pb-4 border-b border-slate-100 w-full group-last:border-0">
                                    <p className="text-sm font-bold text-slate-900 mb-0.5 leading-tight">{n.title}</p>
                                    <p className="text-[13px] text-slate-500 font-medium leading-relaxed">{n.body}</p>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 mt-2 tracking-widest">
                                        {n.sentAt?.toDate ? new Date(n.sentAt.toDate()).toLocaleDateString("en-IN") : "Recent"}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {notifications.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-40 text-center">
                                <span className="text-4xl mb-3 opacity-20">📭</span>
                                <p className="text-slate-500 font-medium text-sm">You're all caught up!<br />No new notifications.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Upcoming Meetings */}
            <div className="card bg-white border border-slate-200 shadow-sm rounded-xl p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-3 tracking-tight">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                            <CalendarDays size={18} />
                        </div>
                        Committee Meetings
                    </h2>
                    <Link to="/member/meetings" className="text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md transition-colors border border-transparent hover:border-blue-100">
                        View All <span className="hidden sm:inline">&rarr;</span>
                    </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {meetings.map((m) => (
                        <div key={m.id} className="relative overflow-hidden p-6 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-400 transition-all duration-200 group">
                            <div className="absolute top-0 right-0 p-3">
                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${m.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                                    {m.status}
                                </span>
                            </div>
                            <h3 className="text-base font-bold text-slate-900 mb-2 mt-2">{m.topic}</h3>
                            <p className="text-sm text-slate-500 line-clamp-2 mb-4 font-medium">{m.description}</p>
                            <div className="space-y-2 mb-6">
                                <div className="flex items-center gap-2.5 text-slate-500 font-semibold text-xs uppercase tracking-widest">
                                    <div className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center"><CalendarDays size={12} className="text-slate-400" /></div>
                                    {m.date?.toDate ? m.date.toDate().toLocaleDateString("en-IN") : m.date || "TBD"}
                                </div>
                                <div className="flex items-center gap-2.5 text-slate-500 font-semibold text-xs uppercase tracking-widest">
                                    <div className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center"><span className="text-[12px]">⏰</span></div>
                                    {m.startTime} {m.endTime ? `- ${m.endTime}` : ""}
                                </div>
                            </div>
                            <Link to="/member/scan" className="w-full py-2 bg-white border border-slate-300 text-slate-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200">
                                📷 Scan to Attend
                            </Link>
                        </div>
                    ))}
                    {meetings.length === 0 && (
                        <div className="col-span-full py-10 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                            <p className="font-semibold text-sm">No upcoming meetings scheduled</p>
                            <p className="text-xs mt-1 text-slate-400">Check back later for updates</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MemberDashboard;
