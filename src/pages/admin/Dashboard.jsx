import React, { useEffect, useState } from "react";
import { Users, CalendarDays, CreditCard, MessageSquareWarning, TrendingUp, UserCheck, UserX, AlertCircle, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { Link } from "react-router-dom";
import { adminApi } from "../../services/api";

const StatCard = ({ icon: Icon, label, value, color, sub }) => {
    const textColorClass = color.includes('emerald') ? 'text-emerald-600' :
        color.includes('rose') || color.includes('red') ? 'text-rose-600' :
            color.includes('amber') || color.includes('orange') ? 'text-amber-600' :
                color.includes('violet') || color.includes('purple') ? 'text-violet-600' :
                    color.includes('pink') ? 'text-pink-600' :
                        color.includes('cyan') ? 'text-cyan-600' :
                            color.includes('slate-700') ? 'text-slate-700' :
                                'text-blue-600';

    return (
        <div className="relative overflow-hidden rounded-xl p-5 sm:p-6 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 group animate-fade-in">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
                    <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
                    {sub && <p className="text-xs font-medium text-slate-500 mt-2">{sub}</p>}
                </div>
                <div className={`w-12 h-12 rounded-lg ${textColorClass.replace('text-', 'bg-').replace('600', '50')} flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3`}>
                    <Icon size={24} className={textColorClass} />
                </div>
            </div>
        </div>
    );
};

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        totalMembers: 0, activeMembers: 0, blockedMembers: 0,
        totalMeetings: 0, openComplaints: 0, pendingPayments: 0,
        recentMembers: [],
        recentMeetings: []
    });
    const [loading, setLoading] = useState(true);
    const [attendanceData, setAttendanceData] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await adminApi.getDashboardStats();
                setStats({
                    ...data.stats,
                    recentMembers: data.recentMembers,
                    recentMeetings: data.recentMeetings
                });
                // Ensure attendance colors
                const colors = ['#6366f1', '#8b5cf6', '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b'];
                setAttendanceData(data.attendanceTrends.map((d, i) => ({ ...d, fill: colors[i % colors.length] })));
                setLastUpdated(new Date());
            } catch (err) {
                console.error("Dashboard stats error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
        const interval = setInterval(fetchStats, 60000); // Poll every 1m
        return () => clearInterval(interval);
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
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="page-title mb-2 drop-shadow-sm text-4xl">Admin Dashboard</h1>
                    <p className="text-slate-500 font-medium">Welcome to the central command center for BCTA.</p>
                </div>
                {lastUpdated && (
                    <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg">
                        <RefreshCw size={12} className="text-emerald-500" />
                        Updated {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                <StatCard icon={Users} label="Total Members" value={stats.totalMembers} color="bg-blue-600" />
                <StatCard icon={UserCheck} label="Active Members" value={stats.activeMembers} color="bg-emerald-500" />
                <StatCard icon={UserX} label="Blocked Members" value={stats.blockedMembers} color="bg-rose-500" />
                <StatCard icon={CalendarDays} label="Meetings Held" value={stats.totalMeetings} color="bg-violet-500" />
                <StatCard icon={CreditCard} label="Pending Payments" value={stats.pendingPayments} color="bg-amber-500" />
                <StatCard icon={MessageSquareWarning} label="Open Complaints" value={stats.openComplaints} color="bg-pink-500" />
                <StatCard icon={TrendingUp} label="Active Rate"
                    value={stats.totalMembers > 0 ? `${Math.round((stats.activeMembers / stats.totalMembers) * 100)}%` : "0%"}
                    color="bg-cyan-500" />
                <StatCard icon={AlertCircle} label="System Status" value="Online" color="bg-slate-700" sub="All systems operational" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="card xl:col-span-2 relative overflow-hidden bg-white border border-slate-200">
                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Meeting Attendance Trends</h2>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-md border border-slate-200">Last 6 Meetings</span>
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
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                    />
                                    <Bar dataKey="attended" name="Attendees" radius={[6, 6, 0, 0]}>
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
                            <p className="font-medium">No meeting data available yet</p>
                        </div>
                    )}
                </div>

                <div className="card flex flex-col items-center justify-center relative overflow-hidden bg-white border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight mb-2 w-full text-left relative z-10">Member Distribution</h2>
                    <p className="text-sm text-slate-500 mb-6 w-full text-left font-medium relative z-10">Active vs Blocked accounts</p>
                    <div className="relative z-10 w-full flex-1 flex flex-col justify-center">
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={95}
                                    paddingAngle={5} dataKey="value" stroke="none" cornerRadius={8}>
                                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} itemStyle={{ fontWeight: 'bold' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-6 mt-4">
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

            <div className="card overflow-hidden !p-0 border border-slate-200 bg-white">
                <div className="flex items-center justify-between p-6 sm:p-8 border-b border-slate-200 bg-white">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Recent Registrations</h2>
                        <p className="text-sm font-medium text-slate-500 mt-1">The latest 5 members added to the platform</p>
                    </div>
                    <Link to="/admin/members" className="flex items-center gap-1 text-blue-600 text-sm font-semibold hover:text-blue-700 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-slate-200">
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
                                        <span className={m.paymentStatus === "paid" ? "badge-active" : "badge-pending"}>
                                            {m.paymentStatus}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {stats.recentMembers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-400 font-medium text-sm">No members registered yet</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card overflow-hidden !p-0 border border-slate-200 bg-white">
                <div className="flex items-center justify-between p-6 sm:p-8 border-b border-slate-200 bg-white">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Recent Meetings</h2>
                        <p className="text-sm font-medium text-slate-500 mt-1">Overview of the latest committee schedules</p>
                    </div>
                    <Link to="/admin/meetings" className="flex items-center gap-1 text-blue-600 text-sm font-semibold hover:text-blue-700 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-slate-200">
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
                                        {m.date && (m.date.toDate ? m.date.toDate().toLocaleDateString("en-IN") : new Date(m.date).toLocaleDateString("en-IN"))}
                                    </td>
                                    <td className="table-cell text-slate-500 font-medium text-sm">{m.startTime}</td>
                                    <td className="table-cell">
                                        <span className={m.status === "active" ? "badge-active" : "badge-pending"}>{m.status}</span>
                                    </td>
                                    <td className="table-cell text-right pr-6 sm:pr-8">
                                        <Link to={`/admin/meetings/${m.id}`} className="text-blue-600 hover:text-blue-700 font-bold text-xs uppercase tracking-wider">Manage</Link>
                                    </td>
                                </tr>
                            ))}
                            {stats.recentMeetings.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-400 font-medium text-sm">No meetings scheduled yet</td>
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
