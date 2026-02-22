import React, { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs, query, where, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Edit, UserX, UserCheck, Phone, MapPin, Droplet, Calendar, CreditCard } from "lucide-react";
import { membersApi } from "../../../services/api";

const MemberDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [member, setMember] = useState(null);
    const [attendance, setAttendance] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const [memberSnap, attSnap, prodSnap] = await Promise.all([
                getDoc(doc(db, "users", id)),
                getDocs(query(collection(db, "attendance"), where("memberUID", "==", id))),
                getDocs(query(collection(db, "products"), where("memberUID", "==", id))),
            ]);
            if (memberSnap.exists()) setMember({ id: memberSnap.id, ...memberSnap.data() });
            setAttendance(attSnap.docs.map(d => d.data()));
            setProducts(prodSnap.docs.map(d => d.data()));
            setLoading(false);
        };
        fetchData();
    }, [id]);

    const toggleBlock = async () => {
        try {
            if (member.status === "active") {
                await membersApi.block(id);
                setMember(p => ({ ...p, status: "blocked" }));
                toast.success(`Member blocked`);
            } else {
                await membersApi.unblock(id);
                setMember(p => ({ ...p, status: "active" }));
                toast.success(`Member unblocked`);
            }
        } catch (err) {
            toast.error(err.message || "Failed to update member status");
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );
    if (!member) return <div className="card text-center text-slate-500">Member not found</div>;

    const totalDue = products.reduce((s, p) => s + (p.remainingAmount || 0), 0);

    return (
        <div className="space-y-6 animate-fade-in pb-12 max-w-6xl mx-auto">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200/60 text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm hover:shadow-md hover:-translate-x-0.5"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="page-title mb-1 drop-shadow-sm text-3xl">Member Profile</h1>
                    <p className="text-slate-500 font-medium text-sm">Detailed view of member records and history</p>
                </div>
            </div>

            {/* Profile Header */}
            <div className="card !p-0 overflow-hidden bg-white/60 backdrop-blur-xl border border-white shadow-xl shadow-slate-200/50">
                {/* Banner Gradient */}
                <div className="h-32 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] mixer-blend-overlay"></div>
                    <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-white/20 rounded-full blur-2xl"></div>
                    <div className="absolute top-4 right-4 flex gap-2 z-10">
                        <Link to={`/admin/members/${id}/edit`} className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-md px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors border border-white/20 shadow-sm">
                            <Edit size={16} /> Edit Profile
                        </Link>
                        <button onClick={toggleBlock}
                            className={`backdrop-blur-md px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors border shadow-sm ${member.status === "active" ? "bg-red-500/80 hover:bg-red-500 text-white border-red-400/50" : "bg-emerald-500/80 hover:bg-emerald-500 text-white border-emerald-400/50"}`}>
                            {member.status === "active" ? <><UserX size={16} /> Block User</> : <><UserCheck size={16} /> Unblock User</>}
                        </button>
                    </div>
                </div>

                <div className="px-6 sm:px-10 pb-8 flex flex-col md:flex-row gap-6 items-start md:items-end -mt-16 relative z-10">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-white rounded-[2rem] blur-md opacity-50 group-hover:opacity-100 transition-opacity"></div>
                        {member.photoURL ? (
                            <img src={member.photoURL} alt="" className="relative w-32 h-32 rounded-[2rem] object-cover border-4 border-white shadow-xl transition-transform group-hover:scale-105" />
                        ) : (
                            <div className="relative w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[2rem] flex items-center justify-center text-white text-4xl font-extrabold border-4 border-white shadow-xl transition-transform group-hover:scale-105">
                                {member.name?.[0]}
                            </div>
                        )}
                        <span className={`absolute -bottom-2 -right-2 text-xs font-bold px-3 py-1 rounded-lg border-2 border-white shadow-lg uppercase tracking-wider ${member.status === "active" ? "bg-emerald-500 text-white" : "bg-slate-500 text-white"}`}>
                            <div className="flex items-center gap-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${member.status === "active" ? "bg-emerald-200 animate-pulse" : "bg-slate-300"}`}></div>
                                {member.status}
                            </div>
                        </span>
                    </div>

                    <div className="flex-1 pt-4 md:pt-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">{member.name} {member.surname}</h2>
                            <span className="font-mono text-sm uppercase font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100/50 inline-block w-fit">
                                {member.memberId}
                            </span>
                        </div>
                        <p className="text-slate-500 font-medium flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                            {member.email}
                        </p>

                        <div className="flex flex-wrap gap-3 mt-5">
                            <span className="flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-100/50 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">
                                <Droplet size={14} className="opacity-70" /> {member.bloodGroup || "Unknown"} Blood
                            </span>
                            <span className="flex items-center gap-1.5 bg-slate-100 text-slate-700 border border-slate-200/50 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">
                                <Calendar size={14} className="opacity-70" /> {member.age} Years Old
                            </span>
                            <span className="flex items-center gap-1.5 bg-slate-100 text-slate-700 border border-slate-200/50 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm font-mono">
                                UID: ****{member.aadhaarLast4}
                            </span>
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide border shadow-sm ${member.paymentStatus === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : member.paymentStatus === "partial" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                                {member.paymentStatus} Payment
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Shop & Nominee */}
                <div className="card bg-white/60 backdrop-blur-xl border border-white shadow-xl shadow-slate-200/50 lg:col-span-1 h-full">
                    <h3 className="text-sm font-bold text-slate-800 mb-6 tracking-tight uppercase border-b border-slate-100 pb-4">Contact Details</h3>
                    <div className="space-y-6">
                        <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50/50 border border-slate-100 transition-colors hover:bg-blue-50/30 hover:border-blue-100 group">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                <MapPin size={20} />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Registered Shop Address</p>
                                <p className="text-sm font-medium text-slate-700 leading-relaxed">{member.shopAddress || <span className="text-slate-400 italic">No address provided</span>}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50/50 border border-slate-100 transition-colors hover:bg-violet-50/30 hover:border-violet-100 group">
                            <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                <Phone size={20} />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Emergency Nominee</p>
                                {member.nomineeDetails?.name ? (
                                    <>
                                        <p className="text-sm font-bold text-slate-800">{member.nomineeDetails.name} <span className="text-xs font-semibold text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded ml-1">{member.nomineeDetails.relation}</span></p>
                                        <p className="text-sm font-medium text-slate-600 mt-1 flex items-center gap-1.5"><Phone size={12} className="opacity-50" /> {member.nomineeDetails.phone}</p>
                                    </>
                                ) : (
                                    <p className="text-sm font-medium text-slate-400 italic">No nominee registered</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="card bg-white/60 backdrop-blur-xl border border-white shadow-xl shadow-slate-200/50 lg:col-span-2">
                    <h3 className="text-sm font-bold text-slate-800 mb-6 tracking-tight uppercase border-b border-slate-100 pb-4">Activity Overview</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: "Meetings Attended", value: attendance.length, color: "bg-gradient-to-br from-blue-500 to-indigo-600", light: "bg-blue-50 text-blue-700 border-blue-100" },
                            { label: "Products Received", value: products.length, color: "bg-gradient-to-br from-violet-500 to-purple-600", light: "bg-violet-50 text-violet-700 border-violet-100" },
                            { label: "Total Pending Dues", value: `₹${totalDue}`, color: "bg-gradient-to-br from-rose-500 to-red-600", light: "bg-red-50 text-red-700 border-red-100" },
                            { label: "Account Gender", value: member.gender, color: "bg-gradient-to-br from-emerald-400 to-teal-500", light: "bg-emerald-50 text-emerald-700 border-emerald-100" },
                        ].map(s => (
                            <div key={s.label} className={`rounded-[1.5rem] p-5 border ${s.light} relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 shadow-sm hover:shadow-md`}>
                                <p className="text-3xl font-extrabold tracking-tight mb-1 relative z-10">{s.value}</p>
                                <p className="text-[11px] font-bold uppercase tracking-wider opacity-70 relative z-10">{s.label}</p>
                                <div className={`absolute -right-6 -bottom-6 w-20 h-20 rounded-full ${s.color} opacity-10 blur-xl group-hover:opacity-20 transition-opacity duration-300`}></div>
                            </div>
                        ))}
                    </div>

                    {/* Embedded small chart or recent activity summary could go here in a future update */}
                    <div className="mt-6 p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-slate-800">Account Created</p>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">
                                {member.createdAt?.toDate ? member.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : "Unknown"}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-slate-800">Last Active</p>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">
                                {attendance.length > 0 && attendance[attendance.length - 1]?.scannedAt?.toDate
                                    ? attendance[attendance.length - 1].scannedAt.toDate().toLocaleDateString()
                                    : "No recent activity"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Product History */}
            <div className="card !p-0 overflow-hidden bg-white/80 backdrop-blur-xl border border-white shadow-xl shadow-slate-200/50">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                            <CreditCard size={20} className="text-blue-500" /> Distribution History
                        </h3>
                        <p className="text-xs font-medium text-slate-500 mt-1">Record of all products distributed to this member</p>
                    </div>
                    <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200">
                        Total Items: {products.length}
                    </span>
                </div>

                {products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <span className="text-4xl mb-3 opacity-30">📦</span>
                        <p className="font-bold text-slate-600 mb-1">No products received</p>
                        <p className="text-sm font-medium">This member hasn't participated in any product distributions yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200/60">
                                    <th className="table-header pl-6 py-4 font-bold text-slate-700">Product Name</th>
                                    <th className="table-header py-4 font-bold text-slate-700">Quantity</th>
                                    <th className="table-header py-4 font-bold text-slate-700">Total Price</th>
                                    <th className="table-header py-4 font-bold text-slate-700">Paid Amount</th>
                                    <th className="table-header py-4 font-bold text-slate-700">Due Amount</th>
                                    <th className="table-header pr-6 py-4 font-bold text-slate-700 text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {products.map((p, i) => (
                                    <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="table-cell pl-6 py-4 font-bold text-slate-800">{p.productName}</td>
                                        <td className="table-cell py-4">
                                            <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-1 rounded border border-slate-200">
                                                {p.quantity} units
                                            </span>
                                        </td>
                                        <td className="table-cell py-4 font-medium text-slate-600">₹{p.totalAmount}</td>
                                        <td className="table-cell py-4 font-bold text-emerald-600">₹{p.paidAmount}</td>
                                        <td className="table-cell py-4 font-bold text-red-500">
                                            {p.remainingAmount > 0 ? `₹${p.remainingAmount}` : <span className="text-slate-400 font-medium">₹0</span>}
                                        </td>
                                        <td className="table-cell pr-6 py-4 text-slate-500 text-xs font-medium text-right">
                                            {p.distributedAt?.toDate ? p.distributedAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MemberDetail;
