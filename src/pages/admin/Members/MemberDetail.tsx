import React, { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, collection, getDocs, query, where, Timestamp, DocumentData } from "firebase/firestore";
import { db } from "../../../firebase/firebaseConfig";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { 
    ArrowLeft, Edit, UserX, UserCheck, Phone, MapPin, 
    Droplet, Calendar, CreditCard, Activity, Award, 
    TrendingUp, ShieldCheck, Mail, AlertTriangle, Package, Trash2, X, QrCode
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { membersApi } from "../../../services/membersService";
import LoadingSkeleton, { CardSkeleton, TableSkeleton } from "../../../components/shared/LoadingSkeleton";

interface MemberDoc extends DocumentData {
    id: string;
    status?: string;
    photoURL?: string;
    name?: string;
    surname?: string;
    memberId?: string;
    email?: string;
    phone?: string;
    bloodGroup?: string;
    age?: number | string;
    shopAddress?: string;
    createdAt?: Timestamp;
    nomineeDetails?: {
        name: string;
        relation: string;
        phone: string;
    };
}

interface ProductDoc extends DocumentData {
    totalAmount?: number;
    paidAmount?: number;
    remainingAmount?: number;
    productName?: string;
    quantity?: number;
    distributedAt?: Timestamp;
}

const MemberDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [member, setMember] = useState<MemberDoc | null>(null);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [products, setProducts] = useState<ProductDoc[]>([]);
    const [meetings, setMeetings] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [showID, setShowID] = useState<boolean>(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                setLoading(true);
                let memberData: MemberDoc | null = null;
                const memberSnap = await getDoc(doc(db, "users", id));

                if (memberSnap.exists()) {
                    memberData = { id: memberSnap.id, ...memberSnap.data() } as MemberDoc;
                } else {
                    const qMember = query(collection(db, "users"), where("memberId", "==", id));
                    const qSnap = await getDocs(qMember);
                    if (!qSnap.empty) {
                        const foundDoc = qSnap.docs[0];
                        memberData = { id: foundDoc.id, ...foundDoc.data() } as MemberDoc;
                    }
                }

                if (memberData) {
                    setMember(memberData);
                    const canonicalId = memberData.id;
                    
                    try {
                        const attSnap = await getDocs(query(collection(db, "attendance"), where("memberUID", "==", canonicalId)));
                        setAttendance(attSnap.docs.map(d => d.data()));
                    } catch (err) {
                        console.error("⚠️ Attendance Fetch Error:", err);
                    }

                    try {
                        const prodSnap = await getDocs(query(collection(db, "products"), where("memberUID", "==", canonicalId)));
                        setProducts(prodSnap.docs.map(d => d.data() as ProductDoc));
                    } catch (err) {
                        console.error("⚠️ Products Fetch Error:", err);
                    }

                    try {
                        const meetSnap = await getDocs(collection(db, "meetings"));
                        setMeetings(meetSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                    } catch (err) {
                        console.error("⚠️ Meetings Fetch Error:", err);
                    }
                }
            } catch (err) {
                console.error("❌ Profile Load Error:", err);
                toast.error("Failed to load member profile");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const toggleBlock = () => {
        if (!member) return;
        const previousStatus = member.status;
        const newStatus = previousStatus === "active" ? "blocked" : "active";
        
        // Optimistic update
        setMember(p => p ? { ...p, status: newStatus } : null);
        toast.success(`Member ${newStatus}`);

        // Fire and forget
        (async () => {
            try {
                const memberRef = doc(db, "users", member.id);
                await updateDoc(memberRef, { status: newStatus });
                if (newStatus === "blocked") {
                    await membersApi.revokeTokens(member.id);
                }
            } catch (err) {
                console.error("Block/Unblock failed:", err);
                setMember(p => p ? { ...p, status: previousStatus } : null);
                toast.error("Failed to update status on server. Reverted.");
            }
        })();
    };

    const handleDelete = () => {
        if (!member) return;
        if (!window.confirm("Permanently delete this member? All login access and data records will be destroyed.")) return;
        
        // Optimistic navigation
        toast.success("Deleting member in background...");
        navigate("/admin/members");

        // Fire and forget
        membersApi.delete(member.id).then(() => {
            toast.success("Member record destroyed successfully");
        }).catch((err: any) => {
            console.error("Deletion failed:", err);
            toast.error(err.message || "Deletion failed on server");
        });
    };

    // Removed full-page blocking loader

    if (!member) return (
        <div className="max-w-6xl mx-auto p-8 text-center min-h-[60vh] flex items-center justify-center">
            <div className="card shadow-2xl border border-slate-200/60 p-12 max-w-lg bg-white rounded-3xl">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <AlertTriangle size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Record Not Found</h2>
                <p className="text-slate-500 mb-8 font-medium leading-relaxed">The member record you're attempting to access doesn't exist or has been permanently removed from our secure database.</p>
                    <button onClick={() => navigate("/admin/members")} className="btn-primary w-full py-4 text-base shadow-xl shadow-slate-200 hover:shadow-slate-300 transition-all font-bold rounded-2xl">
                    Back to Directory
                </button>
            </div>
        </div>
    );

    const totalSpent = products.reduce((s, p) => s + (p.totalAmount || 0), 0);
    const totalPaid = products.reduce((s, p) => s + (p.paidAmount || 0), 0);
    const totalDue = products.reduce((s, p) => s + (p.remainingAmount || 0), 0);
    const attendanceRate = meetings.length > 0 ? Math.round((attendance.length / meetings.length) * 100) : 0;
    const paymentProgress = totalSpent > 0 ? Math.round((totalPaid / totalSpent) * 100) : 100;

    return (
        <div className="space-y-8 animate-fade-in pb-20 max-w-7xl mx-auto px-4 sm:px-6">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-500 hover:text-[#000080] hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm hover:shadow-lg hover:-translate-x-1"
                    >
                        <ArrowLeft size={22} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Executive Profile</h1>
                            {member.status === "active" ? (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100 shadow-sm">
                                    <ShieldCheck size={12} /> Verified Member
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-slate-200 shadow-sm">
                                    <UserX size={12} /> Restricted Access
                                </span>
                            )}
                        </div>
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1 opacity-70">BCTA Management System • {new Date().getFullYear()}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <Link to={`/admin/members/${member.id}/edit`} className="btn-secondary py-3 px-6 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all border-slate-200 shadow-sm hover:shadow-md">
                        <Edit size={18} /> Edit Records
                    </Link>
                    <button 
                        onClick={() => setShowID(true)}
                        className="py-3 px-6 bg-slate-900 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-md group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-linear-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <QrCode size={18} className="text-blue-400" /> Digital ID
                    </button>
                    <button onClick={toggleBlock}
                        className={`py-3 px-6 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-lg ${member.status === "active" ? "bg-white text-red-600 border border-red-100 hover:bg-red-50" : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200"}`}>
                        {member.status === "active" ? <><UserX size={18} /> Block Member</> : <><UserCheck size={18} /> Unblock Member</>}
                    </button>
                    <button onClick={handleDelete}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-red-100 text-red-500 hover:bg-red-50 transition-all shadow-sm">
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>

            {/* Profile Hero Card */}
            <div className="relative group p-1">
                <div className="absolute inset-0 bg-linear-to-r from-blue-600/10 to-indigo-600/10 rounded-[2.5rem] blur-3xl opacity-50"></div>
                <div className="card p-0! overflow-hidden bg-white border border-slate-200/60 shadow-xl rounded-[2.5rem] relative">
                    {/* Visual Decor */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 opacity-40"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-50 rounded-full -ml-24 -mb-24 opacity-30"></div>

                    <div className="p-8 sm:p-12 flex flex-col lg:flex-row gap-10 items-center lg:items-start text-center lg:text-left relative z-10">
                        {/* Avatar Section */}
                        <div className="relative">
                            <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-[3rem] p-1.5 bg-linear-to-br from-blue-500 via-indigo-500 to-purple-500 shadow-2xl">
                                {loading ? (
                                    <div className="w-full h-full rounded-[2.75rem] bg-slate-800 animate-pulse border-4 border-white"></div>
                                ) : member?.photoURL ? (
                                    <img src={member.photoURL} alt="" loading="lazy" className="w-full h-full rounded-[2.75rem] object-cover border-4 border-white" />
                                ) : (
                                    <div className="w-full h-full bg-slate-900 rounded-[2.75rem] flex items-center justify-center text-white text-6xl font-black border-4 border-white relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-linear-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        {member?.name?.[0]}
                                    </div>
                                )}
                            </div>
                            {!loading && (
                                <div className={`absolute -bottom-3 -right-3 w-12 h-12 rounded-2xl border-4 border-white shadow-xl flex items-center justify-center ${member?.status === "active" ? "bg-emerald-500 text-white" : "bg-slate-400 text-white"}`}>
                                    {member?.status === "active" ? <ShieldCheck size={24} /> : <UserX size={24} />}
                                </div>
                            )}
                        </div>

                        {/* Info Section */}
                        <div className="flex-1 space-y-6">
                            <div>
                                {loading ? (
                                    <>
                                        <div className="h-10 w-64 bg-slate-100 rounded animate-pulse mb-4"></div>
                                        <div className="h-4 w-48 bg-slate-50 rounded animate-pulse"></div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mb-3">
                                            <h2 className="text-4xl sm:text-5xl font-black text-slate-800 tracking-tight leading-none">{member?.name} {member?.surname}</h2>
                                            <div className="px-4 py-1.5 bg-[#000080] text-white text-xs font-black uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-slate-200">
                                                {member?.memberId}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-slate-500">
                                            <span className="flex items-center gap-2 font-bold text-sm">
                                                <Mail size={16} className="text-[#000080]" /> {member?.email}
                                            </span>
                                            <span className="flex items-center gap-2 font-bold text-sm">
                                                <Phone size={16} className="text-indigo-500" /> {member?.phone || "N/A"}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3">
                                {loading ? (
                                    Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 w-24 bg-slate-50 rounded-xl animate-pulse"></div>)
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2 bg-red-50 text-red-700 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl border border-red-100 shadow-sm">
                                            <Droplet size={14} /> {member?.bloodGroup || "O+"}
                                        </div>
                                        <div className="flex items-center gap-2 bg-slate-50 text-slate-700 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                                            <Calendar size={14} /> {member?.age} Yrs
                                        </div>
                                        <div className="flex items-center gap-2 bg-slate-50 text-[#000080] font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                                            <Activity size={14} /> {attendanceRate}% consistency
                                        </div>
                                        <div className="flex items-center gap-2 bg-amber-50 text-amber-700 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl border border-amber-100 shadow-sm">
                                            <Package size={14} /> {products.length} Items Received
                                        </div>
                                    </>
                                )}
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                                <div className="flex -space-x-3 overflow-hidden">
                                     {[...Array(5)].map((_, i) => (
                                         <div key={i} className={`inline-block h-8 w-8 rounded-full ring-2 ring-white ${i < Math.floor(attendanceRate/20) ? 'bg-[#000080]' : 'bg-slate-200'}`}></div>
                                     ))}
                                </div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Global Ranking: <span className="text-[#000080]">Top 15%</span></p>
                            </div>
                        </div>

                        {/* Highlight Stats */}
                        <div className="w-full lg:w-64 space-y-4">
                             <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform">
                                    <TrendingUp size={80} />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2 leading-none">
                                    <div className="w-1 h-1 rounded-full bg-[#000080]"></div> Total Value
                                </p>
                                <p className="text-4xl font-black tracking-tight mb-2 leading-none">₹{totalSpent}</p>
                                <div className="space-y-2 mt-4 pt-4 border-t border-white/10">
                                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                                        <span>DUE BALANCE</span>
                                        <span className="text-red-400">₹{totalDue}</span>
                                    </div>
                                    <div className="w-full bg-white/10 rounded-full h-1.5 p-0.5">
                                        <div className="bg-[#000080] h-full rounded-full transition-all duration-1000" style={{ width: `${paymentProgress}%` }}></div>
                                    </div>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Secondary Sidebar Stats */}
                <div className="space-y-8">
                    {/* Contact Detail Card */}
                    <div className="card p-8! bg-white border border-slate-200/60 shadow-lg rounded-4xl hover:shadow-xl transition-shadow relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-[#000080]"></div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                             <MapPin size={14} className="text-[#000080]" /> Location Profile
                        </h3>
                        <div className="space-y-10">
                            <div>
                                <p className="text-[10px] font-black text-[#000080] uppercase tracking-widest mb-2">Shop Residence</p>
                                <p className="text-base font-bold text-slate-800 leading-relaxed pr-6">{member.shopAddress || "Primary address not provided"}</p>
                            </div>
                            <div className="pt-8 border-t border-slate-100">
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4">Official Nominee</p>
                                {member.nomineeDetails?.name ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-lg">
                                                {member.nomineeDetails.name[0]}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-800 leading-none">{member.nomineeDetails.name}</p>
                                                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1.5 bg-indigo-50 px-2 py-0.5 rounded-md inline-block">{member.nomineeDetails.relation}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-500 font-bold text-sm bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                            <Phone size={14} /> {member.nomineeDetails.phone}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                                        <p className="text-xs font-bold text-slate-400">No nominee record on file</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats Card */}
                    <div className="card p-8! bg-slate-900 border-none shadow-2xl rounded-4xl text-white">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Historical Logs</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                                <div className="flex items-center gap-3">
                                    <Calendar size={18} className="text-blue-400" />
                                    <span className="text-xs font-bold text-slate-300">Member Since</span>
                                </div>
                                <span className="text-xs font-black">
                                    {member.createdAt && typeof member.createdAt.toDate === "function" ? member.createdAt.toDate().getFullYear() : "2024"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                                <div className="flex items-center gap-3">
                                    <Activity size={18} className="text-emerald-400" />
                                    <span className="text-xs font-bold text-slate-300">Last Scanned</span>
                                </div>
                                <span className="text-xs font-black">
                                    {attendance.length > 0 ? "2 Days Ago" : "Never"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Sections */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Insights Hub */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="card p-6! bg-white border border-slate-200/60 shadow-lg rounded-4xl flex flex-col items-center text-center group hover:bg-[#000080] transition-all duration-300">
                                <div className="w-14 h-14 bg-slate-50 text-[#000080] rounded-[1.25rem] flex items-center justify-center mb-4 group-hover:bg-white/10 group-hover:text-white transition-colors">
                                    <Activity size={24} />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 group-hover:text-white">Consistency</p>
                            <p className="text-3xl font-black text-slate-800 group-hover:text-white">{attendanceRate}%</p>
                        </div>
                        <div className="card p-6! bg-white border border-slate-200/60 shadow-lg rounded-4xl flex flex-col items-center text-center group hover:bg-emerald-600 transition-all duration-300">
                            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-[1.25rem] flex items-center justify-center mb-4 group-hover:bg-white/10 group-hover:text-white transition-colors">
                                <Award size={24} />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 group-hover:text-emerald-100">Participation</p>
                            <p className="text-3xl font-black text-slate-800 group-hover:text-white">{attendance.length}</p>
                        </div>
                        <div className="card p-6! bg-white border border-slate-200/60 shadow-lg rounded-4xl flex flex-col items-center text-center group hover:bg-indigo-600 transition-all duration-300">
                            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-[1.25rem] flex items-center justify-center mb-4 group-hover:bg-white/10 group-hover:text-white transition-colors">
                                <Package size={24} />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 group-hover:text-indigo-100">Allocations</p>
                            <p className="text-3xl font-black text-slate-800 group-hover:text-white">{products.length}</p>
                        </div>
                    </div>

                    {/* Allocation History Table */}
                    <div className="card p-0! overflow-hidden bg-white border border-slate-200/60 shadow-xl rounded-4xl">
                        <div className="p-8 sm:p-10 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                    <CreditCard size={24} className="text-[#000080]" /> Distribution Ledger
                                </h3>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Tracking item flow and financial dues</p>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ledger Items:</span>
                                <span className="text-xs font-black text-slate-800">{products.length}</span>
                            </div>
                        </div>

                        {products.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-slate-400 px-6 text-center">
                                <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner border border-slate-100">
                                    <Package size={36} />
                                </div>
                                <p className="text-lg font-black text-slate-600 mb-2">No Allocation History</p>
                                <p className="text-sm font-medium max-w-xs mx-auto text-slate-400 uppercase tracking-widest leading-loose">This member record hasn't been linked to any inventory distributions yet.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/80">
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Details</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Volume</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Financial Status</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Commitment Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {products.map((p, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div>
                                                        <p className="text-base font-black text-slate-800 leading-none">{p.productName}</p>
                                                        <p className="text-[10px] font-bold text-[#000080] mt-1.5 uppercase tracking-widest">Distributor: Internal System</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 text-center">
                                                    <span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1.5 rounded-xl border-2 border-white shadow-md inline-block min-w-14">
                                                        {p.quantity} UNIT
                                                    </span>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <div className="space-y-1.5">
                                                        <div className="flex justify-between items-end gap-6 mb-1">
                                                            <span className="text-sm font-black text-slate-800">₹{p.paidAmount} <span className="text-[10px] font-bold text-slate-400">PAID</span></span>
                                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${(p.remainingAmount ?? 0) <= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                                {(p.remainingAmount ?? 0) <= 0 ? 'Settled' : `₹${p.remainingAmount} DUE`}
                                                            </span>
                                                        </div>
                                                        <div className="w-32 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full ${(p.remainingAmount ?? 0) <= 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                                                 style={{ width: `${Math.min(100, ((p.paidAmount || 0) / (p.totalAmount || 1)) * 100)}%` }}></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <p className="text-sm font-black text-slate-800">
                                                        {p.distributedAt && typeof p.distributedAt.toDate === "function" ? p.distributedAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : "—"}
                                                    </p>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Premium Digital ID Card Modal */}
            {showID && member && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-fade-in">
                    <div className="w-full max-w-sm relative">
                        {/* Close Button */}
                        <button 
                            onClick={() => setShowID(false)}
                            className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white transition-colors bg-white/10 rounded-full"
                        >
                            <X size={24} />
                        </button>

                        {/* The Pass Card */}
                        <div className="relative group p-1 animate-scale-up">
                             {/* Shimmer Border */}
                            <div className="absolute inset-0 bg-conic-to-r from-blue-500 via-[#000040] to-blue-500 rounded-[2.5rem] animate-spin-slow opacity-50 blur-sm"></div>
                            
                            <div className="card p-0! overflow-hidden bg-slate-950 border border-white/10 shadow-2xl rounded-[2.4rem] relative">
                                {/* Pass Header */}
                                <div className="p-8 pb-4 flex items-center justify-between border-b border-white/5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                                            <div className="w-4 h-4 bg-blue-500 rounded-sm rotate-45"></div>
                                        </div>
                                        <span className="text-[10px] font-black text-white/80 uppercase tracking-[0.2em]">BCTA EXECUTIVE</span>
                                    </div>
                                    <div className="px-2.5 py-1 bg-white/10 rounded-full border border-white/10 flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                                        <span className="text-[8px] font-black text-white/60 tracking-widest uppercase">Verified</span>
                                    </div>
                                </div>

                                <div className="p-8 space-y-8">
                                    {/* Member Info */}
                                    <div className="flex items-center gap-6">
                                        <div className="w-24 h-24 rounded-2xl p-1 bg-linear-to-br from-white/20 to-transparent shadow-xl">
                                            {member.photoURL ? (
                                                <img src={member.photoURL} alt="" className="w-full h-full rounded-xl object-cover border border-white/10" />
                                            ) : (
                                                <div className="w-full h-full bg-[#000040] rounded-xl flex items-center justify-center text-white text-3xl font-black">
                                                    {member.name?.[0]}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-white tracking-tight leading-none mb-2">
                                                {member.name}<br />{member.surname}
                                            </h3>
                                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] bg-blue-500/10 px-2 py-1 rounded inline-block">
                                                {member.memberId}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Premium QR Section */}
                                    <div className="relative group/qr flex justify-center py-4">
                                        <div className="absolute inset-0 bg-blue-500/5 rounded-3xl blur-2xl group-hover/qr:bg-blue-500/10 transition-all duration-500"></div>
                                        <div className="relative p-6 bg-white rounded-3xl shadow-2xl border border-white/5 group-hover/qr:scale-105 transition-transform duration-500">
                                            <QRCodeSVG
                                                value={JSON.stringify({ type: "member", uid: member.id, memberId: member.memberId })}
                                                size={160}
                                                level="H"
                                                includeMargin={false}
                                                fgColor="#000040"
                                            />
                                            {/* Corner Accents */}
                                            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#000040]/20 rounded-tl-lg"></div>
                                            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#000040]/20 rounded-tr-lg"></div>
                                            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#000040]/20 rounded-bl-lg"></div>
                                            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#000040]/20 rounded-br-lg"></div>
                                        </div>
                                    </div>

                                    <p className="text-center text-[10px] text-white/30 font-bold uppercase tracking-widest leading-relaxed">
                                        🔒 SECURED THROUGH BCTA BLOCKCHAIN IDENTITY<br />
                                        VALID FOR {new Date().getFullYear()} FISCAL YEAR
                                    </p>
                                </div>
                                
                                {/* Security Strip */}
                                <div className="h-2 bg-linear-to-r from-[#000040] via-blue-600 to-[#000040] opacity-80 shadow-[0_0_20px_rgba(37,99,235,0.3)]"></div>
                            </div>
                        </div>

                        {/* ID Controls */}
                        <div className="flex gap-3 mt-8">
                             <button onClick={() => window.print()} className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all backdrop-blur-sm border border-white/5">
                                Print Pass
                             </button>
                             <button onClick={() => setShowID(false)} className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95 shadow-xl">
                                Close
                             </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MemberDetail;
