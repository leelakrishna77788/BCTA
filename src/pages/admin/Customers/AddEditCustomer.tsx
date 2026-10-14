import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  UserPlus,
  Save,
  Loader2,
  Upload,
  X,
  User,
  Camera,
  BadgeCheck,
  Hash,
  Smartphone,
  Wrench,
  FileText,
  CalendarDays,
  IndianRupee,
} from "lucide-react";
import { getDoc, doc } from "firebase/firestore";
import { auth, db } from "../../../firebase/firebaseConfig";
import { useAuth } from "../../../context/AuthContext";
import { uploadImage, ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, deleteImage } from "../../../utils/cloudinary";
import {
  addCustomer,
  updateCustomer,
  normalizePhoneNumber,
} from "../../../services/customersService";
import {
  CUSTOMER_COMPLAINTS,
  CUSTOMER_PAYMENT_STATUSES,
  type CreateCustomerInput,
  type CustomerPaymentStatus,
} from "../../../types/customer.types";
import LoadingSkeleton, { CardSkeleton } from "../../../components/shared/LoadingSkeleton";

/**
 * Manual customer / bill / service record.
 *
 * Every field is typed or selected by the user and stored exactly as entered.
 * Nothing is generated, defaulted or calculated — no bill number, no auto date,
 * no computed totals and no derived payment status. The photo is the one item
 * the user uploads as a file.
 *
 * Shared by the Admin and Member workflows; only the base path and the
 * permission scope differ.
 */
type FormState = CreateCustomerInput;

const EMPTY_FORM: FormState = {
  name: "",
  phoneNumber: "",
  billNumber: "",
  billDate: "",
  customerAddress: "",
  mobileModel: "",
  imeiNumber: "",
  complaint: "",
  description: "",
  serviceDetails: "",
  partPrice: "",
  labourCharges: "",
  estimatedPrice: "",
  finalPrice: "",
  paymentStatus: "",
  paidDate: "",
  termsConditions: "",
  photoUrl: "",
  photoPublicId: "",
};

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none ring-[#000080] focus:ring-1";
const labelCls =
  "text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 group-focus-within:text-indigo-600 transition-colors";

/** A labelled controlled input — the value is stored exactly as typed. */
const TextField: React.FC<{
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  mono?: boolean;
}> = ({ label, name, value, onChange, placeholder, type = "text", required, maxLength, mono }) => (
  <div className="space-y-2 group">
    <label className={labelCls}>
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      maxLength={maxLength}
      className={`${inputCls} ${mono ? "font-mono" : ""}`}
    />
  </div>
);

/** A labelled controlled textarea. */
const AreaField: React.FC<{
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}> = ({ label, name, value, onChange, placeholder, rows = 4, required }) => (
  <div className="space-y-2 group">
    <label className={labelCls}>
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      required={required}
      className={`${inputCls} resize-y`}
    />
  </div>
);

/** A labelled manual select — never preselected, an empty option is shown. */
const SelectField: React.FC<{
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  options: readonly string[];
  labelFor: (opt: string) => string;
  placeholder: string;
  required?: boolean;
}> = ({ label, name, value, onChange, options, labelFor, placeholder, required }) => (
  <div className="space-y-2 group">
    <label className={labelCls}>
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      className={`${inputCls} appearance-none cursor-pointer`}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {labelFor(opt)}
        </option>
      ))}
    </select>
  </div>
);

const Section: React.FC<{
  title: string;
  desc: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, desc, icon, children }) => (
  <div className="card rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{desc}</p>
      </div>
      <span className="text-[#000080]">{icon}</span>
    </div>
    {children}
  </div>
);

const AddEditCustomer: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRole, userProfile } = useAuth();
  const isAdmin = userRole?.toLowerCase().trim() === "admin" ||
    userRole?.toLowerCase().trim() === "superadmin";
  const basePath = isAdmin ? "/admin/customers" : "/member/customers";
  const profileName = [userProfile?.name, userProfile?.surname].filter(Boolean).join(" ").trim();

  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });

  // Photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState("");
  const [existingPublicId, setExistingPublicId] = useState("");

  const profileTitle = isEdit ? t("customers.editCustomer") : t("customers.addCustomer");

  useEffect(() => {
    if (isEdit && id) {
      const fetchCustomer = async () => {
        try {
          const snap = await getDoc(doc(db, "customers", id));
          if (snap.exists()) {
            const d = snap.data();

            // Frontend ownership guard: non-admins may only edit their own records.
            // Firestore rules enforce this at the DB level too, but we redirect
            // early here to give a clear UX rather than a raw permission error.
            if (!isAdmin && d.createdByUID && d.createdByUID !== auth.currentUser?.uid) {
              toast.error(t("customers.toasts.notFound"));
              navigate(basePath, { replace: true });
              return;
            }

            setForm({
              ...EMPTY_FORM,
              name: d.name || "",
              phoneNumber: d.phoneNumber || "",
              billNumber: d.billNumber || "",
              billDate: d.billDate || "",
              customerAddress: d.customerAddress || "",
              mobileModel: d.mobileModel || "",
              imeiNumber: d.imeiNumber || "",
              complaint: d.complaint || "",
              description: d.description || "",
              serviceDetails: d.serviceDetails || "",
              partPrice: d.partPrice || "",
              labourCharges: d.labourCharges || "",
              estimatedPrice: d.estimatedPrice || "",
              finalPrice: d.finalPrice || "",
              paymentStatus: d.paymentStatus || "",
              paidDate: d.paidDate || "",
              termsConditions: d.termsConditions || "",
            });
            if (d.photoUrl) {
              setPhotoPreview(d.photoUrl);
              setExistingPhotoUrl(d.photoUrl);
              setExistingPublicId(d.photoPublicId || "");
            }
          } else {
            toast.error(t("customers.toasts.notFound"));
            navigate(basePath);
          }
        } catch (err) {
          console.error("Fetch customer error:", err);
          toast.error(t("customers.toasts.loadError"));
          navigate(basePath, { replace: true });
        } finally {
          setFetching(false);
        }
      };
      fetchCustomer();
    }
  }, [id, isEdit, isAdmin, navigate, t, basePath]);

  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    // Store exactly what was typed/selected — no coercion, no formatting.
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handlePhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error(t("customers.validation.imageInvalid"));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(t("customers.validation.imageTooLarge"));
      return;
    }
    if (photoPreview && photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleRemovePhoto = () => {
    if (photoPreview && photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    handleRemovePhoto();
  };

  /** Upload the chosen photo and clean up the one it replaces. */
  const resolvePhotoPayload = async (): Promise<{
    photoUrl?: string;
    photoPublicId?: string;
  }> => {
    if (photoFile) {
      if (!ALLOWED_IMAGE_TYPES.includes(photoFile.type)) {
        throw new Error(t("customers.validation.imageInvalid"));
      }
      if (photoFile.size > MAX_IMAGE_BYTES) {
        throw new Error(t("customers.validation.imageTooLarge"));
      }
      const { url, publicId } = await uploadImage(photoFile, "customers");
      if (existingPhotoUrl && existingPublicId) {
        try {
          await deleteImage(existingPublicId);
        } catch (err) {
          console.warn("Failed to delete existing customer photo", err);
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
          console.warn("Failed to delete removed customer photo", err);
        }
      }
      return { photoUrl: "", photoPublicId: "" };
    }
    return {};
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const name = form.name.trim();
    const phoneNumber = normalizePhoneNumber(form.phoneNumber);

    if (!name) {
      toast.error(t("customers.validation.nameRequired"));
      return;
    }
    if (!form.phoneNumber.trim()) {
      toast.error(t("customers.validation.phoneRequired"));
      return;
    }
    if (phoneNumber.length !== 10) {
      toast.error(t("customers.validation.phoneInvalid"));
      return;
    }
    if (!form.complaint.trim()) {
      toast.error(t("customers.validation.complaintRequired"));
      return;
    }
    // Never defaulted — the user must choose a payment status explicitly.
    if (!CUSTOMER_PAYMENT_STATUSES.includes(form.paymentStatus as CustomerPaymentStatus)) {
      toast.error(t("customers.validation.paymentStatusRequired"));
      return;
    }

    setLoading(true);
    try {
      // No value here is generated or derived: every field is the user's own
      // input, passed through unchanged.
      const commonData: CreateCustomerInput = {
        ...form,
        name,
        phoneNumber,
      };

      if (isEdit && id) {
        const photoPayload = await resolvePhotoPayload();
        await updateCustomer(id, { ...commonData, ...photoPayload });
        toast.success(t("customers.toasts.updated"));
        navigate(basePath);
      } else {
        const photoPayload = await resolvePhotoPayload();
        await addCustomer({ ...commonData, ...photoPayload }, isAdmin, profileName);
        toast.success(t("customers.toasts.saved"));
        resetForm();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err: any) {
      console.error("Submit error:", err);
      toast.error(
        err.message || t(isEdit ? "customers.toasts.updateError" : "customers.toasts.saveError")
      );
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 p-0 animate-fade-in">
        <div className="flex items-center gap-6">
          <LoadingSkeleton width="56px" height="56px" borderRadius="1.25rem" />
          <div className="space-y-2">
            <LoadingSkeleton width="240px" height="2.5rem" />
            <LoadingSkeleton width="340px" height="1.25rem" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-3 sm:px-0 animate-fade-in pb-14">
      <section className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-[#0a1f5e] via-[#183b9a] to-[#2b62d4] p-5 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.22),_transparent_46%)]" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/10 text-white transition hover:bg-white/20"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-white/75">{t("customers.title")}</p>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{profileTitle}</h1>
              <p className="mt-1 text-xs text-white/80">
                {isEdit ? t("customers.editDesc") : t("customers.addDesc")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">{t("customers.modeLabel")}</p>
              <p className="mt-1 font-semibold text-white">
                {isEdit ? t("customers.editMode") : t("customers.newMode")}
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">{t("customers.complaint")}</p>
              <p className="mt-1 font-semibold text-white break-all">
                {form.complaint.trim() || t("common.pending")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        {t("serviceBills.manualNotice")}
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.85fr)]">
        <div className="min-w-0 space-y-6">
          {/* Bill information */}
          <Section
            title={t("serviceBills.sections.billInfo")}
            desc={t("serviceBills.sections.billInfoDesc")}
            icon={<Hash size={20} />}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label={t("serviceBills.fields.billNumber")}
                name="billNumber"
                value={form.billNumber}
                onChange={handleChange}
                placeholder={t("serviceBills.placeholders.billNumber")}
                mono
              />
              <TextField
                label={t("serviceBills.fields.billDate")}
                name="billDate"
                type="date"
                value={form.billDate}
                onChange={handleChange}
              />
            </div>
          </Section>

          {/* Customer details */}
          <Section
            title={t("serviceBills.sections.customer")}
            desc={t("serviceBills.sections.customerDesc")}
            icon={<User size={20} />}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label={t("customers.name")}
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder={t("customers.namePlaceholder")}
                required
              />
              <TextField
                label={t("customers.phoneNumber")}
                name="phoneNumber"
                type="tel"
                maxLength={14}
                value={form.phoneNumber}
                onChange={handleChange}
                placeholder={t("customers.phonePlaceholder")}
                required
              />
            </div>
            <div className="mt-4">
              <AreaField
                label={t("serviceBills.fields.customerAddress")}
                name="customerAddress"
                value={form.customerAddress}
                onChange={handleChange}
                placeholder={t("serviceBills.placeholders.customerAddress")}
                rows={2}
              />
            </div>
          </Section>

          {/* Device details */}
          <Section
            title={t("serviceBills.sections.device")}
            desc={t("serviceBills.sections.deviceDesc")}
            icon={<Smartphone size={20} />}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label={t("serviceBills.fields.mobileModel")}
                name="mobileModel"
                value={form.mobileModel}
                onChange={handleChange}
                placeholder={t("serviceBills.placeholders.mobileModel")}
              />
              <TextField
                label={t("serviceBills.fields.imeiNumber")}
                name="imeiNumber"
                value={form.imeiNumber}
                onChange={handleChange}
                placeholder={t("serviceBills.placeholders.imeiNumber")}
                mono
              />
            </div>
          </Section>

          {/* Service / repair */}
          <Section
            title={t("serviceBills.sections.service")}
            desc={t("serviceBills.sections.serviceDesc")}
            icon={<Wrench size={20} />}
          >
            <div className="space-y-4">
              {/* Free-text complaint with suggestions — never auto-filled */}
              <div className="space-y-2 group">
                <label className={labelCls}>
                  {t("serviceBills.fields.complaint")} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="complaint"
                  value={form.complaint}
                  onChange={handleChange}
                  placeholder={t("serviceBills.placeholders.complaint")}
                  list="customer-complaint-suggestions"
                  required
                  className={inputCls}
                />
                <datalist id="customer-complaint-suggestions">
                  {CUSTOMER_COMPLAINTS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <AreaField
                label={t("customers.description")}
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder={t("customers.descriptionPlaceholder")}
                rows={3}
              />

              <AreaField
                label={t("serviceBills.fields.serviceDetails")}
                name="serviceDetails"
                value={form.serviceDetails}
                onChange={handleChange}
                placeholder={t("serviceBills.placeholders.serviceDetails")}
                rows={4}
              />
            </div>
          </Section>

          {/* Pricing — each amount entered separately, nothing is summed */}
          <Section
            title={t("serviceBills.sections.pricing")}
            desc={t("serviceBills.sections.pricingDesc")}
            icon={<IndianRupee size={20} />}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <TextField
                label={t("serviceBills.fields.partPrice")}
                name="partPrice"
                value={form.partPrice}
                onChange={handleChange}
                placeholder={t("serviceBills.placeholders.amount")}
              />
              <TextField
                label={t("serviceBills.fields.labourCharges")}
                name="labourCharges"
                value={form.labourCharges}
                onChange={handleChange}
                placeholder={t("serviceBills.placeholders.amount")}
              />
              <TextField
                label={t("serviceBills.fields.estimatedPrice")}
                name="estimatedPrice"
                value={form.estimatedPrice}
                onChange={handleChange}
                placeholder={t("serviceBills.placeholders.amount")}
              />
              <TextField
                label={t("serviceBills.fields.finalPrice")}
                name="finalPrice"
                value={form.finalPrice}
                onChange={handleChange}
                placeholder={t("serviceBills.placeholders.amount")}
              />
            </div>
          </Section>

          {/* Payment */}
          <Section
            title={t("serviceBills.sections.payment")}
            desc={t("serviceBills.sections.paymentDesc")}
            icon={<CalendarDays size={20} />}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label={t("serviceBills.fields.paymentStatus")}
                name="paymentStatus"
                value={form.paymentStatus}
                onChange={handleChange}
                options={CUSTOMER_PAYMENT_STATUSES}
                labelFor={(opt) => t(`serviceBills.paymentStatus.${opt}`, { defaultValue: opt })}
                placeholder={t("serviceBills.selectPlaceholder")}
                required
              />
              <TextField
                label={t("serviceBills.fields.paidDate")}
                name="paidDate"
                type="date"
                value={form.paidDate}
                onChange={handleChange}
              />
            </div>
          </Section>

          {/* Terms */}
          <Section
            title={t("serviceBills.sections.terms")}
            desc={t("serviceBills.sections.termsDesc")}
            icon={<FileText size={20} />}
          >
            <AreaField
              label={t("serviceBills.fields.termsConditions")}
              name="termsConditions"
              value={form.termsConditions}
              onChange={handleChange}
              placeholder={t("serviceBills.placeholders.termsConditions")}
              rows={5}
            />
          </Section>
        </div>

        <div className="space-y-6 xl:sticky xl:top-6 self-start">
          <div className="card rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{t("customers.photoSection")}</h2>
                <p className="text-sm text-slate-500">{t("customers.photoDesc")}</p>
              </div>
              <Camera className="text-[#000080]" size={20} />
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="h-24 w-24 overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300">
                      <Upload size={24} />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="inline-flex w-full sm:w-auto cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#000080] px-3 py-2 text-xs font-semibold text-white hover:bg-[#000066]">
                    <Upload size={14} />
                    {photoPreview ? t("customers.replacePhoto") : t("customers.addPhoto")}
                    <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                  </label>

                  {photoPreview && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                    >
                      <X size={14} />
                      {t("customers.removePhoto")}
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <div className="flex items-center gap-2 font-semibold text-slate-700">
                  <BadgeCheck size={14} className="text-[#000080]" />
                  {t("serviceBills.fields.paymentStatus")}
                </div>
                <p className="mt-1">{t("serviceBills.sections.paymentDesc")}</p>
              </div>
            </div>
          </div>

          <div className="card rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#000080] px-4 py-3 text-sm font-semibold text-white hover:bg-[#000066] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : (isEdit ? <Save size={16} /> : <UserPlus size={16} />)}
                {loading ? t("customers.saving") : (isEdit ? t("customers.saveChanges") : t("customers.saveCustomer"))}
              </button>

              <button
                type="button"
                onClick={() => navigate(basePath)}
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddEditCustomer;
