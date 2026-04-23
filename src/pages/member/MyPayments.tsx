import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import { CreditCard, AlertCircle, Calendar } from "lucide-react";
import LoadingSkeleton from "../../components/shared/LoadingSkeleton";
import type { Payment } from "../../types/payment.types";

const MyPayments: React.FC = () => {
    const { userProfile, currentUser } = useAuth();
    const { t } = useTranslation();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        if (!currentUser) return;
        
        const unsubscribe = onSnapshot(
            query(
                collection(db, "payments"), 
                where("memberUID", "==", currentUser.uid),
                orderBy("createdAt", "desc")
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

    const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const isPaid = userProfile?.paymentStatus === "paid";

    const getMonthName = (monthNum?: number) => {
        if (!monthNum) return "Unknown Month";
        return new Date(2000, monthNum - 1, 1).toLocaleString('default', { month: 'long' });
    };

    return (
        <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
            <h1 className="page-title mb-0">{t("myPayments.title")}</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="card text-center p-4 border border-emerald-100 bg-emerald-50">
                    <p className="text-xl font-bold text-emerald-600">₹{totalPaid}</p>
                    <p className="text-xs text-emerald-700 font-medium mt-1">{t("myPayments.totalFeesPaid")}</p>
                </div>
                <div className={`card text-center p-4 border ${isPaid ? 'border-emerald-100 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                    <p className={`text-xl font-bold ${isPaid ? "text-emerald-600" : "text-amber-600"}`}>
                        {isPaid ? t("common.paid") : t("common.pending")}
                    </p>
                    <p className={`text-xs mt-1 font-medium ${isPaid ? 'text-emerald-700' : 'text-amber-800'}`}>{t("myPayments.currentStatus")}</p>
                </div>
            </div>

            {!isPaid && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                    <AlertCircle className="text-amber-500 shrink-0" size={20} />
                    <p className="text-sm text-amber-800 font-medium">{t("myPayments.unpaidWarning")}</p>
                </div>
            )}

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
                ) : payments.length === 0 ? (
                    <div className="text-center py-10">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex justify-center items-center mx-auto mb-3">
                            <CreditCard className="text-slate-300" size={24} />
                        </div>
                        <p className="text-slate-400 text-sm font-medium">{t("myPayments.noHistory")}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {payments.map(p => (
                            <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border bg-slate-50 border-slate-100`}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-indigo-100 text-indigo-600`}>
                                    <Calendar size={18} />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-slate-800 text-sm capitalize">{p.type.replace('_', ' ')}</p>
                                    <p className="text-xs text-slate-500 font-medium">
                                        {p.month ? `${getMonthName(p.month)} ${p.year}` : `${p.year}`}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-slate-800">₹{p.amount}</p>
                                    <p className={`text-[10px] uppercase tracking-wider font-bold text-emerald-600`}>
                                        {t("myPayments.paidCheck")}
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
