import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle, Trash2, MessageSquareWarning, Image } from "lucide-react";
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

    const filtered = complaints.filter(c => filter === "all" ? true : c.status === filter);

    const resolve = async (id: string) => {
        const resolution = window.prompt(t("complaints.prompts.resolution"), t("complaints.prompts.resolutionDefault"));
        if (resolution === null) return; // cancelled

        try {
            const docRef = doc(db, "complaints", id);
            await updateDoc(docRef, { 
                status: "resolved",
                resolution: resolution,
                resolvedAt: new Date()
            });
            toast.success(t("complaints.toasts.resolveSuccess"));
        } catch (err: any) {
            toast.error(t("complaints.toasts.resolveError", { error: err.message || "" }));
        }
    };

    const remove = async (id: string) => {
        if (!window.confirm(t("complaints.prompts.confirmDelete"))) return;

        try {
            await deleteDoc(doc(db, "complaints", id));
            toast.success(t("complaints.toasts.deleteSuccess"));
        } catch (err: any) {
            toast.error(t("complaints.toasts.deleteError", { error: err.message || "" }));
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
                                            <button onClick={() => resolve(c.id)}
                                                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-emerald-600 text-white text-[8px] font-black uppercase hover:bg-emerald-700 transition-all" title={t("complaints.actions.resolve")}>
                                                <CheckCircle size={10} /> {t("complaints.actions.resolve")}
                                            </button>
                                        )}
                                        
                                        {c.status === "resolved" && (
                                            <span className="text-[7px] font-black text-emerald-700 uppercase px-1">✓</span>
                                        )}

                                        <button onClick={() => remove(c.id)}
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
        </div>
    );
};

export default ComplaintsList;
