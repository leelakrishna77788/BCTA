import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { collection, query, orderBy, limit, where, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { CalendarDays, CreditCard, Package, Bell, Shield, CheckCircle2, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { CardSkeleton, TableSkeleton } from "../../components/shared/LoadingSkeleton";

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

const MemoizedStatCards = React.memo(({ myAttendanceCount, userProfile, totalDue, totalPaid, myProductsLength }: {
    myAttendanceCount: number;
    userProfile: any;
    totalDue: number;
    totalPaid: number;
    myProductsLength: number;
}) => (
    <>
        <div className="relative overflow-hidden rounded-xl p-5 sm:p-6 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 group">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1">Meetings Attended</p>
                    <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{myAttendanceCount}</p>
                    <p className="text-xs font-medium text-slate-400 mt-1">Attendance logged</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3">
                    <CalendarDays size={22} className="text-[#000080]" />
                </div>
            </div>
        </div>
        <div className="relative overflow-hidden rounded-xl p-5 sm:p-6 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 group">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1">Payment Status</p>
                    <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{userProfile?.paymentStatus || "unpaid"}</p>
                    <p className="text-xs font-medium text-slate-400 mt-1">{totalPaid > 0 ? `₹${totalPaid.toLocaleString()} paid` : undefined}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3 ${userProfile?.paymentStatus === "paid" ? "bg-emerald-50" : "bg-amber-50"}`}>
                    <CreditCard size={22} className={userProfile?.paymentStatus === "paid" ? "text-emerald-600" : "text-amber-600"} />
                </div>
            </div>
        </div>
        <div className="relative overflow-hidden rounded-xl p-5 sm:p-6 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 group">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1">Products Taken</p>
                    <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{myProductsLength}</p>
                    <p className="text-xs font-medium text-slate-400 mt-1">{myProductsLength > 0 ? `${myProductsLength} item${myProductsLength > 1 ? "s" : ""}` : undefined}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3">
                    <Package size={22} className="text-purple-600" />
                </div>
            </div>
        </div>
        <div className="relative overflow-hidden rounded-xl p-5 sm:p-6 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 group">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1">Total Due</p>
                    <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">₹{totalDue.toLocaleString()}</p>
                    <p className="text-xs font-medium text-slate-400 mt-1">{totalDue === 0 ? "All clear!" : "Outstanding"}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3 ${totalDue > 0 ? "bg-rose-50" : "bg-emerald-50"}`}>
                    <Shield size={22} className={totalDue > 0 ? "text-rose-600" : "text-emerald-600"} />
                </div>
            </div>
        </div>
    </>
));

const MemberDashboard: React.FC = () => {
    const { userProfile, currentUser } = useAuth();

    // Real-time state
    const [notifications, setNotifications] = useState<NotificationData[]>([]);
    const [myProducts, setMyProducts] = useState<ProductData[]>([]);
    const [meetings, setMeetings] = useState<MeetingData[]>([]);
    const [myAttendanceCount, setMyAttendanceCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        if (!currentUser) return;
        const unsubs: (() => void)[] = [];

        // 1. Notifications — latest 5, live
        const notifUnsub = onSnapshot(
            query(collection(db, "notifications"), orderBy("sentAt", "desc"), limit(5)),
            snap => {
                setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as NotificationData)));
                setLoading(false);
            },
            err => { console.error("notifications:", err); setLoading(false); }
        );
        unsubs.push(notifUnsub);

        // 2. Products assigned to this member — live
        const prodUnsub = onSnapshot(
            query(collection(db, "products"), where("memberUID", "==", currentUser.uid)),
            snap => setMyProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProductData))),
            err => console.error("products:", err)
        );
        unsubs.push(prodUnsub);

        // 3. Meetings — latest 3, live
        const meetUnsub = onSnapshot(
            query(collection(db, "meetings"), orderBy("createdAt", "desc"), limit(3)),
            snap => setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() } as MeetingData))),
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

    // Removed full page loading for better perceived performance

    return (
        <div className="space-y-6 animate-fade-in pb-8">
            {/* Member Profile Header */}
            <div className="relative overflow-hidden rounded-2xl p-8 sm:p-10 text-white shadow-sm border border-slate-800 bg-slate-900 isolate">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10 w-full text-center sm:text-left">
                    {loading ? (
                         <div className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-800 rounded-2xl animate-pulse border-4 border-slate-700 shadow-lg"></div>
                    ) : userProfile?.photoURL ? (
                        <img src={userProfile.photoURL} alt="" loading="lazy" className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-slate-800 shadow-lg" />
                    ) : (
                        <div className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-800 rounded-2xl flex items-center justify-center text-4xl sm:text-5xl font-bold border-4 border-slate-700 shadow-lg">
                            {userProfile?.name?.[0]}
                        </div>
                    )}
                    <div className="flex-1 mt-2 sm:mt-4">
                        {loading ? (
                            <>
                                <div className="h-4 w-32 bg-slate-800 rounded animate-pulse mb-3"></div>
                                <div className="h-8 w-64 bg-slate-800 rounded animate-pulse mb-3"></div>
                                <div className="h-6 w-24 bg-slate-800 rounded animate-pulse"></div>
                            </>
                        ) : (
                            <>
                                <p className="text-slate-400 text-sm font-semibold tracking-wider uppercase mb-1">Welcome back</p>
                                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{userProfile?.name} {userProfile?.surname}</h1>
                                <p className="font-mono text-slate-300 text-sm mt-2 bg-slate-800 inline-block px-3 py-1 rounded-md border border-slate-700">{userProfile?.memberId}</p>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Live Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
                    <Link to="/member/scan" className="relative overflow-hidden rounded-xl bg-[#000080] p-6 sm:p-8 text-white shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 group border-[#000066]">
                                <div className="absolute right-0 top-0 w-32 h-32 bg-[#000080] rounded-full blur-3xl opacity-30 transition-transform duration-700 group-hover:scale-150"></div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-6 text-xl transition-transform duration-300 group-hover:-rotate-6">
                                📷
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-2 tracking-tight">Scan QR Code</h3>
                                <p className="text-blue-200 font-medium text-sm leading-relaxed">Verify attendance at meetings or scan shop product QR codes.</p>
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
                            <span className="text-xs font-semibold text-[#000080] bg-slate-100 px-2.5 py-1 rounded-md flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                Live
                            </span>
                        )}
                    </div>
                    <div className="flex-1 space-y-4 overflow-y-auto pr-1">
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
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 transition-transform duration-300 group-hover:scale-105 ${n.type === "meeting" ? "bg-indigo-50 text-indigo-600" : n.type === "payment" ? "bg-emerald-50 text-emerald-600" : n.type === "emergency" ? "bg-red-50 text-red-600" : "bg-slate-100 text-[#000080]"}`}>
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
                                                className="absolute top-0 right-0 p-1.5 rounded-lg bg-red-50 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-100 transition-all"
                                                title="Delete notification"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {notifications.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-40 text-center">
                                        <span className="text-4xl mb-3 opacity-20">📭</span>
                                        <p className="text-slate-500 font-medium text-sm">You're all caught up!<br />No new notifications.</p>
                                    </div>
                                )}
                            </>
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
                        <Link to="/member/meetings" className="text-sm font-semibold text-[#000080] hover:text-[#000066] bg-slate-50 px-3 py-1.5 rounded-md transition-colors border border-transparent hover:border-slate-200">
                        View All <span className="hidden sm:inline">&rarr;</span>
                    </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {meetings.map((m) => (
                        <div key={m.id} className="relative overflow-hidden p-6 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-all duration-200 group">
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
                            <Link to="/member/scan" className="w-full py-2 bg-white border border-slate-300 text-slate-700 hover:bg-[#000080] hover:text-white hover:border-[#000080] rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200">
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
