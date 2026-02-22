import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { CreditCard, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";

const PaymentsDashboard = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        const unsub = onSnapshot(
            query(collection(db, "products"), orderBy("distributedAt", "desc")),
            snap => { setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }
        );
        return unsub;
    }, []);

    const totalRevenue = products.reduce((s, p) => s + (p.totalAmount || 0), 0);
    const totalPaid = products.reduce((s, p) => s + (p.paidAmount || 0), 0);
    const totalDue = products.reduce((s, p) => s + (p.remainingAmount || 0), 0);
    const pendingItems = products.filter(p => p.remainingAmount > 0);

    const filtered = filter === "all" ? products :
        filter === "paid" ? products.filter(p => p.remainingAmount === 0) :
            pendingItems;

    return (
        <div className="space-y-5 animate-fade-in">
            <div>
                <h1 className="page-title mb-0">Payments Overview</h1>
                <p className="text-slate-500 text-sm">Track all product payment dues</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[
                    { label: "Total Value", value: `₹${totalRevenue.toLocaleString()}`, color: "bg-blue-600", icon: CreditCard },
                    { label: "Total Collected", value: `₹${totalPaid.toLocaleString()}`, color: "bg-emerald-500", icon: CheckCircle },
                    { label: "Total Pending", value: `₹${totalDue.toLocaleString()}`, color: "bg-red-500", icon: AlertCircle },
                    { label: "Pending Items", value: pendingItems.length, color: "bg-amber-500", icon: TrendingUp },
                ].map(s => (
                    <div key={s.label} className="stat-card">
                        <div className={`w-11 h-11 ${s.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                            <s.icon size={18} className="text-white" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-slate-800">{s.value}</p>
                            <p className="text-xs text-slate-500">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                {["all", "paid", "pending"].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${filter === f ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:border-blue-300"}`}>
                        {f}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="table-header text-left">Member</th>
                                <th className="table-header text-left">Shop</th>
                                <th className="table-header text-left">Product</th>
                                <th className="table-header text-left">Total</th>
                                <th className="table-header text-left">Paid</th>
                                <th className="table-header text-left">Due</th>
                                <th className="table-header text-left">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(p => (
                                <tr key={p.id} className={`hover:bg-slate-50 ${p.remainingAmount > 0 ? "border-l-2 border-red-400" : ""}`}>
                                    <td className="table-cell">
                                        <p className="font-medium">{p.memberName}</p>
                                        <p className="text-xs text-slate-400 font-mono">{p.memberId}</p>
                                    </td>
                                    <td className="table-cell text-xs">{p.shopName}</td>
                                    <td className="table-cell">{p.productName}</td>
                                    <td className="table-cell font-semibold">₹{p.totalAmount}</td>
                                    <td className="table-cell text-emerald-600 font-semibold">₹{p.paidAmount}</td>
                                    <td className="table-cell">
                                        <span className={`font-semibold ${p.remainingAmount > 0 ? "text-red-500" : "text-emerald-600"}`}>
                                            ₹{p.remainingAmount}
                                        </span>
                                    </td>
                                    <td className="table-cell text-xs text-slate-400">
                                        {p.distributedAt?.toDate?.().toLocaleDateString("en-IN") || "—"}
                                    </td>
                                </tr>
                            ))}
                            {!loading && filtered.length === 0 && (
                                <tr><td colSpan={7} className="table-cell text-center text-slate-400 py-12">No records found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PaymentsDashboard;
