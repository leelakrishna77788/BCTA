import React, { useEffect, useState, type ChangeEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Camera, FileText, Loader2, Save, Upload, User, Wrench, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { auth } from "../../firebase/firebaseConfig";
import {
  createServiceBill,
  EMPTY_SERVICE_BILL,
  getServiceBillById,
  updateServiceBill,
} from "../../services/serviceBillsService";
import {
  SERVICE_BILL_PAYMENT_STATUSES,
  type ServiceBillInput,
  type ServiceBillPaymentStatus,
} from "../../types/serviceBill.types";
import {
  uploadImage,
  deleteImage,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
} from "../../utils/cloudinary";
import BillField from "./BillField";

type FormState = ServiceBillInput;

const toFormState = (data: ServiceBillInput): FormState => ({ ...data });

/**
 * Manual bill / service detail form.
 *
 * Shared by the Admin and Member workflows — the only difference is the base
 * path it navigates back to. Every field is typed/selected by the user; there is
 * no default bill number, no auto date, no computed total and no derived status.
 */
const ServiceBillForm: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRole, userProfile } = useAuth();
  const isAdmin = userRole?.toLowerCase().trim() === "admin" ||
    userRole?.toLowerCase().trim() === "superadmin";
  const basePath = isAdmin ? "/admin/service-bills" : "/member/bills";
  const profileName = [userProfile?.name, userProfile?.surname]
    .filter(Boolean)
    .join(" ")
    .trim();

  const isEdit = Boolean(id);
  const [form, setForm] = useState<FormState>({ ...EMPTY_SERVICE_BILL });
  const [fetching, setFetching] = useState<boolean>(isEdit);
  const [saving, setSaving] = useState<boolean>(false);

  // Photo state — the only non-typed item, the user picks a file from their device.
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string>("");
  const [existingPublicId, setExistingPublicId] = useState<string>("");

  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    const load = async () => {
      try {
        setFetching(true);
        const bill = await getServiceBillById(id);
        if (cancelled) return;
        if (!bill) {
          toast.error(t("serviceBills.errors.notFound"));
          navigate(basePath, { replace: true });
          return;
        }
        // Frontend ownership guard: non-admins can only edit their own bills.
        // Firestore rules enforce this at the DB level; this gives a clean UX redirect.
        if (!isAdmin && bill.createdByUID && bill.createdByUID !== auth.currentUser?.uid) {
          toast.error(t("serviceBills.errors.notFound"));
          navigate(basePath, { replace: true });
          return;
        }
        const { id: _id, createdByUID, createdByName, createdByRole, createdAt, updatedAt, ...rest } = bill;
        setForm(toFormState(rest as ServiceBillInput));
        if (bill.photoUrl) {
          setPhotoPreview(bill.photoUrl);
          setExistingPhotoUrl(bill.photoUrl);
          setExistingPublicId(bill.photoPublicId || "");
        }
      } catch (err: any) {
        console.error("[ServiceBillForm] load failed:", err);
        if (!cancelled) {
          toast.error(err.message || t("serviceBills.errors.loadFailed"));
          navigate(basePath, { replace: true });
        }
      } finally {
        if (!cancelled) setFetching(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit, isAdmin, basePath, navigate, t]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    // Store exactly what was typed/selected — no coercion, no formatting.
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    return () => {
      if (photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const handlePhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error(t("serviceBills.errors.imageInvalid"));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(t("serviceBills.errors.imageTooLarge"));
      return;
    }
    if (photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleRemovePhoto = () => {
    if (photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview("");
  };

  /** Upload the chosen photo and clean up the one it replaces. */
  const resolvePhotoPayload = async (): Promise<{
    photoUrl?: string;
    photoPublicId?: string;
  }> => {
    if (photoFile) {
      if (!ALLOWED_IMAGE_TYPES.includes(photoFile.type)) {
        throw new Error(t("serviceBills.errors.imageInvalid"));
      }
      if (photoFile.size > MAX_IMAGE_BYTES) {
        throw new Error(t("serviceBills.errors.imageTooLarge"));
      }
      const { url, publicId } = await uploadImage(photoFile, "service-bills");
      if (existingPublicId) {
        try {
          await deleteImage(existingPublicId);
        } catch (err) {
          console.warn("[ServiceBillForm] failed to delete replaced photo:", err);
        }
      }
      return { photoUrl: url, photoPublicId: publicId };
    }
    if (!photoPreview && existingPhotoUrl) {
      // Photo removed → clean up the uploaded image
      if (existingPublicId) {
        try {
          await deleteImage(existingPublicId);
        } catch (err) {
          console.warn("[ServiceBillForm] failed to delete removed photo:", err);
        }
      }
      return { photoUrl: "", photoPublicId: "" };
    }
    return {};
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // The payment status is never defaulted — the user must pick it explicitly.
    if (!SERVICE_BILL_PAYMENT_STATUSES.includes(form.paymentStatus as ServiceBillPaymentStatus)) {
      toast.error(t("serviceBills.errors.paymentStatusRequired"));
      return;
    }
    setSaving(true);
    try {
      const photoPayload = await resolvePhotoPayload();
      const payload = { ...form, ...photoPayload };
      if (isEdit && id) {
        await updateServiceBill(id, payload);
        toast.success(t("serviceBills.toasts.updated"));
      } else {
        await createServiceBill(payload, isAdmin, profileName);
        toast.success(t("serviceBills.toasts.created"));
      }
      navigate(basePath);
    } catch (err: any) {
      console.error("[ServiceBillForm] save failed:", err);
      toast.error(err.message || t("serviceBills.errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 gap-3">
        <Loader2 size={22} className="animate-spin" />
        <span className="font-bold text-sm">{t("common.loading")}</span>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 animate-fade-in pb-14">
      <section className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-[#0a1f5e] via-[#183b9a] to-[#2b62d4] p-5 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.22),_transparent_46%)]" />
        <div className="relative flex items-center gap-4">
          <Link
            to={basePath}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/10 text-white transition hover:bg-white/20"
            aria-label={t("common.close")}
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-white/75">{t("serviceBills.breadcrumb")}</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {isEdit ? t("serviceBills.form.editTitle") : t("serviceBills.form.createTitle")}
            </h1>
            <p className="mt-1 text-xs text-white/80">{t("serviceBills.form.subtitle")}</p>
          </div>
        </div>
      </section>

      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
        {t("serviceBills.manualNotice")}
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo — the user uploads a file, nothing is generated */}
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t("serviceBills.sections.photo")}</h2>
              <p className="text-sm text-slate-500">{t("serviceBills.sections.photoDesc")}</p>
            </div>
            <Camera className="text-indigo-600" size={20} />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50">
              {photoPreview ? (
                <img src={photoPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-300">
                  <Upload size={26} />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-700">
                <Upload size={14} />
                {photoPreview ? t("serviceBills.form.replacePhoto") : t("serviceBills.form.addPhoto")}
                <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
              </label>

              {photoPreview ? (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100"
                >
                  <X size={14} />
                  {t("serviceBills.form.removePhoto")}
                </button>
              ) : null}

              <p className="text-[11px] font-medium text-slate-400">
                {t("serviceBills.form.photoHint")}
              </p>
            </div>
          </div>
        </section>

        {/* Bill identity */}
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t("serviceBills.sections.billInfo")}</h2>
              <p className="text-sm text-slate-500">{t("serviceBills.sections.billInfoDesc")}</p>
            </div>
            <FileText className="text-indigo-600" size={20} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <BillField
              label={t("serviceBills.fields.billNumber")}
              name="billNumber"
              value={form.billNumber}
              onChange={handleChange}
              placeholder={t("serviceBills.placeholders.billNumber")}
              required
            />
            <BillField
              label={t("serviceBills.fields.billDate")}
              name="billDate"
              type="date"
              value={form.billDate}
              onChange={handleChange}
              required
            />
          </div>
        </section>

        {/* Customer */}
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t("serviceBills.sections.customer")}</h2>
              <p className="text-sm text-slate-500">{t("serviceBills.sections.customerDesc")}</p>
            </div>
            <User className="text-indigo-600" size={20} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <BillField
              label={t("serviceBills.fields.customerName")}
              name="customerName"
              value={form.customerName}
              onChange={handleChange}
              placeholder={t("serviceBills.placeholders.customerName")}
              required
            />
            <BillField
              label={t("serviceBills.fields.customerPhone")}
              name="customerPhone"
              type="tel"
              value={form.customerPhone}
              onChange={handleChange}
              placeholder={t("serviceBills.placeholders.customerPhone")}
              required
            />
            <div className="sm:col-span-2">
              <BillField
                label={t("serviceBills.fields.customerAddress")}
                name="customerAddress"
                type="textarea"
                rows={3}
                value={form.customerAddress}
                onChange={handleChange}
                placeholder={t("serviceBills.placeholders.customerAddress")}
              />
            </div>
          </div>
        </section>

        {/* Device */}
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t("serviceBills.sections.device")}</h2>
              <p className="text-sm text-slate-500">{t("serviceBills.sections.deviceDesc")}</p>
            </div>
            <Wrench className="text-indigo-600" size={20} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <BillField
              label={t("serviceBills.fields.mobileModel")}
              name="mobileModel"
              value={form.mobileModel}
              onChange={handleChange}
              placeholder={t("serviceBills.placeholders.mobileModel")}
              required
            />
            <BillField
              label={t("serviceBills.fields.imeiNumber")}
              name="imeiNumber"
              value={form.imeiNumber}
              onChange={handleChange}
              placeholder={t("serviceBills.placeholders.imeiNumber")}
            />
          </div>
        </section>

        {/* Service */}
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t("serviceBills.sections.service")}</h2>
              <p className="text-sm text-slate-500">{t("serviceBills.sections.serviceDesc")}</p>
            </div>
            <Wrench className="text-indigo-600" size={20} />
          </div>
          <div className="space-y-4">
            <BillField
              label={t("serviceBills.fields.complaint")}
              name="complaint"
              type="textarea"
              rows={3}
              value={form.complaint}
              onChange={handleChange}
              placeholder={t("serviceBills.placeholders.complaint")}
              required
            />
            <BillField
              label={t("serviceBills.fields.serviceDetails")}
              name="serviceDetails"
              type="textarea"
              rows={5}
              value={form.serviceDetails}
              onChange={handleChange}
              placeholder={t("serviceBills.placeholders.serviceDetails")}
            />
          </div>
        </section>

        {/* Pricing — every amount is typed manually, never summed */}
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t("serviceBills.sections.pricing")}</h2>
              <p className="text-sm text-slate-500">{t("serviceBills.sections.pricingDesc")}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <BillField
              label={t("serviceBills.fields.partPrice")}
              name="partPrice"
              value={form.partPrice}
              onChange={handleChange}
              placeholder={t("serviceBills.placeholders.amount")}
              prefix="₹"
            />
            <BillField
              label={t("serviceBills.fields.labourCharges")}
              name="labourCharges"
              value={form.labourCharges}
              onChange={handleChange}
              placeholder={t("serviceBills.placeholders.amount")}
              prefix="₹"
            />
            <BillField
              label={t("serviceBills.fields.estimatedPrice")}
              name="estimatedPrice"
              value={form.estimatedPrice}
              onChange={handleChange}
              placeholder={t("serviceBills.placeholders.amount")}
              prefix="₹"
            />
            <BillField
              label={t("serviceBills.fields.finalPrice")}
              name="finalPrice"
              value={form.finalPrice}
              onChange={handleChange}
              placeholder={t("serviceBills.placeholders.amount")}
              prefix="₹"
            />
          </div>
        </section>

        {/* Payment */}
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t("serviceBills.sections.payment")}</h2>
              <p className="text-sm text-slate-500">{t("serviceBills.sections.paymentDesc")}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <BillField
              label={t("serviceBills.fields.paymentStatus")}
              name="paymentStatus"
              value={form.paymentStatus}
              onChange={handleChange}
              options={SERVICE_BILL_PAYMENT_STATUSES.map((status) => ({
                value: status,
                label: t(`serviceBills.paymentStatus.${status}`, { defaultValue: status }),
              }))}
              required
            />
            <BillField
              label={t("serviceBills.fields.paidDate")}
              name="paidDate"
              type="date"
              value={form.paidDate}
              onChange={handleChange}
            />
          </div>
        </section>

        {/* Terms */}
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t("serviceBills.sections.terms")}</h2>
              <p className="text-sm text-slate-500">{t("serviceBills.sections.termsDesc")}</p>
            </div>
          </div>
          <BillField
            label={t("serviceBills.fields.termsConditions")}
            name="termsConditions"
            type="textarea"
            rows={5}
            value={form.termsConditions}
            onChange={handleChange}
            placeholder={t("serviceBills.placeholders.termsConditions")}
          />
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link
            to={basePath}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            {t("common.cancel")}
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? t("common.processing") : t("common.save")}
          </button>
        </div>
      </form>
    </div>
  );
};

export type { FormState, ServiceBillPaymentStatus };
export default ServiceBillForm;
