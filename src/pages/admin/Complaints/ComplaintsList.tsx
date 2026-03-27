import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle, Trash2, MessageSquareWarning, Image } from "lucide-react";
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../../firebase/firebaseConfig";

interface Complaint {
    id: string;
    memberId?: string;
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
                    <div key={c.id} className="card animate-fade-in">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <MessageSquareWarning size={18} className="text-orange-500" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono text-xs text-[#000080]">{c.memberId || "Unknown"}</span>
                                        <span className={c.status === "open" ? "badge-pending" : "badge-active"}>{c.status}</span>
                                        <span className="text-xs text-slate-400 ml-auto">
                                            {formatDate(c.createdAt)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-700">{c.description}</p>
                                    {c.imageURL && (
                                        <a href={c.imageURL} target="_blank" rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-xs text-[#000080] hover:underline mt-1.5">
                                            <Image size={12} /> View attached image
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
