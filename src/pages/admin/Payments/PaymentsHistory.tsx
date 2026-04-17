import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where, Timestamp } from "firebase/firestore";
import { Link } from "react-router-dom";
import { ArrowLeft, CalendarDays, ReceiptText, Search } from "lucide-react";
import { db } from "../../../firebase/firebaseConfig";
import toast from "react-hot-toast";

interface MemberDoc {
  uid: string;
  memberId?: string;
  name?: string;
  surname?: string;
}

interface PaymentHistoryDoc {
  id: string;
  memberUID?: string;
  memberId?: string;
  memberName?: string;
  amount?: number;
  month?: number;
  year?: number;
  type?: string;
  paidAt?: Timestamp | Date;
  createdAt?: Timestamp | Date;
}

const monthsList = [
  { value: 1, label: "January" }, { value: 2, label: "February" }, { value: 3, label: "March" },
  { value: 4, label: "April" }, { value: 5, label: "May" }, { value: 6, label: "June" },
  { value: 7, label: "July" }, { value: 8, label: "August" }, { value: 9, label: "September" },
  { value: 10, label: "October" }, { value: 11, label: "November" }, { value: 12, label: "December" }
];

const monthLabel = (month?: number) => {
  if (!month || month < 1 || month > 12) return "-";
  return new Date(2026, month - 1, 1).toLocaleString("en-US", { month: "long" });
};

const toDate = (value?: Timestamp | Date) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if ("toDate" in value && typeof value.toDate === "function") return value.toDate();
  return null;
};

const currentYear = new Date().getFullYear();
const historyStartYear = 2025;

const PaymentsHistory: React.FC = () => {
  const [rows, setRows] = useState<PaymentHistoryDoc[]>([]);
  const [membersByUid, setMembersByUid] = useState<Record<string, MemberDoc>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "member"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const nextMap: Record<string, MemberDoc> = {};
        snap.docs.forEach((doc) => {
          const data = doc.data() as Omit<MemberDoc, "uid">;
          nextMap[doc.id] = { uid: doc.id, ...data };
        });
        setMembersByUid(nextMap);
      },
      (err) => {
        console.error("Members lookup error:", err);
      }
    );

    return unsub;
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "payments"),
      where("type", "==", "monthly_fee")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const mapped = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentHistoryDoc));
        mapped.sort((a, b) => {
          const dateA = toDate(a.paidAt) || toDate(a.createdAt);
          const dateB = toDate(b.paidAt) || toDate(b.createdAt);
          return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
        });
        setRows(mapped);
        setLoading(false);
      },
      (err) => {
        console.error("Payments history fetch error:", err);
        toast.error("Failed to load payments history");
        setRows([]);
        setLoading(false);
      }
    );

    return unsub;
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filteredRows = rows.filter((row) => {
      const matchesMonth = selectedMonth === "all" || String(row.month || "") === selectedMonth;
      const matchesYear = selectedYear === "all" || String(row.year || "") === selectedYear;

      if (!matchesMonth || !matchesYear) return false;

      if (!term) return true;

      const member = membersByUid[row.memberUID || ""];
      const name = String(member ? `${member.name || ""} ${member.surname || ""}` : row.memberName || "").toLowerCase();
      const memberId = String(member?.memberId || row.memberId || "").toLowerCase();
      const uid = String(row.memberUID || "").toLowerCase();
      const period = `${monthLabel(row.month)} ${row.year || ""}`.toLowerCase();
      return (
        name.includes(term) ||
        memberId.includes(term) ||
        uid.includes(term) ||
        period.includes(term)
      );
    });

    return filteredRows;
  }, [rows, search, membersByUid, selectedMonth, selectedYear]);

  const yearOptions = useMemo(() => {
    const dataYears = rows
      .map((row) => row.year)
      .filter((year): year is number => typeof year === "number" && year >= historyStartYear);

    const yearsFromStart = Array.from(
      { length: Math.max(0, currentYear - historyStartYear + 1) },
      (_, index) => currentYear - index,
    );

    return Array.from(new Set([...yearsFromStart, ...dataYears])).sort((a, b) => b - a);
  }, [rows]);

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in pb-4 sm:pb-8">
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="page-title mb-0 text-2xl sm:text-3xl">Payments History</h1>
            <p className="text-slate-500 text-sm mt-2">View complete monthly fee records for all members</p>
          </div>
          <Link
            to="/admin/payments"
            className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-sm inline-flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Payments
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="relative max-w-md w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, member ID, UID, period..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-700 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="grid w-full gap-2 sm:grid-cols-2 lg:max-w-[420px]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
              <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Months</option>
                {monthsList.map((month) => (
                  <option key={month.value} value={String(month.value)}>{month.label}</option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
              <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Years</option>
                {yearOptions.map((year) => (
                  <option key={year} value={String(year)}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm animate-pulse">
              <div className="h-5 w-48 rounded bg-slate-200 mb-3" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="h-14 rounded-xl bg-slate-100" />
                <div className="h-14 rounded-xl bg-slate-100" />
                <div className="h-14 rounded-xl bg-slate-100" />
                <div className="h-14 rounded-xl bg-slate-100" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-400 shadow-sm">
            No payment history found
          </div>
        ) : (
          filtered.map((row) => {
            const member = membersByUid[row.memberUID || ""];
            const displayName = member ? `${member.name || ""} ${member.surname || ""}`.trim() : (row.memberName || "Unknown Member");
            const displayMemberId = member?.memberId || row.memberId || "N/A";
            const paidDate = toDate(row.paidAt) || toDate(row.createdAt);
            return (
              <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <p className="text-base sm:text-lg font-bold text-slate-900 truncate">
                      {displayName}
                    </p>
                    <p className="text-xs font-mono text-slate-500 mt-1 truncate">
                      {displayMemberId} · {row.memberUID || "UID missing"}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                    <ReceiptText size={12} /> Paid
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amount</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">₹{Number(row.amount || 0).toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Month</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{monthLabel(row.month)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Year</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{row.year || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Paid On</p>
                    <p className="mt-1 text-sm font-bold text-slate-900 inline-flex items-center gap-1">
                      <CalendarDays size={13} />
                      {paidDate ? paidDate.toLocaleDateString("en-IN") : "-"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PaymentsHistory;
