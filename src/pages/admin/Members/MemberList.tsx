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
            const docId = member.id || member.uid;
            if (!docId) throw new Error("Member ID missing");
            const memberRef = doc(db, "users", docId);
            
            const updatePayload: any = { status: newStatus };
            let actionText = newStatus === "active" ? "unblocked" : "blocked";

            if (member.status === "pending" && newStatus === "active") {
                const year = new Date().getFullYear();
                const num = Math.floor(Math.random() * 900) + 100;
                updatePayload.memberId = `BCTA-${year}-${num}`;
                actionText = "approved";
            }

            await updateDoc(memberRef, updatePayload);
            if (newStatus === "blocked") {
                await membersApi.revokeTokens(docId);
            }
            toast.success(`Member ${actionText} successfully`);
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
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-2">
                <div className="relative">
                    <div className="absolute -left-4 top-0 w-1 bg-indigo-600 h-full rounded-full opacity-0 md:opacity-100" />
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-2">
                        Members <span className="text-indigo-600">Directory</span>
                    </h1>
                    <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                            {members.slice(0, 3).map((m, i) => (
                                <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 overflow-hidden">
                                     {m.photoURL ? <img src={m.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-400">{m.name?.[0]}</div>}
                                </div>
                            ))}
                        </div>
                        <p className="text-slate-500 font-semibold text-sm tracking-tight">
                            Showing <span className="text-slate-900">{filtered.length}</span> of <span className="text-slate-900">{members.length}</span> records
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowBulkConfirm(true)} 
                        className="group h-12 px-5 rounded-2xl glass-card border border-red-200/50 text-red-600 hover:bg-red-50 transition-all flex items-center gap-2 shadow-sm font-bold text-sm"
                    >
                         <Trash2 size={18} className="transition-transform group-hover:scale-110" /> 
                         <span className="hidden sm:inline">Bulk Cleanup</span>
                    </button>
                    <Link to="/admin/members/add" className="h-12 px-6 rounded-2xl bg-indigo-600 text-white font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95">
                        <Plus size={20} strokeWidth={2.5} /> 
                        <span>Add Member</span>
                    </Link>
                </div>
            </div>

            {/* Bulk Deletion Modal */}
            {showBulkConfirm && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto pt-8 sm:pt-20">
                    <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-slate-200 p-6 sm:p-12 max-w-lg w-full relative">
                        <button 
                            onClick={() => setShowBulkConfirm(false)}
                            className="absolute top-4 sm:top-8 right-4 sm:right-8 text-slate-400 hover:text-slate-600 transition-colors z-50 p-2"
                            title="Close"
                        >
                            <X size={20} className="sm:w-6 sm:h-6" />
                        </button>
                        <div className="absolute top-0 right-0 p-4 sm:p-8 opacity-5 text-red-600">
                             <ShieldAlert size={80} className="sm:w-[120px] sm:h-[120px]" />
                        </div>
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mb-6 sm:mb-8 shadow-inner">
                            <AlertTriangle size={28} className="sm:w-9 sm:h-9" />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3 sm:mb-4 tracking-tight">Danger Zone</h2>
                        <p className="text-sm sm:text-base text-slate-500 font-bold leading-relaxed mb-6 sm:mb-8">
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

            <div className="glass-card rounded-2xl sm:rounded-3xl border border-white/40 p-3.5 sm:p-4 premium-shadow"
              style={{ background: "rgba(255, 255, 255, 0.6)" }}
            >
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="flex items-center gap-2 text-slate-400">
                        <Filter size={16} />
                        <span className="text-[11px] font-black uppercase tracking-widest">Filter Results</span>
                    </div>
                    <div className="flex gap-3 sm:w-auto w-full">
                        <div className="relative flex-1 sm:w-44">
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                                className="w-full h-11 pl-4 pr-10 appearance-none bg-white/80 border border-slate-200 rounded-2xl font-bold text-slate-700 cursor-pointer shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm">
                                <option value="all">All Status</option>
                                <option value="active">Active Members</option>
                                <option value="blocked">Blocked Members</option>
                                <option value="pending">Pending Approval</option>
                            </select>
                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none border-l pl-2 border-slate-200">
                                <Filter size={14} />
                            </div>
                        </div>
                        <div className="relative flex-1 sm:w-44">
                            <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}
                                className="w-full h-11 pl-4 pr-10 appearance-none bg-white/80 border border-slate-200 rounded-2xl font-bold text-slate-700 cursor-pointer shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm">
                                <option value="all">All Payments</option>
                                <option value="paid">Fully Paid</option>
                                <option value="unpaid">Unpaid</option>
                                <option value="partial">Partial Payment</option>
                            </select>
                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none border-l pl-2 border-slate-200">
                                <Filter size={14} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-card rounded-4xl border border-white/40 overflow-hidden premium-shadow"
              style={{ background: "rgba(255, 255, 255, 0.7)" }}
            >
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-8">
                            <TableSkeleton rows={8} />
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse block md:table">
                            <thead className="hidden md:table-header-group">
                                <tr className="bg-slate-50/50 border-b border-white/40">
                                    <th className="table-header pl-10 py-5 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Member Information</th>
                                    <th className="table-header py-5 hidden md:table-cell font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Medical</th>
                                    <th className="table-header py-5 hidden lg:table-cell font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Activity</th>
                                    <th className="table-header py-5 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Finances</th>
                                    <th className="table-header py-5 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Standing</th>
                                    <th className="table-header pr-10 py-5 text-right font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] w-24">Management</th>
                                </tr>
                            </thead>
                            <tbody className="block md:table-row-group md:divide-y md:divide-slate-100 space-y-4 md:space-y-0 p-4 md:p-0">
                                {filtered.map(m => (
                                    <tr key={m.id || m.uid} className="block md:table-row bg-white/40 hover:bg-white/80 border-b border-slate-100/50 md:border-0 rounded-2xl md:rounded-none p-3.5 md:p-0 transition-all duration-300 group hover:shadow-xl hover:shadow-indigo-500/5 relative">
                                        <td className="block md:table-cell pl-0 md:pl-10 py-2 md:py-6 border-b border-slate-100 border-dashed md:border-0 mb-4 md:mb-0">
                                            <div className="flex items-center gap-5">
                                                <div className="relative group/avatar">
                                                    {m.photoURL ? (
                                                        <img src={m.photoURL} alt="" className="w-14 h-14 md:w-12 md:h-12 rounded-2xl object-cover shadow-md border border-white group-hover/avatar:scale-105 transition-transform duration-500" />
                                                    ) : (
                                                        <div className="w-14 h-14 md:w-12 md:h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black border border-indigo-100 shadow-inner text-xl md:text-lg">
                                                            {m.name?.[0]}
                                                        </div>
                                                    )}
                                                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${m.status === "active" ? "bg-emerald-500" : m.status === "pending" ? "bg-amber-500" : "bg-slate-400"}`} />
                                                </div>
                                                <div>
                                                    <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-3 mb-1">
                                                        <span className="font-black text-slate-900 tracking-tight text-lg md:text-[15px]">{m.name} {m.surname}</span>
                                                        <span className="font-mono text-[9px] uppercase font-black text-indigo-600 bg-indigo-50/50 px-2 py-0.5 rounded-lg self-start md:self-auto border border-indigo-100/30 tracking-tighter shadow-sm">{m.memberId || "NEW REG"}</span>
                                                    </div>
                                                    <p className="text-xs font-semibold text-slate-400 tracking-wide">{m.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="block md:table-cell py-1.5 md:py-6">
                                            <div className="flex justify-between md:block items-center">
                                                <span className="md:hidden text-[10px] text-slate-400 font-black uppercase tracking-widest">Medical</span>
                                                <span className="bg-red-50/50 text-red-600 border border-red-100/50 text-[10px] font-black px-3 py-1.5 rounded-xl inline-flex items-center gap-1 shadow-sm">
                                                    <div className="w-1 h-1 rounded-full bg-red-500" />
                                                    {m.bloodGroup || "N/A"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="block md:table-cell py-1.5 md:py-6 lg:hidden">
                                            <div className="flex justify-between lg:block items-center">
                                                <span className="lg:hidden text-[10px] text-slate-400 font-black uppercase tracking-widest">Activity</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[15px] font-black text-slate-900">{m.attendanceCount || 0}</span>
                                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Meets</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="block md:table-cell py-1.5 md:py-6">
                                            <div className="flex justify-between md:block items-center">
                                                <span className="md:hidden text-[10px] text-slate-400 font-black uppercase tracking-widest">Finances</span>
                                                <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${m.paymentStatus === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200/50" : m.paymentStatus === "partial" ? "bg-amber-50 text-amber-700 border-amber-200/50" : "bg-red-50 text-red-700 border-red-200/50"}`}>
                                                    {m.paymentStatus || 'none'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="block md:table-cell py-1.5 md:py-6">
                                            <div className="flex justify-between md:block items-center">
                                                <span className="md:hidden text-[10px] text-slate-400 font-black uppercase tracking-widest">Standing</span>
                                                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${m.status === "active" ? "bg-indigo-50 text-indigo-700 border-indigo-200/50" : m.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200/50" : "bg-slate-50 text-slate-600 border-slate-200/50"}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${m.status === "active" ? "bg-indigo-500 animate-pulse" : m.status === "pending" ? "bg-amber-500" : "bg-slate-400"}`}></div>
                                                    {m.status || 'unknown'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="block md:table-cell pr-0 md:pr-10 py-4 md:py-6 text-left md:text-right mt-4 md:mt-0 pt-4 md:pt-6 border-t border-slate-100/50 md:border-0 md:bg-transparent -mx-4 px-4 md:mx-0 md:px-0">
                                            <div className="flex flex-wrap md:flex-nowrap items-center justify-start md:justify-end gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link to={`/admin/members/${m.id || m.uid}`}
                                                    className="h-10 md:h-8 px-4 md:w-8 md:px-0 rounded-xl md:rounded-lg flex-1 md:flex-none flex items-center justify-center bg-white border border-slate-200 text-slate-600 md:text-slate-500 hover:text-[#4f46e5] hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm font-bold text-xs md:font-normal"
                                                    title="View Profile">
                                                    <Eye size={16} className="md:mr-0 mr-1.5" /> <span className="md:hidden">View</span>
                                                </Link>
                                                {m.status === "pending" ? (
                                                    <button onClick={() => toggleBlock(m)}
                                                        className="h-10 md:h-8 px-4 md:px-3 rounded-xl md:rounded-lg flex-1 md:flex-none flex items-center justify-center bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm font-bold text-xs md:text-[10px] uppercase tracking-wider"
                                                        title="Approve Member">
                                                        <UserCheck size={16} className="mr-1.5 md:w-3.5 md:h-3.5 md:mr-1" /> Approve
                                                    </button>
                                                ) : m.status === "active" ? (
                                                    <button onClick={() => toggleBlock(m)}
                                                        className="h-10 md:h-8 px-4 md:w-8 md:px-0 rounded-xl md:rounded-lg flex items-center justify-center bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm font-bold text-xs"
                                                        title="Block Member">
                                                        <UserX size={16} className="md:mr-0 mr-1.5" /> <span className="md:hidden">Block</span>
                                                    </button>
                                                ) : (
                                                    <button onClick={() => toggleBlock(m)}
                                                        className="h-10 md:h-8 px-4 md:px-3 rounded-xl md:rounded-lg flex-1 md:flex-none flex items-center justify-center bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm font-bold text-xs md:text-[10px] uppercase tracking-wider"
                                                        title="Unblock Member">
                                                        <UserCheck size={16} className="mr-1.5 md:w-3.5 md:h-3.5 md:mr-1" /> Unblock
                                                    </button>
                                                )}
                                                <button onClick={() => handleDelete(m.id || m.uid, m.name)}
                                                    className="w-10 h-10 md:w-8 md:h-8 rounded-xl md:rounded-lg flex items-center justify-center bg-white border border-slate-200 text-red-500 md:text-slate-400 hover:text-red-700 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm"
                                                    title="Delete Permanently">
                                                    <Trash2 size={18} className="md:w-4 md:h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr className="block md:table-row">
                                        <td colSpan={6} className="block md:table-cell py-16 text-center border border-slate-200 md:border-0 rounded-2xl md:rounded-none shadow-sm md:shadow-none mx-4 md:mx-0 my-4 md:my-0">
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
