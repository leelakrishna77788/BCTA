import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  collection,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import {
  CalendarDays,
  CreditCard,
  Bell,
  Shield,
  Trash2,
  Sparkles,
  ArrowUpRight,
  Clock,
  Users,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import qrCodeImage from "../../assets/scan.jpg";
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
      query(
        collection(db, "notifications"),
        orderBy("sentAt", "desc"),
        limit(5),
      ),
      (snap) => {
        setNotifications(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as NotificationData),
        );
        setLoading(false);
      },
      (err) => {
        console.error("notifications:", err);
        setLoading(false);
      },
    );
    unsubs.push(notifUnsub);

    const prodUnsub = onSnapshot(
      query(
        collection(db, "products"),
        where("memberUID", "==", currentUser.uid),
      ),
      (snap) =>
        setMyProducts(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ProductData),
        ),
      (err) => console.error("products:", err),
    );
    unsubs.push(prodUnsub);

    const meetUnsub = onSnapshot(
      query(collection(db, "meetings"), orderBy("createdAt", "desc"), limit(3)),
      (snap) =>
        setMeetings(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MeetingData),
        ),
      (err) => console.error("meetings:", err),
    );
    unsubs.push(meetUnsub);

    const attUnsub = onSnapshot(
      query(collection(db, "attendance"), where("uid", "==", currentUser.uid)),
      (snap) => setMyAttendanceCount(snap.size),
      (err) => console.error("attendance:", err),
    );
    unsubs.push(attUnsub);

    return () => unsubs.forEach((u) => u());
  }, [currentUser]);

  const deleteNotification = async (id: string) => {
    if (!window.confirm("Delete this notification?")) return;
    try {
      await deleteDoc(doc(db, "notifications", id));
      toast.success("Notification deleted");
    } catch (err: any) {
      toast.error("Failed to delete notification");
    }
  };

  const totalDue = myProducts.reduce((s, p) => s + (p.remainingAmount || 0), 0);
  const totalPaid = myProducts.reduce((s, p) => s + (p.paidAmount || 0), 0);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };
  const getDeadlineInfo = () => {
    const today = new Date();

    // Get last day of current month
    const lastDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const diffDays = Math.ceil(
      (lastDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      date: lastDate,
      isUrgent: diffDays <= 5,
      daysLeft: diffDays,
    };
  };

  const deadline = getDeadlineInfo();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-violet-200/40 to-indigo-200/40 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-cyan-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 right-1/3 w-72 h-72 bg-gradient-to-br from-rose-200/20 to-orange-200/20 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 w-full">
        {" "}
        {/* Hero Section - Clean */}
        <div className=" p-4 sm:p-5">
          <div className="flex items-center gap-4">
            {/* Left Image */}
            <div>
              {userProfile?.photoURL ? (
                <img
                  src={userProfile.photoURL}
                  alt="User"
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-slate-200"
                />
              ) : (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-100 flex items-center justify-center text-base font-bold text-slate-700">
                  {userProfile?.name?.[0]}
                </div>
              )}
            </div>

            {/* Right Content */}
            <div className="flex flex-col">
              <p className="text-sm text-slate-500 font-medium">
                {getGreeting()}
              </p>

              <h1 className="text-lg sm:text-xl font-semibold text-slate-800">
                {userProfile?.name} {userProfile?.surname}
              </h1>
            </div>
          </div>
        </div>
        {/* Deadline Alert */}
        <div
          className={`mx-3 sm:mx-4 flex items-center justify-between rounded-xl px-4 py-3 sm:py-4
  ${deadline.isUrgent ? "bg-red-100 text-red-700 border border-red-200" : "bg-green-100 text-green-700 border border-green-200"}`}
        >
          {/* Left Content */}
          <div>
            <p className="font-semibold text-base sm:text-3xl">
              Monthly Deadline
            </p>

            <p className="text-xs sm:text-sm">
              Due by{" "}
              {deadline.date.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
            </p>

            <div className="text-xs sm:text-sm font-medium mt-1">
              Amount: <span className="text-blue-700 font-bold">₹100/-</span>
            </div>
          </div>

          {/* Right Content (always right) */}
          <div className="text-right">
            <p className="text-lg sm:text-2xl font-bold whitespace-nowrap">
              {deadline.daysLeft} days left
            </p>
          </div>
        </div>
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 px-3 sm:px-4 py-3">
          {" "}
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
            : [
                {
                  label: "Meetings Attended",
                  value: myAttendanceCount,
                  icon: Users,
                  gradient: "from-violet-500 to-purple-600",
                  bgGradient: "from-violet-50 to-purple-50",
                  iconBg: "bg-violet-100",
                  iconColor: "text-violet-600",
                  trend: "+2 this month",
                },
                {
                  label: "Payment Status",
                  value:
                    userProfile?.paymentStatus === "paid" ? "Paid" : "Pending",
                  icon: CreditCard,
                  gradient:
                    userProfile?.paymentStatus === "paid"
                      ? "from-emerald-500 to-teal-600"
                      : "from-amber-500 to-orange-600",
                  bgGradient:
                    userProfile?.paymentStatus === "paid"
                      ? "from-emerald-50 to-teal-50"
                      : "from-amber-50 to-orange-50",
                  iconBg:
                    userProfile?.paymentStatus === "paid"
                      ? "bg-emerald-100"
                      : "bg-amber-100",
                  iconColor:
                    userProfile?.paymentStatus === "paid"
                      ? "text-emerald-600"
                      : "text-amber-600",
                  trend:
                    totalPaid > 0
                      ? `₹${totalPaid.toLocaleString()} paid`
                      : "No payments yet",
                },
                {
                  label: "Total Due",
                  value: `₹${totalDue.toLocaleString()}`,
                  icon: TrendingUp,
                  gradient:
                    totalDue > 0
                      ? "from-rose-500 to-red-600"
                      : "from-emerald-500 to-teal-600",
                  bgGradient:
                    totalDue > 0
                      ? "from-rose-50 to-red-50"
                      : "from-emerald-50 to-teal-50",
                  iconBg: totalDue > 0 ? "bg-rose-100" : "bg-emerald-100",
                  iconColor:
                    totalDue > 0 ? "text-rose-600" : "text-emerald-600",
                  trend: totalDue === 0 ? "All clear!" : "Outstanding balance",
                },
                {
                  label: "Active Products",
                  value: myProducts.length,
                  icon: Zap,
                  gradient: "from-blue-500 to-indigo-600",
                  bgGradient: "from-blue-50 to-indigo-50",
                  iconBg: "bg-blue-100",
                  iconColor: "text-blue-600",
                  trend: "Assigned to you",
                },
              ].map((stat, idx) => (
                <div
                  key={stat.label}
                  className="group relative bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 overflow-hidden"
                >
                  {/* Background Hover */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                  />

                  {/* Top Gradient Line */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${stat.gradient} transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300`}
                  />

                  <div className="relative z-10">
                    {/* Icon Row */}
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`w-9 h-9 ${stat.iconBg} rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105`}
                      >
                        <stat.icon size={18} className={stat.iconColor} />
                      </div>

                      <ArrowUpRight
                        size={14}
                        className="text-slate-300 group-hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-all duration-300"
                      />
                    </div>

                    {/* Label */}
                    <p className="text-[10px] font-semibold text-slate-400 uppercase mb-0.5">
                      {stat.label}
                    </p>

                    {/* Value */}
                    <p className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                      {stat.value}
                    </p>

                    {/* Trend */}
                    <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                      <span
                        className={`w-1 h-1 rounded-full bg-gradient-to-r ${stat.gradient}`}
                      />
                      {stat.trend}
                    </p>
                  </div>
                </div>
              ))}
        </div>
        {/* Main Content - Scanner & Notifications Side by Side */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
          {/* Left Column - Actions & Meetings */}
          <div className="xl:col-span-8 space-y-6">
            <div className="block sm:hidden">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-3 py-4">
                <div className="flex items-center justify-between">
                  <Link
                    to="/member/complaint"
                    className="flex flex-col items-center flex-1"
                  >
                    <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center">
                      📝
                    </div>
                    <span className="text-[11px]">Complaint</span>
                  </Link>

                  <Link
                    to="/member/emergency"
                    className="flex flex-col items-center flex-1"
                  >
                    <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center">
                      🚨
                    </div>
                    <span className="text-[11px]">Emergency</span>
                  </Link>

                  <Link
                    to="/member/payments"
                    className="flex flex-col items-center flex-1"
                  >
                    <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <CreditCard size={20} />
                    </div>
                    <span className="text-[11px]">Payments</span>
                  </Link>

                  <Link
                    to="/member/scan"
                    className="flex flex-col items-center flex-1"
                  >
                    <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center">
                      ⛶
                    </div>
                    <span className="text-[11px]">Scan</span>
                  </Link>
                </div>
              </div>
            </div>
            {/* Secondary Actions Grid */}
            <div className="hidden sm:grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  to: "/member/complaint",
                  icon: "📝",
                  title: "Raise Complaint",
                  sub: "Report issues",
                  gradient: "from-orange-500 to-amber-600",
                  bg: "bg-gradient-to-br from-orange-50 to-amber-50",
                  hoverBg:
                    "group-hover:from-orange-100 group-hover:to-amber-100",
                },
                {
                  to: "/member/emergency",
                  icon: "🚨",
                  title: "Emergency",
                  sub: "Quick help",
                  gradient: "from-red-500 to-rose-600",
                  bg: "bg-gradient-to-br from-red-50 to-rose-50",
                  hoverBg: "group-hover:from-red-100 group-hover:to-rose-100",
                },
                {
                  to: "/member/payments",
                  icon: <CreditCard size={24} />,
                  title: "Payments",
                  sub: "View history",
                  gradient: "from-emerald-500 to-teal-600",
                  bg: "bg-gradient-to-br from-emerald-50 to-teal-50",
                  hoverBg:
                    "group-hover:from-emerald-100 group-hover:to-teal-100",
                },
              ].map((action, idx) => (
                <Link
                  key={idx}
                  to={action.to}
                  className={`group relative overflow-hidden rounded-2xl p-6 ${action.bg} ${action.hoverBg} border border-slate-200/50 hover:border-slate-300 shadow-sm hover:shadow-lg transition-all duration-500 hover:-translate-y-1`}
                >
                  <div
                    className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${action.gradient} transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}
                  />

                  <div className="relative z-10">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300">
                      <span
                        className={
                          typeof action.icon === "string"
                            ? "text-2xl"
                            : "text-slate-700"
                        }
                      >
                        {action.icon}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg mb-1">
                      {action.title}
                    </h3>
                    <p className="text-sm text-slate-500 font-medium">
                      {action.sub}
                    </p>
                  </div>

                  <ArrowUpRight
                    size={20}
                    className="absolute top-4 right-4 text-slate-300 group-hover:text-slate-500 transform translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300"
                  />
                </Link>
              ))}
            </div>

            {/* Meetings Section */}
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-violet-500/10 rounded-[2rem] blur-xl" />
              <div className="relative bg-white rounded-[1.75rem] border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="p-6 sm:p-8 pb-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-blue-50/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <CalendarDays size={24} className="text-white" />
                      </div>
                      <span>
                        Committee Meetings
                        <span className="block text-sm font-medium text-slate-500 mt-0.5">
                          Your upcoming sessions
                        </span>
                      </span>
                    </h2>
                    <Link
                      to="/member/meetings"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white hover:bg-indigo-600 rounded-xl text-sm font-bold transition-colors duration-300 shadow-lg hover:shadow-xl"
                    >
                      View All Meetings
                      <ArrowUpRight size={16} />
                    </Link>
                  </div>
                </div>

                <div className="p-6 sm:p-8">
                  {meetings.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {meetings.map((m) => (
                        <div
                          key={m.id}
                          className="group relative bg-gradient-to-br from-white to-slate-50 rounded-2xl border-2 border-slate-100 hover:border-indigo-200 transition-all duration-500 hover:shadow-xl hover:-translate-y-1 overflow-hidden"
                        >
                          <div
                            className={`absolute top-0 left-0 right-0 h-1.5 ${m.status === "active" ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-slate-300 to-slate-400"}`}
                          />

                          <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div
                                className={`w-12 h-12 rounded-xl flex items-center justify-center ${m.status === "active" ? "bg-gradient-to-br from-emerald-100 to-teal-100" : "bg-slate-100"}`}
                              >
                                <CalendarDays
                                  size={20}
                                  className={
                                    m.status === "active"
                                      ? "text-emerald-600"
                                      : "text-slate-500"
                                  }
                                />
                              </div>
                              <span
                                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                  m.status === "active"
                                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                    : "bg-slate-100 text-slate-600 border border-slate-200"
                                }`}
                              >
                                {m.status}
                              </span>
                            </div>

                            <h3 className="text-xl font-black text-slate-900 mb-2 group-hover:text-indigo-700 transition-colors line-clamp-1">
                              {m.topic}
                            </h3>
                            <p className="text-sm text-slate-500 line-clamp-2 mb-5 font-medium leading-relaxed min-h-[40px]">
                              {m.description}
                            </p>

                            <div className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="flex items-center gap-3 text-slate-600 text-sm font-semibold">
                                <CalendarDays
                                  size={16}
                                  className="text-indigo-500"
                                />
                                {m.date?.toDate
                                  ? m.date
                                      .toDate()
                                      .toLocaleDateString("en-IN", {
                                        weekday: "short",
                                        month: "short",
                                        day: "numeric",
                                      })
                                  : m.date || "TBD"}
                              </div>
                              <div className="flex items-center gap-3 text-slate-600 text-sm font-semibold">
                                <Clock size={16} className="text-indigo-500" />
                                {m.startTime}{" "}
                                {m.endTime ? `- ${m.endTime}` : ""}
                              </div>
                            </div>

                            <Link
                              to="/member/scan"
                              className="mt-5 w-full py-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white hover:from-indigo-600 hover:to-violet-600 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg group/btn"
                            >
                              <span className="text-lg">📷</span>
                              Scan to Attend
                              <ArrowUpRight
                                size={16}
                                className="opacity-0 group-hover/btn:opacity-100 transform translate-x-0 group-hover/btn:translate-x-1 transition-all"
                              />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-16 text-center">
                      <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CalendarDays size={40} className="text-slate-400" />
                      </div>
                      <p className="font-black text-xl text-slate-700 mb-2">
                        No Upcoming Meetings
                      </p>
                      <p className="text-slate-500 font-medium">
                        We'll notify you when new sessions are scheduled.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Scanner + Notifications Side by Side */}
          <div className="xl:col-span-4 space-y-6">
            {/* QR Scanner Card */}
            <Link
              to="/member/scan"
              className="hidden sm:block group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 p-5"
            >
              {/* Image Box */}
              <div className="w-full flex justify-center">
                <div className="w-full max-w-[180px] bg-slate-50 border border-slate-200 rounded-xl shadow-inner p-3">
                  <img
                    src={qrCodeImage}
                    alt="Scan QR"
                    className="w-full h-36 object-contain mx-auto"
                  />
                </div>
              </div>

              {/* Text */}
              <div className="text-center mt-4 transition-all duration-300 group-hover:translate-y-[-2px]">
                <div className="mt-4">
                  <div className="flex justify-center mt-4">
                    <div
                      className="w-1/3 text-center py-2.5 bg-blue-800 text-white rounded-xl text-sm font-semibold shadow-sm 
        hover:bg-blue-900 hover:shadow-md active:scale-95 transition-all duration-200"
                    >
                      Scan QR
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1 group-hover:text-slate-700 transition-colors duration-300">
                  Tap to open scanner
                </p>
              </div>
            </Link>

            {/* Notifications */}
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden sticky top-6">
              <div className="p-6 pb-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                      <Bell size={18} className="text-white" />
                    </div>
                    Notifications
                  </h2>
                  {notifications.length > 0 && (
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500" />
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 max-h-[460px] overflow-y-auto custom-scrollbar">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 animate-pulse mb-3"
                    >
                      <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0" />
                      <div className="w-full space-y-2 py-1">
                        <div className="h-4 w-3/4 bg-slate-200 rounded-full" />
                        <div className="h-3 w-full bg-slate-100 rounded-full" />
                      </div>
                    </div>
                  ))
                ) : notifications.length > 0 ? (
                  <div className="space-y-3">
                    {notifications.map((n, i) => (
                      <div
                        key={n.id || i}
                        className="group relative flex gap-4 p-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all duration-300"
                      >
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 transition-transform duration-300 group-hover:scale-110 shadow-sm ${
                            n.type === "meeting"
                              ? "bg-gradient-to-br from-indigo-100 to-violet-100"
                              : n.type === "payment"
                                ? "bg-gradient-to-br from-emerald-100 to-teal-100"
                                : n.type === "emergency"
                                  ? "bg-gradient-to-br from-red-100 to-rose-100"
                                  : "bg-gradient-to-br from-blue-100 to-indigo-100"
                          }`}
                        >
                          {n.type === "meeting"
                            ? "📅"
                            : n.type === "payment"
                              ? "💳"
                              : n.type === "emergency"
                                ? "🚨"
                                : "📢"}
                        </div>
                        <div className="flex-1 min-w-0 pr-8">
                          <p className="text-sm font-bold text-slate-800 mb-1 truncate">
                            {n.title}
                          </p>
                          <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                            {n.body}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest">
                            {n.sentAt?.toDate
                              ? new Date(n.sentAt.toDate()).toLocaleDateString(
                                  "en-IN",
                                  { day: "numeric", month: "short" },
                                )
                              : "Recent"}
                          </p>
                        </div>
                        {n.id && (
                          <button
                            onClick={() => deleteNotification(n.id!)}
                            className="absolute top-1/2 -translate-y-1/2 right-3 p-2 rounded-xl bg-red-50 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all duration-300"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <span className="text-4xl opacity-50">📭</span>
                    </div>
                    <p className="font-bold text-slate-700">All caught up!</p>
                    <p className="text-sm text-slate-500 mt-1">
                      No new notifications
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Custom CSS */}
      <style>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 20s linear infinite;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>
    </div>
  );
};

export default MemberDashboard;
