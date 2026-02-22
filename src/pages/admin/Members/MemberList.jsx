import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { Search, Plus, Eye, UserX, UserCheck, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

const MemberList = () => {
    const [members, setMembers] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [paymentFilter, setPaymentFilter] = useState("all");

    useEffect(() => {
        const unsubscribe = onSnapshot(
            query(collection(db, "users"), where("role", "==", "member"), orderBy("createdAt", "desc")),
            (snap) => {
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setMembers(data);
                setFiltered(data);
                setLoading(false);
            },
            (err) => { console.error(err); setLoading(false); }
        );
        return unsubscribe;
    }, []);

    useEffect(() => {
        let result = [...members];
        if (search) {
            const s = search.toLowerCase();
            result = result.filter(m =>
                m.name?.toLowerCase().includes(s) ||
                m.surname?.toLowerCase().includes(s) ||
                m.memberId?.toLowerCase().includes(s) ||
                m.email?.toLowerCase().includes(s)
            );
        }
        if (statusFilter !== "all") result = result.filter(m => m.status === statusFilter);
        if (paymentFilter !== "all") result = result.filter(m => m.paymentStatus === paymentFilter);
        setFiltered(result);
    }, [search, statusFilter, paymentFilter, members]);

    const toggleBlock = async (member) => {
        const newStatus = member.status === "active" ? "blocked" : "active";
        try {
            await updateDoc(doc(db, "users", member.id), { status: newStatus });
            toast.success(`Member ${newStatus === "active" ? "unblocked" : "blocked"} successfully`);
        } catch {
            toast.error("Failed to update status");
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative">
                    <h1 className="page-title mb-1 drop-shadow-sm text-3xl">Members Directory</h1>
                    <p className="text-slate-500 font-medium">Viewing {filtered.length} of {members.length} registered members</p>
                </div>
                <Link to="/admin/members/add" className="btn-primary inline-flex items-center gap-2 shadow-xl shadow-slate-200/50 hover:shadow-xl shadow-slate-200/50 transition-all">
                    <Plus size={18} /> <span>Add New Member</span>
                </Link>
            </div>

            {/* Filters */}
            <div className="card !p-4 bg-white/60 backdrop-blur-xl border border-white shadow-xl shadow-slate-200/50">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 flex items-center gap-3 bg-white border border-slate-200/60 rounded-xl px-4 py-2.5 shadow-sm focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-300 transition-all">
                        <Search size={18} className="text-slate-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name, ID, or email..."
                            className="flex-1 bg-transparent text-sm font-medium text-slate-700 placeholder-slate-400 outline-none w-full"
                        />
                    </div>
                    <div className="flex gap-3 sm:w-auto w-full">
                        <div className="relative flex-1 sm:w-40">
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                                className="input-field w-full py-2.5 pl-4 pr-10 appearance-none bg-white font-medium text-slate-700 cursor-pointer shadow-sm">
                                <option value="all">All Status</option>
                                <option value="active">Active Members</option>
                                <option value="blocked">Blocked Members</option>
                            </select>
                            <Filter size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="relative flex-1 sm:w-44">
                            <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}
                                className="input-field w-full py-2.5 pl-4 pr-10 appearance-none bg-white font-medium text-slate-700 cursor-pointer shadow-sm">
                                <option value="all">All Payments</option>
                                <option value="paid">Fully Paid</option>
                                <option value="unpaid">Unpaid</option>
                                <option value="partial">Partial Payment</option>
                            </select>
                            <Filter size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card p-0 overflow-hidden border border-slate-200/60 shadow-xl shadow-slate-200/50 bg-white/80 backdrop-blur-xl">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-4">
                            <div className="relative w-10 h-10">
                                <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                                <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
                            </div>
                            <p className="text-slate-500 font-medium animate-pulse">Loading members directory...</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200/60">
                                    <th className="table-header pl-6 py-4 font-bold text-slate-700">Member Info</th>
                                    <th className="table-header py-4 hidden md:table-cell font-bold text-slate-700">Blood Group</th>
                                    <th className="table-header py-4 hidden lg:table-cell font-bold text-slate-700">Attendance</th>
                                    <th className="table-header py-4 font-bold text-slate-700">Payment</th>
                                    <th className="table-header py-4 font-bold text-slate-700">Status</th>
                                    <th className="table-header pr-6 py-4 text-right font-bold text-slate-700 w-24">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map(m => (
                                    <tr key={m.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="table-cell pl-6 py-4">
                                            <div className="flex items-center gap-4">
                                                {m.photoURL ? (
                                                    <img src={m.photoURL} alt="" className="w-10 h-10 rounded-xl object-cover shadow-sm border border-slate-200/60" />
                                                ) : (
                                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center text-blue-600 font-bold border border-blue-100 shadow-sm">
                                                        {m.name?.[0]}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="font-bold text-slate-800 tracking-tight">{m.name} {m.surname}</span>
                                                        <span className="font-mono text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100/50">{m.memberId}</span>
                                                    </div>
                                                    <p className="text-xs font-medium text-slate-500">{m.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="table-cell py-4 hidden md:table-cell">
                                            <span className="bg-red-50 text-red-600 border border-red-100 text-xs font-bold px-2.5 py-1 rounded inline-block shadow-sm">
                                                {m.bloodGroup || "N/A"}
                                            </span>
                                        </td>
                                        <td className="table-cell py-4 hidden lg:table-cell">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-6 h-6 rounded bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold border border-slate-200">
                                                    {m.attendanceCount || 0}
                                                </div>
                                                <span className="text-xs text-slate-500 font-medium">meetings</span>
                                            </div>
                                        </td>
                                        <td className="table-cell py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide border shadow-sm ${m.paymentStatus === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : m.paymentStatus === "partial" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                                                {m.paymentStatus}
                                            </span>
                                        </td>
                                        <td className="table-cell py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide border shadow-sm ${m.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${m.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`}></div>
                                                {m.status}
                                            </span>
                                        </td>
                                        <td className="table-cell pr-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link to={`/admin/members/${m.id}`}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm"
                                                    title="View Profile">
                                                    <Eye size={16} />
                                                </Link>
                                                <button onClick={() => toggleBlock(m)}
                                                    className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-slate-200 transition-all shadow-sm ${m.status === "active"
                                                        ? "text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                                                        : "text-slate-500 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50"}`}
                                                    title={m.status === "active" ? "Block Member" : "Unblock Member"}>
                                                    {m.status === "active" ? <UserX size={16} /> : <UserCheck size={16} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-400">
                                                <span className="text-4xl mb-3 opacity-30">🔍</span>
                                                <p className="font-bold text-slate-600 mb-1">No members found</p>
                                                <p className="text-sm font-medium">Try adjusting your search or filters.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MemberList;
