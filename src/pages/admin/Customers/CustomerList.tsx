import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import SecurityWarningPopup from "../../../components/shared/SecurityWarningPopup";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  X,
  Search,
  Phone,
  CalendarDays,
  Image as ImageIcon,
  UserRound,
  Wrench,
  Loader2,
  ChevronDown,
} from "lucide-react";
import {
  subscribeCustomers,
  subscribeCustomersByPhone,
  deleteCustomer,
} from "../../../services/customersService";
import { CUSTOMER_COMPLAINTS } from "../../../types/customer.types";
import type { Customer } from "../../../types/customer.types";
import { useAuth } from "../../../context/AuthContext";
import { TableSkeleton } from "../../../components/shared/LoadingSkeleton";

const CustomerList: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { userRole } = useAuth();
  const isAdmin = userRole?.toLowerCase().trim() === "admin" ||
    userRole?.toLowerCase().trim() === "superadmin";
  const basePath = isAdmin ? "/admin/customers" : "/member/customers";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<
    { id: string; name: string; photoPublicId?: string } | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!showDeleteConfirm) return;

    const scrollY = window.scrollY;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyLeft = document.body.style.left;
    const previousBodyRight = document.body.style.right;
    const previousBodyWidth = document.body.style.width;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.left = previousBodyLeft;
      document.body.style.right = previousBodyRight;
      document.body.style.width = previousBodyWidth;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [showDeleteConfirm]);

  useEffect(() => {
    setLoading(true);
    const normalized = searchTerm.replace(/\D/g, "");

    if (!normalized) {
      setIsSearching(false);
      const unsub = subscribeCustomers((data) => {
        setCustomers(data);
        setLoading(false);
      }, isAdmin);
      return () => unsub();
    }

    setIsSearching(true);
    const unsub = subscribeCustomersByPhone(normalized, (data) => {
      setCustomers(data);
      setLoading(false);
    }, isAdmin);
    return () => unsub();
  }, [searchTerm, isAdmin]);

  /**
   * Complaints are free text now: translate the known suggestions and show the
   * user's own wording verbatim for anything else. Nothing is generated.
   */
  const complaintLabel = (value?: string) => {
    const raw = (value || "").trim();
    if (!raw) return t("common.unknown");
    if ((CUSTOMER_COMPLAINTS as readonly string[]).includes(raw)) {
      return t(`customers.complaints.${raw}`, { defaultValue: raw });
    }
    return raw;
  };

  const paymentLabel = (value?: string) =>
    t(`serviceBills.paymentStatus.${value || "unpaid"}`, {
      defaultValue: value || t("common.unknown"),
    });

  const clearSearch = () => {
    setSearchTerm("");
    setIsSearching(false);
  };

  const handleDelete = (c: Customer) => {
    if (!c.id) return;
    setCustomerToDelete({
      id: c.id,
      name: c.name || t("common.unknown"),
      photoPublicId: c.photoPublicId,
    });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!customerToDelete) return;
    setShowDeleteConfirm(false);
    setDeleting(true);
    try {
      await deleteCustomer(customerToDelete.id, customerToDelete.photoPublicId);
      toast.success(t("customers.toasts.deleted"));
    } catch (err: any) {
      console.error("Delete customer error:", err);
      toast.error(t("customers.toasts.deleteError"));
    } finally {
      setDeleting(false);
      setCustomerToDelete(null);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return "";
    const locale = i18n.language === "te" ? "te-IN" : "en-IN";
    if (date.toDate) return date.toDate().toLocaleDateString(locale);
    return new Date(date).toLocaleDateString(locale);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Security Warning Popup */}
      <SecurityWarningPopup storageKey="securityWarning_customers" />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && customerToDelete && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 backdrop-blur-lg animate-fade-in p-4"
          onClick={() => {
            setShowDeleteConfirm(false);
            setCustomerToDelete(null);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-scale-up relative"
            style={{ maxHeight: "calc(100vh - 32px)", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100">
              <AlertTriangle className="text-red-600" size={32} />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 text-center mb-3">
              {t("customers.deleteConfirm", { name: customerToDelete.name })}
            </h2>
            <p className="text-sm text-slate-600 text-center mb-6">
              {t("customers.deleteWarning")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setCustomerToDelete(null);
                }}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
              >
                {t("common.cancel") || "Cancel"}
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                {deleting ? t("customers.deleting") : t("common.delete") || "Delete"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end justify-between mb-2">
        <div className="relative">
          <div className="absolute -left-4 top-0 w-1 bg-indigo-600 h-full rounded-full opacity-0 md:opacity-100" />
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-2">
            {t("customers.title")}
          </h1>
          <p className="text-slate-500 font-medium text-sm tracking-tight">{t("customers.subtitle")}</p>
        </div>
        <Link
          to={`${basePath}/add`}
          className="h-12 w-full justify-center px-6 rounded-2xl bg-indigo-600 text-white font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95 sm:w-auto"
        >
          <Plus size={20} strokeWidth={2.5} />
          <span>{t("customers.addCustomer")}</span>
        </Link>
      </div>

      {/* Search Card */}
      <div className="glass-card rounded-2xl sm:rounded-3xl border border-white/15 p-3.5 sm:p-4"
        style={{ background: "rgba(255, 255, 255, 0.18)" }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-slate-400">
            <Search size={16} />
            <span className="text-[11px] font-black uppercase tracking-widest">{t("customers.searchByPhone")}</span>
          </div>
          <div className="relative w-full sm:w-80">
            <Phone size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="tel"
              inputMode="numeric"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("customers.searchPlaceholder")}
              className="w-full h-11 pl-10 pr-10 bg-white/40 border border-slate-200/60 rounded-2xl font-semibold text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={t("common.clear")}
                title={t("customers.clearSearch")}
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-8">
            <TableSkeleton rows={6} />
          </div>
        ) : customers.length === 0 ? (
          isSearching ? (
            <div className="text-center py-20 px-4 rounded-3xl border border-dashed border-slate-300 flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center">
                <Search size={28} className="text-indigo-400" />
              </div>
              <p className="font-black text-slate-700 text-lg tracking-tight">{t("customers.notFound")}</p>
              <p className="text-sm font-medium text-slate-400 max-w-sm">{t("customers.notFoundDesc")}</p>
              <button
                onClick={clearSearch}
                className="mt-2 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all"
              >
                <X size={14} />
                {t("customers.clearSearch")}
              </button>
            </div>
          ) : (
            <div className="text-center py-20 px-4 rounded-3xl border border-dashed border-slate-300 flex flex-col items-center justify-center gap-4">
              <span className="text-6xl opacity-20">📋</span>
              <p className="font-black text-slate-700 text-lg tracking-tight">{t("customers.noCustomers")}</p>
              <p className="text-sm font-medium text-slate-400">{t("customers.noCustomersDesc")}</p>
              <Link
                to={`${basePath}/add`}
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2.5 text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                <Plus size={16} strokeWidth={2.5} />
                {t("customers.addCustomer")}
              </Link>
            </div>
          )
        ) : (
          customers.map((c) => {
            const statusTone =
              c.paymentStatus === "Paid"
                ? { color: "text-emerald-700", dot: "bg-emerald-500" }
                : c.paymentStatus === "Partial"
                  ? { color: "text-amber-700", dot: "bg-amber-500" }
                  : { color: "text-red-700", dot: "bg-red-500" };
            return (
              <div
                key={c.id}
                className="glass-card bg-white/35 hover:bg-white/45 rounded-2xl p-4 sm:p-5 transition-all duration-300 border border-white/30 shadow-md hover:shadow-lg group"
              >
                <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:gap-6">
                  {/* Photo + basic info */}
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="relative shrink-0">
                      {c.photoUrl ? (
                        <img
                          src={c.photoUrl}
                          alt=""
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl object-cover shadow-md border-2 border-white"
                        />
                      ) : (
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-indigo-50 rounded-xl sm:rounded-2xl flex items-center justify-center text-indigo-600 font-black border-2 border-indigo-100 shadow-inner">
                          <UserRound size={24} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-slate-900 text-base sm:text-lg tracking-tight truncate">
                        {c.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold truncate flex items-center gap-1">
                        <Phone size={12} className="shrink-0" />
                        {c.phoneNumber || t("common.unknown")}
                      </p>
                      <span className="inline-flex items-center gap-1 mt-1 font-mono text-[10px] uppercase font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 shadow-sm">
                        <Wrench size={10} />
                        {complaintLabel(c.complaint)}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:gap-3 w-full lg:w-auto lg:max-w-md">
                    <div className="rounded-xl px-3 py-2 sm:min-w-[120px] bg-white/80 border border-white/80 flex flex-col justify-center">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                        <CalendarDays size={10} /> {t("customers.th.created")}
                      </p>
                      <p className="text-sm font-black text-slate-800">{formatDate(c.createdAt) || t("common.noDate")}</p>
                    </div>
                    <div className="rounded-xl px-3 py-2 sm:min-w-[120px] bg-white/80 border border-white/80 flex flex-col justify-center">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                        {t("customers.th.payment")}
                      </p>
                      <p className={`text-sm font-black uppercase flex items-center gap-1.5 ${statusTone.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full inline-block ${statusTone.dot}`} />
                        {paymentLabel(c.paymentStatus)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="w-full md:w-auto md:shrink-0 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg shadow-slate-200/60">
                    <div className={`grid gap-2 ${isAdmin ? "grid-cols-2" : "grid-cols-1"}`}>
                      <Link
                        to={`${basePath}/${c.id}/edit`}
                        className="h-11 sm:h-10 min-w-0 px-1.5 sm:px-2 flex items-center justify-center gap-1 rounded-xl border border-indigo-200 bg-white text-indigo-600 shadow-md shadow-indigo-100 transition-all font-bold text-[11px] sm:text-xs hover:bg-indigo-50 hover:shadow-lg hover:shadow-indigo-100 hover:-translate-y-0.5 active:translate-y-0.5"
                        title={t("customers.actions.edit")}
                      >
                        <Pencil size={15} /> <span className="inline">{t("customers.actions.edit")}</span>
                      </Link>
                      {/* Deleting a customer stays an Admin-only operation */}
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(c)}
                          className="h-11 sm:h-10 min-w-0 px-1.5 sm:px-2 flex items-center justify-center gap-1 rounded-xl border border-red-200 bg-white text-red-500 shadow-md shadow-red-100 transition-all font-bold text-[11px] sm:text-xs hover:bg-red-50 hover:text-red-700 hover:shadow-lg hover:shadow-red-100 hover:-translate-y-0.5 active:translate-y-0.5"
                          title={t("customers.actions.delete")}
                        >
                          <Trash2 size={15} /> <span className="inline">{t("customers.actions.delete")}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="mt-3 pl-0 lg:ml-[76px]">
                  <p className="text-slate-600 text-xs font-medium leading-relaxed flex items-start gap-1.5">
                    <ImageIcon size={12} className="mt-0.5 shrink-0 text-slate-400" />
                    <span className="wrap-break-word">{c.description || t("customers.fields.noDescription")}</span>
                  </p>
                </div>

                {/* Saved manual bill / service details — shown exactly as stored */}
                {(() => {
                  // Legacy records predate these fields, so treat each as optional.
                  const str = (v: unknown) => (v == null ? "" : String(v).trim());
                  const rows: Array<[string, string]> = [
                    [t("serviceBills.fields.billNumber"), str(c.billNumber)],
                    [t("serviceBills.fields.billDate"), str(c.billDate)],
                    [t("serviceBills.fields.customerAddress"), str(c.customerAddress)],
                    [t("serviceBills.fields.mobileModel"), str(c.mobileModel)],
                    [t("serviceBills.fields.imeiNumber"), str(c.imeiNumber)],
                    [t("serviceBills.fields.serviceDetails"), str(c.serviceDetails)],
                    [t("serviceBills.fields.partPrice"), str(c.partPrice)],
                    [t("serviceBills.fields.labourCharges"), str(c.labourCharges)],
                    [t("serviceBills.fields.estimatedPrice"), str(c.estimatedPrice)],
                    [t("serviceBills.fields.finalPrice"), str(c.finalPrice)],
                    [t("serviceBills.fields.paidDate"), str(c.paidDate)],
                    [t("serviceBills.fields.termsConditions"), str(c.termsConditions)],
                    ].filter((pair) => pair[1] !== "") as Array<[string, string]>;
                  if (rows.length === 0) return null;
                  const open = expanded.has(c.id || "");
                  return (
                    <div className="mt-3 pl-0 lg:ml-[76px]">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(c.id || "")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/80 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                      >
                        <ChevronDown
                          size={13}
                          className={`transition-transform ${open ? "rotate-180" : ""}`}
                        />
                        {t("customers.details")}
                      </button>

                      {open && (
                        <dl className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 rounded-2xl border border-slate-200 bg-white/70 p-3">
                          {rows.map(([label, value]) => (
                            <div key={label} className="min-w-0">
                              <dt className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                                {label}
                              </dt>
                              <dd className="mt-0.5 text-xs font-semibold text-slate-700 wrap-break-word">
                                {value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CustomerList;