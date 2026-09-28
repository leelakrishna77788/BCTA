import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Eye,
  FileText,
  Filter,
  Loader2,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { deleteServiceBill, subscribeServiceBills } from "../../services/serviceBillsService";
import { SERVICE_BILL_PAYMENT_STATUSES, type SavedServiceBill } from "../../types/serviceBill.types";
import { TableSkeleton } from "../../components/shared/LoadingSkeleton";
import { formatDateOnly, formatDateTime } from "../../utils/date";

const DASH = "—";

const show = (value: string | undefined | null) => {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : DASH;
};

const rupees = (value: string | undefined | null) => {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? `₹ ${trimmed}` : DASH;
};

/**
 * Bill / service detail list.
 *
 * Shared by the Admin and Member workflows: admins see every saved record,
 * members only see the records they created (enforced again by the security
 * rules). Nothing on this screen is generated or calculated.
 */
const ServiceBillList: React.FC = () => {
  const { t } = useTranslation();
  const { userRole } = useAuth();
  const normalizedRole = userRole?.toLowerCase().trim() || "";
  const isAdmin = normalizedRole === "admin" || normalizedRole === "superadmin";
  const basePath = isAdmin ? "/admin/service-bills" : "/member/bills";

  const [bills, setBills] = useState<SavedServiceBill[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SavedServiceBill | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeServiceBills(
      isAdmin,
      (list) => {
        setBills(list);
        setLoading(false);
      },
      () => {
        toast.error(t("serviceBills.errors.loadFailed"));
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [isAdmin, t]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return bills.filter((bill) => {
      if (statusFilter !== "all" && bill.paymentStatus !== statusFilter) return false;
      if (!term) return true;
      const haystack = [
        bill.billNumber,
        bill.billDate,
        bill.customerName,
        bill.customerPhone,
        bill.customerAddress,
        bill.mobileModel,
        bill.imeiNumber,
        bill.complaint,
        bill.serviceDetails,
        bill.finalPrice,
        bill.createdByName,
      ]
        .map((v) => String(v ?? ""))
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [bills, searchTerm, statusFilter]);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    setDeletingId(id);
    try {
      await deleteServiceBill(id, pendingDelete.photoPublicId);
      toast.success(t("serviceBills.toasts.deleted"));
    } catch (err: any) {
      console.error("[ServiceBillList] delete failed:", err);
      toast.error(err.message || t("serviceBills.errors.deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  const hasFilters = searchTerm.trim().length > 0 || statusFilter !== "all";

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-7 rounded-full bg-indigo-600" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              {t("serviceBills.title")}
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-2 max-w-2xl">
            {isAdmin ? t("serviceBills.adminSubtitle") : t("serviceBills.memberSubtitle")}
          </p>
        </div>
        <Link
          to={`${basePath}/new`}
          className="h-12 w-full sm:w-auto justify-center px-6 rounded-2xl bg-indigo-600 text-white font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Plus size={20} strokeWidth={2.5} />
          <span>{t("serviceBills.addBill")}</span>
        </Link>
      </div>

      <div className="glass-card rounded-2xl sm:rounded-3xl border border-white/15 p-3.5 sm:p-4"
        style={{ background: "rgba(255, 255, 255, 0.18)" }}
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-2 text-slate-400">
            <Filter size={16} />
            <span className="text-[11px] font-black uppercase tracking-widest">{t("serviceBills.filterResults")}</span>
          </div>
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,12rem)_auto] xl:items-center">
            <div className="relative min-w-0">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t("serviceBills.searchPlaceholder")}
                className="w-full h-11 pl-10 pr-10 bg-white/40 border border-slate-200/60 rounded-2xl font-semibold text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={t("common.clear")}
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-11 pl-4 pr-4 appearance-none bg-white/35 border border-slate-200/50 rounded-2xl font-bold text-slate-700 cursor-pointer focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
            >
              <option value="all">{t("serviceBills.allPaymentStatuses")}</option>
              {SERVICE_BILL_PAYMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`serviceBills.paymentStatus.${status}`, { defaultValue: status })}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasFilters}
              className="h-11 inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/60 bg-white/40 px-4 text-sm font-bold text-slate-600 shadow-sm transition-all hover:bg-white hover:text-indigo-600 disabled:opacity-40 disabled:hover:bg-white/40"
            >
              <RotateCcw size={14} />
              {t("common.clear")}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-8">
          <TableSkeleton rows={6} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 px-4 rounded-3xl border border-dashed flex flex-col items-center justify-center gap-4">
          <span className="text-slate-300"><FileText size={64} /></span>
          <p className="font-bold text-slate-600 mb-1">{t("serviceBills.empty")}</p>
          <p className="text-sm font-medium text-slate-400">{t("serviceBills.emptyHint")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((bill) => (
            <article
              key={bill.id}
              className="glass-card bg-white/35 hover:bg-white/45 rounded-2xl p-4 sm:p-5 lg:p-6 transition-all duration-300 border border-white/30 shadow-md hover:shadow-lg"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
                {bill.photoUrl ? (
                  <img
                    src={bill.photoUrl}
                    alt=""
                    className="h-24 w-24 shrink-0 rounded-2xl border-2 border-white object-cover shadow-md lg:h-28 lg:w-28"
                  />
                ) : null}
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1 font-mono text-[11px] font-black uppercase text-indigo-700">
                      <FileText size={12} /> {show(bill.billNumber)}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {bill.billDate ? formatDateOnly(bill.billDate) : t("serviceBills.noDate")}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${
                        bill.paymentStatus === "Paid"
                          ? "bg-emerald-100 text-emerald-700"
                          : bill.paymentStatus === "Partial"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {t(`serviceBills.paymentStatus.${bill.paymentStatus}`, {
                        defaultValue: bill.paymentStatus || DASH,
                      })}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-black text-slate-900 text-base sm:text-lg tracking-tight">
                      {show(bill.customerName)}
                    </h3>
                    {bill.customerPhone ? (
                      <p className="text-xs text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                        <Phone size={12} /> {bill.customerPhone}
                      </p>
                    ) : null}
                  </div>

                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    <div>
                      <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {t("serviceBills.fields.mobileModel")}
                      </dt>
                      <dd className="text-sm font-bold text-slate-800 truncate">{show(bill.mobileModel)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {t("serviceBills.fields.imeiNumber")}
                      </dt>
                      <dd className="text-sm font-bold text-slate-800 font-mono truncate">{show(bill.imeiNumber)}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {t("serviceBills.fields.complaint")}
                      </dt>
                      <dd className="text-sm font-bold text-slate-800 line-clamp-2">{show(bill.complaint)}</dd>
                    </div>
                  </dl>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="rounded-lg bg-white/70 border border-white/80 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                      {t("serviceBills.fields.partPrice")}: {rupees(bill.partPrice)}
                    </span>
                    <span className="rounded-lg bg-white/70 border border-white/80 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                      {t("serviceBills.fields.labourCharges")}: {rupees(bill.labourCharges)}
                    </span>
                    <span className="rounded-lg bg-white/70 border border-white/80 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                      {t("serviceBills.fields.estimatedPrice")}: {rupees(bill.estimatedPrice)}
                    </span>
                    <span className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-black text-indigo-700">
                      {t("serviceBills.fields.finalPrice")}: {rupees(bill.finalPrice)}
                    </span>
                  </div>

                  {isAdmin && bill.createdByName ? (
                    <p className="text-[11px] text-slate-400">
                      {t("serviceBills.createdBy")}: {bill.createdByName} • {formatDateTime(bill.createdAt)}
                    </p>
                  ) : null}
                </div>

                <div className="w-full lg:w-auto lg:shrink-0 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg shadow-slate-200/60">
                  <div className="grid grid-cols-3 gap-2">
                    <Link
                      to={`${basePath}/${bill.id}`}
                      className="h-12 sm:h-10 min-w-0 px-1.5 sm:px-2 flex flex-col sm:flex-row items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 shadow-md shadow-slate-200/60 transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 font-bold text-[11px] sm:text-xs leading-tight text-center"
                    >
                      <Eye size={16} /> <span className="inline">{t("common.view")}</span>
                    </Link>
                    <Link
                      to={`${basePath}/${bill.id}/edit`}
                      className="h-12 sm:h-10 min-w-0 px-1.5 sm:px-2 flex flex-col sm:flex-row items-center justify-center gap-1 rounded-xl border border-amber-200 bg-white text-amber-700 shadow-md shadow-amber-100 transition-all hover:bg-amber-50 font-bold text-[11px] sm:text-xs leading-tight text-center"
                    >
                      <Pencil size={16} /> <span className="inline">{t("common.edit")}</span>
                    </Link>
                    {isAdmin ? (
                      <button
                        onClick={() => setPendingDelete(bill)}
                        disabled={deletingId === bill.id}
                        className="h-12 sm:h-10 min-w-0 px-1.5 sm:px-2 flex flex-col sm:flex-row items-center justify-center gap-1 rounded-xl border border-red-200 bg-white text-red-500 shadow-md shadow-red-100 transition-all font-bold text-[11px] sm:text-xs leading-tight text-center hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
                      >
                        {deletingId === bill.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                        <span className="inline">{t("common.delete")}</span>
                      </button>
                    ) : (
                      <span className="hidden sm:block" />
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 backdrop-blur-lg animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-scale-up">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100">
              <AlertTriangle className="text-red-600" size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 text-center mb-3">
              {t("serviceBills.deleteConfirmTitle")}
            </h2>
            <p className="text-sm text-slate-600 text-center mb-6">
              {t("serviceBills.deleteConfirmMessage", {
                bill: pendingDelete.billNumber || pendingDelete.customerName,
              })}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingDelete(null)}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceBillList;
