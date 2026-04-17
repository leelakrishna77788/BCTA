import React, { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../../firebase/firebaseConfig";
import { CreditCard, TrendingUp, AlertCircle, CheckCircle, CalendarDays } from "lucide-react";
import { markMemberFeePaid, removeMemberFeePaid } from "../../../services/paymentsService";
import { useAuth } from "../../../context/AuthContext";
import toast from "react-hot-toast";

interface Member {
    uid: string;
    memberId: string;
    name: string;
    surname?: string;
    [key: string]: any;
}

interface PaymentDoc {
    memberUID: string;
    type: string;
    month: number;
    year: number;
    [key: string]: any;
}

const currentDate = new Date();
const currentMonthNumeric = currentDate.getMonth() + 1;
const currentYearNumeric = currentDate.getFullYear();

const monthsList = [
    { value: 1, label: "January" }, { value: 2, label: "February" }, { value: 3, label: "March" },
    { value: 4, label: "April" }, { value: 5, label: "May" }, { value: 6, label: "June" },
    { value: 7, label: "July" }, { value: 8, label: "August" }, { value: 9, label: "September" },
    { value: 10, label: "October" }, { value: 11, label: "November" }, { value: 12, label: "December" }
];

const yearsList = [currentYearNumeric - 1, currentYearNumeric, currentYearNumeric + 1];

const PaymentsDashboard: React.FC = () => {
    const { currentUser } = useAuth();
    const [members, setMembers] = useState<Member[]>([]);
    const [payments, setPayments] = useState<PaymentDoc[]>([]);
    
    const [loadingMembers, setLoadingMembers] = useState<boolean>(true);
    const [loadingPayments, setLoadingPayments] = useState<boolean>(true);
    const [filter, setFilter] = useState<string>("all");
    const [processingId, setProcessingId] = useState<string | null>(null);

    const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthNumeric);
    const [selectedYear, setSelectedYear] = useState<number>(currentYearNumeric);

    useEffect(() => {
        const q = query(collection(db, "users"), where("role", "==", "member"));
        const unsub = onSnapshot(q, (snap) => {
            setMembers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as Member)));
            setLoadingMembers(false);
        }, (err) => {
            console.error("Members fetch error:", err);
            setLoadingMembers(false);
        });
        return unsub;
    }, []);

    useEffect(() => {
        setLoadingPayments(true);
        const q = query(
            collection(db, "payments"),
            where("type", "==", "monthly_fee"),
            where("month", "==", selectedMonth),
            where("year", "==", selectedYear)
        );
        const unsub = onSnapshot(q, (snap) => {
            setPayments(snap.docs.map(d => d.data() as PaymentDoc));
            setLoadingPayments(false);
        }, (err) => {
            console.error("Payments fetch error:", err);
            setLoadingPayments(false);
        });
        return unsub;
    }, [selectedMonth, selectedYear]);

    const computedMembers = useMemo(() => {
        const paidSet = new Set(payments.map(p => p.memberUID));
        return members.map(m => ({
            ...m,
            computedStatus: paidSet.has(m.uid) ? "paid" : "pending"
        }));
    }, [members, payments]);

    const totalMembers = computedMembers.length;
    const paidMembersCount = computedMembers.filter(m => m.computedStatus === "paid").length;
    const pendingMembersCount = computedMembers.filter(m => m.computedStatus !== "paid").length;

    const totalCollected = paidMembersCount * 100;

    const filtered = filter === "all" ? computedMembers :
        filter === "paid" ? computedMembers.filter(m => m.computedStatus === "paid") :
            computedMembers.filter(m => m.computedStatus !== "paid");

    const loading = loadingMembers || loadingPayments;

    const handleMarkPaid = async (member: any) => {
        if (!currentUser) return;
        const monthLabel = monthsList.find(m => m.value === selectedMonth)?.label;
        if (!window.confirm(`Mark ₹100 as paid for ${member.name} for ${monthLabel} ${selectedYear}?`)) return;
        
        setProcessingId(member.uid);
        try {
            await markMemberFeePaid(member.uid, member.memberId, `${member.name} ${member.surname || ""}`.trim(), selectedMonth, selectedYear, currentUser.uid);
            toast.success(`Fee collected from ${member.name}`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to mark fee as paid.");
        } finally {
            setProcessingId(null);
        }
    };

    const handleMarkUnpaid = async (member: any) => {
        const monthLabel = monthsList.find(m => m.value === selectedMonth)?.label;
        if (!window.confirm(`Remove payment record for ${member.name} for ${monthLabel} ${selectedYear}?`)) return;
        
        setProcessingId(member.uid);
        try {
            await removeMemberFeePaid(member.uid, selectedMonth, selectedYear);
            toast.success(`Payment removed for ${member.name}`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to remove payment.");
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="space-y-5 animate-fade-in">
            <div>
                <h1 className="page-title mb-0">Payments Overview</h1>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
                    <p className="text-slate-500 text-sm">Track monthly ₹100 member fees dynamically</p>
                    
                    <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm w-fit">
                        <CalendarDays className="text-indigo-500 ml-2" size={20} />
                        <select 
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
                        >
                            {monthsList.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                        <select 
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 mr-1"
                        >
                            {yearsList.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: "Total Members", value: totalMembers, color: "bg-[#4f46e5]", icon: CreditCard },
                    { label: "Collected Amount", value: `₹${totalCollected.toLocaleString()}`, color: "bg-emerald-500", icon: CheckCircle },
                    { label: "Pending Members", value: pendingMembersCount, color: "bg-red-500", icon: AlertCircle },
                    { label: "Paid Members", value: paidMembersCount, color: "bg-teal-500", icon: TrendingUp },
                ].map(s => (
                    <div key={s.label} className="stat-card bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3">
                        <div className={`w-11 h-11 ${s.color} rounded-xl flex items-center justify-center shrink-0`}>
                            <s.icon size={18} className="text-white" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-slate-800">{loading ? "-" : s.value}</p>
                            <p className="text-xs text-slate-500">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                {["all", "paid", "pending"].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${filter === f ? "bg-[#4f46e5] text-white" : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"}`}>
                        {f}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="card p-0 overflow-hidden border border-slate-200 bg-white rounded-xl shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse block md:table">
                        <thead className="hidden md:table-header-group">
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="table-header text-left pl-6 py-3">Member ID</th>
                                <th className="table-header text-left">Name</th>
                                <th className="table-header text-left">Monthly Fee</th>
                                <th className="table-header text-left">Status</th>
                                <th className="table-header text-right pr-6">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="block md:table-row-group divide-y md:divide-slate-100 font-medium">
                            {filtered.map(m => (
                                <tr key={m.uid} className={`block md:table-row bg-white border border-slate-100 md:border-0 rounded-2xl md:rounded-none mb-4 md:mb-0 shadow-sm md:shadow-none hover:bg-slate-50 transition-colors p-4 md:p-0 ${m.computedStatus !== "paid" ? "md:border-l-4 md:border-red-500" : ""}`}>
                                    <td className="flex md:table-cell md:p-4 md:pl-6 mb-3 md:mb-0 justify-between items-center">
                                        <span className="md:hidden text-[10px] font-black text-slate-400 uppercase tracking-wider">Member ID</span>
                                        <span className="font-mono text-xs text-slate-500">{m.memberId || "N/A"}</span>
                                    </td>
                                    <td className="flex md:table-cell md:p-4 mb-2 md:mb-0 justify-between items-center font-semibold text-slate-800">
                                        <span className="md:hidden text-[10px] font-black text-slate-400 uppercase tracking-wider">Name</span>
                                        <span>{m.name} {m.surname || ""}</span>
                                    </td>
                                    <td className="flex md:table-cell md:p-4 mb-2 md:mb-0 justify-between items-center font-bold">
                                        <span className="md:hidden text-[10px] font-black text-slate-400 uppercase tracking-wider">Fee</span>
                                        <span>₹100</span>
                                    </td>
                                    <td className="flex md:table-cell md:p-4 mb-3 md:mb-0 justify-between items-center">
                                        <span className="md:hidden text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</span>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${m.computedStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                            {m.computedStatus === "paid" ? "Paid" : "Pending"}
                                        </span>
                                    </td>
                                    <td className="flex md:table-cell md:p-4 md:pr-6 justify-between items-center text-right border-t border-slate-100 md:border-0 pt-3 md:pt-0 mt-2 md:mt-0">
                                        <span className="md:hidden text-[10px] font-black text-slate-400 uppercase tracking-wider">Action</span>
                                        {m.computedStatus !== "paid" ? (
                                            <button
                                                onClick={() => handleMarkPaid(m)}
                                                disabled={processingId === m.uid}
                                                className="px-3 py-1.5 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                                            >
                                                {processingId === m.uid ? "Processing..." : "Mark Paid"}
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-2 md:justify-end">
                                                <button
                                                    onClick={() => handleMarkUnpaid(m)}
                                                    disabled={processingId === m.uid}
                                                    className="px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                                                >
                                                    {processingId === m.uid ? "..." : "Undo"}
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {!loading && filtered.length === 0 && (
                                <tr className="block md:table-row"><td colSpan={5} className="block md:table-cell text-center text-slate-400 py-16">No members found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PaymentsDashboard;
