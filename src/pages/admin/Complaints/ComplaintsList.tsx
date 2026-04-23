import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle, Trash2, MessageSquareWarning, Image, AlertTriangle, X } from "lucide-react";
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../../firebase/firebaseConfig";
import { useTranslation } from "react-i18next";

interface Complaint {
    id: string;
    memberId?: string;
    submittedByUID?: string;
    submittedByName?: string;
    title?: string;
    status: string;
    createdAt: any;
    description: string;
    imageURL?: string;
    resolution?: string;
    resolvedAt?: any;
}

const ComplaintsList: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [filter, setFilter] = useState<string>("all");
    const [loading, setLoading] = useState<boolean>(true);
    const [showResolveConfirm, setShowResolveConfirm] = useState<boolean>(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
    const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
    const [resolveButtonPosition, setResolveButtonPosition] = useState<{ top: number; left: number } | null>(null);
    const [deleteButtonPosition, setDeleteButtonPosition] = useState<{ top: number; left: number } | null>(null);
    const [resolutionText, setResolutionText] = useState<string>("");

    useEffect(() => {
        const q = query(collection(db, "complaints"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            setComplaints(snap.docs.map(d => ({ id: d.id, ...d.data() } as Complaint)));
            setLoading(false);
        }, (err) => {
            console.error("Complaints fetch error:", err);
            setLoading(false);
        });
        return unsub;
    }, []);

    useEffect(() => {
        if (!showResolveConfirm && !showDeleteConfirm) return;

        const scrollY = window.scrollY;
        const previousBodyOverflow = document.body.style.overflow;
        const previousBodyPosition = document.body.style.position;
        const previousBodyTop = document.body.style.top;
        const previousBodyLeft = document.body.style.left;
        const previousBodyRight = document.body.style.right;
        const previousBodyWidth = document.body.style.width;
        const previousHtmlOverflow = document.documentElement.style.overflow;

        document.body.style.overflow = "hidden";
        document.body.style.position = "fixed";
        document.body.style.top = `-${scrollY}px`;
        document.body.style.left = "0";
        document.body.style.right = "0";
        document.body.style.width = "100%";
        document.documentElement.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousBodyOverflow;
            document.body.style.position = previousBodyPosition;
            document.body.style.top = previousBodyTop;
            document.body.style.left = previousBodyLeft;
            document.body.style.right = previousBodyRight;
            document.body.style.width = previousBodyWidth;
            document.documentElement.style.overflow = previousHtmlOverflow;
            window.scrollTo(0, scrollY);
        };
    }, [showResolveConfirm, showDeleteConfirm]);

    const filtered = complaints.filter(c => filter === "all" ? true : c.status === filter);

    const handleResolve = (event: React.MouseEvent<HTMLButtonElement>, id: string) => {
        const buttonRect = event.currentTarget.getBoundingClientRect();
        const buttonTop = buttonRect.top + window.scrollY;
        
        // Calculate which group of 3 rows this button belongs to
        const rowHeight = 150;
        const groupSize = 3;
        const groupIndex = Math.floor(buttonTop / (rowHeight * groupSize));
        
        // Position card at the center of this group
        const groupCenterY = (groupIndex * rowHeight * groupSize) + (rowHeight * groupSize / 2);
        
        setResolveButtonPosition({
            top: groupCenterY,
            left: 0
        });
        setSelectedComplaintId(id);
        setResolutionText(t("complaints.prompts.resolutionDefault"));
        setShowResolveConfirm(true);
    };

    const confirmResolve = async () => {
        if (!selectedComplaintId) return;
        setShowResolveConfirm(false);
        setResolveButtonPosition(null);

        try {
            const docRef = doc(db, "complaints", selectedComplaintId);
            await updateDoc(docRef, { 
                status: "resolved",
                resolution: resolutionText,
                resolvedAt: new Date()
            });
            toast.success(t("complaints.toasts.resolveSuccess"));
        } catch (err: any) {
            toast.error(t("complaints.toasts.resolveError", { error: err.message || "" }));
        } finally {
            setSelectedComplaintId(null);
            setResolutionText("");
        }
    };

    const handleDelete = (event: React.MouseEvent<HTMLButtonElement>, id: string) => {
        const buttonRect = event.currentTarget.getBoundingClientRect();
        const buttonTop = buttonRect.top + window.scrollY;
        
        // Calculate which group of 3 rows this button belongs to
        const rowHeight = 150;
        const groupSize = 3;
        const groupIndex = Math.floor(buttonTop / (rowHeight * groupSize));
        
        // Position card at the center of this group
        const groupCenterY = (groupIndex * rowHeight * groupSize) + (rowHeight * groupSize / 2);
        
        setDeleteButtonPosition({
            top: groupCenterY,
            left: 0
        });
        setSelectedComplaintId(id);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!selectedComplaintId) return;
        setShowDeleteConfirm(false);
        setDeleteButtonPosition(null);

        try {
            await deleteDoc(doc(db, "complaints", selectedComplaintId));
            toast.success(t("complaints.toasts.deleteSuccess"));
        } catch (err: any) {
            toast.error(t("complaints.toasts.deleteError", { error: err.message || "" }));
        } finally {
            setSelectedComplaintId(null);
        }
    };

    const formatDate = (date: any) => {
        if (!date) return "";
        const locale = i18n.language === 'te' ? 'te-IN' : 'en-IN';
        if (date.toDate) return date.toDate().toLocaleDateString(locale);
        return new Date(date).toLocaleDateString(locale);
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-1">{t("complaints.title")}</h1>
                    <p className="text-slate-500 font-medium text-sm tracking-tight">{t("complaints.subtitle")}</p>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100/50 p-1 rounded-2xl border border-slate-200/60 w-fit">
                    {["all", "open", "resolved"].map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-3.5 sm:px-5 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300 ${filter === f ? "text-white shadow-xl shadow-indigo-500/20 scale-105" : "text-slate-500 hover:text-indigo-600 hover:bg-white/80"}`}
                            style={filter === f ? { background: "var(--gradient-primary)" } : {}}
                        >
                            {t(`complaints.filters.${f}`)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 stagger-children">
                {filtered.map((c, i) => (
                    <div key={c.id} className="glass-card animate-fade-in rounded-lg hover:shadow-md transition-all duration-300 border border-slate-200/50 group overflow-hidden"
                      style={{ background: "linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)" }}
                    >
                        <div className="p-3 flex gap-2.5 relative">
                            {/* Status indicator bar */}
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 transition-all duration-300 group-hover:w-1"
                              style={{ background: c.status === "open" ? "#f59e0b" : "#10b981" }}
                            />

                            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm border border-white"
                              style={{ background: c.status === "open" ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" : "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
                            >
                                <MessageSquareWarning size={16} className="text-white" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <h3 className="text-xs font-black text-slate-900">{c.submittedByName || t("complaints.labels.anonymous")}</h3>
                                    <span className="text-[7px] font-black font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase">{c.memberId || t("complaints.labels.na")}</span>
                                    <span className={`text-[7px] uppercase font-black px-1.5 py-0.5 rounded ${c.status === "open" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                                        {t(`complaints.status.${c.status}`)}
                                    </span>
                                </div>
                                
                                <p className="text-slate-700 text-xs font-medium leading-relaxed mb-1.5 wrap-break-word">
                                   "{c.description}"
                                </p>

                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 text-[8px] font-bold text-slate-400">
                                        <span>📅 {formatDate(c.createdAt)}</span>
                                        {c.imageURL && (
                                            <a href={c.imageURL} target="_blank" rel="noreferrer"
                                                className="inline-flex items-center gap-0.5 text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded hover:bg-indigo-100 transition-all" title={t("complaints.labels.evidence")}>
                                                <Image size={10} /> {t("complaints.labels.img")}
                                            </a>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        {c.status === "open" && (
                                            <button onClick={(e) => handleResolve(e, c.id)}
                                                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-emerald-600 text-white text-[8px] font-black uppercase hover:bg-emerald-700 transition-all" title={t("complaints.actions.resolve")}>
                                                <CheckCircle size={10} /> {t("complaints.actions.resolve")}
                                            </button>
                                        )}
                                        
                                        {c.status === "resolved" && (
                                            <span className="text-[7px] font-black text-emerald-700 uppercase px-1">✓</span>
                                        )}

                                        <button onClick={(e) => handleDelete(e, c.id)}
                                            className="p-1 rounded bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all" title={t("complaints.actions.delete")}>
                                            <Trash2 size={11} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {!loading && filtered.length === 0 && (
                    <div className="glass-card text-center text-slate-400 py-20 rounded-3xl border border-dashed border-slate-300 flex flex-col items-center justify-center gap-4">
                        <span className="text-6xl opacity-20">📭</span>
                        <p className="font-black uppercase tracking-widest text-sm opacity-50">{t("complaints.noComplaints", { filter: t(`complaints.filters.${filter}`) })}</p>
                    </div>
                )}
            </div>

            {showResolveConfirm && resolveButtonPosition && (
                <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-lg animate-fade-in" onClick={() => { setShowResolveConfirm(false); setResolveButtonPosition(null); setSelectedComplaintId(null); }}>
                    <div 
                        className="fixed bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-scale-up mx-4"
                        style={{
                            top: `${resolveButtonPosition.top}px`,
                            left: '50%',
                            transform: 'translate(-50%, -50%)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100">
                            <CheckCircle className="text-emerald-600" size={32} />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 text-center mb-3">
                            {t("complaints.actions.resolve")} {t("complaints.title").slice(0, -1)}
                        </h2>
                        <p className="text-sm text-slate-600 text-center mb-4">
                            {t("complaints.prompts.resolution")}
                        </p>
                        <textarea
                            value={resolutionText}
                            onChange={(e) => setResolutionText(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all mb-6 text-sm"
                            rows={3}
                            placeholder={t("complaints.prompts.resolutionDefault")}
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowResolveConfirm(false); setResolveButtonPosition(null); setSelectedComplaintId(null); }}
                                className="flex-1 px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                            >
                                {t("common.cancel") || "Cancel"}
                            </button>
                            <button
                                onClick={confirmResolve}
                                className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
                            >
                                {t("complaints.actions.resolve")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteConfirm && deleteButtonPosition && (
                <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-lg animate-fade-in" onClick={() => { setShowDeleteConfirm(false); setDeleteButtonPosition(null); setSelectedComplaintId(null); }}>
                    <div 
                        className="fixed bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-scale-up mx-4"
                        style={{
                            top: `${deleteButtonPosition.top}px`,
                            left: '50%',
                            transform: 'translate(-50%, -50%)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100">
                            <AlertTriangle className="text-red-600" size={32} />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 text-center mb-3">
                            {t("complaints.prompts.confirmDelete")}
                        </h2>
                        <p className="text-sm text-slate-600 text-center mb-6">
                            {t("memberDetail.deleteWarning") || "This action cannot be undone. The complaint will be permanently removed."}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowDeleteConfirm(false); setDeleteButtonPosition(null); setSelectedComplaintId(null); }}
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
        </div>
    );
};

export default ComplaintsList;
