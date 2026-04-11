import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase/firebaseConfig";
import { CreditCard, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";

interface Product {
    id: string;
    totalAmount: string | number;
    paidAmount: string | number;
    remainingAmount: string | number;
    memberName: string;
    memberId: string;
    shopName: string;
    productName: string;
    distributedAt: any;
}

const PaymentsDashboard: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [filter, setFilter] = useState<string>("all");

    useEffect(() => {
        const q = query(collection(db, "products"), orderBy("distributedAt", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
            setLoading(false);
        }, (err) => {
            console.error("Payments fetch error:", err);
            setLoading(false);
        });
        return unsub;
    }, []);

    const totalRevenue = products.reduce((s, p) => s + (parseFloat(p.totalAmount as string) || 0), 0);
    const totalPaid = products.reduce((s, p) => s + (parseFloat(p.paidAmount as string) || 0), 0);
    const totalDue = products.reduce((s, p) => s + (parseFloat(p.remainingAmount as string) || 0), 0);
    const pendingItems = products.filter(p => parseFloat(p.remainingAmount as string) > 0);

    const filtered = filter === "all" ? products :
        filter === "paid" ? products.filter(p => parseFloat(p.remainingAmount as string) === 0) :
            pendingItems;

    const formatDate = (date: any) => {
        if (!date) return "—";
        if (date.toDate) return date.toDate().toLocaleDateString("en-IN");
        return new Date(date).toLocaleDateString("en-IN");
    };

    return (
        <div className="space-y-5 animate-fade-in">
            <div>
                <h1 className="page-title mb-0">Payments Overview</h1>
                <p className="text-slate-500 text-sm">Track all product payment dues</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: "Total Value", value: `₹${totalRevenue.toLocaleString()}`, color: "bg-[#4f46e5]", icon: CreditCard },
                    { label: "Total Collected", value: `₹${totalPaid.toLocaleString()}`, color: "bg-emerald-500", icon: CheckCircle },
                    { label: "Total Pending", value: `₹${totalDue.toLocaleString()}`, color: "bg-red-500", icon: AlertCircle },
                    { label: "Pending Items", value: pendingItems.length, color: "bg-amber-500", icon: TrendingUp },
                ].map(s => (
                    <div key={s.label} className="stat-card bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3">
                        <div className={`w-11 h-11 ${s.color} rounded-xl flex items-center justify-center shrink-0`}>
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
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${filter === f ? "bg-[#4f46e5] text-white" : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"}`}>
                        {f}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="card p-0 overflow-hidden border border-slate-200 bg-white rounded-xl shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse block md:table">
                        <thead className="hidden md:table-header-group">
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="table-header text-left pl-6 py-3">Member</th>
                                <th className="table-header text-left">Shop</th>
                                <th className="table-header text-left">Product</th>
                                <th className="table-header text-left">Total</th>
                                <th className="table-header text-left">Paid</th>
                                <th className="table-header text-left">Due</th>
                                <th className="table-header text-left pr-6">Date</th>
                            </tr>
                        </thead>
                        <tbody className="block md:table-row-group divide-y md:divide-slate-100 font-medium">
                            {filtered.map(p => (
                                <tr key={p.id} className={`block md:table-row bg-white border border-slate-100 md:border-0 rounded-2xl md:rounded-none mb-4 md:mb-0 shadow-sm md:shadow-none hover:bg-slate-50 transition-colors p-4 md:p-0 ${parseFloat(p.remainingAmount as string) > 0 ? "md:border-l-4 md:border-red-500" : ""}`}>
                                    <td className="flex md:table-cell md:p-4 md:pl-6 mb-3 md:mb-0 justify-between items-center">
                                        <span className="md:hidden text-[10px] font-black text-slate-400 uppercase tracking-wider">Member</span>
                                        <div className="text-right md:text-left">
                                            <p className="font-semibold text-slate-800">{p.memberName}</p>
                                            <p className="text-xs text-slate-400 font-mono">{p.memberId}</p>
                                        </div>
                                    </td>
                                    <td className="flex md:table-cell md:p-4 mb-2 md:mb-0 justify-between items-center text-xs font-medium text-slate-600">
                                        <span className="md:hidden text-[10px] font-black text-slate-400 uppercase tracking-wider">Shop</span>
                                        <span>{p.shopName}</span>
                                    </td>
                                    <td className="flex md:table-cell md:p-4 mb-2 md:mb-0 justify-between items-center font-medium">
                                        <span className="md:hidden text-[10px] font-black text-slate-400 uppercase tracking-wider">Product</span>
                                        <span>{p.productName}</span>
                                    </td>
                                    <td className="flex md:table-cell md:p-4 mb-2 md:mb-0 justify-between items-center font-bold">
                                        <span className="md:hidden text-[10px] font-black text-slate-400 uppercase tracking-wider">Total</span>
                                        <span>₹{p.totalAmount}</span>
                                    </td>
                                    <td className="flex md:table-cell md:p-4 mb-2 md:mb-0 justify-between items-center text-emerald-600 font-bold">
                                        <span className="md:hidden text-[10px] font-black text-slate-400 uppercase tracking-wider">Paid</span>
                                        <span>₹{p.paidAmount}</span>
                                    </td>
                                    <td className="flex md:table-cell md:p-4 mb-3 md:mb-0 justify-between items-center">
                                        <span className="md:hidden text-[10px] font-black text-slate-400 uppercase tracking-wider">Due</span>
                                        <span className={`font-bold ${parseFloat(p.remainingAmount as string) > 0 ? "text-red-500" : "text-emerald-600"}`}>
                                            ₹{p.remainingAmount}
                                        </span>
                                    </td>
                                    <td className="flex md:table-cell md:p-4 md:pr-6 justify-between items-center text-right border-t border-slate-100 md:border-0 pt-3 md:pt-0 mt-2 md:mt-0 text-xs text-slate-400">
                                        <span className="md:hidden text-[10px] font-black text-slate-400 uppercase tracking-wider">Date</span>
                                        <span>{formatDate(p.distributedAt)}</span>
                                    </td>
                                </tr>
                            ))}
                            {!loading && filtered.length === 0 && (
                                <tr className="block md:table-row"><td colSpan={7} className="block md:table-cell text-center text-slate-400 py-16">No records found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PaymentsDashboard;
