import React, { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, collection, getDocs, query, where, Timestamp, DocumentData } from "firebase/firestore";
import { db } from "../../../firebase/firebaseConfig";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
    ArrowLeft, Edit, UserX, UserCheck, Phone, MapPin,
    Droplet, CreditCard, Activity,
    ShieldCheck, Mail, AlertTriangle, Package, Trash2, X, QrCode,
    BadgeCheck, CheckCircle2, CalendarDays
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { membersApi } from "../../../services/membersService";
import LoadingSkeleton, { CardSkeleton } from "../../../components/shared/LoadingSkeleton";

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
    paymentStatus?: string;
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

const MEMBER_ID_PATTERN = /^BCTA-\d{4}-\d+$/;

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
                        setAttendance(attSnap.docs.map((d) => d.data()));
                    } catch (err) {
                        console.error("Attendance fetch error:", err);
                    }

                    try {
                        const prodSnap = await getDocs(query(collection(db, "products"), where("memberUID", "==", canonicalId)));
                        setProducts(prodSnap.docs.map((d) => d.data() as ProductDoc));
                    } catch (err) {
                        console.error("Products fetch error:", err);
                    }

                    try {
                        const meetSnap = await getDocs(collection(db, "meetings"));
                        setMeetings(meetSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
                    } catch (err) {
                        console.error("Meetings fetch error:", err);
                    }
                }
            } catch (err) {
                console.error("Profile load error:", err);
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

        const updatePayload: any = { status: newStatus };
        let actionText = newStatus === "active" ? "unblocked" : "blocked";

        if (previousStatus === "pending" && newStatus === "active") {
            const year = new Date().getFullYear();
            const num = Math.floor(Math.random() * 900) + 100;
            updatePayload.memberId = `BCTA-${year}-${num}`;
            actionText = "approved";
        }

        setMember((p) => (p ? { ...p, ...updatePayload } : null));
        toast.success(`Member ${actionText}`);

        (async () => {
            try {
                const memberRef = doc(db, "users", member.id);
                await updateDoc(memberRef, updatePayload);
                if (newStatus === "blocked") {
                    await membersApi.revokeTokens(member.id);
                }
            } catch (err) {
                console.error("Block/unblock failed:", err);
                setMember((p) => (p ? { ...p, status: previousStatus } : null));
                toast.error("Failed to update status on server. Reverted.");
            }
        })();
    };

    const handleDelete = () => {
        if (!member) return;
        if (!window.confirm("Permanently delete this member? All login access and data records will be destroyed.")) return;

        toast.success("Deleting member in background...");
        navigate("/admin/members");

        membersApi.delete(member.id).then(() => {
            toast.success("Member record destroyed successfully");
        }).catch((err: any) => {
            console.error("Deletion failed:", err);
            toast.error(err.message || "Deletion failed on server");
        });
    };

    if (!member) return (
        <div className="max-w-6xl mx-auto p-8 text-center min-h-[60vh] flex items-center justify-center">
            <div className="card shadow-2xl border border-slate-200/60 p-12 max-w-lg bg-white rounded-3xl">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <AlertTriangle size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Record Not Found</h2>
                <p className="text-slate-500 mb-8 font-medium leading-relaxed">The member record you are trying to access does not exist or has been removed.</p>
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
    const fullName = `${member.name ?? ""} ${member.surname ?? ""}`.trim();
    const memberId = member.memberId?.trim() || "";
    const hasMemberId = memberId.length > 0;
    const memberIdVerified = hasMemberId && MEMBER_ID_PATTERN.test(memberId);
    const profileInitial = (member.name?.[0] ?? member.email?.[0] ?? "M").toUpperCase();
    const memberSince = member.createdAt && typeof member.createdAt.toDate === "function"
        ? member.createdAt.toDate().getFullYear()
        : new Date().getFullYear();
    const derivedPaymentStatus = member.paymentStatus || (totalDue <= 0 ? "paid" : "unpaid");
    const statusTone = member.status === "active"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-red-50 text-red-700 border-red-200";
    const paymentTone = derivedPaymentStatus === "paid"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-amber-50 text-amber-700 border-amber-200";

    if (loading) {
        return (
            <div className="mx-auto w-full max-w-6xl space-y-6 px-3 sm:px-0 animate-fade-in">
                <LoadingSkeleton height="2rem" width="220px" className="mb-2" />
                <div className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
                    <CardSkeleton />
                    <CardSkeleton />
                </div>
                <div className="card space-y-4">
                    <LoadingSkeleton height="1rem" width="35%" />
                    <LoadingSkeleton height="220px" borderRadius="1rem" />
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6 p-0 animate-fade-in pb-20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Member Profile</h1>
                        <p className="text-sm text-slate-500">Admin view with profile and account controls.</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/admin/members/${member.id}/edit`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        <Edit size={14} /> Edit
                    </Link>
                    <button
                        onClick={() => setShowID(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        <QrCode size={14} /> Digital ID
                    </button>
                    {member.status === "pending" ? (
                        <button onClick={toggleBlock} className="inline-flex items-center gap-1.5 rounded-lg bg-[#000080] px-3 py-2 text-xs font-semibold text-white hover:bg-[#000066]">
                            <UserCheck size={14} /> Approve
                        </button>
                    ) : (
                        <button
                            onClick={toggleBlock}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${member.status === "active" ? "border border-red-200 bg-white text-red-700 hover:bg-red-50" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                        >
                            {member.status === "active" ? <><UserX size={14} /> Block</> : <><UserCheck size={14} /> Unblock</>}
                        </button>
                    )}
                    <button
                        onClick={handleDelete}
                        className="h-9 w-9 flex items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>

            <section className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-[#0a1f5e] via-[#183b9a] to-[#2b62d4] p-5 text-white shadow-xl sm:p-8">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.22),_transparent_46%)]" />
                <div className="pointer-events-none absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
                <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.95fr)] lg:items-center">
                    <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
                        {member.photoURL ? (
                            <img
                                src={member.photoURL}
                                alt={`${fullName} profile photo`}
                                className="h-24 w-24 rounded-3xl object-cover ring-4 ring-white/20 shadow-xl sm:h-28 sm:w-28"
                            />
                        ) : (
                            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/15 text-4xl font-bold ring-4 ring-white/20 shadow-xl sm:h-28 sm:w-28">
                                {profileInitial}
                            </div>
                        )}

                        <div className="min-w-0 space-y-4">
                            <div className="space-y-1">
                                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{fullName || member.name}</h2>
                                <p className="text-sm text-white/80">{member.email || "No email on file"}</p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusTone}`}>
                                    <ShieldCheck size={12} /> {member.status || "unknown"}
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                                    <Droplet size={12} /> {member.bloodGroup || "Blood group not set"}
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                                    <BadgeCheck size={12} /> {hasMemberId ? memberId : "Member ID pending"}
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
                                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold ${memberIdVerified ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-100" : "border-amber-300/40 bg-amber-400/10 text-amber-100"}`}>
                                    {memberIdVerified ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                                    {memberIdVerified ? "Member ID verified" : "Member ID pending check"}
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 font-semibold text-white/80">
                                    Joined {memberSince}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                            <p className="text-xs uppercase tracking-[0.22em] text-white/60">Meetings</p>
                            <p className="mt-2 text-3xl font-bold">{attendance.length}</p>
                            <p className="mt-1 text-xs text-white/65">attended</p>
                        </div>
                        <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                            <p className="text-xs uppercase tracking-[0.22em] text-white/60">Payment</p>
                            <p className={`mt-2 text-2xl font-bold capitalize ${derivedPaymentStatus === "paid" ? "text-emerald-300" : "text-amber-300"}`}>
                                {derivedPaymentStatus}
                            </p>
                            <p className="mt-1 text-xs text-white/65">current status</p>
                        </div>
                        <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur sm:col-span-2 xl:col-span-1">
                            <p className="text-xs uppercase tracking-[0.22em] text-white/60">Member since</p>
                            <p className="mt-2 text-3xl font-bold">{memberSince}</p>
                            <p className="mt-1 text-xs text-white/65">joined the portal</p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.85fr)]">
                <div className="min-w-0 space-y-6">
                    <div className="card rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Personal Details</h2>
                                <p className="text-sm text-slate-500">Identity, account, and member-specific profile details.</p>
                            </div>
                            <Activity className="text-[#000080]" size={20} />
                        </div>

                        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {[
                                { label: "Member ID", value: hasMemberId ? memberId : "Pending assignment", icon: BadgeCheck },
                                { label: "Full Name", value: fullName || "-" },
                                { label: "Age", value: member.age ? `${member.age} years` : "-" },
                                { label: "Blood Group", value: member.bloodGroup || "-", icon: Droplet },
                                { label: "Email", value: member.email || "-", icon: Mail },
                                { label: "Phone", value: member.phone || "-", icon: Phone },
                                { label: "Attendance", value: `${attendance.length} / ${meetings.length || 0} meetings` },
                                { label: "Consistency", value: `${attendanceRate}%`, icon: CalendarDays },
                                { label: "Balance Due", value: `Rs. ${totalDue.toLocaleString()}`, icon: CreditCard },
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                        <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                            {Icon ? <Icon size={13} className="text-[#000080]" /> : null}
                                            {item.label}
                                        </dt>
                                        <dd className="mt-2 text-sm font-semibold text-slate-900 break-words">{item.value}</dd>
                                    </div>
                                );
                            })}
                        </dl>
                    </div>

                    <div className="card rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
                        <div className="mb-5 flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Shop and Nominee</h2>
                                <p className="text-sm text-slate-500">Address and emergency contact details.</p>
                            </div>
                            <MapPin className="text-[#000080]" size={20} />
                        </div>

                        <div className="space-y-4">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 rounded-xl bg-[#000080]/10 p-2 text-[#000080]">
                                        <MapPin size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Shop address</p>
                                        <p className="mt-1 text-sm font-medium text-slate-800 leading-6">{member.shopAddress || "No address on file"}</p>
                                    </div>
                                </div>
                            </div>

                            {member.nomineeDetails?.name ? (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Nominee</p>
                                    <div className="mt-3 space-y-1">
                                        <p className="text-sm font-semibold text-slate-900">{member.nomineeDetails.name}</p>
                                        <p className="text-sm text-slate-600">{member.nomineeDetails.relation || "Relation not set"}</p>
                                        <p className="text-sm text-slate-600">{member.nomineeDetails.phone || "Phone not set"}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-4 text-sm text-slate-500">
                                    No nominee details have been added yet.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="card rounded-[1.75rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                            <h2 className="text-lg font-bold text-slate-900">Distribution Ledger</h2>
                            <p className="text-sm text-slate-500">Products allocated and corresponding payment tracking.</p>
                        </div>

                        {products.length === 0 ? (
                            <div className="p-10 text-center text-slate-500">
                                <Package size={28} className="mx-auto mb-3 text-slate-300" />
                                No allocation history found for this member.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[640px] text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-500">
                                        <tr>
                                            <th className="px-5 py-3 font-semibold">Product</th>
                                            <th className="px-5 py-3 font-semibold">Quantity</th>
                                            <th className="px-5 py-3 font-semibold">Paid</th>
                                            <th className="px-5 py-3 font-semibold">Due</th>
                                            <th className="px-5 py-3 font-semibold">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {products.map((p, i) => (
                                            <tr key={i} className="hover:bg-slate-50/70">
                                                <td className="px-5 py-3 font-medium text-slate-800">{p.productName || "-"}</td>
                                                <td className="px-5 py-3 text-slate-700">{p.quantity ?? 0}</td>
                                                <td className="px-5 py-3 text-slate-700">Rs. {(p.paidAmount || 0).toLocaleString()}</td>
                                                <td className="px-5 py-3 text-slate-700">Rs. {(p.remainingAmount || 0).toLocaleString()}</td>
                                                <td className="px-5 py-3 text-slate-700">
                                                    {p.distributedAt && typeof p.distributedAt.toDate === "function"
                                                        ? p.distributedAt.toDate().toLocaleDateString()
                                                        : "-"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <aside className="min-w-0 space-y-6">
                    <div className="card rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
                        <div className="mb-5 flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Membership Snapshot</h2>
                                <p className="text-sm text-slate-500">Quick account and ID verification status.</p>
                            </div>
                            <CalendarDays className="text-[#000080]" size={20} />
                        </div>

                        <div className="space-y-3">
                            <div className={`rounded-2xl border p-4 ${statusTone}`}>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em]">Account status</p>
                                <p className="mt-1 text-lg font-bold capitalize">{member.status || "unknown"}</p>
                            </div>
                            <div className={`rounded-2xl border p-4 ${memberIdVerified ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Member ID check</p>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <p className="font-mono text-sm font-semibold text-slate-900 break-all">{hasMemberId ? memberId : "Member ID pending"}</p>
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${memberIdVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                        {memberIdVerified ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                                        {memberIdVerified ? "Verified" : "Needs check"}
                                    </span>
                                </div>
                            </div>
                            <div className={`rounded-2xl border p-4 ${paymentTone}`}>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em]">Payment status</p>
                                <p className="mt-1 text-lg font-bold capitalize">{derivedPaymentStatus}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Joined year</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">{memberSince}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                        <div className="card rounded-[1.5rem] border border-slate-200 bg-white p-5 text-left shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Meetings attended</p>
                            <p className="mt-2 text-3xl font-bold text-[#000080]">{attendance.length}</p>
                            <p className="mt-1 text-sm text-slate-500">Attendance summary from meeting records.</p>
                        </div>
                        <div className="card rounded-[1.5rem] border border-slate-200 bg-white p-5 text-left shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Payments collected</p>
                            <p className="mt-2 text-3xl font-bold text-emerald-600">Rs. {totalPaid.toLocaleString()}</p>
                            <p className="mt-1 text-sm text-slate-500">{paymentProgress}% of total allocation value paid.</p>
                        </div>
                        <div className="card rounded-[1.5rem] border border-slate-200 bg-white p-5 text-left shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Quick contact</p>
                            <div className="mt-3 space-y-2 text-sm text-slate-700">
                                <p className="flex items-center gap-2 break-words"><Mail size={14} className="text-[#000080]" /> {member.email || "-"}</p>
                                <p className="flex items-center gap-2 break-words"><Phone size={14} className="text-[#000080]" /> {member.phone || "-"}</p>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {showID && member && (
                <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md animate-fade-in overflow-y-auto">
                    <div className="mx-auto flex min-h-full w-full max-w-lg items-center justify-center p-3 sm:p-6">
                        <div className="w-full relative">
                            <button
                                onClick={() => setShowID(false)}
                                className="absolute right-0 top-0 z-10 p-2 text-white/70 hover:text-white transition-colors bg-white/10 rounded-full"
                                aria-label="Close Digital ID"
                            >
                                <X size={22} />
                            </button>

                            <div className="relative group p-1 pt-12 sm:pt-0 animate-scale-up">
                                <div className="absolute inset-0 bg-conic-to-r from-indigo-500 via-[#1e1b4b] to-indigo-500 rounded-[2.2rem] animate-spin-slow opacity-50 blur-sm" />

                                <div className="card p-0! overflow-hidden bg-slate-950 border border-white/10 shadow-2xl rounded-[2.1rem] relative">
                                    <div className="p-5 sm:p-8 pb-4 flex items-center justify-between border-b border-white/5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                                                <div className="w-4 h-4 bg-indigo-500 rounded-sm rotate-45" />
                                            </div>
                                            <span className="text-[10px] font-black text-white/80 uppercase tracking-[0.2em]">BCTA EXECUTIVE</span>
                                        </div>
                                        <div className="px-2.5 py-1 bg-white/10 rounded-full border border-white/10 flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                                            <span className="text-[8px] font-black text-white/60 tracking-widest uppercase">Verified</span>
                                        </div>
                                    </div>

                                    <div className="p-5 sm:p-8 space-y-6 sm:space-y-8">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 text-center sm:text-left">
                                            <div className="mx-auto sm:mx-0 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl p-1 bg-linear-to-br from-white/20 to-transparent shadow-xl">
                                                {member.photoURL ? (
                                                    <img src={member.photoURL} alt="" className="w-full h-full rounded-xl object-cover border border-white/10" />
                                                ) : (
                                                    <div className="w-full h-full bg-[#1e1b4b] rounded-xl flex items-center justify-center text-white text-2xl sm:text-3xl font-black">
                                                        {member.name?.[0]}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight mb-2 break-words">
                                                    {member.name} {member.surname}
                                                </h3>
                                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] bg-indigo-500/10 px-2 py-1 rounded inline-block break-all">
                                                    {member.memberId}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="relative flex justify-center py-2 sm:py-4">
                                            <div className="absolute inset-0 bg-indigo-500/5 rounded-3xl blur-2xl" />
                                            <div className="relative p-4 sm:p-6 bg-white rounded-3xl shadow-2xl border border-white/5">
                                                <QRCodeSVG
                                                    value={JSON.stringify({ type: "member", uid: member.id, memberId: member.memberId })}
                                                    size={140}
                                                    level="H"
                                                    includeMargin={false}
                                                    fgColor="#1e1b4b"
                                                />
                                            </div>
                                        </div>

                                        <p className="text-center text-[10px] text-white/30 font-bold uppercase tracking-widest leading-relaxed">
                                            Secured through BCTA digital identity
                                            <br />
                                            Valid for {new Date().getFullYear()} fiscal year
                                        </p>
                                    </div>

                                    <div className="h-2 bg-linear-to-r from-[#1e1b4b] via-indigo-600 to-[#1e1b4b] opacity-80 shadow-[0_0_20px_rgba(37,99,235,0.3)]" />
                                </div>
                            </div>

                            <div className="mt-5 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button onClick={() => window.print()} className="w-full py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all backdrop-blur-sm border border-white/5">
                                    Print Pass
                                </button>
                                <button onClick={() => setShowID(false)} className="w-full py-3.5 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95 shadow-xl">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MemberDetail;
