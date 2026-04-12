import React, { useEffect, useState } from "react";
import {
    collection, getDocs, query, where, doc, getDoc, addDoc, serverTimestamp, orderBy
} from "firebase/firestore";
import { db } from "../../../firebase/firebaseConfig";
import { useParams, useNavigate } from "react-router-dom";
import { Scanner, IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import { ArrowLeft, CheckCircle, Package, CreditCard, ScanLine, Camera, X, Zap, ZapOff, Store } from "lucide-react";

interface Shop {
    id: string;
    shopName: string;
    ownerName: string;
}

interface Product {
    id: string;
    totalAmount: number | string;
    paidAmount: number | string;
    remainingAmount: number | string;
    memberName: string;
    memberId: string;
    productName: string;
    quantity: number | string;
    distributedAt: any;
}

interface MemberProfile {
    id: string;
    memberId: string;
    name: string;
    surname: string;
    photoURL?: string;
    status: string;
}

interface DistributionForm {
    productName: string;
    quantity: number | string;
    totalAmount: string;
    paidAmount: string;
}

const ShopDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [shop, setShop] = useState<Shop | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [memberUID, setMemberUID] = useState<string>("");
    const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
    const [verifying, setVerifying] = useState<boolean>(false);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [form, setForm] = useState<DistributionForm>({ productName: "", quantity: 1, totalAmount: "", paidAmount: "" });
    const [isScanning, setIsScanning] = useState<boolean>(false);
    const [torchOn, setTorchOn] = useState(false);
    const [torchSupported, setTorchSupported] = useState(false);

    // Direct Torch manipulation
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    // 1. Initial configuration and capabilities check when scanning starts
    useEffect(() => {
        if (!isScanning) {
            setTorchSupported(false);
            setTorchOn(false);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const video = document.querySelector('video');
                if (!video || !video.srcObject) return;
                
                const stream = video.srcObject as MediaStream;
                const track = stream.getVideoTracks()[0];
                if (!track) return;

                const caps = track.getCapabilities() as any;
                if (caps.torch) {
                    setTorchSupported(true);
                }
                
                // Always apply current torch state upon stream init
                await track.applyConstraints({
                    advanced: [{ torch: torchOn }]
                } as any);
            } catch (e) {
                console.warn("Torch interaction error:", e);
            }
        }, 1500); // Delay for camera initialization

        return () => clearTimeout(timer);
    }, [isScanning]); 
    // ^ Removed `torchOn` from dependencies to prevent re-triggering the 1.5s timeout on every toggle

    // 2. Instant toggle handling independently
    useEffect(() => {
        const toggleTorch = async () => {
            try {
                const video = document.querySelector('video');
                if (!video || !video.srcObject) return;
                
                const stream = video.srcObject as MediaStream;
                const track = stream.getVideoTracks()[0];
                if (!track) return;

                // Explicitly send torch boolean constraint
                await track.applyConstraints({
                    advanced: [{ torch: torchOn }]
                } as any);
            } catch (e) {
                console.warn("Torch toggle error:", e);
            }
        };

        if (isScanning) {
            toggleTorch();
        }
    }, [torchOn, isScanning]);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            setLoading(true);
            
            // 1. Fetch Shop Data (Crucial)
            try {
                const shopSnap = await getDoc(doc(db, "shops", id));
                if (shopSnap.exists()) {
                    setShop({ id: shopSnap.id, ...shopSnap.data() } as Shop);
                } else {
                    toast.error("Shop not found in database");
                    navigate("/admin/shops");
                }
            } catch (err: any) {
                console.error("Shop Fetch Error:", err);
                toast.error("Cloud connection error. Retrying shop data...");
            }

            // 2. Fetch Products Data (Non-blocking fallback)
            try {
                const q = query(collection(db, "products"), where("shopId", "==", id), orderBy("distributedAt", "desc"));
                const prodSnap = await getDocs(q);
                setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
            } catch (err: any) {
                console.warn("Product list failed (likely missing index), trying fallback...", err);
                try {
                    const fallbackQ = query(collection(db, "products"), where("shopId", "==", id));
                    const prodSnap = await getDocs(fallbackQ);
                    setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
                } catch (fallbackErr) {
                    console.error("All product fetch attempts failed:", fallbackErr);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, navigate]);

    const verifyMember = async (idToVerify?: string) => {
        const targetId = idToVerify || memberUID.trim();
        if (!targetId) return toast.error("Enter or scan member ID");
        setVerifying(true);
        try {
            const q = query(collection(db, "users"), where("memberId", "==", targetId));
            const snap = await getDocs(q);
            if (snap.empty) {
                const docSnap = await getDoc(doc(db, "users", targetId));
                if (!docSnap.exists()) { toast.error("Member not found"); setVerifying(false); return; }
                const data = { id: docSnap.id, ...docSnap.data() } as MemberProfile;
                if (data.status === "blocked") { toast.error("Member is blocked!"); setVerifying(false); return; }
                setMemberProfile(data);
            } else {
                const data = { id: snap.docs[0].id, ...snap.docs[0].data() } as MemberProfile;
                if (data.status === "blocked") { toast.error("Member is blocked!"); setVerifying(false); return; }
                setMemberProfile(data);
            }
            toast.success("Member verified!");
        } catch { toast.error("Verification failed"); } finally { setVerifying(false); }
    };

    const handleScan = (data: IDetectedBarcode[]) => {
        if (data?.[0]?.rawValue) {
            try {
                const result = JSON.parse(data[0].rawValue);
                if (result.type === "member" && (result.uid || result.memberId)) {
                    const id = result.memberId || result.uid;
                    setMemberUID(id);
                    setIsScanning(false);
                    verifyMember(id);
                } else {
                    toast.error("Invalid Member QR Code");
                }
            } catch (e) {
                // If not JSON, try as raw ID
                setMemberUID(data[0].rawValue);
                setIsScanning(false);
                verifyMember(data[0].rawValue);
            }
        }
    };

    const handleDistribute = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!shop) return toast.error("Shop data not loaded. Please refresh the page.");
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
                quantity: typeof form.quantity === 'string' ? parseInt(form.quantity) : form.quantity,
                totalAmount: total,
                paidAmount: paid,
                remainingAmount: due,
                distributedAt: serverTimestamp()
            });

            // 2. Add notification for member
            await addDoc(collection(db, "notifications"), {
                userId: memberProfile.id,
                title: "Product Distributed",
                body: `You received ${form.productName} (Qty: ${form.quantity}) from ${shop.shopName}. Due: ₹${due}`,
                type: "product",
                read: false,
                createdAt: serverTimestamp()
            });

            toast.success("Product distributed successfully!");
            setMemberProfile(null);
            setMemberUID("");
            setForm({ productName: "", quantity: 1, totalAmount: "", paidAmount: "" });

            // Refresh list
            const prodSnap = await getDocs(query(collection(db, "products"), where("shopId", "==", id), orderBy("distributedAt", "desc")));
            setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
        } catch (err: any) { 
            toast.error(err.message || "Failed to record distribution");
            // If the index is missing, try fetching without orderBy as fallback
            if (id) {
                const prodSnap = await getDocs(query(collection(db, "products"), where("shopId", "==", id)));
                setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
            }
        }
        finally { setSubmitting(false); }
    };

    if (loading) return (
        <div className="flex justify-center h-64 items-center">
            <div className="w-8 h-8 border-4 border-[#4f46e5] border-t-transparent rounded-full animate-spin" />
        </div>
    );

    const totalRevenue = products.reduce((s, p) => s + (parseFloat(p.totalAmount as string) || 0), 0);
    const totalPaid = products.reduce((s, p) => s + (parseFloat(p.paidAmount as string) || 0), 0);
    const totalDue = products.reduce((s, p) => s + (parseFloat(p.remainingAmount as string) || 0), 0);

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <button 
                    onClick={() => navigate(-1)} 
                    className="group w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50 shadow-sm transition-all duration-300 active:scale-95"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform duration-300" />
                </button>
                <div className="relative">
                    <div className="absolute -left-4 top-0 w-1 bg-indigo-600 h-full rounded-full opacity-0 sm:opacity-100" />
                    <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-1">
                        {shop?.shopName}
                    </h1>
                    <div className="flex items-center gap-2">
                        <Store size={14} className="text-indigo-500" />
                        <p className="text-slate-500 font-bold text-sm tracking-tight uppercase">
                            Authorized Dealer: <span className="text-slate-900">{shop?.ownerName}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div className="glass-card rounded-3xl border border-white/40 p-5 sm:p-8 premium-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <CreditCard size={60} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Total Inventory Value</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-slate-900 tracking-tighter">₹{totalRevenue.toLocaleString()}</span>
                    </div>
                </div>
                <div className="glass-card rounded-3xl border border-white/40 p-5 sm:p-8 premium-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <CheckCircle size={60} />
                    </div>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-3">Realized Revenue</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-emerald-600 tracking-tighter">₹{totalPaid.toLocaleString()}</span>
                    </div>
                    <div className="mt-4 h-1.5 w-full bg-emerald-100 rounded-full overflow-hidden shadow-inner">
                        <div 
                            className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                            style={{ width: `${Math.min(100, (totalPaid / (totalRevenue || 1)) * 100)}%` }}
                        />
                    </div>
                </div>
                <div className="glass-card rounded-3xl border border-white/40 p-5 sm:p-8 premium-shadow relative overflow-hidden group bg-rose-50/10">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <ZapOff size={60} />
                    </div>
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mb-3">Outstanding Credit</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-rose-600 tracking-tighter">₹{totalDue.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Distribution Workflow */}
            <div className="glass-card rounded-4xl border border-white/40 p-5 sm:p-10 premium-shadow">
                <div className="flex items-center justify-between mb-6 sm:mb-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                            <Package size={20} />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Distribution Console</h2>
                    </div>
                </div>

                <div className="relative mb-10">
                    <div className="absolute inset-0 bg-slate-50/50 rounded-2xl sm:rounded-3xl border border-dashed border-slate-200 -z-10" />
                    <div className="p-5 sm:p-10">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                            <div>
                                <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] mb-1">Step 1: Identity Token</h3>
                                <p className="text-slate-400 font-medium text-xs">Scan or enter the unique member identifier</p>
                            </div>
                            <button 
                                onClick={() => setIsScanning(true)}
                                className="h-12 px-6 rounded-2xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-3 shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all active:scale-95"
                            >
                                <Camera size={18} />
                                Launch Scanner
                            </button>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-1">
                                <input
                                    value={memberUID}
                                    onChange={e => setMemberUID(e.target.value)}
                                    placeholder="Enter Member ID (e.g. BCTA-001)"
                                    className="w-full h-14 px-6 rounded-2xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-slate-800 placeholder:text-slate-300 shadow-inner"
                                />
                                {verifying && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <div className="w-5 h-5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={() => verifyMember()} 
                                disabled={verifying} 
                                className="h-14 px-10 rounded-2xl bg-slate-900 text-white font-black text-sm uppercase tracking-widest hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                            >
                                Verify ID
                            </button>
                        </div>
                    </div>
                </div>

                {/* Premium Scanner Modal/Overlay */}
                {isScanning && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/90 backdrop-blur-sm animate-fade-in">
                        <div className="w-full max-w-md bg-slate-900 rounded-[2.5rem] sm:rounded-[40px] p-6 sm:p-8 border border-white/10 shadow-2xl relative overflow-hidden">
                            <div className="flex items-center justify-between mb-6 sm:mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-50/500/10 rounded-xl flex items-center justify-center text-indigo-400">
                                        <ScanLine size={20} />
                                    </div>
                                    <h3 className="text-xl font-bold text-white tracking-tight">Member Scanner</h3>
                                </div>
                                <button onClick={() => setIsScanning(false)} className="p-2 text-slate-400 hover:text-white transition-colors bg-white/5 rounded-full">
                                    <X size={20} />
                                </button>
                            </div>

                             <div className="relative aspect-square rounded-[36px] overflow-hidden border-4 border-slate-800 shadow-2xl group">
                                 {/* Premium Scanner Container */}
                                <div className="absolute inset-0 z-10 pointer-events-none border-12 border-slate-900">
                                    {/* Glowing Corners */}
                                    <div className="absolute top-2 left-2 w-16 h-16 border-t-5 border-l-5 border-indigo-500 rounded-tl-2xl shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                                    <div className="absolute top-2 right-2 w-16 h-16 border-t-5 border-r-5 border-indigo-500 rounded-tr-2xl shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                                    <div className="absolute bottom-2 left-2 w-16 h-16 border-b-5 border-l-5 border-indigo-500 rounded-bl-2xl shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                                    <div className="absolute bottom-2 right-2 w-16 h-16 border-b-5 border-r-5 border-indigo-500 rounded-br-2xl shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                                    
                                    {/* Scanning Laser Line */}
                                    <div className="absolute top-0 left-0 w-full h-[2px] bg-linear-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_10px_rgba(96,165,250,0.8)] animate-scan-laser"></div>
                                </div>

                                <Scanner
                                    onScan={handleScan}
                                    onError={(e) => toast.error("Camera error")}
                                    styles={{ container: { height: '100%', width: '100%', backgroundColor: '#0f172a' } }}
                                    constraints={{ facingMode: 'environment' }}
                                    components={{
                                        onOff: false,
                                        torch: false,
                                        zoom: false,
                                        finder: false,
                                    }}
                                />

                                {/* Torch Toggle Button - Visible only on Mobile or if explicitly supported */}
                                {(torchSupported || isMobile) && (
                                    <button 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            const newState = !torchOn;
                                            setTorchOn(newState);
                                            toast.success(newState ? "Flashlight On" : "Flashlight Off", { duration: 1000 });
                                        }}
                                        className={`absolute bottom-6 right-6 z-20 p-5 rounded-full transition-all duration-300 transform active:scale-95 ${torchOn ? 'bg-yellow-400 text-black shadow-[0_0_25px_rgba(250,204,21,0.6)] scale-110' : 'bg-white/10 text-white backdrop-blur-md border border-white/20'}`}
                                    >
                                        {torchOn ? <Zap size={28} fill="currentColor" /> : <ZapOff size={28} />}
                                    </button>
                                )}

                                <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-2.5 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/5">
                                    <div className="w-1 h-1 bg-indigo-50/500 rounded-full animate-pulse"></div>
                                    <span className="text-[8px] font-black text-white/90 uppercase tracking-[2px]">Terminal Active</span>
                                </div>
                            </div>

                            <p className="text-center text-slate-400 text-sm font-medium px-4 mb-2 mt-8">Align the member's QR code within the frame for instant verification.</p>
                            <button onClick={() => setIsScanning(false)} className="w-full py-4 text-xs font-black text-white/40 uppercase tracking-[3px] hover:text-white/60 transition-colors">
                                Cancel Scan
                            </button>

                            {/* Background Glow */}
                            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>
                        </div>
                    </div>
                )}

                {memberProfile && (
                    <div className="mb-10 p-5 sm:p-8 bg-indigo-50/50 rounded-3xl border border-indigo-100 flex flex-col sm:flex-row items-center gap-6 animate-slide-up relative overflow-hidden group/profile">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover/profile:scale-110 transition-transform duration-700">
                             <CheckCircle size={80} />
                        </div>
                        <div className="flex items-center gap-5 flex-1 relative z-10">
                            {memberProfile.photoURL ? (
                                <img src={memberProfile.photoURL} alt="" className="w-16 h-16 rounded-[24px] object-cover ring-4 ring-white shadow-xl" />
                            ) : (
                                <div className="w-16 h-16 bg-indigo-600 rounded-[24px] flex items-center justify-center text-white font-black text-2xl shadow-xl ring-4 ring-white">
                                    {memberProfile.name?.[0]}
                                </div>
                            )}
                            <div>
                                <h4 className="text-xl font-black text-slate-900 tracking-tight">{memberProfile.name} {memberProfile.surname}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">{memberProfile.memberId}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 relative z-10">
                            <span className="bg-white/80 backdrop-blur-md text-emerald-600 text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest border border-emerald-100 shadow-sm flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Registry Match
                            </span>
                            <button onClick={() => setMemberProfile(null)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                )}

                {memberProfile && (
                    <form onSubmit={handleDistribute} className="space-y-8 animate-fade-in border-t border-slate-100 pt-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-1.5 h-8 bg-indigo-600 rounded-full" />
                            <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em]">Step 2: Distribution Details</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Product Description</label>
                                <input 
                                    value={form.productName} 
                                    onChange={e => setForm(p => ({ ...p, productName: e.target.value }))}
                                    required 
                                    placeholder="e.g. iPhone Screen, Battery, etc." 
                                    className="w-full h-14 px-6 rounded-2xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold text-slate-800 shadow-inner" 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Quantity</label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    value={form.quantity}
                                    onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                                    required 
                                    className="w-full h-14 px-6 rounded-2xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold text-slate-800 shadow-inner" 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Unit Valuation (₹)</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    value={form.totalAmount}
                                    onChange={e => setForm(p => ({ ...p, totalAmount: e.target.value }))}
                                    required 
                                    placeholder="0.00" 
                                    className="w-full h-14 px-6 rounded-2xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold text-slate-800 shadow-inner" 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Immediate Deposit (₹)</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        value={form.paidAmount}
                                        onChange={e => setForm(p => ({ ...p, paidAmount: e.target.value }))}
                                        placeholder="0.00" 
                                        className="w-full h-14 px-6 rounded-2xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold text-slate-800 shadow-inner" 
                                    />
                                    {form.totalAmount && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-rose-50 border border-rose-100 flex items-center gap-2">
                                            <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Balance Due:</span>
                                            <span className="text-xs font-black text-rose-600">₹{Math.max(0, parseFloat(form.totalAmount || "0") - parseFloat(form.paidAmount || "0")).toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button 
                                type="submit" 
                                disabled={submitting || !memberProfile} 
                                className="flex-1 h-14 rounded-2xl bg-indigo-600 text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={20} />}
                                {submitting ? "Processing..." : "Authorize Distribution"}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            <div className="glass-card rounded-4xl border border-white/40 p-5 sm:p-10 premium-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6 sm:mb-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                            <CreditCard size={20} />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Distribution History</h2>
                    </div>
                </div>

                <div className="overflow-x-auto -mx-2">
                    <table className="w-full text-left border-separate border-spacing-y-4">
                        <thead className="hidden md:table-header-group">
                            <tr className="text-slate-400">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em]">Distributed To</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em]">Product Details</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em]">Total Value</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em]">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-right">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="block md:table-row-group">
                            {products.map(p => (
                                <tr key={p.id} className="block md:table-row bg-white/50 border border-slate-100 rounded-3xl md:rounded-none mb-4 md:mb-0 group hover:bg-white transition-all duration-300">
                                    <td className="block md:table-cell px-6 py-5 rounded-t-3xl md:rounded-l-3xl md:rounded-tr-none border-x border-t border-slate-100 md:border-y md:border-r-0 md:border-l">
                                         <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                <div className="text-xs font-black">{p.memberName?.[0]}</div>
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 tracking-tight leading-none mb-1">{p.memberName}</p>
                                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{p.memberId}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="block md:table-cell px-6 py-5 border-x border-slate-100 md:border-y md:border-x-0">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-700">{p.productName}</span>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Quantity: {p.quantity}</span>
                                        </div>
                                    </td>
                                    <td className="block md:table-cell px-6 py-5 border-x border-slate-100 md:border-y md:border-x-0">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-slate-900">₹{p.totalAmount}</span>
                                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">Paid: ₹{p.paidAmount}</span>
                                        </div>
                                    </td>
                                    <td className="block md:table-cell px-6 py-5 border-x border-slate-100 md:border-y md:border-x-0">
                                        {parseFloat(p.remainingAmount as string) > 0 ? (
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-100">
                                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                                <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest leading-none">Due: ₹{p.remainingAmount}</span>
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100">
                                                <CheckCircle size={10} className="text-emerald-500" />
                                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none">Settled</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="block md:table-cell px-6 py-5 rounded-b-3xl md:rounded-r-3xl md:rounded-bl-none border-x border-b border-slate-100 md:border-y md:border-l-0 md:border-r text-right">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {p.distributedAt?.toDate?.().toLocaleDateString("en-IN", { day: '2-digit', month: 'short' }) || 
                                             (p.distributedAt ? new Date(p.distributedAt).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' }) : "—")}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {products.length === 0 && (
                        <div className="py-20 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200 border border-slate-100">
                                <CreditCard size={40} />
                            </div>
                            <p className="text-xl font-black text-slate-900 mb-2">No Transactions</p>
                            <p className="text-slate-400 uppercase tracking-[0.2em] text-xs font-black">History is currently clear</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShopDetail;
