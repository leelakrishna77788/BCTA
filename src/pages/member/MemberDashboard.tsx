import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { collection, query, orderBy, limit, where, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { CalendarDays, CreditCard, Package, Bell, Shield, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { CardSkeleton } from "../../components/shared/LoadingSkeleton";

interface NotificationData {
    id?: string;
    type: string;
    title: string;
    body: string;
    sentAt: any;
    [key: string]: any;
}

interface ProductData {
    id?: string;
    paidAmount?: number;
    remainingAmount?: number;
    [key: string]: any;
}

interface MeetingData {
    id?: string;
    status: string;
    topic: string;
    description: string;
    date: any;
    startTime: string;
    endTime: string;
    [key: string]: any;
}

const STAT_CONFIG = [
    { key: "attendance", label: "Meetings Attended", icon: CalendarDays, iconBg: "bg-indigo-50", iconColor: "text-indigo-600", gradient: "var(--gradient-accent)" },
    { key: "payment", label: "Payment Status", icon: CreditCard, iconBg: "dynamic", iconColor: "dynamic", gradient: "var(--gradient-success)" },
    { key: "products", label: "Products Taken", icon: Package, iconBg: "bg-violet-50", iconColor: "text-violet-600", gradient: "linear-gradient(135deg, #8b5cf6, #a78bfa)" },
    { key: "due", label: "Total Due", icon: Shield, iconBg: "dynamic", iconColor: "dynamic", gradient: "var(--gradient-warm)" },
];

const MemoizedStatCards = React.memo(({ myAttendanceCount, userProfile, totalDue, totalPaid, myProductsLength }: {
    myAttendanceCount: number;
    userProfile: any;
    totalDue: number;
    totalPaid: number;
    myProductsLength: number;
}) => {
    const cards = [
        { ...STAT_CONFIG[0], value: myAttendanceCount, sub: "Attendance logged" },
        { ...STAT_CONFIG[1], value: userProfile?.paymentStatus || "unpaid", sub: totalPaid > 0 ? `₹${totalPaid.toLocaleString()} paid` : undefined,
          iconBg: userProfile?.paymentStatus === "paid" ? "bg-emerald-50" : "bg-amber-50",
          iconColor: userProfile?.paymentStatus === "paid" ? "text-emerald-600" : "text-amber-600" },
        { ...STAT_CONFIG[2], value: myProductsLength, sub: myProductsLength > 0 ? `${myProductsLength} item${myProductsLength > 1 ? "s" : ""}` : undefined },
        { ...STAT_CONFIG[3], value: `₹${totalDue.toLocaleString()}`, sub: totalDue === 0 ? "All clear!" : "Outstanding",
          iconBg: totalDue > 0 ? "bg-rose-50" : "bg-emerald-50",
          iconColor: totalDue > 0 ? "text-rose-600" : "text-emerald-600" },
    ];

    return (
        <>
            {cards.map(({ label, icon: Icon, value, sub, iconBg, iconColor, gradient }) => (
                <div key={label} className="relative overflow-hidden rounded-2xl p-6 glass-card border border-white/40 hover:-translate-y-2 transition-all duration-500 group animate-slide-up premium-shadow"
                  style={{ background: "rgba(255, 255, 255, 0.7)" }}
                >
                    {/* Gradient accent strip */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: gradient }}
                    />
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
                            <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
                            {sub && <p className="text-xs font-medium text-slate-400 mt-2">{sub}</p>}
                        </div>
                        <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6`}>
                            <Icon size={20} className={iconColor} />
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
});

const MemberDashboard: React.FC = () => {
    const { userProfile, currentUser } = useAuth();

    const [notifications, setNotifications] = useState<NotificationData[]>([]);
    const [myProducts, setMyProducts] = useState<ProductData[]>([]);
    const [meetings, setMeetings] = useState<MeetingData[]>([]);
    const [myAttendanceCount, setMyAttendanceCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        if (!currentUser) return;
        const unsubs: (() => void)[] = [];

        const notifUnsub = onSnapshot(
            query(collection(db, "notifications"), orderBy("sentAt", "desc"), limit(5)),
            snap => { setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as NotificationData))); setLoading(false); },
            err => { console.error("notifications:", err); setLoading(false); }
        );
        unsubs.push(notifUnsub);

        const prodUnsub = onSnapshot(
            query(collection(db, "products"), where("memberUID", "==", currentUser.uid)),
            snap => setMyProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProductData))),
            err => console.error("products:", err)
        );
        unsubs.push(prodUnsub);

        const meetUnsub = onSnapshot(
            query(collection(db, "meetings"), orderBy("createdAt", "desc"), limit(3)),
            snap => setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() } as MeetingData))),
            err => console.error("meetings:", err)
        );
        unsubs.push(meetUnsub);

        const attUnsub = onSnapshot(
            query(collection(db, "attendance"), where("uid", "==", currentUser.uid)),
            snap => setMyAttendanceCount(snap.size),
            err => console.error("attendance:", err)
        );
        unsubs.push(attUnsub);

        return () => unsubs.forEach(u => u());
    }, [currentUser]);

    const deleteNotification = useCallback(async (id: string) => {
        if (!window.confirm("Delete this notification?")) return;
        try {
            await deleteDoc(doc(db, "notifications", id));
            toast.success("Notification deleted");
        } catch (err: any) {
            toast.error("Failed to delete notification");
        }
    }, []);

    const totalDue = useMemo(() => myProducts.reduce((s, p) => s + (p.remainingAmount || 0), 0), [myProducts]);
    const totalPaid = useMemo(() => myProducts.reduce((s, p) => s + (p.paidAmount || 0), 0), [myProducts]);

    return (
        <div className="space-y-6 animate-fade-in pb-8">
            {/* Member Profile Header — Premium Gradient */}
            <div className="relative overflow-hidden rounded-2xl p-8 sm:p-10 text-white isolate"
              style={{
                background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)",
                boxShadow: "0 8px 32px rgba(30, 27, 75, 0.25)",
              }}
            >
                {/* Decorative orbs */}
                <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-15 pointer-events-none"
                  style={{ background: "radial-gradient(circle, rgba(139,92,246,0.6) 0%, transparent 70%)" }}
                />
                <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full opacity-10 pointer-events-none"
                  style={{ background: "radial-gradient(circle, rgba(99,102,241,0.6) 0%, transparent 70%)" }}
                />

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10 w-full text-center sm:text-left">
                    {loading ? (
                         <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white/10 rounded-2xl animate-pulse border-2 border-white/10 shadow-lg"></div>
                    ) : userProfile?.photoURL ? (
                        <img src={userProfile.photoURL} alt="" loading="lazy" className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-white/20 shadow-xl ring-4 ring-white/5" />
                    ) : (
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl flex items-center justify-center text-4xl sm:text-5xl font-bold border-2 border-white/15 shadow-xl"
                          style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}
                        >
                            {userProfile?.name?.[0]}
                        </div>
                    )}
                    <div className="flex-1 mt-2 sm:mt-4">
                        {loading ? (
                            <>
                                <div className="h-4 w-32 bg-white/10 rounded animate-pulse mb-3"></div>
                                <div className="h-8 w-64 bg-white/10 rounded animate-pulse mb-3"></div>
                                <div className="h-6 w-24 bg-white/10 rounded animate-pulse"></div>
                            </>
                        ) : (
                            <>
                                <p className="text-indigo-200/70 text-sm font-semibold tracking-wider uppercase mb-1">Welcome back</p>
                                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{userProfile?.name} {userProfile?.surname}</h1>
                                <p className="font-mono text-indigo-200/80 text-sm mt-3 bg-white/10 backdrop-blur-sm inline-block px-3 py-1.5 rounded-lg border border-white/10">{userProfile?.memberId}</p>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Live Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 stagger-children">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
                ) : (
                    <MemoizedStatCards
                        myAttendanceCount={myAttendanceCount}
                        userProfile={userProfile}
                        totalDue={totalDue}
                        totalPaid={totalPaid}
                        myProductsLength={myProducts.length}
                    />
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Action Cards */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Link to="/member/scan" className="relative overflow-hidden rounded-xl p-6 sm:p-8 text-white hover:-translate-y-1 transition-all duration-300 group"
                      style={{
                        background: "linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)",
                        boxShadow: "var(--shadow-lg)",
                      }}
                    >
                        <div className="absolute right-0 top-0 w-40 h-40 rounded-full blur-3xl opacity-20 transition-transform duration-700 group-hover:scale-150 pointer-events-none"
                          style={{ background: "rgba(99,102,241,0.6)" }}
                        />
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center mb-6 text-xl transition-transform duration-300 group-hover:-rotate-6 border border-white/10">
                                📷
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-2 tracking-tight">Scan QR Code</h3>
                                <p className="text-indigo-200/80 font-medium text-sm leading-relaxed">Verify attendance at meetings or scan shop product QR codes.</p>
                            </div>
                        </div>
                    </Link>

                    <div className="flex flex-col gap-4">
                        {[
                            { to: "/member/complaint", emoji: "📝", label: "Raise Complaint", sub: "Report issues directly to admins", bg: "bg-amber-50", color: "text-amber-600" },
                            { to: "/member/emergency", emoji: "🚨", label: "Emergency Help", sub: "Find hospitals & direct contact", bg: "bg-red-50", color: "text-red-600" },
                            { to: "/member/payments", icon: CreditCard, label: "My Payments", sub: "View all dues and history", bg: "bg-emerald-50", color: "text-emerald-600" },
                        ].map(item => (
                             <Link key={item.to} to={item.to} className="flex items-center gap-4 p-5 glass-card border border-white/40 rounded-2xl hover:border-white/60 hover:-translate-y-1 transition-all duration-500 group premium-shadow"
                               style={{ background: "rgba(255,255,255,0.7)" }}
                             >
                                <div className={`w-12 h-12 ${item.bg} rounded-xl flex items-center justify-center ${item.color} transition-all duration-300 group-hover:scale-110 group-hover:-rotate-3`}>
                                    {item.icon ? <item.icon size={20} /> : <span className="text-xl">{item.emoji}</span>}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 tracking-tight">{item.label}</h3>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">{item.sub}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Notifications Panel */}
                <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 overflow-hidden flex flex-col premium-shadow"
                  style={{ background: "rgba(255, 255, 255, 0.6)" }}
                >
                    <div className="flex items-center justify-between p-5 border-b border-slate-100">
                        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2.5 tracking-tight">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <Bell size={16} />
                            </div>
                            Notifications
                        </h2>
                        {notifications.length > 0 && (
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg flex items-center gap-1.5 uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full animate-breathe"
                                  style={{ background: "var(--gradient-accent)" }}
                                />
                                Live
                            </span>
                        )}
                    </div>
                    <div className="flex-1 p-5 space-y-4 overflow-y-auto">
                        {loading ? (
                             Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="flex gap-4">
                                     <div className="w-10 h-10 rounded-lg bg-slate-100 animate-pulse shrink-0"></div>
                                     <div className="w-full space-y-2">
                                         <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse"></div>
                                         <div className="h-3 w-full bg-slate-50 rounded animate-pulse"></div>
                                     </div>
                                </div>
                             ))
                        ) : (
                            <>
                                {notifications.map((n, i) => (
                                    <div key={n.id || i} className="flex gap-4 group cursor-default relative">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 transition-transform duration-300 group-hover:scale-105 ${n.type === "meeting" ? "bg-indigo-50" : n.type === "payment" ? "bg-emerald-50" : n.type === "emergency" ? "bg-red-50" : "bg-slate-100"}`}>
                                            {n.type === "meeting" ? "📅" : n.type === "payment" ? "💳" : n.type === "emergency" ? "🚨" : "📢"}
                                        </div>
                                        <div className="pb-4 border-b border-slate-100 w-full group-last:border-0 pr-8">
                                            <p className="text-sm font-bold text-slate-900 mb-0.5 leading-tight">{n.title}</p>
                                            <p className="text-[13px] text-slate-500 font-medium leading-relaxed">{n.body}</p>
                                            <p className="text-[10px] uppercase font-bold text-slate-400 mt-2 tracking-widest">
                                                {n.sentAt?.toDate ? new Date(n.sentAt.toDate()).toLocaleDateString("en-IN") : "Recent"}
                                            </p>
                                        </div>
                                        {n.id && (
                                            <button
                                                onClick={() => deleteNotification(n.id!)}
                                                className="absolute top-0 right-0 p-1.5 rounded-lg bg-red-50 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-500 transition-all"
                                                title="Delete notification"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {notifications.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-40 text-center">
                                        <span className="text-4xl mb-3 opacity-20">📭</span>
                                        <p className="text-slate-400 font-medium text-sm">You're all caught up!<br />No new notifications.</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Upcoming Meetings */}
            <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 overflow-hidden premium-shadow"
              style={{ background: "rgba(255, 255, 255, 0.6)" }}
            >
                <div className="flex items-center justify-between p-6 sm:p-8 border-b border-slate-100">
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-3 tracking-tight">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <CalendarDays size={18} />
                        </div>
                        Committee Meetings
                    </h2>
                    <Link to="/member/meetings" className="text-sm font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                        View All &rarr;
                    </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-6 sm:p-8">
                    {meetings.map((m) => (
                        <div key={m.id} className="relative overflow-hidden p-6 glass-card border border-white/40 rounded-2xl hover:border-white/60 hover:-translate-y-1.5 transition-all duration-500 group premium-shadow"
                          style={{ background: "rgba(255,255,255,0.7)" }}
                        >
                            {/* Gradient accent on hover */}
                            <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                              style={{ background: "var(--gradient-accent)" }}
                            />
                            <div className="absolute top-3 right-3">
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${m.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                                    {m.status}
                                </span>
                            </div>
                            <h3 className="text-base font-bold text-slate-900 mb-2 mt-2 tracking-tight">{m.topic}</h3>
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
                            <Link to="/member/scan" className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 border text-indigo-600 bg-white/80 border-indigo-100 hover:text-white hover:border-transparent"
                              style={{ "--tw-gradient-from": "#4338ca", "--tw-gradient-to": "#6366f1" } as any}
                              onMouseEnter={e => { e.currentTarget.style.background = "var(--gradient-primary)"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = ""; }}
                            >
                                📷 Scan to Attend
                            </Link>
                        </div>
                    ))}
                    {meetings.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                            <span className="text-4xl mb-3 block opacity-20">📅</span>
                            <p className="font-semibold text-sm">No upcoming meetings scheduled</p>
                            <p className="text-xs mt-1">Check back later for updates</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MemberDashboard;
