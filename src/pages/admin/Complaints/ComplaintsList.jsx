import React, { useEffect, useState } from "react";
import { collection, query, orderBy, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { onSnapshot } from "firebase/firestore";
import toast from "react-hot-toast";
import { CheckCircle, Trash2, MessageSquareWarning, Image } from "lucide-react";
import { complaintsApi } from "../../../services/api";

const ComplaintsList = () => {
    const [complaints, setComplaints] = useState([]);
    const [filter, setFilter] = useState("open");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onSnapshot(
            query(collection(db, "complaints"), orderBy("createdAt", "desc")),
            snap => { setComplaints(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }
        );
        return unsub;
    }, []);

    const filtered = complaints.filter(c => filter === "all" ? true : c.status === filter);

    const resolve = async (id) => {
        const resolution = window.prompt("Enter resolution message (optional):", "Resolved by admin");
        if (resolution === null) return; // cancelled

        try {
            await complaintsApi.resolve(id, resolution);
            toast.success("Complaint resolved via API");
        } catch (err) {
            toast.error(err.message || "Failed to resolve complaint");
        }
    };

    const remove = async (id) => {
        if (!window.confirm("Delete this complaint?")) return;

        // Wait, is there a delete API?
        // Actually, deleting directly is fine for now but let's stick to what we have.
        try {
            await deleteDoc(doc(db, "complaints", id));
            toast.success("Deleted");
        } catch {
            toast.error("Failed to delete complaint");
        }
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
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${filter === f ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:border-blue-300"}`}>
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
                                        <span className="font-mono text-xs text-blue-600">{c.memberId || "Unknown"}</span>
                                        <span className={c.status === "open" ? "badge-pending" : "badge-active"}>{c.status}</span>
                                        <span className="text-xs text-slate-400 ml-auto">
                                            {c.createdAt?.toDate?.().toLocaleDateString("en-IN")}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-700">{c.description}</p>
                                    {c.imageURL && (
                                        <a href={c.imageURL} target="_blank" rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1.5">
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
