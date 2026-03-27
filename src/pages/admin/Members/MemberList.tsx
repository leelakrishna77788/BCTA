import React, { useEffect, useState } from "react";
import { Plus, Eye, UserX, UserCheck, Filter, Trash2, AlertTriangle, ShieldAlert, X } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { collection, getDocs, query, where, doc, updateDoc, Timestamp, DocumentData } from "firebase/firestore";
import { db } from "../../../firebase/firebaseConfig";
import { membersApi } from "../../../services/membersService";
import { TableSkeleton } from "../../../components/shared/LoadingSkeleton";

interface MemberDoc extends DocumentData {
    id?: string;
    uid?: string;
    role?: string;
    createdAt?: Timestamp | Date;
    status?: string;
    paymentStatus?: string;
    photoURL?: string;
    name?: string;
    surname?: string;
    memberId?: string;
    email?: string;
    bloodGroup?: string;
    attendanceCount?: number;
}

const MemberList: React.FC = () => {
    const [members, setMembers] = useState<MemberDoc[]>([]);
    const [filtered, setFiltered] = useState<MemberDoc[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [showBulkConfirm, setShowBulkConfirm] = useState<boolean>(false);
    const [bulkConfirmText, setBulkConfirmText] = useState<string>("");

    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [paymentFilter, setPaymentFilter] = useState<string>("all");

    const fetchMembers = async () => {
        try {
            setLoading(true);
            const q = query(collection(db, "users"), where("role", "==", "member"));
            const snap = await getDocs(q);
            const data: MemberDoc[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            
            data.sort((a, b) => {
                const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : new Date(a.createdAt as any || 0);
                const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : new Date(b.createdAt as any || 0);
                return dateB.getTime() - dateA.getTime();
            });

            setMembers(data);
            setFiltered(data);
        } catch (err) {
            console.error("❌ Component Error [MemberList]:", err);
            toast.error("Failed to load members directory");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    useEffect(() => {
        let result = [...members];
        if (statusFilter !== "all") result = result.filter(m => m.status === statusFilter);
        if (paymentFilter !== "all") result = result.filter(m => m.paymentStatus === paymentFilter);
        setFiltered(result);
    }, [statusFilter, paymentFilter, members]);

    const toggleBlock = async (member: MemberDoc) => {
        const newStatus = member.status === "active" ? "blocked" : "active";
        try {
            const memberId = member.id || member.uid;
            if (!memberId) throw new Error("Member ID missing");
            const memberRef = doc(db, "users", memberId);
            await updateDoc(memberRef, { status: newStatus });
            if (newStatus === "blocked") {
                await membersApi.revokeTokens(memberId);
            }
            toast.success(`Member ${newStatus === "active" ? "unblocked" : "blocked"} successfully`);
            fetchMembers();
        } catch {
            toast.error("Failed to update status");
        }
    };

    const handleDelete = async (id: string | undefined, name: string | undefined) => {
        if (!id) return;
        if (!window.confirm(`Are you absolutely sure you want to PERMANENTLY delete ${name}? This action cannot be undone.`)) return;
        
        try {
            await membersApi.delete(id);
            toast.success(`${name} has been removed permanently`);
            fetchMembers();
        } catch (err: any) {
            toast.error(err.message || "Failed to delete member");
        }
    };

    const handleBulkDelete = async () => {
        if (bulkConfirmText !== "DELETE ALL") {
            toast.error("Please type 'DELETE ALL' exactly to confirm");
            return;
        }

        try {
            setIsDeleting(true);
            await membersApi.deleteAll();
            toast.success("Database cleanup complete. All members removed.");
            setShowBulkConfirm(false);
            setBulkConfirmText("");
            fetchMembers();
        } catch (err: any) {
            toast.error(err.message || "Bulk deletion failed");
            setShowBulkConfirm(false);
            setBulkConfirmText("");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative">
                    <h1 className="page-title mb-1 drop-shadow-sm text-3xl">Members Directory</h1>
                    <p className="text-slate-500 font-medium">Viewing {filtered.length} of {members.length} registered members</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setShowBulkConfirm(true)} className="btn-secondary text-red-600 border-red-100 hover:bg-red-50 py-3 px-5 rounded-2xl font-bold flex items-center gap-2">
                         <Trash2 size={18} /> <span className="hidden sm:inline">Bulk Cleanup</span>
                    </button>
                    <Link to="/admin/members/add" className="btn-primary inline-flex items-center gap-2 shadow-xl shadow-slate-200/50 hover:shadow-xl shadow-slate-200/50 transition-all py-3 px-5 rounded-2xl">
                        <Plus size={18} /> <span>Add Member</span>
                    </Link>
                </div>
            </div>

            {/* Bulk Deletion Modal */}
            {showBulkConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 p-8 sm:p-12 max-w-lg w-full relative overflow-hidden">
                        <button 
                            onClick={() => setShowBulkConfirm(false)}
                            className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition-colors z-50 p-2"
                            title="Close"
                        >
                            <X size={24} />
                        </button>
                        <div className="absolute top-0 right-0 p-8 opacity-5 text-red-600">
                             <ShieldAlert size={120} />
                        </div>
                        <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mb-8 shadow-inner">
                            <AlertTriangle size={36} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Danger Zone</h2>
                        <p className="text-slate-500 font-bold leading-relaxed mb-8">
                            You are about to permanently delete <span className="text-red-600">{members.length} members</span>. This will remove all their data and login access. This action <span className="underline decoration-red-200 decoration-4 underline-offset-4">cannot be undone</span>.
                        </p>
                        
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Type 'DELETE ALL' to verify</label>
                                <input 
                                    type="text" 
                                    value={bulkConfirmText}
                                    onChange={(e) => setBulkConfirmText(e.target.value)}
                                    placeholder="Confirm here..."
                                    className="input-field w-full py-4 px-6 bg-slate-50 border-slate-200 focus:border-red-500 rounded-2xl font-black text-red-600 text-center tracking-widest uppercase transition-all"
                                />
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                <button 
                                    onClick={() => { setShowBulkConfirm(false); setBulkConfirmText(""); }}
                                    className="btn-secondary flex-1 py-4 font-bold rounded-2xl hover:bg-slate-50"
                                    disabled={isDeleting}
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleBulkDelete}
                                    className="bg-red-600 text-white font-black flex-1 py-4 rounded-2xl shadow-lg shadow-red-100 hover:shadow-red-200 hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                                    disabled={isDeleting || bulkConfirmText !== "DELETE ALL"}
                                >
                                    {isDeleting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 size={20} />}
                                    {isDeleting ? "Processing..." : "Destroy Records"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="card p-4! bg-white border border-slate-200 shadow-sm rounded-xl">
                <div className="flex flex-col sm:flex-row gap-4 justify-end">
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

            <div className="card p-0 overflow-hidden border border-slate-200 shadow-sm bg-white rounded-xl">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-8">
                            <TableSkeleton rows={8} />
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
                                    <tr key={m.id || m.uid} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="table-cell pl-6 py-4">
                                            <div className="flex items-center gap-4">
                                                {m.photoURL ? (
                                                    <img src={m.photoURL} alt="" className="w-10 h-10 rounded-xl object-cover shadow-sm border border-slate-200/60" />
                                                ) : (
                                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-[#000080] font-bold border border-slate-200 shadow-sm">
                                                        {m.name?.[0]}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="font-bold text-slate-800 tracking-tight">{m.name} {m.surname}</span>
                                                        <span className="font-mono text-[10px] uppercase font-bold text-[#000080] bg-slate-50 px-2 py-0.5 rounded border border-slate-200">{m.memberId}</span>
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
                                                {m.paymentStatus || 'none'}
                                            </span>
                                        </td>
                                        <td className="table-cell py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide border shadow-sm ${m.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${m.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`}></div>
                                                {m.status || 'unknown'}
                                            </span>
                                        </td>
                                        <td className="table-cell pr-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link to={`/admin/members/${m.id || m.uid}`}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-slate-200 text-slate-500 hover:text-[#000080] hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm"
                                                    title="View Profile">
                                                    <Eye size={16} />
                                                </Link>
                                                {m.status === "active" ? (
                                                    <button onClick={() => toggleBlock(m)}
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm"
                                                        title="Block Member">
                                                        <UserX size={16} />
                                                    </button>
                                                ) : (
                                                    <button onClick={() => toggleBlock(m)}
                                                        className="h-8 px-3 rounded-lg flex items-center justify-center bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm font-bold text-[10px] uppercase tracking-wider"
                                                        title="Unblock Member">
                                                        <UserCheck size={14} className="mr-1" /> Unblock
                                                    </button>
                                                )}
                                                <button onClick={() => handleDelete(m.id || m.uid, m.name)}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm"
                                                    title="Delete Permanently">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-400">
                                                <span className="text-4xl mb-3 opacity-30">👥</span>
                                                <p className="font-bold text-slate-600 mb-1">No members found</p>
                                                <p className="text-sm font-medium">Try adjusting your filters.</p>
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
