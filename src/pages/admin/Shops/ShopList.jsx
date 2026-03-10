import React, { useEffect, useState } from "react";
import {
    collection, onSnapshot, query, orderBy, doc, getDoc
} from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { QRCodeSVG } from "qrcode.react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, Store, QrCode, Download, Eye } from "lucide-react";
import { shopsApi } from "../../../services/api";

const ShopList = () => {
    const [shops, setShops] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selectedShop, setSelectedShop] = useState(null);
    const [form, setForm] = useState({ shopName: "", ownerName: "", address: "", phone: "" });

    useEffect(() => {
        const unsub = onSnapshot(
            query(collection(db, "shops"), orderBy("createdAt", "desc")),
            snap => setShops(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );
        return unsub;
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await shopsApi.create(form);
            toast.success("Shop created via API with fixed QR!");
            setShowForm(false);
            setForm({ shopName: "", ownerName: "", address: "", phone: "" });
        } catch (err) {
            toast.error(err.message || "Failed to create shop");
        }
        finally { setSubmitting(false); }
    };

    const downloadShopQR = (shop) => {
        const svg = document.getElementById(`shop-qr-${shop.id}`);
        if (!svg) return;
        const serializer = new XMLSerializer();
        const svgStr = serializer.serializeToString(svg);
        const a = document.createElement("a");
        a.href = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
        a.download = `${shop.shopName}-QR.svg`;
        a.click();
    };

    return (
        <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title mb-0">Shops & Product Distribution</h1>
                    <p className="text-slate-500 text-sm">{shops.length} registered shops</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
                    <Plus size={16} /> Add Shop
                </button>
            </div>

            {/* Add Shop Form */}
            {showForm && (
                <div className="card animate-fade-in">
                    <h2 className="text-base font-semibold text-slate-700 mb-4">Register New Shop</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="label">Shop Name*</label>
                                <input value={form.shopName} onChange={e => setForm(p => ({ ...p, shopName: e.target.value }))}
                                    required placeholder="e.g. Sri Rama Mobile Store" className="input-field" />
                            </div>
                            <div>
                                <label className="label">Owner Name*</label>
                                <input value={form.ownerName} onChange={e => setForm(p => ({ ...p, ownerName: e.target.value }))}
                                    required placeholder="Owner's full name" className="input-field" />
                            </div>
                            <div>
                                <label className="label">Phone</label>
                                <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                                    placeholder="9876543210" className="input-field" />
                            </div>
                            <div>
                                <label className="label">Address</label>
                                <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                                    placeholder="Shop address" className="input-field" />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                            <button type="submit" disabled={submitting} className="btn-primary">
                                {submitting ? "Creating..." : "Create Shop & Generate QR"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Shop Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {shops.map(shop => (
                    <div key={shop.id} className="card hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 bg-violet-100 rounded-xl flex items-center justify-center">
                                    <Store size={20} className="text-violet-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800 text-sm">{shop.shopName}</h3>
                                    <p className="text-xs text-slate-500">{shop.ownerName}</p>
                                </div>
                            </div>
                            <span className="bg-emerald-100 text-emerald-700 text-xs font-medium px-2 py-0.5 rounded-full">Fixed QR</span>
                        </div>

                        {/* Fixed QR Code */}
                        <div className="flex justify-center p-3 bg-white border border-slate-100 rounded-xl mb-3">
                            <QRCodeSVG
                                id={`shop-qr-${shop.id}`}
                                value={JSON.stringify({ type: "shop", shopId: shop.id, shopName: shop.shopName })}
                                size={120}
                                level="H"
                                includeMargin
                            />
                        </div>

                        <p className="text-xs text-slate-400 text-center mb-3">
                            🔒 This QR is permanent and never changes
                        </p>

                        <div className="flex gap-2">
                            <Link to={`/admin/shops/${shop.id}`}
                                className="flex-1 btn-secondary text-xs py-1.5 flex items-center justify-center gap-1">
                                <Eye size={13} /> View History
                            </Link>
                            <button onClick={() => downloadShopQR(shop)}
                                className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1">
                                <Download size={13} /> QR
                            </button>
                        </div>
                    </div>
                ))}
                {shops.length === 0 && (
                    <div className="card md:col-span-2 xl:col-span-3 text-center text-slate-400 py-16">
                        No shops registered yet.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShopList;
