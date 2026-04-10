import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle, Trash2, MessageSquareWarning, Image } from "lucide-react";
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../../firebase/firebaseConfig";

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
        const resolution = window.prompt("Enter resolution message (optional):", "Resolved by admin");
        if (resolution === null) return; // cancelled

        try {
            const docRef = doc(db, "complaints", id);
            await updateDoc(docRef, { 
                status: "resolved",
                resolution: resolution,
                resolvedAt: new Date()
            });
            toast.success("Complaint resolved successfully");
        } catch (err: any) {
            toast.error(err.message || "Failed to resolve complaint");
        }
    };

    const remove = async (id: string) => {
        if (!window.confirm("Delete this complaint?")) return;

        try {
            await deleteDoc(doc(db, "complaints", id));
            toast.success("Deleted successfully");
        } catch (err: any) {
            toast.error(err.message || "Failed to delete complaint");
        }
    };

    const formatDate = (date: any) => {
        if (!date) return "";
        if (date.toDate) return date.toDate().toLocaleDateString("en-IN");
        return new Date(date).toLocaleDateString("en-IN");
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-1">Complaints</h1>
                    <p className="text-slate-500 font-medium text-sm tracking-tight">Manage and resolve member grievances</p>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100/50 p-1 rounded-2xl border border-slate-200/60 w-fit">
                    {["all", "open", "resolved"].map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-3.5 sm:px-5 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300 ${filter === f ? "text-white shadow-xl shadow-indigo-500/20 scale-105" : "text-slate-500 hover:text-indigo-600 hover:bg-white/80"}`}
                            style={filter === f ? { background: "var(--gradient-primary)" } : {}}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-5 ml-1 stagger-children">
                {filtered.map((c, i) => (
                    <div key={c.id} className="glass-card animate-fade-in border-none rounded-2xl sm:rounded-3xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1.5 premium-shadow group"
                      style={{ background: "rgba(255, 255, 255, 0.7)" }}
                    >
                        <div className="p-4 sm:p-8 flex flex-col md:flex-row gap-5 sm:gap-6 relative">
                            {/* Status indicator bar */}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-16 rounded-r-full transition-all duration-500 group-hover:h-24"
                              style={{ background: c.status === "open" ? "var(--gradient-warm)" : "var(--gradient-success)" }}
                            />

                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border border-white/50 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3"
                              style={{ background: c.status === "open" ? "var(--gradient-warm)" : "var(--gradient-success)" }}
                            >
                                <MessageSquareWarning size={24} className="text-white drop-shadow-md" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-3 mb-3">
                                    <h3 className="text-lg font-black text-slate-900 tracking-tight">{c.submittedByName || "Anonymous Member"}</h3>
                                    <span className="text-[10px] font-black font-mono text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 uppercase tracking-widest">{c.memberId || "No ID"}</span>
                                    <span className={`text-[10px] uppercase font-black px-3 py-1 rounded-lg shadow-sm border ${c.status === "open" ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}>
                                        {c.status}
                                    </span>
                                </div>

                                {c.title && (
                                    <p className="font-bold text-slate-700 text-sm mb-2 opacity-80 uppercase tracking-wide">{c.title}</p>
                                )}
                                
                                <p className="text-slate-600 leading-relaxed text-[15px] font-medium bg-slate-100/40 p-5 rounded-2xl border border-slate-200/30 mb-5 italic">
                                   "{c.description}"
                                </p>

                                <div className="flex flex-wrap items-center justify-between gap-4 mt-auto pt-2 border-t border-slate-100/50">
                                    <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                        <span className="flex items-center gap-1.5">📅 {formatDate(c.createdAt)}</span>
                                        {c.imageURL && (
                                            <a href={c.imageURL} target="_blank" rel="noreferrer"
                                                className="inline-flex items-center gap-2 text-indigo-600 bg-indigo-50/50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100/50 group/link">
                                                <Image size={14} className="transition-transform group-hover/link:scale-110" /> 
                                                <span>View Evidence Image</span>
                                            </a>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2.5">
                                        {c.status === "open" && (
                                            <button onClick={() => resolve(c.id)}
                                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all duration-300 shadow-sm border border-emerald-100 group/btn" title="Mark resolved">
                                                <CheckCircle size={15} className="transition-transform group-hover/btn:scale-110" /> Resolve Issue
                                            </button>
                                        )}
                                        
                                        {c.status === "resolved" && (
                                            <div className="flex flex-col items-end gap-1 px-3">
                                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Resolved on {formatDate(c.resolvedAt)}</span>
                                            </div>
                                        )}

                                        <button onClick={() => remove(c.id)}
                                            className="p-2.5 rounded-xl bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white transition-all duration-300 border border-rose-100" title="Delete Complaint">
                                            <Trash2 size={15} />
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
                        <p className="font-black uppercase tracking-widest text-sm opacity-50">No {filter} complaints found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ComplaintsList;
