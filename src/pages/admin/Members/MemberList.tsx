import React, { useEffect, useState, useCallback } from "react";
import { Plus, Eye, UserX, UserCheck, Filter, Trash2, AlertTriangle, ShieldAlert, X, Loader2 } from "lucide-react";
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
    // Track which member is currently being toggled (prevents double-clicks)
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [paymentFilter, setPaymentFilter] = useState<string>("all");

    // Lock ALL scroll when modal is open
    useEffect(() => {
        if (!showBulkConfirm) return;

        const preventDefault = (e: Event) => e.preventDefault();

        // Block mouse wheel
        window.addEventListener("wheel", preventDefault, { passive: false });
        // Block touch scroll (mobile)
        window.addEventListener("touchmove", preventDefault, { passive: false });
        // Block keyboard scroll (arrow keys, space, page up/down)
        const blockKeys = (e: KeyboardEvent) => {
            const keys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Space", " "];
            if (keys.includes(e.key)) e.preventDefault();
        };
        window.addEventListener("keydown", blockKeys);

        // Also lock body/html as fallback
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";

        return () => {
            window.removeEventListener("wheel", preventDefault);
            window.removeEventListener("touchmove", preventDefault);
            window.removeEventListener("keydown", blockKeys);
            document.body.style.overflow = "";
            document.documentElement.style.overflow = "";
        };
    }, [showBulkConfirm]);

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

    /** Optimistically update a member in local state without re-fetching */
    const updateMemberLocally = useCallback((docId: string, updates: Partial<MemberDoc>) => {
        setMembers(prev => prev.map(m => (m.id === docId || m.uid === docId) ? { ...m, ...updates } : m));
    }, []);

    const toggleBlock = async (member: MemberDoc) => {
        const docId = member.id || member.uid;
        if (!docId) { toast.error("Member ID missing"); return; }

        // Prevent double-clicks
        if (togglingId === docId) return;
        setTogglingId(docId);

        const previousStatus = member.status;
        const newStatus = previousStatus === "active" ? "blocked" : "active";

        const updatePayload: any = { status: newStatus };
        let actionText = newStatus === "active" ? "unblocked" : "blocked";

        if (previousStatus === "pending" && newStatus === "active") {
            const year = new Date().getFullYear();
            const num = Math.floor(Math.random() * 900) + 100;
            updatePayload.memberId = `BCTA-${year}-${num}`;
            actionText = "approved";
        }

        // 1) Optimistic UI update — instant feedback
        updateMemberLocally(docId, updatePayload);
        toast.success(`Member ${actionText} successfully`);

        // 2) Persist to Firestore in background
        try {
            const memberRef = doc(db, "users", docId);
            await updateDoc(memberRef, updatePayload);

            // Fire token revocation in background (don't block UI)
            if (newStatus === "blocked") {
                membersApi.revokeTokens(docId).catch(err =>
                    console.warn("Token revocation failed (non-critical):", err)
                );
            }
        } catch (err) {
            // Rollback on failure
            console.error("Block/Unblock failed:", err);
            updateMemberLocally(docId, { status: previousStatus });
            toast.error("Failed to update status on server. Reverted.");
        } finally {
            setTogglingId(null);
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
        <>
            {/* Bulk Deletion Modal */}
            {showBulkConfirm && (
                <div className="fixed inset-0 z-[100] backdrop-blur-md animate-fade-in">
                    <div className="absolute inset-0 flex items-start justify-center p-4 pt-8 sm:pt-12">
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
                </div>
            )}

        <div className={`space-y-6 animate-fade-in pb-8 ${showBulkConfirm ? 'blur-sm' : ''}`}>
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
            <div className="space-y-4">
                {loading ? (
                    <div className="p-8">
                        <TableSkeleton rows={8} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="glass-card text-center py-20 rounded-3xl border border-dashed border-slate-300 flex flex-col items-center justify-center gap-4">
                        <span className="text-6xl opacity-20">👥</span>
                        <p className="font-bold text-slate-600 mb-1">No members found</p>
                        <p className="text-sm font-medium text-slate-400">Try adjusting your filters.</p>
                    </div>
                ) : (
                    filtered.map(m => (
                        <div key={m.id || m.uid} className="glass-card bg-white/60 hover:bg-white/90 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl border border-white/40 group">
                            <div className="flex flex-col md:flex-row md:items-center gap-6">
                                {/* Avatar and Basic Info */}
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="relative shrink-0">
                                        {m.photoURL ? (
                                            <img src={m.photoURL} alt="" className="w-16 h-16 rounded-2xl object-cover shadow-md border-2 border-white" />
                                        ) : (
                                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black border-2 border-indigo-100 shadow-inner text-2xl">
                                                {m.name?.[0]}
                                            </div>
                                        )}
                                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white shadow-sm ${m.status === "active" ? "bg-emerald-500" : m.status === "pending" ? "bg-amber-500" : "bg-slate-400"}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-slate-900 text-lg tracking-tight truncate">{m.name} {m.surname}</h3>
                                        <p className="text-xs text-slate-400 font-semibold truncate">{m.email}</p>
                                        <span className="inline-block mt-1 font-mono text-[9px] uppercase font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 shadow-sm">{m.memberId || "NEW REG"}</span>
                                    </div>
                                </div>

                                {/* Info Badges */}
                                <div className="flex flex-wrap md:flex-nowrap gap-3 md:gap-4">
                                    <div className="bg-red-50/50 rounded-xl px-4 py-2 border border-red-100/50 text-center">
                                        <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">Blood</p>
                                        <p className="text-sm font-black text-red-600 flex items-center justify-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                            {m.bloodGroup || "N/A"}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl px-4 py-2 border border-slate-100 text-center">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Meetings</p>
                                        <p className="text-sm font-black text-slate-900">{m.attendanceCount || 0}</p>
                                    </div>
                                    <div className={`rounded-xl px-4 py-2 border text-center ${m.paymentStatus === "paid" ? "bg-emerald-50 border-emerald-100" : m.paymentStatus === "partial" ? "bg-amber-50 border-amber-100" : "bg-red-50 border-red-100"}`}>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Payment</p>
                                        <p className={`text-sm font-black uppercase ${m.paymentStatus === "paid" ? "text-emerald-700" : m.paymentStatus === "partial" ? "text-amber-700" : "text-red-700"}`}>
                                            {m.paymentStatus || 'none'}
                                        </p>
                                    </div>
                                    <div className={`rounded-xl px-4 py-2 border text-center ${m.status === "active" ? "bg-indigo-50 border-indigo-100" : m.status === "pending" ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-100"}`}>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                                        <p className={`text-sm font-black uppercase flex items-center justify-center gap-1.5 ${m.status === "active" ? "text-indigo-700" : m.status === "pending" ? "text-amber-700" : "text-slate-600"}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${m.status === "active" ? "bg-indigo-500 animate-pulse" : m.status === "pending" ? "bg-amber-500" : "bg-slate-400"}`}></div>
                                            {m.status || 'unknown'}
                                        </p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                {(() => {
                                    const memberId = m.id || m.uid;
                                    const isToggling = togglingId === memberId;
                                    return (
                                <div className="flex gap-2 md:shrink-0">
                                    <Link to={`/admin/members/${memberId}`}
                                        className="flex-1 md:w-auto h-10 px-4 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 rounded-xl transition-all shadow-sm font-bold text-xs"
                                        title="View Profile">
                                        <Eye size={16} className="mr-1.5" /> View
                                    </Link>
                                    {m.status === "pending" ? (
                                        <button onClick={() => toggleBlock(m)}
                                            disabled={isToggling}
                                            className={`flex-1 md:w-auto h-10 px-4 flex items-center justify-center rounded-xl transition-all shadow-sm font-bold text-xs uppercase tracking-wider ${isToggling ? "bg-indigo-400 cursor-not-allowed opacity-70" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
                                            title="Approve Member">
                                            {isToggling ? <Loader2 size={16} className="mr-1.5 animate-spin" /> : <UserCheck size={16} className="mr-1.5" />}
                                            {isToggling ? "Processing..." : "Approve"}
                                        </button>
                                    ) : m.status === "active" ? (
                                        <button onClick={() => toggleBlock(m)}
                                            disabled={isToggling}
                                            className={`flex-1 md:w-auto h-10 px-4 flex items-center justify-center rounded-xl transition-all shadow-sm font-bold text-xs ${isToggling ? "bg-slate-100 cursor-not-allowed opacity-70 border border-slate-200" : "bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50"}`}
                                            title="Block Member">
                                            {isToggling ? <Loader2 size={16} className="mr-1.5 animate-spin" /> : <UserX size={16} className="mr-1.5" />}
                                            {isToggling ? "Blocking..." : "Block"}
                                        </button>
                                    ) : (
                                        <button onClick={() => toggleBlock(m)}
                                            disabled={isToggling}
                                            className={`flex-1 md:w-auto h-10 px-4 flex items-center justify-center rounded-xl transition-all shadow-sm font-bold text-xs uppercase tracking-wider ${isToggling ? "bg-emerald-400 cursor-not-allowed opacity-70" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                                            title="Unblock Member">
                                            {isToggling ? <Loader2 size={16} className="mr-1.5 animate-spin" /> : <UserCheck size={16} className="mr-1.5" />}
                                            {isToggling ? "Unblocking..." : "Unblock"}
                                        </button>
                                    )}
                                    <button onClick={() => handleDelete(m.id || m.uid, m.name)}
                                        className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 text-red-500 hover:text-red-700 hover:border-red-200 hover:bg-red-50 rounded-xl transition-all shadow-sm"
                                        title="Delete Permanently">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                    );
                                })()}
                            </div>
                        </div>
                    ))
                )}
            </div>
            </div>
        </div>
        </>
    );
};

export default MemberList;