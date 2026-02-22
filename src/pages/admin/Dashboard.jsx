import React, { useEffect, useState } from "react";
import {
    collection, getDocs, query, where, orderBy, limit
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { Users, CalendarDays, CreditCard, MessageSquareWarning, TrendingUp, UserCheck, UserX, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Link } from "react-router-dom";

const StatCard = ({ icon: Icon, label, value, color, sub }) => (
    <div className={`relative overflow-hidden rounded-[1.5rem] p-5 sm:p-6 bg-gradient-to-br from-white/80 to-slate-50/50 backdrop-blur-xl border border-white shadow-xl shadow-slate-200/50 hover:shadow-xl shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 group group-hover:border-${color.split('-')[1]}-100 animate-fade-in`}>
        <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center flex-shrink-0 mb-4 shadow-inner transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
            <Icon size={24} className="text-white drop-shadow-sm" />
        </div>
        <div>
            <p className="text-3xl font-extrabold text-slate-800 tracking-tight mb-0.5">{value}</p>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{label}</p>
            {sub && <p className="text-xs font-semibold text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`absolute -right-6 -bottom-6 w-24 h-24 ${color.replace('bg-', 'bg-').replace('500', '100').replace('600', '100')} rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-300`}></div>
    </div>
);

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        totalMembers: 0, activeMembers: 0, blockedMembers: 0,
        totalMeetings: 0, openComplaints: 0, pendingPayments: 0,
        recentMembers: [],
        recentMeetings: []
    });
    const [loading, setLoading] = useState(true);
    const [attendanceData, setAttendanceData] = useState([]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [usersSnap, meetingsSnap, complaintsSnap] = await Promise.all([
                    getDocs(collection(db, "users")),
                    getDocs(collection(db, "meetings")),
                    getDocs(query(collection(db, "complaints"), where("status", "==", "open"))),
                ]);

                const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                const activeMembers = users.filter(u => u.status === "active" && u.role === "member");
                const blockedMembers = users.filter(u => u.status === "blocked");
                const memberUsers = users.filter(u => u.role === "member");
                const pendingPayments = memberUsers.filter(u => u.paymentStatus !== "paid").length;

                // Recent 5 members
                const recentMembers = [...memberUsers]
                    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                    .slice(0, 5);

                setStats({
                    totalMembers: memberUsers.length,
                    activeMembers: activeMembers.length,
                    blockedMembers: blockedMembers.length,
                    totalMeetings: meetingsSnap.size,
                    openComplaints: complaintsSnap.size,
                    pendingPayments,
                    recentMembers,
                    recentMeetings: meetingsSnap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 5)
                });

                // Attendance chart data (from meetings)
                const meetings = meetingsSnap.docs.map(d => ({ id: d.id, ...d.data() })).slice(-6);
                const attData = await Promise.all(meetings.map(async (m) => {
                    const attSnap = await getDocs(query(collection(db, "attendance"), where("meetingId", "==", m.id)));
                    return { name: m.topic?.slice(0, 10) || "Meeting", attended: attSnap.size };
                }));
                // Create a beautiful gradient color cycle for the charts
                const colors = ['#6366f1', '#8b5cf6', '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b'];
                setAttendanceData(attData.map((d, i) => ({ ...d, fill: colors[i % colors.length] })));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const pieData = [
        { name: "Active", value: stats.activeMembers, color: "#10b981" },
        { name: "Blocked", value: stats.blockedMembers, color: "#f43f5e" },
    ];

    if (loading) return (
        <div className="flex items-center justify-center h-64 mt-20">
            <div className="flex flex-col items-center gap-4">
                <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
                </div>
                <p className="text-slate-500 font-medium animate-pulse">Loading dashboard...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in pb-8">
            <div className="relative">
                <h1 className="page-title mb-2 drop-shadow-sm text-4xl">Admin Dashboard</h1>
                <p className="text-slate-500 font-medium">Welcome to the central command center for BCTA.</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                <StatCard icon={Users} label="Total Members" value={stats.totalMembers} color="bg-gradient-to-br from-blue-500 to-indigo-600" />
                <StatCard icon={UserCheck} label="Active Members" value={stats.activeMembers} color="bg-gradient-to-br from-emerald-400 to-teal-500" />
                <StatCard icon={UserX} label="Blocked Members" value={stats.blockedMembers} color="bg-gradient-to-br from-rose-500 to-red-600" />
                <StatCard icon={CalendarDays} label="Meetings Held" value={stats.totalMeetings} color="bg-gradient-to-br from-violet-500 to-purple-600" />
                <StatCard icon={CreditCard} label="Pending Payments" value={stats.pendingPayments} color="bg-gradient-to-br from-amber-400 to-orange-500" />
                <StatCard icon={MessageSquareWarning} label="Open Complaints" value={stats.openComplaints} color="bg-gradient-to-br from-pink-500 to-rose-500" />
                <StatCard icon={TrendingUp} label="Overall Attendance"
                    value={stats.totalMembers > 0 ? `${Math.round((stats.activeMembers / stats.totalMembers) * 100)}%` : "0%"}
                    color="bg-gradient-to-br from-cyan-400 to-blue-500" />
                <StatCard icon={AlertCircle} label="System Status" value="Online" color="bg-gradient-to-br from-slate-700 to-slate-900" sub="All systems operational" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Attendance Bar Chart */}
                <div className="card xl:col-span-2 relative overflow-hidden group">
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <h2 className="text-lg font-bold text-slate-800 tracking-tight">Meeting Attendance Trends</h2>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full">Last 6 Meetings</span>
                    </div>
                    {attendanceData.length > 0 ? (
                        <div className="relative z-10">
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={attendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 500 }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', fontWeight: 'bold' }}
                                    />
                                    <Bar dataKey="attended" radius={[6, 6, 0, 0]}>
                                        {attendanceData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm relative z-10">
                            <span className="text-4xl mb-3 opacity-30">📊</span>
                            <p className="font-medium">No meeting data available to display</p>
                        </div>
                    )}
                </div>

                {/* Pie Chart */}
                <div className="card flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-emerald-50 rounded-full blur-3xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
                    <h2 className="text-lg font-bold text-slate-800 tracking-tight mb-2 w-full text-left relative z-10">Member Distribution</h2>
                    <p className="text-xs text-slate-500 mb-6 w-full text-left font-medium relative z-10">Active vs Blocked accounts</p>

                    <div className="relative z-10 w-full flex-1 flex flex-col justify-center">
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
                                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                                    itemStyle={{ fontWeight: 'bold' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Custom Legend */}
                        <div className="flex justify-center gap-6 mt-6">
                            {pieData.map(d => (
                                <div key={d.name} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ background: d.color }} />
                                    <span className="text-sm font-bold text-slate-700">{d.name} <span className="text-slate-400 font-medium ml-1">({d.value})</span></span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Members */}
            <div className="card overflow-hidden !p-0">
                <div className="flex items-center justify-between p-6 sm:p-8 border-b border-slate-100 bg-white/50 backdrop-blur-sm">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 tracking-tight">Recent Registrations</h2>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">The latest 5 members added to the platform</p>
                    </div>
                    <Link to="/admin/members" className="flex items-center gap-1 text-blue-600 text-sm font-bold hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                        View all <span className="text-lg leading-none">&rarr;</span>
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                <th className="table-header text-left pl-6 sm:pl-8">Member ID</th>
                                <th className="table-header text-left">Member Name</th>
                                <th className="table-header text-left">Blood Group</th>
                                <th className="table-header text-left">Status</th>
                                <th className="table-header text-left pr-6 sm:pr-8">Payment</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/60">
                            {stats.recentMembers.map((m) => (
                                <tr key={m.id} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="table-cell pl-6 sm:pl-8">
                                        <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-mono text-xs font-bold border border-slate-200 group-hover:bg-blue-100 group-hover:text-blue-700 group-hover:border-blue-200 transition-colors">
                                            {m.memberId}
                                        </div>
                                    </td>
                                    <td className="table-cell">
                                        <div className="flex items-center gap-3">
                                            {m.photoURL ? (
                                                <img src={m.photoURL} alt="" className="w-8 h-8 rounded-lg object-cover shadow-sm" />
                                            ) : (
                                                <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center text-slate-500 font-bold text-xs shadow-sm">
                                                    {m.name?.[0]}
                                                </div>
                                            )}
                                            <span className="font-bold text-slate-800">{m.name} {m.surname}</span>
                                        </div>
                                    </td>
                                    <td className="table-cell">
                                        <span className="font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded text-xs border border-red-100/50">{m.bloodGroup || "N/A"}</span>
                                    </td>
                                    <td className="table-cell">
                                        <span className={m.status === "active" ? "badge-active" : "badge-blocked"}>
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${m.status === "active" ? "bg-emerald-500" : "bg-red-500"}`}></div>
                                                {m.status}
                                            </div>
                                        </span>
                                    </td>
                                    <td className="table-cell pr-6 sm:pr-8">
                                        <span className={m.paymentStatus === "paid" ? "badge-active" : "badge-pending shadow-xl shadow-slate-200/50"}>
                                            {m.paymentStatus}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {stats.recentMembers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <span className="text-3xl mb-2 opacity-30">👥</span>
                                            <p className="font-medium text-sm">No members registered yet</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent Meetings */}
            <div className="card overflow-hidden !p-0">
                <div className="flex items-center justify-between p-6 sm:p-8 border-b border-slate-100 bg-white/50 backdrop-blur-sm">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 tracking-tight">Recent Meetings</h2>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">Overview of the latest committee schedules</p>
                    </div>
                    <Link to="/admin/meetings" className="flex items-center gap-1 text-blue-600 text-sm font-bold hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                        Manage Meetings <span className="text-lg leading-none">&rarr;</span>
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                <th className="table-header text-left pl-6 sm:pl-8">Topic</th>
                                <th className="table-header text-left">Date</th>
                                <th className="table-header text-left">Time</th>
                                <th className="table-header text-left">Status</th>
                                <th className="table-header text-right pr-6 sm:pr-8">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/60">
                            {stats.recentMeetings.map((m) => (
                                <tr key={m.id} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="table-cell pl-6 sm:pl-8">
                                        <span className="font-bold text-slate-800">{m.topic}</span>
                                    </td>
                                    <td className="table-cell text-slate-500 font-medium text-sm">
                                        {m.date?.toDate ? m.date.toDate().toLocaleDateString("en-IN") : m.date || "TBD"}
                                    </td>
                                    <td className="table-cell text-slate-500 font-medium text-sm">
                                        {m.startTime}
                                    </td>
                                    <td className="table-cell">
                                        <span className={m.status === "active" ? "badge-active" : "badge-pending"}>
                                            {m.status}
                                        </span>
                                    </td>
                                    <td className="table-cell text-right pr-6 sm:pr-8">
                                        <Link to={`/admin/meetings/${m.id}`} className="text-blue-600 hover:text-blue-700 font-bold text-xs uppercase tracking-wider">
                                            Manage
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {stats.recentMeetings.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-400 font-medium text-sm">
                                        No meetings scheduled yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
