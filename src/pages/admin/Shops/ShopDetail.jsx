import React, { useEffect, useState } from "react";
import {
    collection, getDocs, query, where, doc, getDoc,
} from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, CheckCircle, Package, CreditCard } from "lucide-react";
import { shopsApi } from "../../../services/api";

const ShopDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [shop, setShop] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [memberUID, setMemberUID] = useState("");
    const [memberProfile, setMemberProfile] = useState(null);
    const [verifying, setVerifying] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ productName: "", quantity: 1, totalAmount: "", paidAmount: "" });

    useEffect(() => {
        const fetchShop = async () => {
            const [shopSnap, prodSnap] = await Promise.all([
                getDoc(doc(db, "shops", id)),
                getDocs(query(collection(db, "products"), where("shopId", "==", id))),
            ]);
            if (shopSnap.exists()) setShop({ id: shopSnap.id, ...shopSnap.data() });
            setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        };
        fetchShop();
    }, [id]);

    const verifyMember = async () => {
        if (!memberUID.trim()) return toast.error("Enter member UID or ID");
        setVerifying(true);
        try {
            // Search by memberId field
            const q = query(collection(db, "users"), where("memberId", "==", memberUID.trim()));
            const snap = await getDocs(q);
            if (snap.empty) {
                // Try by UID
                const docSnap = await getDoc(doc(db, "users", memberUID.trim()));
                if (!docSnap.exists()) { toast.error("Member not found"); setVerifying(false); return; }
                const data = { id: docSnap.id, ...docSnap.data() };
                if (data.status === "blocked") { toast.error("Member is blocked!"); setVerifying(false); return; }
                setMemberProfile(data);
            } else {
                const data = { id: snap.docs[0].id, ...snap.docs[0].data() };
                if (data.status === "blocked") { toast.error("Member is blocked!"); setVerifying(false); return; }
                setMemberProfile(data);
            }
            toast.success("Member verified!");
        } catch (err) { toast.error("Verification failed"); } finally { setVerifying(false); }
    };

    const handleDistribute = async (e) => {
        e.preventDefault();
        if (!memberProfile) return toast.error("Verify member first");
        const total = parseFloat(form.totalAmount);
        const paid = parseFloat(form.paidAmount) || 0;
        setSubmitting(true);
        try {
            const payload = {
                shopId: id,
                memberQuery: memberProfile.id,
                productName: form.productName,
                quantity: form.quantity,
                totalAmount: total,
                paidAmount: paid
            };

            await shopsApi.distributeProduct(payload);
            toast.success("Product distributed successfully via API!");

            setMemberProfile(null);
            setMemberUID("");
            setForm({ productName: "", quantity: 1, totalAmount: "", paidAmount: "" });

            // Refresh
            const prodSnap = await getDocs(query(collection(db, "products"), where("shopId", "==", id)));
            setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) { toast.error(err.message || "Failed to record distribution"); }
        finally { setSubmitting(false); }
    };

    if (loading) return (
        <div className="flex justify-center h-64 items-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    const totalRevenue = products.reduce((s, p) => s + (p.totalAmount || 0), 0);
    const totalPaid = products.reduce((s, p) => s + (p.paidAmount || 0), 0);
    const totalDue = products.reduce((s, p) => s + (p.remainingAmount || 0), 0);

    return (
        <div className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="page-title mb-0">{shop?.shopName}</h1>
                    <p className="text-slate-500 text-sm">Owner: {shop?.ownerName}</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="card text-center">
                    <p className="text-xl font-bold text-slate-800">₹{totalRevenue}</p>
                    <p className="text-xs text-slate-500 mt-1">Total Value</p>
                </div>
                <div className="card text-center">
                    <p className="text-xl font-bold text-emerald-600">₹{totalPaid}</p>
                    <p className="text-xs text-slate-500 mt-1">Total Paid</p>
                </div>
                <div className="card text-center">
                    <p className="text-xl font-bold text-red-500">₹{totalDue}</p>
                    <p className="text-xs text-slate-500 mt-1">Total Due</p>
                </div>
            </div>

            {/* Member verification & Product entry */}
            <div className="card">
                <h2 className="text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <Package size={18} /> Distribute Product
                </h2>

                {/* Step 1: Verify Member */}
                <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-sm font-semibold text-blue-700 mb-2">Step 1: Verify Member</p>
                    <div className="flex gap-2">
                        <input
                            value={memberUID}
                            onChange={e => setMemberUID(e.target.value)}
                            placeholder="Enter Member ID (e.g. BCTA-2024-001)"
                            className="input-field flex-1"
                        />
                        <button onClick={verifyMember} disabled={verifying} className="btn-primary whitespace-nowrap">
                            {verifying ? "Checking..." : "Verify"}
                        </button>
                    </div>
                </div>

                {/* Member Info */}
                {memberProfile && (
                    <div className="mb-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-4 animate-fade-in">
                        <div className="flex items-center gap-3 flex-1">
                            {memberProfile.photoURL ? (
                                <img src={memberProfile.photoURL} alt="" className="w-12 h-12 rounded-xl object-cover" />
                            ) : (
                                <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-bold">
                                    {memberProfile.name?.[0]}
                                </div>
                            )}
                            <div>
                                <p className="font-semibold text-slate-800">{memberProfile.name} {memberProfile.surname}</p>
                                <p className="text-xs font-mono text-emerald-700">{memberProfile.memberId}</p>
                                <p className="text-xs text-slate-500">Payment: {memberProfile.paymentStatus}</p>
                            </div>
                        </div>
                        <span className="badge-active flex items-center gap-1">
                            <CheckCircle size={12} /> Verified
                        </span>
                    </div>
                )}

                {/* Step 2: Product Form */}
                {memberProfile && (
                    <form onSubmit={handleDistribute} className="space-y-4 animate-fade-in">
                        <p className="text-sm font-semibold text-blue-700">Step 2: Enter Product Details</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Product Name*</label>
                                <input value={form.productName} onChange={e => setForm(p => ({ ...p, productName: e.target.value }))}
                                    required placeholder="e.g. iPhone Screen, Battery" className="input-field" />
                            </div>
                            <div>
                                <label className="label">Quantity*</label>
                                <input type="number" min="1" value={form.quantity}
                                    onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                                    required className="input-field" />
                            </div>
                            <div>
                                <label className="label">Total Amount (₹)*</label>
                                <input type="number" step="0.01" value={form.totalAmount}
                                    onChange={e => setForm(p => ({ ...p, totalAmount: e.target.value }))}
                                    required placeholder="0.00" className="input-field" />
                            </div>
                            <div>
                                <label className="label">Amount Paid (₹)</label>
                                <input type="number" step="0.01" value={form.paidAmount}
                                    onChange={e => setForm(p => ({ ...p, paidAmount: e.target.value }))}
                                    placeholder="0.00" className="input-field" />
                                {form.totalAmount && (
                                    <p className="text-xs text-red-500 mt-1">
                                        Remaining: ₹{Math.max(0, parseFloat(form.totalAmount || 0) - parseFloat(form.paidAmount || 0)).toFixed(2)}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button type="submit" disabled={submitting} className="btn-primary">
                            {submitting ? "Recording..." : "Record Distribution"}
                        </button>
                    </form>
                )}
            </div>

            {/* Product History */}
            <div className="card">
                <h2 className="text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <CreditCard size={16} /> Distribution History ({products.length})
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="table-header text-left">Member</th>
                                <th className="table-header text-left">Product</th>
                                <th className="table-header text-left">Qty</th>
                                <th className="table-header text-left">Total</th>
                                <th className="table-header text-left">Paid</th>
                                <th className="table-header text-left">Due</th>
                                <th className="table-header text-left">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50">
                                    <td className="table-cell">
                                        <div>
                                            <p className="font-medium">{p.memberName}</p>
                                            <p className="text-xs text-slate-400 font-mono">{p.memberId}</p>
                                        </div>
                                    </td>
                                    <td className="table-cell">{p.productName}</td>
                                    <td className="table-cell">{p.quantity}</td>
                                    <td className="table-cell">₹{p.totalAmount}</td>
                                    <td className="table-cell text-emerald-600 font-medium">₹{p.paidAmount}</td>
                                    <td className="table-cell">
                                        <span className={p.remainingAmount > 0 ? "text-red-500 font-medium" : "text-emerald-600"}>
                                            ₹{p.remainingAmount}
                                        </span>
                                    </td>
                                    <td className="table-cell text-xs text-slate-400">
                                        {p.distributedAt?.toDate?.().toLocaleDateString("en-IN") || "—"}
                                    </td>
                                </tr>
                            ))}
                            {products.length === 0 && (
                                <tr><td colSpan={7} className="table-cell text-center text-slate-400 py-10">No distributions yet</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ShopDetail;
