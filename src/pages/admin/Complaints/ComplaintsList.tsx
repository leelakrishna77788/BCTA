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
        <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title mb-0">Complaints</h1>
                    <p className="text-slate-500 text-sm">{filtered.length} {filter} complaints</p>
                </div>
                <div className="flex gap-2">
                    {["all", "open", "resolved"].map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${filter === f ? "bg-[#000080] text-white" : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"}`}>
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                {filtered.map(c => (
                    <div key={c.id} className="card animate-fade-in border-none shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-4 flex-1">
                                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center shrink-0 border border-orange-100">
                                    <MessageSquareWarning size={20} className="text-orange-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    {c.title && (
                                        <h3 className="font-black text-slate-900 text-sm mb-1">{c.title}</h3>
                                    )}
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className="font-black text-slate-900 text-sm">{c.submittedByName || "Anonymous Member"}</span>
                                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">{c.memberId || "No ID"}</span>
                                        <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${c.status === "open" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                                            {c.status}
                                        </span>
                                        <span className="text-[11px] text-slate-400 font-medium ml-auto">
                                            {formatDate(c.createdAt)}
                                        </span>
                                    </div>
                                    <p className="text-slate-600 leading-relaxed text-sm bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 mb-3">{c.description}</p>
                                    {c.imageURL && (
                                        <a href={c.imageURL} target="_blank" rel="noreferrer"
                                            className="inline-flex items-center gap-2 text-xs font-bold text-[#000080] bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
                                            <Image size={14} /> View Evidence Image
                                        </a>
                                    )}
                                </div>
                            </div>
                            {c.status === "open" && (
                                <div className="flex gap-2 flex-shrink-0">
                                    <button onClick={() => resolve(c.id)}
                                        className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors" title="Mark resolved">
                                        <CheckCircle size={16} />
                                    </button>
                                    <button onClick={() => remove(c.id)}
                                        className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors" title="Delete">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {!loading && filtered.length === 0 && (
                    <div className="card text-center text-slate-400 py-16">No {filter} complaints found.</div>
                )}
            </div>
        </div>
    );
};

export default ComplaintsList;
