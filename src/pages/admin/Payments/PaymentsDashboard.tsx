

import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../../firebase/firebaseConfig";
import { CreditCard, TrendingUp, AlertCircle, CheckCircle, CalendarDays, History, X } from "lucide-react";
import { markMemberFeePaid, removeMemberFeePaid } from "../../../services/paymentsService";
import { useAuth } from "../../../context/AuthContext";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

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

const monthsList = [
    { value: 1, label: "January" }, { value: 2, label: "February" }, { value: 3, label: "March" },
    { value: 4, label: "April" }, { value: 5, label: "May" }, { value: 6, label: "June" },
    { value: 7, label: "July" }, { value: 8, label: "August" }, { value: 9, label: "September" },
    { value: 10, label: "October" }, { value: 11, label: "November" }, { value: 12, label: "December" }
];

const currentYearNumeric = new Date().getFullYear();
const yearsList = [currentYearNumeric - 1, currentYearNumeric, currentYearNumeric + 1];

const PaymentsDashboard: React.FC = () => {
    const { currentUser } = useAuth();
    const [members, setMembers] = useState<Member[]>([]);
    const [payments, setPayments] = useState<PaymentDoc[]>([]);
    
    const [loadingMembers, setLoadingMembers] = useState<boolean>(true);
    const [loadingPayments, setLoadingPayments] = useState<boolean>(true);
    const [filter, setFilter] = useState<string>("all");
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [markPaidConfirm, setMarkPaidConfirm] = useState<Member | null>(null);
    const [markUnpaidConfirm, setMarkUnpaidConfirm] = useState<Member | null>(null);

    const getCurrentPeriod = () => {
        const now = new Date();
        return {
            month: now.getMonth() + 1,
            year: now.getFullYear(),
        };
    };

    const [{ month: selectedMonth, year: selectedYear }, setCurrentPeriod] = useState(getCurrentPeriod());

    useEffect(() => {
        const isModalOpen = markPaidConfirm !== null || markUnpaidConfirm !== null;
        if (!isModalOpen) return;

        const preventDefault = (e: Event) => e.preventDefault();
        const blockKeys = (e: KeyboardEvent) => {
            const keys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Space", " "];
            if (keys.includes(e.key)) e.preventDefault();
        };

        window.addEventListener("wheel", preventDefault, { passive: false });
        window.addEventListener("touchmove", preventDefault, { passive: false });
        window.addEventListener("keydown", blockKeys);
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";

        return () => {
            window.removeEventListener("wheel", preventDefault);
            window.removeEventListener("touchmove", preventDefault);
            window.removeEventListener("keydown", blockKeys);
            document.body.style.overflow = "";
            document.documentElement.style.overflow = "";
        };
    }, [markPaidConfirm, markUnpaidConfirm]);

    useEffect(() => {
        const syncCurrentPeriod = () => {
            setCurrentPeriod(getCurrentPeriod());
        };

        syncCurrentPeriod();
        const intervalId = window.setInterval(syncCurrentPeriod, 60_000);

        return () => window.clearInterval(intervalId);
    }, []);

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

        setProcessingId(member.uid);
        try {
            await markMemberFeePaid(member.uid, member.memberId, `${member.name} ${member.surname || ""}`.trim(), selectedMonth, selectedYear, currentUser.uid);
            toast.success(`Fee collected from ${member.name}`);
            setMarkPaidConfirm(null);
        } catch (error) {
            console.error(error);
            toast.error("Failed to mark fee as paid.");
        } finally {
            setProcessingId(null);
        }
    };

    const handleMarkUnpaid = async (member: any) => {
        setProcessingId(member.uid);
        try {
            await removeMemberFeePaid(member.uid, selectedMonth, selectedYear);
            toast.success(`Payment removed for ${member.name}`);
            setMarkUnpaidConfirm(null);
        } catch (error) {
            console.error(error);
            toast.error("Failed to remove payment.");
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <>
            {markPaidConfirm && typeof document !== "undefined" && createPortal(
                <div className="fixed inset-0 z-[9999] overflow-hidden overscroll-none bg-black/30 backdrop-blur-md animate-fade-in">
                    <div className="flex h-[100dvh] w-full items-center justify-center p-2 sm:p-4">
                        <div className="relative w-[min(420px,calc(100vw-1rem))] max-h-[calc(100dvh-1rem)] overflow-y-auto overscroll-contain rounded-[1.5rem] sm:rounded-[2rem] bg-white p-4 sm:p-8 shadow-2xl border border-slate-200">
                            <div className="absolute right-3 top-3 opacity-10 text-indigo-600">
                                <CheckCircle size={64} className="sm:w-[84px] sm:h-[84px]" />
                            </div>

                            <div className="mb-4 sm:mb-5 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                <CheckCircle size={24} className="sm:w-7 sm:h-7" />
                            </div>

                            <h2 className="text-xl sm:text-2xl font-black text-slate-900">Mark as Paid</h2>
                            <p className="mt-2 sm:mt-3 text-xs sm:text-sm font-semibold leading-relaxed text-slate-500">
                                You are about to mark <span className="text-slate-900">{markPaidConfirm.name} {markPaidConfirm.surname || ""}</span> as paid for <span className="text-slate-900">{monthsList.find(m => m.value === selectedMonth)?.label} {selectedYear}</span>.
                            </p>

                            <div className="mt-4 sm:mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                                <div className="flex items-center justify-between gap-4 py-1 text-xs sm:text-sm">
                                    <span className="font-semibold text-slate-500">Member:</span>
                                    <span className="font-bold text-slate-900 text-right">{markPaidConfirm.name} {markPaidConfirm.surname || ""}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4 py-1 text-xs sm:text-sm">
                                    <span className="font-semibold text-slate-500">Amount:</span>
                                    <span className="font-black text-slate-900 text-base sm:text-lg">₹100</span>
                                </div>
                                <div className="flex items-center justify-between gap-4 py-1 text-xs sm:text-sm">
                                    <span className="font-semibold text-slate-500">Period:</span>
                                    <span className="font-bold text-slate-900 text-right">{monthsList.find(m => m.value === selectedMonth)?.label} {selectedYear}</span>
                                </div>
                            </div>

                            <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                                <button
                                    onClick={() => setMarkPaidConfirm(null)}
                                    className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 sm:py-3.5 font-bold text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleMarkPaid(markPaidConfirm)}
                                    disabled={processingId === markPaidConfirm.uid}
                                    className="flex-1 rounded-2xl bg-indigo-600 py-3 sm:py-3.5 font-black text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {processingId === markPaidConfirm.uid ? "Processing..." : "Confirm Payment"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body,
            )}

            {markUnpaidConfirm && typeof document !== "undefined" && createPortal(
                <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm animate-fade-in">
                    <div className="flex h-[100dvh] w-full items-center justify-center p-2 sm:p-4">
                        <div className="relative w-[min(420px,calc(100vw-1rem))] max-h-[calc(100dvh-1rem)] overflow-y-auto overscroll-contain rounded-[1.5rem] sm:rounded-[2rem] bg-white p-4 sm:p-8 shadow-2xl border border-slate-200">
                            <div className="absolute right-3 top-3 opacity-10 text-indigo-600">
                                <CheckCircle size={64} className="sm:w-[84px] sm:h-[84px]" />
                            </div>

                            <div className="mb-4 sm:mb-5 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                <CheckCircle size={24} className="sm:w-7 sm:h-7" />
                            </div>

                            <h2 className="text-xl sm:text-2xl font-black text-slate-900">Undo Payment</h2>
                            <p className="mt-2 sm:mt-3 text-xs sm:text-sm font-semibold leading-relaxed text-slate-500">
                                You are about to remove payment for <span className="text-slate-900">{markUnpaidConfirm.name} {markUnpaidConfirm.surname || ""}</span> for <span className="text-slate-900">{monthsList.find(m => m.value === selectedMonth)?.label} {selectedYear}</span>.
                            </p>

                            <div className="mt-4 sm:mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                                <div className="flex items-center justify-between gap-4 py-1 text-xs sm:text-sm">
                                    <span className="font-semibold text-slate-500">Member:</span>
                                    <span className="font-bold text-slate-900 text-right">{markUnpaidConfirm.name} {markUnpaidConfirm.surname || ""}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4 py-1 text-xs sm:text-sm">
                                    <span className="font-semibold text-slate-500">Amount:</span>
                                    <span className="font-black text-slate-900 text-base sm:text-lg">₹100</span>
                                </div>
                                <div className="flex items-center justify-between gap-4 py-1 text-xs sm:text-sm">
                                    <span className="font-semibold text-slate-500">Period:</span>
                                    <span className="font-bold text-slate-900 text-right">{monthsList.find(m => m.value === selectedMonth)?.label} {selectedYear}</span>
                                </div>
                            </div>

                            <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                                <button
                                    onClick={() => setMarkUnpaidConfirm(null)}
                                    className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 sm:py-3.5 font-bold text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleMarkUnpaid(markUnpaidConfirm)}
                                    disabled={processingId === markUnpaidConfirm.uid}
                                    className="flex-1 rounded-2xl bg-indigo-600 py-3 sm:py-3.5 font-black text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {processingId === markUnpaidConfirm.uid ? "Processing..." : "Undo Payment"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body,
            )}

        <div className="space-y-5 sm:space-y-6 animate-fade-in pb-4 sm:pb-8">
            <div className="relative rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
                <div className="flex flex-col gap-2 sm:gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="pr-[190px] sm:pr-0">
                        <h1 className="page-title mb-0 text-2xl sm:text-3xl">Payments Overview</h1>
                        <p className="hidden sm:block text-slate-500 text-sm mt-2">Track monthly ₹100 member fees dynamically</p>
                    </div>

                    <div className="w-full lg:w-auto lg:ml-auto flex flex-col lg:flex-row gap-2 lg:gap-3 lg:items-center">
                        <div className="absolute top-4 right-4 sm:static sm:self-end -mt-1 sm:mt-0 flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-200 w-auto max-w-full">
                            <div className="hidden sm:flex items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 h-9 w-9">
                                <CalendarDays size={18} />
                            </div>
                            <select
                                value={selectedMonth}
                                disabled
                                onChange={() => undefined}
                                className="h-8 sm:h-9 min-w-[82px] sm:min-w-[90px] bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm rounded-lg px-2 sm:px-2.5 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                            >
                                {monthsList.filter((m) => m.value === selectedMonth).map((m) => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                            <select
                                value={selectedYear}
                                disabled
                                onChange={() => undefined}
                                className="h-8 sm:h-9 min-w-[72px] sm:min-w-[78px] bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm rounded-lg px-2 sm:px-2.5 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                            >
                                {yearsList.filter((y) => y === selectedYear).map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        <Link
                            to="/admin/payments/history"
                            className="self-center lg:self-auto h-10 px-5 rounded-xl border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 hover:border-indigo-700 font-semibold text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                            <History size={16} />
                            Payment History
                        </Link>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                {[
                    { label: "Total Members", value: totalMembers, color: "bg-indigo-600", icon: CreditCard },
                    { label: "Collected Amount", value: `₹${totalCollected.toLocaleString()}`, color: "bg-emerald-500", icon: CheckCircle },
                    { label: "Pending Members", value: pendingMembersCount, color: "bg-rose-500", icon: AlertCircle },
                    { label: "Paid Members", value: paidMembersCount, color: "bg-teal-500", icon: TrendingUp },
                ].map((s) => (
                    <div key={s.label} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 sm:gap-4">
                        <div className={`w-11 h-11 ${s.color} rounded-2xl flex items-center justify-center shrink-0 shadow-sm`}>
                            <s.icon size={18} className="text-white" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-lg sm:text-xl font-bold text-slate-900 truncate">{loading ? "-" : s.value}</p>
                            <p className="text-xs font-medium text-slate-500">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap gap-2">
                {["all", "paid", "pending"].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-colors border ${filter === f ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {loading ? (
                    Array.from({ length: 6 }).map((_, idx) => (
                        <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm animate-pulse">
                            <div className="flex items-start justify-between gap-3 mb-4">
                                <div className="space-y-2 min-w-0 flex-1">
                                    <div className="h-4 w-40 rounded bg-slate-200" />
                                    <div className="h-3 w-24 rounded bg-slate-200" />
                                </div>
                                <div className="h-6 w-16 rounded-full bg-slate-200" />
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="h-16 rounded-xl bg-slate-100" />
                                <div className="h-16 rounded-xl bg-slate-100" />
                            </div>
                            <div className="h-10 rounded-xl bg-slate-200" />
                        </div>
                    ))
                ) : filtered.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-400 shadow-sm">
                        No members found
                    </div>
                ) : (
                    filtered.map((m) => (
                        <div key={m.uid} className={`rounded-2xl lg:rounded-3xl border bg-white p-4 sm:p-5 lg:p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-[1px] ${m.computedStatus !== "paid" ? "border-rose-200" : "border-slate-200"}`}>
                            {/* Mobile/Tablet Layout */}
                            <div className="lg:hidden flex flex-col gap-4">
                                {/* Row 1: Member Info + Status Badge */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-base sm:text-lg font-bold text-slate-900 truncate">{m.name} {m.surname || ""}</p>
                                        <p className="mt-1 inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-mono text-slate-500 truncate">{m.memberId || "N/A"}</p>
                                    </div>
                                    <span className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-extrabold tracking-wide ${m.computedStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                                        {m.computedStatus === "paid" ? "Paid" : "Pending"}
                                    </span>
                                </div>

                                {/* Row 2: Fee and Period Blocks */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Monthly Fee</p>
                                        <p className="mt-1 text-sm font-bold text-slate-900">₹100</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Period</p>
                                        <p className="mt-1 text-sm font-bold text-slate-900">{monthsList.find((item) => item.value === selectedMonth)?.label} {selectedYear}</p>
                                    </div>
                                </div>

                                {/* Action Button */}
                                {m.computedStatus !== "paid" ? (
                                    <button
                                        onClick={() => setMarkPaidConfirm(m)}
                                        disabled={processingId === m.uid}
                                        className="h-11 w-full rounded-xl bg-indigo-600 text-white font-bold text-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        {processingId === m.uid ? "Processing..." : "Mark Paid"}
                                    </button>
                                ) : (
                                    <button
                                            onClick={() => setMarkUnpaidConfirm(m)}
                                        disabled={processingId === m.uid}
                                        className="h-11 w-full rounded-xl bg-indigo-600 text-white font-bold text-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        {processingId === m.uid ? "..." : "Undo Payment"}
                                    </button>
                                )}
                            </div>

                            {/* Desktop Layout - 3 Column */}
                            <div className="hidden lg:grid lg:grid-cols-[1.6fr_1.1fr_240px] lg:items-center lg:gap-0">
                                {/* Column 1: Member Info */}
                                <div className="min-w-0 lg:pr-6 lg:border-r lg:border-slate-200">
                                    <p className="text-xl font-bold text-slate-900 truncate">{m.name} {m.surname || ""}</p>
                                    <p className="mt-1 inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-mono text-slate-500 truncate">{m.memberId || "N/A"}</p>
                                </div>

                                {/* Column 2: Fee and Period */}
                                <div className="grid grid-cols-2 gap-3 lg:px-6 lg:border-r lg:border-slate-200">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Monthly Fee</p>
                                        <p className="mt-1 text-sm font-bold text-slate-900">₹100</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Period</p>
                                        <p className="mt-1 text-sm font-bold text-slate-900">{monthsList.find((item) => item.value === selectedMonth)?.label} {selectedYear}</p>
                                    </div>
                                </div>

                                {/* Column 3: Status + Action */}
                                <div className="lg:min-w-[240px] lg:pl-6 flex flex-col items-stretch lg:items-center lg:justify-center gap-2 min-w-0">
                                    <span className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-extrabold tracking-wide ${m.computedStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                                        {m.computedStatus === "paid" ? "Paid" : "Pending"}
                                    </span>
                                    {m.computedStatus !== "paid" ? (
                                        <button
                                            onClick={() => setMarkPaidConfirm(m)}
                                            disabled={processingId === m.uid}
                                            className="h-10 lg:h-11 w-full lg:w-[160px] rounded-xl bg-indigo-600 text-white font-bold text-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                            {processingId === m.uid ? "Processing..." : "Mark Paid"}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setMarkUnpaidConfirm(m)}
                                            disabled={processingId === m.uid}
                                            className="h-10 lg:h-11 w-full lg:w-[160px] rounded-xl bg-indigo-600 text-white font-bold text-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                            {processingId === m.uid ? "..." : "Undo Payment"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
        </>
    );
};

export default PaymentsDashboard;
