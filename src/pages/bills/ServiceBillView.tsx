import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  FileText,
  Hash,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Printer,
  Smartphone,
  User,
  Wrench,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { auth } from "../../firebase/firebaseConfig";
import { getServiceBillById } from "../../services/serviceBillsService";
import type { SavedServiceBill } from "../../types/serviceBill.types";
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

const escapeHtml = (value: unknown) =>
  show(String(value ?? "")).replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const Row: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="space-y-1">
    <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</dt>
    <dd className={`text-sm font-bold text-slate-800 break-words ${mono ? "font-mono" : ""}`}>{value}</dd>
  </div>
);

const Block: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
  <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="mb-5 flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <span className="text-indigo-600">{icon}</span>
    </div>
    {children}
  </section>
);

/**
 * Read-only view of a saved manual bill / service detail record.
 * Shared by the Admin and Member workflows — access is limited by the security
 * rules to admins and the member who created the record.
 */
const ServiceBillView: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const isAdmin = ["admin", "superadmin"].includes(userRole?.toLowerCase().trim() || "");
  const basePath = isAdmin ? "/admin/service-bills" : "/member/bills";

  const [bill, setBill] = useState<SavedServiceBill | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const data = await getServiceBillById(id);
        if (cancelled) return;
        if (!data) {
          toast.error(t("serviceBills.errors.notFound"));
          navigate(basePath, { replace: true });
          return;
        }
        // Frontend ownership guard: non-admins can only view their own bills.
        // Firestore rules enforce this at the DB level; this gives a clean UX redirect.
        if (!isAdmin && data.createdByUID && data.createdByUID !== auth.currentUser?.uid) {
          toast.error(t("serviceBills.errors.notFound"));
          navigate(basePath, { replace: true });
          return;
        }
        setBill(data);
      } catch (err: any) {
        console.error("[ServiceBillView] load failed:", err);
        if (!cancelled) {
          toast.error(err.message || t("serviceBills.errors.loadFailed"));
          navigate(basePath, { replace: true });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, isAdmin, basePath, navigate, t]);

  const handlePrint = () => {
    if (!bill) return;
    const rows = [
      [t("serviceBills.fields.billNumber"), show(bill.billNumber)],
      [t("serviceBills.fields.billDate"), bill.billDate ? formatDateOnly(bill.billDate) : DASH],
      [t("serviceBills.fields.customerName"), show(bill.customerName)],
      [t("serviceBills.fields.customerPhone"), show(bill.customerPhone)],
      [t("serviceBills.fields.customerAddress"), show(bill.customerAddress)],
      [t("serviceBills.fields.mobileModel"), show(bill.mobileModel)],
      [t("serviceBills.fields.imeiNumber"), show(bill.imeiNumber)],
      [t("serviceBills.fields.complaint"), show(bill.complaint)],
      [t("serviceBills.fields.serviceDetails"), show(bill.serviceDetails)],
      [t("serviceBills.fields.partPrice"), rupees(bill.partPrice)],
      [t("serviceBills.fields.labourCharges"), rupees(bill.labourCharges)],
      [t("serviceBills.fields.estimatedPrice"), rupees(bill.estimatedPrice)],
      [t("serviceBills.fields.finalPrice"), rupees(bill.finalPrice)],
      [t("serviceBills.fields.paymentStatus"), show(bill.paymentStatus)],
      [t("serviceBills.fields.paidDate"), bill.paidDate ? formatDateOnly(bill.paidDate) : DASH],
    ];

    const win = window.open("", "_blank", "width=800,height=1000");
    if (!win) return;
    win.document.write(`
      <!doctype html>
      <html><head><meta charset="utf-8" />
      <title>${escapeHtml(bill.billNumber || "Bill")}</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;padding:32px;}
        h1{font-size:20px;margin:0 0 4px;}
        p.sub{color:#64748b;font-size:12px;margin:0 0 20px;}
        table{width:100%;border-collapse:collapse;font-size:13px;}
        td{border-bottom:1px solid #e2e8f0;padding:8px 4px;vertical-align:top;}
        td.k{width:38%;color:#64748b;font-weight:700;}
        .terms{margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;white-space:pre-wrap;}
      </style></head><body>
      <h1>BCTA — ${escapeHtml(t("serviceBills.title"))}</h1>
      <p class="sub">${escapeHtml(bill.billNumber || "")}</p>
      <table>${rows
        .map(([k, v]) => `<tr><td class="k">${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`)
        .join("")}</table>
      <div class="terms"><strong>${escapeHtml(t("serviceBills.fields.termsConditions"))}</strong><br/>${escapeHtml(bill.termsConditions)}</div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 gap-3">
        <Loader2 size={22} className="animate-spin" />
        <span className="font-bold text-sm">{t("common.loading")}</span>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 py-10 text-center">
        <FileText size={56} className="mx-auto text-slate-300" />
        <h1 className="text-2xl font-black text-slate-900">{t("serviceBills.errors.notFoundTitle")}</h1>
        <p className="text-sm text-slate-500">{t("serviceBills.errors.notFound")}</p>
        <Link
          to={basePath}
          className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white"
        >
          <ArrowLeft size={16} /> {t("serviceBills.backToList")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 animate-fade-in pb-14">
      <section className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-[#0a1f5e] via-[#183b9a] to-[#2b62d4] p-5 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.22),_transparent_46%)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              to={basePath}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/10 text-white transition hover:bg-white/20"
              aria-label={t("serviceBills.backToList")}
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-white/75">{t("serviceBills.breadcrumb")}</p>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {show(bill.billNumber || bill.customerName)}
              </h1>
              <p className="mt-1 text-xs text-white/80">
                {t("serviceBills.viewSubtitle")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20"
            >
              <Printer size={14} /> {t("serviceBills.print")}
            </button>
            <Link
              to={`${basePath}/${bill.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#183b9a] hover:bg-white/90"
            >
              <Pencil size={14} /> {t("common.edit")}
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {t("serviceBills.fields.finalPrice")}
          </p>
          <p className="mt-1 text-xl font-black text-indigo-700">{rupees(bill.finalPrice)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {t("serviceBills.fields.paymentStatus")}
          </p>
          <p className="mt-1 text-xl font-black text-slate-900">
            {t(`serviceBills.paymentStatus.${bill.paymentStatus}`, { defaultValue: show(bill.paymentStatus) })}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {t("serviceBills.fields.paidDate")}
          </p>
          <p className="mt-1 text-xl font-black text-slate-900">
            {bill.paidDate ? formatDateOnly(bill.paidDate) : DASH}
          </p>
        </div>
      </div>

      <Block title={t("serviceBills.sections.billInfo")} icon={<Hash size={20} />}>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Row label={t("serviceBills.fields.billNumber")} value={show(bill.billNumber)} mono />
          <Row
            label={t("serviceBills.fields.billDate")}
            value={bill.billDate ? formatDateOnly(bill.billDate) : DASH}
          />
        </dl>
      </Block>

      <Block title={t("serviceBills.sections.customer")} icon={<User size={20} />}>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Row label={t("serviceBills.fields.customerName")} value={show(bill.customerName)} />
          <Row label={t("serviceBills.fields.customerPhone")} value={show(bill.customerPhone)} />
        </dl>
        <div className="mt-4">
          <Row label={t("serviceBills.fields.customerAddress")} value={show(bill.customerAddress)} />
        </div>
      </Block>

      <Block title={t("serviceBills.sections.device")} icon={<Smartphone size={20} />}>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Row label={t("serviceBills.fields.mobileModel")} value={show(bill.mobileModel)} />
          <Row label={t("serviceBills.fields.imeiNumber")} value={show(bill.imeiNumber)} mono />
        </dl>
      </Block>

      <Block title={t("serviceBills.sections.service")} icon={<Wrench size={20} />}>
        <dl className="grid gap-4">
          <Row label={t("serviceBills.fields.complaint")} value={show(bill.complaint)} />
          <Row label={t("serviceBills.fields.serviceDetails")} value={show(bill.serviceDetails)} />
        </dl>
      </Block>

      {bill.photoUrl ? (
        <Block title={t("serviceBills.sections.photo")} icon={<Camera size={20} />}>
          <img
            src={bill.photoUrl}
            alt={t("serviceBills.sections.photo")}
            className="max-h-80 w-full rounded-2xl border border-slate-200 object-contain"
          />
        </Block>
      ) : null}

      <Block title={t("serviceBills.sections.pricing")} icon={<FileText size={20} />}>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Row label={t("serviceBills.fields.partPrice")} value={rupees(bill.partPrice)} />
          <Row label={t("serviceBills.fields.labourCharges")} value={rupees(bill.labourCharges)} />
          <Row label={t("serviceBills.fields.estimatedPrice")} value={rupees(bill.estimatedPrice)} />
          <Row label={t("serviceBills.fields.finalPrice")} value={rupees(bill.finalPrice)} />
        </dl>
      </Block>

      <Block title={t("serviceBills.sections.payment")} icon={<CalendarDays size={20} />}>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Row
            label={t("serviceBills.fields.paymentStatus")}
            value={t(`serviceBills.paymentStatus.${bill.paymentStatus}`, {
              defaultValue: show(bill.paymentStatus),
            })}
          />
          <Row
            label={t("serviceBills.fields.paidDate")}
            value={bill.paidDate ? formatDateOnly(bill.paidDate) : DASH}
          />
        </dl>
      </Block>

      <Block title={t("serviceBills.sections.terms")} icon={<FileText size={20} />}>
        <p className="whitespace-pre-wrap text-sm text-slate-700">{show(bill.termsConditions)}</p>
      </Block>

      <div className="space-y-1 text-center text-[11px] text-slate-400">
        {bill.createdByName ? (
          <p className="flex items-center justify-center gap-1.5">
            <MapPin size={12} /> {t("serviceBills.createdBy")}: {bill.createdByName} • {formatDateTime(bill.createdAt)}
          </p>
        ) : null}
        {bill.createdByUID ? (
          <p className="flex items-center justify-center gap-1.5">
            <Phone size={12} /> UID: {bill.createdByUID}
          </p>
        ) : null}
      </div>

      <div className="flex justify-center">
        <Link
          to={basePath}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft size={16} /> {t("serviceBills.backToList")}
        </Link>
      </div>
    </div>
  );
};

export default ServiceBillView;
