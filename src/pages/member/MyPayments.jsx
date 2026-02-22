import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useAuth } from "../../context/AuthContext";
import { CreditCard, Package, AlertCircle } from "lucide-react";

const MyPayments = () => {
    const { currentUser, userProfile } = useAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;
        getDocs(query(collection(db, "products"), where("memberUID", "==", currentUser.uid)))
            .then(snap => { setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); });
    }, [currentUser]);

    const totalDue = products.reduce((s, p) => s + (p.remainingAmount || 0), 0);
    const totalPaid = products.reduce((s, p) => s + (p.paidAmount || 0), 0);

    return (
        <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
            <h1 className="page-title mb-0">My Payments</h1>

            <div className="grid grid-cols-3 gap-3">
                <div className="card text-center p-4">
                    <p className="text-xl font-bold text-blue-600">₹{totalPaid}</p>
                    <p className="text-xs text-slate-500 mt-1">Total Paid</p>
                </div>
                <div className="card text-center p-4">
                    <p className="text-xl font-bold text-red-500">₹{totalDue}</p>
                    <p className="text-xs text-slate-500 mt-1">Total Due</p>
                </div>
                <div className="card text-center p-4">
                    <p className={`text-xl font-bold ${userProfile?.paymentStatus === "paid" ? "text-emerald-600" : "text-amber-500"}`}>
                        {userProfile?.paymentStatus}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Status</p>
                </div>
            </div>

            {totalDue > 0 && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                    <AlertCircle className="text-amber-500 flex-shrink-0" size={20} />
                    <p className="text-sm text-amber-800">You have ₹{totalDue} in pending dues. Please clear them to avoid account restrictions.</p>
                </div>
            )}

            <div className="card">
                <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <Package size={16} /> Product History
                </h2>
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : products.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-10">No products received yet</p>
                ) : (
                    <div className="space-y-3">
                        {products.map(p => (
                            <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border ${p.remainingAmount > 0 ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"}`}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${p.remainingAmount > 0 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}>
                                    <Package size={18} />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-slate-800 text-sm">{p.productName}</p>
                                    <p className="text-xs text-slate-500">{p.shopName} • Qty: {p.quantity}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-slate-800">₹{p.totalAmount}</p>
                                    <p className={`text-xs font-medium ${p.remainingAmount > 0 ? "text-red-500" : "text-emerald-600"}`}>
                                        {p.remainingAmount > 0 ? `₹${p.remainingAmount} due` : "Paid ✓"}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyPayments;
