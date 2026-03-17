import React, { useEffect, useState } from "react";
import {
    collection, getDocs, query, where, doc, getDoc, addDoc, serverTimestamp, updateDoc
} from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, CheckCircle, Package, CreditCard } from "lucide-react";

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
            try {
                const [shopSnap, prodSnap] = await Promise.all([
                    getDoc(doc(db, "shops", id)),
                    getDocs(query(collection(db, "products"), where("shopId", "==", id), orderBy("distributedAt", "desc"))),
                ]);
                if (shopSnap.exists()) setShop({ id: shopSnap.id, ...shopSnap.data() });
                setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) {
                // Fallback for missing index during development
                const prodSnap = await getDocs(query(collection(db, "products"), where("shopId", "==", id)));
                setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } finally {
                setLoading(false);
            }
        };
        fetchShop();
    }, [id]);

    const verifyMember = async () => {
        if (!memberUID.trim()) return toast.error("Enter member UID or ID");
        setVerifying(true);
        try {
            const q = query(collection(db, "users"), where("memberId", "==", memberUID.trim()));
            const snap = await getDocs(q);
            if (snap.empty) {
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
        } catch { toast.error("Verification failed"); } finally { setVerifying(false); }
    };

    const handleDistribute = async (e) => {
        e.preventDefault();
        if (!memberProfile) return toast.error("Verify member first");
        const total = parseFloat(form.totalAmount);
        const paid = parseFloat(form.paidAmount) || 0;
        const due = total - paid;
        
        setSubmitting(true);
        try {
            // 1. Create product record
            await addDoc(collection(db, "products"), {
                shopId: id,
                shopName: shop.shopName,
                memberId: memberProfile.memberId,
                memberUID: memberProfile.id,
                memberName: `${memberProfile.name} ${memberProfile.surname}`,
                productName: form.productName,
                quantity: parseInt(form.quantity),
                totalAmount: total,
                paidAmount: paid,
                remainingAmount: due,
                distributedAt: serverTimestamp()
            });

            // 2. Add notification for member
            await addDoc(collection(db, "notifications"), {
                userId: memberProfile.id,
                title: "Product Distributed",
                message: `You received ${form.productName} (Qty: ${form.quantity}) from ${shop.shopName}. Due: ₹${due}`,
                type: "product",
                read: false,
                createdAt: serverTimestamp()
            });

            toast.success("Product distributed successfully!");
            setMemberProfile(null);
            setMemberUID("");
            setForm({ productName: "", quantity: 1, totalAmount: "", paidAmount: "" });

            // Refresh list
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

    const totalRevenue = products.reduce((s, p) => s + (parseFloat(p.totalAmount) || 0), 0);
    const totalPaid = products.reduce((s, p) => s + (parseFloat(p.paidAmount) || 0), 0);
    const totalDue = products.reduce((s, p) => s + (parseFloat(p.remainingAmount) || 0), 0);

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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card text-center bg-white border border-slate-200">
                    <p className="text-xl font-bold text-slate-800">₹{totalRevenue.toLocaleString()}</p>
                    <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Total Value</p>
                </div>
                <div className="card text-center bg-white border border-slate-200">
                    <p className="text-xl font-bold text-emerald-600">₹{totalPaid.toLocaleString()}</p>
                    <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Total Paid</p>
                </div>
                <div className="card text-center bg-white border border-slate-200">
                    <p className="text-xl font-bold text-red-500">₹{totalDue.toLocaleString()}</p>
                    <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Total Due</p>
                </div>
            </div>

            <div className="card bg-white border border-slate-200">
                <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Package size={18} className="text-blue-600" /> Distribute Product
                </h2>

                <div className="mb-6 p-5 bg-blue-50/50 rounded-xl border border-blue-100">
                    <p className="text-sm font-bold text-blue-800 mb-3">Step 1: Verify Member</p>
                    <div className="flex gap-2">
                        <input
                            value={memberUID}
                            onChange={e => setMemberUID(e.target.value)}
                            placeholder="Enter Member ID (e.g. BCTA-001)"
                            className="input-field flex-1 bg-white"
                        />
                        <button onClick={verifyMember} disabled={verifying} className="btn-primary whitespace-nowrap px-6">
                            {verifying ? "Checking..." : "Verify"}
                        </button>
                    </div>
                </div>

                {memberProfile && (
                    <div className="mb-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-4 animate-slide-up">
                        <div className="flex items-center gap-3 flex-1">
                            {memberProfile.photoURL ? (
                                <img src={memberProfile.photoURL} alt="" className="w-12 h-12 rounded-xl object-cover shadow-sm" />
                            ) : (
                                <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-sm">
                                    {memberProfile.name?.[0]}
                                </div>
                            )}
                            <div>
                                <p className="font-bold text-slate-800">{memberProfile.name} {memberProfile.surname}</p>
                                <p className="text-xs font-mono font-bold text-emerald-700">{memberProfile.memberId}</p>
                            </div>
                        </div>
                        <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                            <CheckCircle size={14} /> Verified
                        </span>
                    </div>
                )}

                {memberProfile && (
                    <form onSubmit={handleDistribute} className="space-y-4 animate-fade-in border-t border-slate-100 pt-6">
                        <p className="text-sm font-bold text-blue-800">Step 2: Enter Product Details</p>
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
                                    <p className="text-xs font-bold text-rose-500 mt-2 bg-rose-50 px-2 py-1 rounded inline-block">
                                        Remaining Due: ₹{Math.max(0, parseFloat(form.totalAmount || 0) - parseFloat(form.paidAmount || 0)).toFixed(2)}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button type="submit" disabled={submitting} className="btn-primary w-full md:w-auto px-8">
                            {submitting ? "Recording..." : "Complete Distribution"}
                        </button>
                    </form>
                )}
            </div>

            <div className="card bg-white border border-slate-200">
                <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <CreditCard size={18} className="text-violet-600" /> Distribution History ({products.length})
                </h2>
                <div className="overflow-x-auto text-sm">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100 font-bold text-slate-700">
                                <th className="table-header text-left pl-4 py-3">Member</th>
                                <th className="table-header text-left">Product</th>
                                <th className="table-header text-left">Qty</th>
                                <th className="table-header text-left">Total</th>
                                <th className="table-header text-left">Paid</th>
                                <th className="table-header text-left">Due</th>
                                <th className="table-header text-right pr-4">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/60 font-medium">
                            {products.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="table-cell pl-4 py-4">
                                        <p className="font-bold text-slate-800">{p.memberName}</p>
                                        <p className="text-xs font-mono font-bold text-blue-600">{p.memberId}</p>
                                    </td>
                                    <td className="table-cell font-medium">{p.productName}</td>
                                    <td className="table-cell">{p.quantity}</td>
                                    <td className="table-cell font-bold">₹{p.totalAmount}</td>
                                    <td className="table-cell text-emerald-600 font-bold">₹{p.paidAmount}</td>
                                    <td className="table-cell">
                                        <span className={`font-bold ${parseFloat(p.remainingAmount) > 0 ? "text-rose-500 font-bold bg-rose-50 px-2 py-0.5 rounded" : "text-emerald-600"}`}>
                                            ₹{p.remainingAmount}
                                        </span>
                                    </td>
                                    <td className="table-cell text-xs text-slate-400 font-medium text-right pr-4">
                                        {p.distributedAt?.toDate?.().toLocaleDateString("en-IN") || 
                                         (p.distributedAt ? new Date(p.distributedAt).toLocaleDateString("en-IN") : "—")}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {products.length === 0 && (
                        <div className="py-16 text-center text-slate-400 font-medium">No distributions recorded yet</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShopDetail;
