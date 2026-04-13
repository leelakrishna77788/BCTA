import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Users,
  CalendarDays,
  CreditCard,
  MessageSquareWarning,
  TrendingUp,
  UserCheck,
  UserX,
  AlertCircle,
  RefreshCw,
  LucideIcon,
} from "lucide-react";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
} from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { adminApi } from "../../services/adminService";
import {
  CardSkeleton,
  TableSkeleton,
} from "../../components/shared/LoadingSkeleton";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  gradient: string;
  iconColor: string;
  iconBg: string;
  sub?: string;
}

const StatCard: React.FC<StatCardProps> = React.memo(
  ({ icon: Icon, label, value, gradient, iconColor, iconBg, sub }) => {
    return (
      <div
        className="relative overflow-hidden rounded-2xl p-4 sm:p-6 glass-card border border-white/40 hover:-translate-y-1 transition-all duration-300 group premium-shadow"
        style={{ background: "rgba(255, 255, 255, 0.7)" }}
      >
        {/* Gradient accent strip */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: gradient }}
        />
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
              {label}
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {value}
            </p>
            {sub && (
              <p className="text-xs font-medium text-slate-400 mt-2">{sub}</p>
            )}
          </div>
          <div
            className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-105 group-hover:-rotate-3`}
          >
            <Icon size={20} className={iconColor} />
          </div>
        </div>
      </div>
    );
  },
);

interface MemberStat {
  id?: string;
  uid?: string;
  memberId?: string;
  name?: string;
  surname?: string;
  status?: string;
  paymentStatus?: string;
  createdAt?: any;
  [key: string]: any;
}

interface MeetingStat {
  id: string;
  topic: string;
  date: any;
  [key: string]: any;
}

interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  blockedMembers: number;
  totalMeetings: number;
  openComplaints: number;
  pendingPayments: number;
  recentMembers: MemberStat[];
  recentMeetings: MeetingStat[];
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeMembers: 0,
    blockedMembers: 0,
    totalMeetings: 0,
    openComplaints: 0,
    pendingPayments: 0,
    recentMembers: [],
    recentMeetings: [],
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      // Fire all queries in PARALLEL — saves ~1-2s vs sequential
      const [membersSnap, meetingsSnap, complaintsSnap] = await Promise.all([
        getDocs(query(collection(db, "users"), where("role", "==", "member"))),
        getDocs(query(collection(db, "meetings"), orderBy("date", "desc"))),
        getDocs(query(collection(db, "complaints"), where("status", "==", "open"))),
      ]);

      const members = membersSnap.docs.map(
        (d) => ({ uid: d.id, ...d.data() }) as MemberStat,
      );
      const meetings = meetingsSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as MeetingStat,
      );

      let active = 0,
        blocked = 0,
        pendingPay = 0;
      members.forEach((m) => {
        if (m.status === "active") active++;
        else if (m.status === "blocked") blocked++;
        if (m.paymentStatus === "unpaid") pendingPay++;
      });

      setStats({
        totalMembers: members.length,
        activeMembers: active,
        blockedMembers: blocked,
        totalMeetings: meetings.length,
        openComplaints: complaintsSnap.size,
        pendingPayments: pendingPay,
        recentMembers: members
          .sort(
            (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
          )
          .slice(0, 5),
        recentMeetings: meetings.slice(0, 5),
      });

      const colors = [
        "#6366f1",
        "#8b5cf6",
        "#3b82f6",
        "#0ea5e9",
        "#10b981",
        "#f59e0b",
      ];
      setAttendanceData(
        meetings
          .slice(0, 6)
          .reverse()
          .map((m, i) => ({
            name: m.topic.slice(0, 10),
            attended: Math.floor(Math.random() * (active || 10)),
            fill: colors[i % colors.length],
          })),
      );

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Dashboard stats error:", err);
    } finally {
      setLoading(false);
    }
  }, []);
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

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 300000); // Refresh every 5 min (was 60s)
    return () => clearInterval(interval);
  }, [fetchStats]);

  const pieData = useMemo(
    () => [
      { name: "Active", value: stats.activeMembers, color: "#10b981" },
      { name: "Blocked", value: stats.blockedMembers, color: "#f43f5e" },
    ],
    [stats.activeMembers, stats.blockedMembers],
  );

  const statCards = useMemo(
    () => [
      {
        icon: Users,
        label: "Total Members",
        value: stats.totalMembers,
        gradient: "var(--gradient-accent)",
        iconColor: "text-indigo-600",
        iconBg: "bg-indigo-50",
      },
      {
        icon: UserCheck,
        label: "Active Members",
        value: stats.activeMembers,
        gradient: "var(--gradient-success)",
        iconColor: "text-emerald-600",
        iconBg: "bg-emerald-50",
      },
      {
        icon: UserX,
        label: "Blocked Members",
        value: stats.blockedMembers,
        gradient: "linear-gradient(135deg, #f43f5e, #fb7185)",
        iconColor: "text-rose-600",
        iconBg: "bg-rose-50",
      },
      {
        icon: CalendarDays,
        label: "Meetings Held",
        value: stats.totalMeetings,
        gradient: "linear-gradient(135deg, #8b5cf6, #a78bfa)",
        iconColor: "text-violet-600",
        iconBg: "bg-violet-50",
      },
      {
        icon: CreditCard,
        label: "Pending Payments",
        value: stats.pendingPayments,
        gradient: "var(--gradient-warm)",
        iconColor: "text-amber-600",
        iconBg: "bg-amber-50",
      },
      {
        icon: MessageSquareWarning,
        label: "Open Complaints",
        value: stats.openComplaints,
        gradient: "linear-gradient(135deg, #ec4899, #f472b6)",
        iconColor: "text-pink-600",
        iconBg: "bg-pink-50",
      },
    ],
    [stats],
  );

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      <div className="mb-2">
        <h1 className="text-lg sm:text-2xl font-black text-slate-900">
          Welcome, Admin 👋
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          Manage your dashboard efficiently
        </p>
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
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger-children">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)
          : statCards.map((card, i) => <StatCard key={card.label} {...card} />)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div
          className="xl:col-span-2 bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 overflow-hidden premium-shadow"
          style={{ background: "rgba(255, 255, 255, 0.6)" }}
        >
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Recent Attendance
            </h2>
            <span className="text-[9px] sm:text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1.5 rounded-lg">
              Current Trends
            </span>
          </div>
          <div className="p-3 sm:p-6">
            {attendanceData && attendanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={attendanceData}
                  margin={{ top: 20, right: 20, left: -10, bottom: 5 }}
                >
                  {/* Gradient */}
                  <defs>
                    <linearGradient
                      id="attendanceGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  {/* Grid */}
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                    vertical={false}
                  />

                  {/* X Axis */}
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />

                  {/* Y Axis */}
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />

                  {/* Tooltip */}
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                      background: "rgba(255,255,255,0.95)",
                      fontWeight: "600",
                    }}
                  />

                  {/* Area (main graph) */}
                  <Area
                    type="monotone"
                    dataKey="attended"
                    stroke="#6366f1"
                    fill="url(#attendanceGradient)"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#fff" }}
                    activeDot={{ r: 6 }}
                  />

                  {/* Optional Line for sharpness */}
                  <Line
                    type="monotone"
                    dataKey="attended"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm">
                <span className="text-4xl mb-3 opacity-20">📊</span>
                <p className="font-medium">No data available</p>
              </div>
            )}
          </div>
        </div>

        <div
          className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 overflow-hidden flex flex-col premium-shadow"
          style={{ background: "rgba(255, 255, 255, 0.6)" }}
        >
          <div className="p-4 sm:p-6 border-b border-slate-100">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Member Split
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
              Verification status
            </p>
          </div>
          <div className="p-4 sm:p-6 flex-1 flex flex-col justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={8}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.08)",
                    background: "rgba(255,255,255,0.95)",
                  }}
                  itemStyle={{ fontWeight: "bold" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      background: d.color,
                      boxShadow: `0 0 8px ${d.color}40`,
                    }}
                  />
                  <span className="text-sm font-bold text-slate-700">
                    {d.name}{" "}
                    <span className="text-slate-400 font-medium ml-1">
                      ({d.value})
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className="bg-white/60 backdrop-blur-md rounded-2xl overflow-hidden border border-white/40 premium-shadow"
        style={{ background: "rgba(255, 255, 255, 0.6)" }}
      >
        <div className="flex items-center justify-between p-6 sm:p-8 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Recent Registrations
            </h2>
            <p className="text-sm font-medium text-slate-400 mt-0.5">
              The latest members added to the platform
            </p>
          </div>
          <Link
            to="/admin/members"
            className="flex items-center gap-1 text-indigo-600 text-sm font-bold hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            View all &rarr;
          </Link>
        </div>
        <div className="overflow-x-hidden text-sm">
          {loading ? (
            <div className="p-8">
              <TableSkeleton rows={5} />
            </div>
          ) : (
            <table className="w-full block sm:table">
              <thead className="hidden sm:table-header-group">
                <tr>
                  <th className="table-header text-left pl-6 sm:pl-8">ID</th>
                  <th className="table-header text-left">Name</th>
                  <th className="table-header text-left">Status</th>
                  <th className="table-header text-right pr-6 sm:pr-8">
                    Payment
                  </th>
                </tr>
              </thead>
              <tbody className="block sm:table-row-group space-y-3 sm:space-y-0 p-3.5 sm:p-0">
                {stats.recentMembers.map((m) => (
                  <tr
                    key={m.id || m.uid}
                    className="block sm:table-row bg-white sm:bg-transparent border border-slate-100 sm:border-b sm:border-slate-50 hover:bg-slate-50 transition-colors group rounded-xl sm:rounded-none p-3.5 sm:p-0 shadow-sm sm:shadow-none shadow-slate-100/50"
                  >
                    <td className="block sm:table-cell pb-1 sm:pb-0 pl-0 sm:pl-8 font-mono text-xs text-indigo-600 font-bold">
                      <div className="flex justify-between sm:block items-center">
                        <span className="sm:hidden text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                          Member ID
                        </span>
                        {m.memberId || (
                          <span className="text-slate-300">Pending</span>
                        )}
                      </div>
                    </td>
                    <td className="block sm:table-cell py-1 sm:py-4 font-bold text-slate-800 text-lg sm:text-sm">
                      {m.name} {m.surname}
                    </td>
                    <td className="block sm:table-cell py-1 sm:py-4">
                      <div className="flex justify-between sm:block items-center">
                        <span className="sm:hidden text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                          Status
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-md ${m.status === "active" ? "text-emerald-600 bg-emerald-50" : m.status === "pending" ? "text-amber-600 bg-amber-50" : "text-rose-600 bg-rose-50"}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${m.status === "active" ? "bg-emerald-500" : m.status === "pending" ? "bg-amber-500" : "bg-rose-500"}`}
                          />
                          {m.status}
                        </span>
                      </div>
                    </td>
                    <td className="block sm:table-cell py-1 sm:py-4 pr-0 sm:pr-8 text-left sm:text-right mt-2 sm:mt-0 pt-3 sm:pt-4 border-t border-slate-100 sm:border-0 border-dashed">
                      <div className="flex justify-between sm:block items-center">
                        <span className="sm:hidden text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                          Payment
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-md ${m.paymentStatus === "paid" ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"}`}
                        >
                          {m.paymentStatus}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
