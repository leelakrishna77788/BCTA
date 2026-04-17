import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase/firebaseConfig";
import { QRCodeSVG } from "qrcode.react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, Store, QrCode, Download } from "lucide-react";

interface Shop {
    id: string;
    shopName: string;
    ownerName: string;
    address?: string;
    phone?: string;
    createdAt?: any;
}

interface ShopForm {
    shopName: string;
    ownerName: string;
    address: string;
    phone: string;
}

const ShopList: React.FC = () => {
    const [shops, setShops] = useState<Shop[]>([]);
    const [showForm, setShowForm] = useState<boolean>(false);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [form, setForm] = useState<ShopForm>({ shopName: "", ownerName: "", address: "", phone: "" });

    useEffect(() => {
        const unsub = onSnapshot(
            query(collection(db, "shops"), orderBy("createdAt", "desc")),
            snap => setShops(snap.docs.map(d => ({ id: d.id, ...d.data() } as Shop)))
        );
        return unsub;
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const shopsRef = collection(db, "shops");
            await addDoc(shopsRef, {
                ...form,
                createdAt: serverTimestamp(),
            });
            toast.success("Shop created successfully!");
            setShowForm(false);
            setForm({ shopName: "", ownerName: "", address: "", phone: "" });
        } catch (err: any) {
            toast.error(err.message || "Failed to create shop");
        }
        finally { setSubmitting(false); }
    };

    const downloadShopQR = (shop: Shop) => {
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
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-2">
                <div className="relative">
                    <div className="absolute -left-4 top-0 w-1 bg-indigo-600 h-full rounded-full opacity-0 md:opacity-100" />
                    <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-2">
                        Shops & <span className="text-indigo-600">Distribution</span>
                    </h1>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="text-slate-500 font-semibold text-sm tracking-tight">
                            <span className="text-slate-900">{shops.length}</span> active distribution points
                        </p>
                    </div>
                </div>
                <button 
                    onClick={() => setShowForm(!showForm)} 
                    className={`h-12 px-6 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg ${
                        showForm 
                        ? "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50" 
                        : "bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5"
                    }`}
                >
                    {showForm ? <Plus className="rotate-45 transition-transform" /> : <Plus />}
                    <span>{showForm ? "Cancel Registration" : "Register New Shop"}</span>
                </button>
            </div>

            {/* Add Shop Form */}
            {showForm && (
                <div className="glass-card rounded-4xl border border-white/40 p-8 sm:p-10 premium-shadow animate-slide-up relative overflow-hidden"
                  style={{ background: "rgba(255, 255, 255, 0.7)" }}
                >
                    <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                        <Store size={120} />
                    </div>
                    <h2 className="text-[11px] font-black text-indigo-600 mb-8 tracking-[0.2em] uppercase flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                        Registration Form
                    </h2>
                    
                    <form onSubmit={handleSubmit} className="relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Shop Name</label>
                                <input 
                                    value={form.shopName} 
                                    onChange={e => setForm(p => ({ ...p, shopName: e.target.value }))}
                                    required 
                                    placeholder="e.g. Sri Rama Mobile Store" 
                                    className="w-full h-14 px-6 rounded-2xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-slate-800 placeholder:text-slate-300 shadow-inner" 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Proprietor Name</label>
                                <input 
                                    value={form.ownerName} 
                                    onChange={e => setForm(p => ({ ...p, ownerName: e.target.value }))}
                                    required 
                                    placeholder="Owner's full name" 
                                    className="w-full h-14 px-6 rounded-2xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-slate-800 placeholder:text-slate-300 shadow-inner" 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Primary Contact</label>
                                <input 
                                    type="tel" 
                                    value={form.phone} 
                                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                                    placeholder="9876543210" 
                                    className="w-full h-14 px-6 rounded-2xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-slate-800 placeholder:text-slate-300 shadow-inner" 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Full Address</label>
                                <input 
                                    value={form.address} 
                                    onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                                    placeholder="Detailed location" 
                                    className="w-full h-14 px-6 rounded-2xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-slate-800 placeholder:text-slate-300 shadow-inner" 
                                />
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button 
                                type="submit" 
                                disabled={submitting} 
                                className="flex-1 h-14 rounded-2xl bg-indigo-600 text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <QrCode size={18} />}
                                {submitting ? "Processing..." : "Register & Generate QR"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Shop Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {shops.map(shop => (
                    <div key={shop.id} className="glass-card rounded-3xl border border-white/40 p-6 premium-shadow hover:bg-white/90 transition-all duration-500 group">
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                                    <Store size={26} className="text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 tracking-tight text-base leading-tight">{shop.shopName}</h3>
                                    <p className="text-xs font-semibold text-slate-400 mt-0.5">{shop.ownerName}</p>
                                </div>
                            </div>
                            <span className="bg-indigo-50 text-indigo-700 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border border-indigo-100/50">Fixed Identifier</span>
                        </div>

                        <div className="flex justify-center p-8 bg-white border border-slate-100 rounded-3xl mb-6 shadow-inner relative group/qr overflow-hidden">
                            <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover/qr:opacity-100 transition-opacity" />
                            <QRCodeSVG
                                id={`shop-qr-${shop.id}`}
                                value={JSON.stringify({ type: "shop", shopId: shop.id, shopName: shop.shopName })}
                                size={150}
                                level="H"
                                includeMargin={false}
                                fgColor="#0f172a"
                                className="relative z-10 drop-shadow-sm"
                            />
                        </div>

                        <div className="flex items-center gap-2 justify-center mb-6 py-2 px-4 rounded-xl bg-slate-50/50 border border-slate-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Verified Merchant Key</p>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => downloadShopQR(shop)}
                                className="flex-1 h-11 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm font-bold text-xs">
                                <Download size={18} /> Download QR
                            </button>
                        </div>
                    </div>
                ))}
                {shops.length === 0 && (
                    <div className="glass-card md:col-span-2 xl:col-span-3 text-center py-20 rounded-3xl border border-white/40">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200 border border-slate-100">
                            <Store size={40} />
                        </div>
                        <p className="text-xl font-black text-slate-900 mb-2">No Shops Registered</p>
                        <p className="text-slate-400 font-medium uppercase tracking-[0.2em] text-xs">Registry is currently empty</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShopList;
