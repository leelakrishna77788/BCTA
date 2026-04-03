import React, { useEffect, useState } from "react";
import {
    collection, getDocs, query, where, doc, getDoc, addDoc, serverTimestamp, orderBy
} from "firebase/firestore";
import { db } from "../../../firebase/firebaseConfig";
import { useParams, useNavigate } from "react-router-dom";
import { Scanner, IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import { ArrowLeft, CheckCircle, Package, CreditCard, ScanLine, Camera, X, Zap, ZapOff } from "lucide-react";

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
                
                if (torchOn) {
                    await track.applyConstraints({
                        advanced: [{ torch: true }]
                    } as any);
                }
            } catch (e) {
                console.warn("Torch interaction error:", e);
            }
        }, 1500);

        return () => clearTimeout(timer);
    }, [isScanning, torchOn]);

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
            <div className="w-8 h-8 border-4 border-[#000080] border-t-transparent rounded-full animate-spin" />
        </div>
    );

    const totalRevenue = products.reduce((s, p) => s + (parseFloat(p.totalAmount as string) || 0), 0);
    const totalPaid = products.reduce((s, p) => s + (parseFloat(p.paidAmount as string) || 0), 0);
    const totalDue = products.reduce((s, p) => s + (parseFloat(p.remainingAmount as string) || 0), 0);

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
                    <Package size={18} className="text-[#000080]" /> Distribute Product
                </h2>

                <div className="mb-6 p-5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-bold text-[#000080]">Step 1: Identify Member</p>
                        <button 
                            onClick={() => setIsScanning(true)}
                            className="text-xs font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-slate-100 transition-colors shadow-sm"
                        >
                            <Camera size={14} className="text-blue-600" />
                            Scan QR Code
                        </button>
                    </div>
                    
                    <div className="flex gap-2">
                        <input
                            value={memberUID}
                            onChange={e => setMemberUID(e.target.value)}
                            placeholder="Enter Member ID (e.g. BCTA-001)"
                            className="input-field flex-1 bg-white"
                        />
                        <button onClick={() => verifyMember()} disabled={verifying} className="btn-primary whitespace-nowrap px-6">
                            {verifying ? "Checking..." : "Verify"}
                        </button>
                    </div>
                </div>

                {/* Premium Scanner Modal/Overlay */}
                {isScanning && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-fade-in">
                        <div className="w-full max-w-md bg-slate-900 rounded-[40px] p-8 border border-white/10 shadow-2xl relative overflow-hidden">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
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
                                    <div className="absolute top-2 left-2 w-16 h-16 border-t-5 border-l-5 border-blue-500 rounded-tl-2xl shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                                    <div className="absolute top-2 right-2 w-16 h-16 border-t-5 border-r-5 border-blue-500 rounded-tr-2xl shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                                    <div className="absolute bottom-2 left-2 w-16 h-16 border-b-5 border-l-5 border-blue-500 rounded-bl-2xl shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                                    <div className="absolute bottom-2 right-2 w-16 h-16 border-b-5 border-r-5 border-blue-500 rounded-br-2xl shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                                    
                                    {/* Scanning Laser Line */}
                                    <div className="absolute top-0 left-0 w-full h-[2px] bg-linear-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_10px_rgba(96,165,250,0.8)] animate-scan-laser"></div>
                                </div>

                                <Scanner
                                    onScan={handleScan}
                                    onError={(e) => toast.error("Camera error")}
                                    styles={{ container: { height: '100%', width: '100%', backgroundColor: '#0f172a' } }}
                                    constraints={{ facingMode: 'environment' }}
                                />

                                {/* Torch Toggle Button - Visible on Mobile or if detected */}
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
                                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
                                    <span className="text-[8px] font-black text-white/90 uppercase tracking-[2px]">Terminal Active</span>
                                </div>
                            </div>

                            <p className="text-center text-slate-400 text-sm font-medium px-4 mb-2 mt-8">Align the member's QR code within the frame for instant verification.</p>
                            <button onClick={() => setIsScanning(false)} className="w-full py-4 text-xs font-black text-white/40 uppercase tracking-[3px] hover:text-white/60 transition-colors">
                                Cancel Scan
                            </button>

                            {/* Background Glow */}
                            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
                        </div>
                    </div>
                )}

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
                        <p className="text-sm font-bold text-[#000080]">Step 2: Enter Product Details</p>
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
                                        Remaining Due: ₹{Math.max(0, parseFloat(form.totalAmount || "0") - parseFloat(form.paidAmount || "0")).toFixed(2)}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button type="submit" disabled={submitting || !memberProfile} className="btn-primary w-full md:w-auto px-8">
                            {submitting ? "Recording..." : "Complete Distribution"}
                        </button>
                    </form>
                )}
            </div>

            <div className="card bg-white border border-slate-200">
                <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <CreditCard size={18} className="text-violet-600" /> Distribution History ({products.length})
                </h2>
                <div className="flex justify-center p-5 bg-white border border-slate-100 rounded-2xl mb-4 shadow-sm animate-fade-in">
                    <QRCodeSVG
                        id={`shop-qr-${shop?.id}`}
                        value={JSON.stringify({ type: "shop", shopId: shop?.id, shopName: shop?.shopName })}
                        size={140}
                        level="H"
                        includeMargin={false}
                        fgColor="#000040"
                    />
                </div>
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
                                        <p className="text-xs font-mono font-bold text-[#000080]">{p.memberId}</p>
                                    </td>
                                    <td className="table-cell font-medium">{p.productName}</td>
                                    <td className="table-cell">{p.quantity}</td>
                                    <td className="table-cell font-bold">₹{p.totalAmount}</td>
                                    <td className="table-cell text-emerald-600 font-bold">₹{p.paidAmount}</td>
                                    <td className="table-cell">
                                        <span className={`font-bold ${parseFloat(p.remainingAmount as string) > 0 ? "text-rose-500 font-bold bg-rose-50 px-2 py-0.5 rounded" : "text-emerald-600"}`}>
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
