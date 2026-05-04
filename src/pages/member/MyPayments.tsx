import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import { CreditCard, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import LoadingSkeleton from "../../components/shared/LoadingSkeleton";
import type { Payment } from "../../types/payment.types";

const MyPayments: React.FC = () => {
    const { userProfile, currentUser } = useAuth();
    const { t } = useTranslation();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [filter, setFilter] = useState<string>("all");
    const [selectedYear, setSelectedYear] = useState<string>("all");

    useEffect(() => {
        if (!currentUser) return;
        
        const unsubscribe = onSnapshot(
            query(
                collection(db, "payments"), 
                where("memberUID", "==", currentUser.uid)
            ),
            (snap) => { 
                setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment))); 
                setLoading(false); 
            },
            (err) => {
                console.error(err);
                setLoading(false);
            }
        );
        
        return () => unsubscribe();
    }, [currentUser]);

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const monthsList = useMemo(() => [
        { value: 1, label: t("payments.months.1") }, { value: 2, label: t("payments.months.2") }, { value: 3, label: t("payments.months.3") },
        { value: 4, label: t("payments.months.4") }, { value: 5, label: t("payments.months.5") }, { value: 6, label: t("payments.months.6") },
        { value: 7, label: t("payments.months.7") }, { value: 8, label: t("payments.months.8") }, { value: 9, label: t("payments.months.9") },
        { value: 10, label: t("payments.months.10") }, { value: 11, label: t("payments.months.11") }, { value: 12, label: t("payments.months.12") }
    ], [t]);

    const paymentSet = useMemo(() => {
        const set = new Set<string>();
        payments.forEach(p => {
            if (p.type === "monthly_fee" && p.month && p.year) {
                set.add(`${p.month}-${p.year}`);
            }
        });
        return set;
    }, [payments]);

    const allMonths = useMemo(() => {
        const months: { month: number; year: number; label: string; isPaid: boolean }[] = [];
        for (let y = currentYear; y >= 2020; y--) {
            const startMonth = y === currentYear ? currentMonth : 12;
            for (let m = startMonth; m >= 1; m--) {
                const key = `${m}-${y}`;
                months.push({
                    month: m,
                    year: y,
                    label: monthsList.find(ml => ml.value === m)?.label || "",
                    isPaid: paymentSet.has(key),
                });
            }
        }
        return months;
    }, [currentMonth, currentYear, paymentSet, monthsList]);

    const yearOptions = useMemo(() => {
        const years = [];
        for (let y = currentYear; y >= 2020; y--) {
            years.push(y);
        }
        return years;
    }, [currentYear]);

    const filteredMonths = useMemo(() => {
        let result = allMonths;
        if (selectedYear !== "all") {
            const y = parseInt(selectedYear, 10);
            result = result.filter(m => m.year === y);
        }
        if (filter === "paid") return result.filter(m => m.isPaid);
        if (filter === "unpaid") return result.filter(m => !m.isPaid);
        return result;
    }, [allMonths, filter, selectedYear]);

    const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const currentMonthPaid = paymentSet.has(`${currentMonth}-${currentYear}`);

    const hasUnpaid = allMonths.some(m => !m.isPaid);

    return (
        <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
            <h1 className="page-title mb-0">{t("myPayments.title")}</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="card text-center p-4 border border-emerald-100 bg-emerald-50">
                    <p className="text-xl font-bold text-emerald-600">₹{totalPaid}</p>
                    <p className="text-xs text-emerald-700 font-medium mt-1">{t("myPayments.totalFeesPaid")}</p>
                </div>
                <div className={`card text-center p-4 border ${currentMonthPaid ? 'border-emerald-100 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                    <p className={`text-xl font-bold ${currentMonthPaid ? "text-emerald-600" : "text-amber-600"}`}>
                        {currentMonthPaid ? t("common.paid") : t("common.pending")}
                    </p>
                    <p className={`text-xs mt-1 font-medium ${currentMonthPaid ? 'text-emerald-700' : 'text-amber-800'}`}>{t("myPayments.currentStatus")}</p>
                </div>
            </div>

            {hasUnpaid && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                    <AlertCircle className="text-amber-500 shrink-0" size={20} />
                    <p className="text-sm text-amber-800 font-medium">{t("myPayments.unpaidWarning")}</p>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex flex-wrap gap-2">
                    {["all", "paid", "unpaid"].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-colors border ${filter === f ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                        >
                            {t(`payments.filters.${f}`)}
                        </button>
                    ))}
                </div>
                <div className="sm:ml-auto">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="h-10 sm:h-9 min-w-[120px] w-full sm:w-auto bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl px-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                        <option value="all">{t("payments.history.allYears")}</option>
                        {yearOptions.map(y => (
                            <option key={y} value={String(y)}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="card">
                <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <CreditCard size={16} /> {t("myPayments.paymentHistory")}
                </h2>
                {loading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
                                <LoadingSkeleton width="40px" height="40px" borderRadius="0.75rem" />
                                <div className="flex-1 space-y-2">
                                    <LoadingSkeleton width="60%" height="0.875rem" />
                                    <LoadingSkeleton width="40%" height="0.75rem" />
                                </div>
                                <div className="text-right space-y-2">
                                    <LoadingSkeleton width="50px" height="0.875rem" />
                                    <LoadingSkeleton width="40px" height="0.75rem" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredMonths.length === 0 ? (
                    <div className="text-center py-10">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex justify-center items-center mx-auto mb-3">
                            <CreditCard className="text-slate-300" size={24} />
                        </div>
                        <p className="text-slate-400 text-sm font-medium">{t("myPayments.noHistory")}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredMonths.map(({ month, year, label, isPaid }) => (
                            <div key={`${month}-${year}`} className={`flex items-center gap-3 p-3 rounded-xl border ${isPaid ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isPaid ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                                    {isPaid ? <CheckCircle size={18} /> : <XCircle size={18} />}
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-slate-800 text-sm">Monthly Fee</p>
                                    <p className="text-xs text-slate-500 font-medium">{label} {year}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-slate-800">₹100</p>
                                    <p className={`text-[10px] uppercase tracking-wider font-bold ${isPaid ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {isPaid ? t("common.paid") : t("common.unpaid")}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyPayments;
