
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation, Trans } from "react-i18next";
import { Plus, Eye, UserX, UserCheck, Filter, Trash2, AlertTriangle, ShieldAlert, X, Loader2, Search, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { collection, query, where, doc, updateDoc, Timestamp, DocumentData, onSnapshot } from "firebase/firestore";
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

const MODAL_HEIGHT = 320; // approximate delete confirm modal height
const MODAL_MARGIN = 16;

const MemberList: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [members, setMembers] = useState<MemberDoc[]>([]);
    const [filtered, setFiltered] = useState<MemberDoc[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [showBulkConfirm, setShowBulkConfirm] = useState<boolean>(false);
    const [bulkConfirmText, setBulkConfirmText] = useState<string>("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
    const [memberToDelete, setMemberToDelete] = useState<{ id: string; name: string } | null>(null);
    const [deleteModalPosition, setDeleteModalPosition] = useState<{ top: number } | null>(null);
    // Track which member is currently being toggled (prevents double-clicks)
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [deletingProgress, setDeletingProgress] = useState<string>("");

    const deleteModalRef = useRef<HTMLDivElement>(null);

    const [searchTerm, setSearchTerm] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [paymentFilter, setPaymentFilter] = useState<string>("all");

    // Lock ALL scroll when modal is open
    useEffect(() => {
        if (!showBulkConfirm && !showDeleteConfirm) return;

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
    }, [showBulkConfirm, showDeleteConfirm]);

    useEffect(() => {
        setLoading(true);
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        let userDocs: MemberDoc[] = [];
        let paidMemberIds = new Set<string>();
        let hasUsersSnapshot = false;
        let hasPaymentsSnapshot = false;
        let hydrateTimer: ReturnType<typeof setTimeout> | null = null;

        const hydrateMembers = () => {
            if (!hasUsersSnapshot || !hasPaymentsSnapshot) return;

            // Debounce: if both snapshots arrive nearly simultaneously, only run once
            if (hydrateTimer) clearTimeout(hydrateTimer);
            hydrateTimer = setTimeout(() => {

            const merged = userDocs.map((member) => {
                const docId = member.id || member.uid;
                return {
                    ...member,
                    paymentStatus: docId && paidMemberIds.has(docId) ? "paid" : "unpaid",
                } as MemberDoc;
            });

            merged.sort((a, b) => {
                const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : new Date(a.createdAt as any || 0);
                const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : new Date(b.createdAt as any || 0);
                return dateB.getTime() - dateA.getTime();
            });

            setMembers(merged);
            setLoading(false);
        }, 50); // 50ms debounce
        };

        const usersUnsub = onSnapshot(
            query(collection(db, "users"), where("role", "==", "member")),
            (snap) => {
                hasUsersSnapshot = true;
                userDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MemberDoc));
                hydrateMembers();
            },
            (err) => {
                console.error("❌ Users listener error [MemberList]:", err);
                toast.error(t("memberList.updateFailed"));
                setLoading(false);
            }
        );

        const paymentsUnsub = onSnapshot(
            query(
                collection(db, "payments"),
                where("month", "==", currentMonth),
                where("year", "==", currentYear)
            ),
            (snap) => {
                hasPaymentsSnapshot = true;
                paidMemberIds = new Set(
                    snap.docs
                        .map((d) => String(d.data().memberUID || ""))
                        .filter(Boolean)
                );
                hydrateMembers();
            },
            (err) => {
                console.error("❌ Payments listener error [MemberList]:", err);
                toast.error(t("memberList.updateFailed"));
                setLoading(false);
            }
        );

        return () => {
            if (hydrateTimer) clearTimeout(hydrateTimer);
            usersUnsub();
            paymentsUnsub();
        };
    }, []);

    useEffect(() => {
        let result = [...members];
        const term = searchTerm.trim().toLowerCase();

        if (term) {
            result = result.filter(m => {
                const fullName = `${m.name || ""} ${m.surname || ""}`.trim().toLowerCase();
                const memberId = String(m.memberId || "").toLowerCase();
                const email = String(m.email || "").toLowerCase();
                const bloodGroup = String(m.bloodGroup || "").toLowerCase();
                const status = String(m.status || "").toLowerCase();
                return (
                    fullName.includes(term) ||
                    memberId.includes(term) ||
                    email.includes(term) ||
                    bloodGroup.includes(term) ||
                    status.includes(term)
                );
            });
        }

        if (statusFilter !== "all") result = result.filter(m => m.status === statusFilter);
        if (paymentFilter !== "all") result = result.filter(m => m.paymentStatus === paymentFilter);
        setFiltered(result);
    }, [searchTerm, statusFilter, paymentFilter, members, i18n.language]);

    const clearFilters = () => {
        setSearchTerm("");
        setStatusFilter("all");
        setPaymentFilter("all");
    };

    /** Optimistically update a member in local state without re-fetching */
    const updateMemberLocally = useCallback((docId: string, updates: Partial<MemberDoc>) => {
        setMembers(prev => prev.map(m => (m.id === docId || m.uid === docId) ? { ...m, ...updates } : m));
    }, []);

    const toggleBlock = async (member: MemberDoc) => {
        const docId = member.id || member.uid;
        if (!docId) { toast.error(t("memberList.memberIdMissing")); return; }

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
        const statusMap: Record<string, string> = {
            unblocked: t("memberList.memberUnblocked"),
            blocked: t("memberList.memberBlocked"),
            approved: t("memberList.memberApproved")
        };
        toast.success(statusMap[actionText] || t("memberList.memberApproved"));

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
            toast.error(t("memberList.updateFailed"));
        } finally {
            setTogglingId(null);
        }
    };

    const handleDelete = async (
        id: string | undefined,
        name: string | undefined,
        event: React.MouseEvent<HTMLButtonElement>
    ) => {
        if (!id) return;

        const buttonRect = event.currentTarget.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        // Center modal vertically on the clicked button
        let top = buttonRect.top + buttonRect.height / 2 - MODAL_HEIGHT / 2;

        // Clamp so modal never goes above or below viewport bounds
        top = Math.max(MODAL_MARGIN, Math.min(top, viewportHeight - MODAL_HEIGHT - MODAL_MARGIN));

        setDeleteModalPosition({ top });
        setMemberToDelete({ id, name: name || "Member" });
        setShowDeleteConfirm(true);
    };

    // After modal mounts, re-clamp based on actual rendered height
    useEffect(() => {
        if (!showDeleteConfirm || !deleteModalRef.current || !deleteModalPosition) return;

        const actualHeight = deleteModalRef.current.offsetHeight;
        const viewportHeight = window.innerHeight;

        let top = deleteModalPosition.top;
        top = Math.max(MODAL_MARGIN, Math.min(top, viewportHeight - actualHeight - MODAL_MARGIN));

        if (top !== deleteModalPosition.top) {
            setDeleteModalPosition({ top });
        }
    }, [showDeleteConfirm]);

    const confirmDelete = async () => {
        if (!memberToDelete) return;
        setShowDeleteConfirm(false);
        setDeleteModalPosition(null);

        try {
            await membersApi.delete(memberToDelete.id);
            toast.success(t("memberList.memberRemoved", { name: memberToDelete.name }));
        } catch (err: any) {
            toast.error(err.message || "Failed to delete member");
        } finally {
            setMemberToDelete(null);
        }
    };

    const handleBulkDelete = async () => {
        const text = bulkConfirmText.trim().toUpperCase();
        if (text !== "DELETE ALL" && text !== "DELETE") {
            toast.error(t("memberList.dangerZone.typeExactly"));
            return;
        }

        try {
            setIsDeleting(true);
            setDeletingProgress(t("memberList.processing") || "Processing...");
            
            // Note: membersApi.deleteAll fetches all members and calls bulkDelete in chunks
            const result = await membersApi.deleteAll();
            
            toast.success(t("memberList.dangerZone.cleanupComplete"));
            setShowBulkConfirm(false);
            setBulkConfirmText("");
        } catch (err: any) {
            console.error("[MemberList] Bulk deletion error:", err);
            toast.error(err.message || "Bulk deletion failed");
            setShowBulkConfirm(false);
            setBulkConfirmText("");
        } finally {
            setIsDeleting(false);
            setDeletingProgress("");
        }
    };

    return (
        <>
            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && memberToDelete && deleteModalPosition && (
                <div
                    className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-lg animate-fade-in"
                    onClick={() => {
                        setShowDeleteConfirm(false);
                        setMemberToDelete(null);
                        setDeleteModalPosition(null);
                    }}
                >
                    <div
                        ref={deleteModalRef}
                        className="fixed bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-scale-up mx-4"
                        style={{
                            top: `${deleteModalPosition.top}px`,
                            left: "50%",
                            transform: "translateX(-50%)",
                            maxHeight: `calc(100vh - ${MODAL_MARGIN * 2}px)`,
                            overflowY: "auto",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100">
                            <AlertTriangle className="text-red-600" size={32} />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 text-center mb-3">
                            {t("memberList.removePermanently", { name: memberToDelete.name })}
                        </h2>
                        <p className="text-sm text-slate-600 text-center mb-6">
                            {t("memberDetail.deleteWarning") || "This action cannot be undone. All member data will be permanently removed."}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setMemberToDelete(null);
                                }}
                                className="flex-1 px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                            >
                                {t("common.cancel") || "Cancel"}
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                            >
                                {t("common.delete") || "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Deletion Modal */}
            {showBulkConfirm && (
                <div className="fixed inset-0 z-100 backdrop-blur-md animate-fade-in">
                    <div className="absolute inset-0 flex items-start justify-center p-4 pt-8 sm:pt-12">
                        <div className="bg-white rounded-4xl shadow-2xl border border-slate-200 p-6 sm:p-12 max-w-lg w-full relative">
                        <button
                            onClick={() => setShowBulkConfirm(false)}
                            className="absolute top-4 sm:top-8 right-4 sm:right-8 text-slate-400 hover:text-slate-600 transition-colors z-50 p-2"
                            title={t("common.close")}
                        >
                            <X size={20} className="sm:w-6 sm:h-6" />
                        </button>
                        <div className="absolute top-0 right-0 p-4 sm:p-8 opacity-5 text-red-600">
                             <ShieldAlert size={80} className="sm:w-[120px] sm:h-[120px]" />
                        </div>
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mb-6 sm:mb-8 shadow-inner">
                            <AlertTriangle size={28} className="sm:w-9 sm:h-9" />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3 sm:mb-4 tracking-tight">{t("memberList.dangerZone.title")}</h2>
                        <p className="text-sm sm:text-base text-slate-500 font-bold leading-relaxed mb-6 sm:mb-8">
                            <Trans i18nKey="memberList.dangerZone.bulkDesc" values={{ count: members.length }}>
                                You are about to permanently delete <span className="text-red-600">{members.length} members</span>. This will remove all their data and login access. This action <span className="underline decoration-red-200 decoration-4 underline-offset-4">cannot be undone</span>.
                            </Trans>
                        </p>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{t("memberList.dangerZone.verifyLabel")}</label>
                                <input
                                    type="text"
                                    value={bulkConfirmText}
                                    onChange={(e) => setBulkConfirmText(e.target.value)}
                                    placeholder={t("memberList.dangerZone.placeholder")}
                                    className="input-field w-full py-4 px-6 bg-slate-50 border-slate-200 focus:border-red-500 rounded-2xl font-black text-red-600 text-center tracking-widest uppercase transition-all"
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                <button
                                    onClick={() => { setShowBulkConfirm(false); setBulkConfirmText(""); }}
                                    className="btn-secondary flex-1 py-4 font-bold rounded-2xl hover:bg-slate-50"
                                    disabled={isDeleting}
                                >
                                    {t("common.cancel")}
                                </button>
                                <button
                                    onClick={handleBulkDelete}
                                    className="bg-red-600 text-white font-black flex-1 py-4 rounded-2xl shadow-lg shadow-red-100 hover:shadow-red-200 hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                    disabled={isDeleting || (bulkConfirmText.trim().toUpperCase() !== "DELETE ALL" && bulkConfirmText.trim().toUpperCase() !== "DELETE")}
                                >
                                    {isDeleting ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                                    {isDeleting ? (deletingProgress || t("memberList.processing")) : t("memberList.dangerZone.destroy")}
                                </button>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            )}

        <div className={`space-y-6 animate-fade-in pb-8 ${showBulkConfirm ? 'blur-sm' : ''}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end justify-between mb-2">
                <div className="relative">
                    <div className="absolute -left-4 top-0 w-1 bg-indigo-600 h-full rounded-full opacity-0 md:opacity-100" />
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-2">
                        {t("memberList.title")} <span className="text-indigo-600">{t("memberList.directory")}</span>
                    </h1>
                </div>
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap lg:w-auto lg:items-center">
                    <button
                        onClick={() => setShowBulkConfirm(true)}
                        className="group h-12 w-full justify-center px-5 rounded-2xl glass-card border border-red-200/50 text-red-600 hover:bg-red-50 transition-all flex items-center gap-2 shadow-sm font-bold text-sm sm:w-auto"
                    >
                         <Trash2 size={18} className="transition-transform group-hover:scale-110" />
                        <span>{t("memberList.bulkCleanup")}</span>
                    </button>
                    <Link to="/admin/members/add" className="h-12 w-full justify-center px-6 rounded-2xl bg-indigo-600 text-white font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95 sm:w-auto">
                        <Plus size={20} strokeWidth={2.5} />
                        <span>{t("memberList.addMember")}</span>
                    </Link>
                </div>
            </div>

            <div className="glass-card rounded-2xl sm:rounded-3xl border border-white/15 p-3.5 sm:p-4"
                style={{ background: "rgba(255, 255, 255, 0.18)" }}
            >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex items-center gap-2 text-slate-400">
                        <Filter size={16} />
                        <span className="text-[11px] font-black uppercase tracking-widest">{t("memberList.filterResults")}</span>
                    </div>
                    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,11rem)_minmax(0,11rem)_auto] xl:items-center">
                        <div className="relative min-w-0">
                            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={t("memberList.searchPlaceholder")}
                                className="w-full h-11 pl-10 pr-10 bg-white/40 border border-slate-200/60 rounded-2xl font-semibold text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                            />
                            {searchTerm ? (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    aria-label={t("common.clear")}
                                    title={t("common.clear")}
                                >
                                    <X size={14} />
                                </button>
                            ) : null}
                        </div>
                        <div className="relative min-w-0">
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                                className="w-full h-11 pl-4 pr-10 appearance-none bg-white/35 border border-slate-200/50 rounded-2xl font-bold text-slate-700 cursor-pointer focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm">
                                <option value="all">{t("memberList.allStatus")}</option>
                                <option value="active">{t("memberList.activeMembers")}</option>
                                <option value="blocked">{t("memberList.blockedMembers")}</option>
                                <option value="pending">{t("memberList.pendingApproval")}</option>
                            </select>
                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none border-l pl-2 border-slate-200">
                                <Filter size={14} />
                            </div>
                        </div>
                        <div className="relative min-w-0">
                            <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}
                                className="w-full h-11 pl-4 pr-10 appearance-none bg-white/35 border border-slate-200/50 rounded-2xl font-bold text-slate-700 cursor-pointer focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm">
                                <option value="all">{t("memberList.allPayments")}</option>
                                <option value="paid">{t("memberList.fullyPaid")}</option>
                                <option value="unpaid">{t("memberList.unpaid")}</option>
                                <option value="partial">{t("memberList.partialPayment")}</option>
                            </select>
                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none border-l pl-2 border-slate-200">
                                <Filter size={14} />
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="h-11 inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/60 bg-white/40 px-4 text-sm font-bold text-slate-600 shadow-sm transition-all hover:bg-white hover:text-indigo-600 hover:shadow-md active:scale-[0.98] sm:col-span-2 xl:col-span-1"
                            title={t("memberList.reset")}
                        >
                            <RotateCcw size={14} />
                            {t("memberList.reset")}
                        </button>
                    </div>
                </div>
            </div>

            <div className="rounded-4xl overflow-hidden">
            <div className="space-y-4">
                {loading ? (
                    <div className="p-8">
                        <TableSkeleton rows={8} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 px-4 rounded-3xl border border-dashed flex flex-col items-center justify-center gap-4">
                        <span className="text-6xl opacity-20">👥</span>
                        <p className="font-bold text-slate-600 mb-1">{t("memberList.noMembersFound")}</p>
                        <p className="text-sm font-medium text-slate-400">{t("memberList.adjustFilters")}</p>
                    </div>
                ) : (
                    filtered.map(m => (
                        <div key={m.id || m.uid} className="glass-card bg-white/35 hover:bg-white/45 rounded-2xl p-4 sm:p-5 lg:p-6 transition-all duration-300 border border-white/30 shadow-md hover:shadow-lg group">
                            <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:gap-6">
                                {/* Avatar and Basic Info */}
                                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                    <div className="relative shrink-0">
                                        {m.photoURL ? (
                                            <img src={m.photoURL} alt="" className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl object-cover shadow-md border-2 border-white" />
                                        ) : (
                                            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-indigo-50 rounded-xl sm:rounded-2xl flex items-center justify-center text-indigo-600 font-black border-2 border-indigo-100 shadow-inner text-xl sm:text-2xl">
                                                {m.name?.[0]}
                                            </div>
                                        )}
                                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white shadow-sm ${m.status === "active" ? "bg-emerald-500" : m.status === "pending" ? "bg-amber-500" : "bg-slate-400"}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-slate-900 text-base sm:text-lg tracking-tight truncate">{m.name} {m.surname}</h3>
                                        <p className="text-xs text-slate-500 font-semibold truncate">{m.email}</p>
                                        <span className="inline-block mt-1 font-mono text-[10px] uppercase font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 shadow-sm">{m.memberId || t("memberList.newReg")}</span>
                                    </div>
                                </div>

                                {/* Info Badges */}
                                <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:gap-3 lg:gap-4 w-full lg:w-auto">
                                    <div className="rounded-xl px-3 py-2.5 text-center sm:px-4 bg-white/80 border border-white/80 min-h-[64px] flex flex-col justify-center">
                                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{t("memberList.blood")}</p>
                                        <div className="text-base sm:text-sm font-black text-slate-800 flex items-center justify-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                            {m.bloodGroup || "N/A"}
                                        </div>
                                    </div>
                                    <div className="rounded-xl px-3 py-2.5 text-center sm:px-4 bg-white/80 border border-white/80 min-h-[64px] flex flex-col justify-center">
                                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{t("memberList.meetings")}</p>
                                        <p className="text-base sm:text-sm font-black text-slate-900">{m.attendanceCount || 0}</p>
                                    </div>
                                    <div className="rounded-xl px-3 py-2.5 text-center sm:px-4 bg-white/80 border border-white/80 min-h-[64px] flex flex-col justify-center">
                                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{t("memberList.payment")}</p>
                                        <p className={`text-base sm:text-sm font-black uppercase ${m.paymentStatus === "paid" ? "text-emerald-700" : m.paymentStatus === "partial" ? "text-amber-700" : "text-red-700"}`}>
                                            {t(`common.${m.paymentStatus || 'pending'}`)}
                                        </p>
                                    </div>
                                    <div className="rounded-xl px-3 py-2.5 text-center sm:px-4 bg-white/80 border border-white/80 min-h-[64px] flex flex-col justify-center">
                                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{t("memberList.status")}</p>
                                        <p className={`text-base sm:text-sm font-black uppercase flex items-center justify-center gap-1.5 ${m.status === "active" ? "text-indigo-700" : m.status === "pending" ? "text-amber-700" : "text-slate-600"}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${m.status === "active" ? "bg-indigo-500 animate-pulse" : m.status === "pending" ? "bg-amber-500" : "bg-slate-400"}`}></div>
                                            {t(`common.${m.status || 'pending'}`)}
                                        </p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                {(() => {
                                    const memberId = m.id || m.uid;
                                    const isToggling = togglingId === memberId;
                                    return (
                                <div className="w-full md:w-auto md:shrink-0 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg shadow-slate-200/60 transition-shadow hover:shadow-xl hover:shadow-slate-200/80">
                                    <div className="grid grid-cols-3 gap-2">
                                        <Link
                                            to={`/admin/members/${memberId}`}
                                            className="h-12 sm:h-10 min-w-0 px-1.5 sm:px-2 flex flex-col sm:flex-row items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 shadow-md shadow-slate-200/60 transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-lg hover:shadow-indigo-100 hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-lg active:shadow-slate-300/80 font-bold text-[11px] sm:text-xs leading-tight text-center"
                                            title={t("memberList.view")}
                                        >
                                            <Eye size={16} /> <span className="inline">{t("memberList.view")}</span>
                                        </Link>
                                        {m.status === "pending" ? (
                                            <button
                                                onClick={() => toggleBlock(m)}
                                                disabled={isToggling}
                                                className={`h-12 sm:h-10 min-w-0 px-1.5 sm:px-2 flex flex-col sm:flex-row items-center justify-center gap-1 rounded-xl border border-indigo-200 bg-white shadow-md shadow-indigo-100 transition-all font-bold text-[11px] sm:text-xs uppercase tracking-wider leading-tight text-center ${isToggling ? "cursor-not-allowed opacity-70" : "text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-lg hover:shadow-indigo-100 hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-lg active:shadow-indigo-200/70"}`}
                                                title={t("memberList.approve")}
                                            >
                                                {isToggling ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
                                                <span className="inline">{isToggling ? t("memberList.processing") : t("memberList.approve")}</span>
                                            </button>
                                        ) : m.status === "active" ? (
                                            <button
                                                onClick={() => toggleBlock(m)}
                                                disabled={isToggling}
                                                className={`h-12 sm:h-10 min-w-0 px-1.5 sm:px-2 flex flex-col sm:flex-row items-center justify-center gap-1 rounded-xl border border-red-200 bg-white shadow-md shadow-red-100 transition-all font-bold text-[11px] sm:text-xs leading-tight text-center ${isToggling ? "cursor-not-allowed opacity-70" : "text-slate-500 hover:bg-red-50 hover:text-red-600 hover:shadow-lg hover:shadow-red-100 hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-lg active:shadow-red-200/70"}`}
                                                title={t("memberList.block")}
                                            >
                                                {isToggling ? <Loader2 size={16} className="animate-spin" /> : <UserX size={16} />}
                                                <span className="inline">{isToggling ? t("memberList.blocking") : t("memberList.block")}</span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => toggleBlock(m)}
                                                disabled={isToggling}
                                                className={`h-12 sm:h-10 min-w-0 px-1.5 sm:px-2 flex flex-col sm:flex-row items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-white shadow-md shadow-emerald-100 transition-all font-bold text-[11px] sm:text-xs uppercase tracking-wider leading-tight text-center ${isToggling ? "cursor-not-allowed opacity-70" : "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-lg hover:shadow-emerald-100 hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-lg active:shadow-emerald-200/70"}`}
                                                title={t("memberList.unblock")}
                                            >
                                                {isToggling ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
                                                <span className="inline">{isToggling ? t("memberList.unblocking") : t("memberList.unblock")}</span>
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => handleDelete(m.id || m.uid, m.name, e)}
                                            className="h-12 sm:h-10 min-w-0 px-1.5 sm:px-2 flex flex-col sm:flex-row items-center justify-center gap-1 rounded-xl border border-red-200 bg-white text-red-500 shadow-md shadow-red-100 transition-all font-bold text-[11px] sm:text-xs leading-tight text-center hover:bg-red-50 hover:text-red-700 hover:shadow-lg hover:shadow-red-100 hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-lg active:shadow-red-200/70"
                                            title={t("memberList.delete")}
                                        >
                                            <Trash2 size={16} /> <span className="inline">{t("memberList.delete")}</span>
                                        </button>
                                    </div>
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