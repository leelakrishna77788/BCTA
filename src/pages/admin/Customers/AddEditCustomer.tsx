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
} from "lucide-react";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../../../firebase/firebaseConfig";
import { uploadImage, ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, deleteImage } from "../../../utils/cloudinary";
import {
  addCustomer,
  updateCustomer,
  normalizePhoneNumber,
} from "../../../services/customersService";
import {
  CUSTOMER_COMPLAINTS,
  CUSTOMER_PAYMENT_STATUSES,
} from "../../../types/customer.types";
import type {
  CustomerComplaint,
  CustomerPaymentStatus,
} from "../../../types/customer.types";
import LoadingSkeleton, { CardSkeleton } from "../../../components/shared/LoadingSkeleton";

interface FormState {
  name: string;
  phoneNumber: string;
  complaint: CustomerComplaint | "";
  description: string;
  paymentStatus: CustomerPaymentStatus | "";
}

const EMPTY_FORM: FormState = {
  name: "",
  phoneNumber: "",
  complaint: "",
  description: "",
  paymentStatus: "",
};

const AddEditCustomer: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState("");
  const [existingPublicId, setExistingPublicId] = useState("");

  const profileTitle = isEdit
    ? t("customers.editCustomer")
    : t("customers.addCustomer");

  useEffect(() => {
    if (isEdit && id) {
      const fetchCustomer = async () => {
        try {
          const snap = await getDoc(doc(db, "customers", id));
          if (snap.exists()) {
            const d = snap.data();
            setForm({
              name: d.name || "",
              phoneNumber: d.phoneNumber || "",
              complaint: (d.complaint || "") as CustomerComplaint,
              description: d.description || "",
              paymentStatus: (d.paymentStatus || "") as CustomerPaymentStatus,
            });
            if (d.photoUrl) {
              setPhotoPreview(d.photoUrl);
              setExistingPhotoUrl(d.photoUrl);
              setExistingPublicId(d.photoPublicId || "");
            }
          } else {
            toast.error(t("customers.toasts.notFound"));
            navigate("/admin/customers");
          }
        } catch (err) {
          console.error("Fetch customer error:", err);
          toast.error(t("customers.toasts.loadError"));
        } finally {
          setFetching(false);
        }
      };
      fetchCustomer();
    }
  }, [id, isEdit, navigate, t]);

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
    setForm(EMPTY_FORM);
    handleRemovePhoto();
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
    if (!form.complaint) {
      toast.error(t("customers.validation.complaintRequired"));
      return;
    }
    if (!form.paymentStatus) {
      toast.error(t("customers.validation.paymentStatusRequired"));
      return;
    }

    setLoading(true);
    try {
      const commonData = {
        name,
        phoneNumber,
        complaint: form.complaint as CustomerComplaint,
        description: form.description.trim(),
        paymentStatus: form.paymentStatus as CustomerPaymentStatus,
      };

      if (isEdit && id) {
        let photoPayload: {
          photoUrl?: string;
          photoPublicId?: string;
        } = {};

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
          photoPayload = { photoUrl: url, photoPublicId: publicId };
        } else if (!photoPreview && existingPhotoUrl) {
          // Photo removed by admin → clean up the uploaded image
          if (existingPublicId) {
            try {
              await deleteImage(existingPublicId);
            } catch (err) {
              console.warn("Failed to delete removed customer photo", err);
            }
          }
          photoPayload = { photoUrl: "", photoPublicId: "" };
        }

        await updateCustomer(id, { ...commonData, ...photoPayload });
        toast.success(t("customers.toasts.updated"));
        navigate("/admin/customers");
      } else {
        let photoPayload: {
          photoUrl?: string;
          photoPublicId?: string;
        } = {};
        if (photoFile) {
          if (!ALLOWED_IMAGE_TYPES.includes(photoFile.type)) {
            throw new Error(t("customers.validation.imageInvalid"));
          }
          if (photoFile.size > MAX_IMAGE_BYTES) {
            throw new Error(t("customers.validation.imageTooLarge"));
          }
          const { url, publicId } = await uploadImage(photoFile, "customers");
          photoPayload = { photoUrl: url, photoPublicId: publicId };
        }

        await addCustomer({ ...commonData, ...photoPayload });
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
                {form.complaint ? t(`customers.complaints.${form.complaint}`) : t("common.pending")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.85fr)]">
        <div className="min-w-0 space-y-6">
          <div className="card rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{t("customers.customerDetails")}</h2>
                <p className="text-sm text-slate-500">{t("customers.customerDetailsDesc")}</p>
              </div>
              <User className="text-[#000080]" size={20} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Name */}
              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 group-focus-within:text-indigo-600 transition-colors">
                  {t("customers.name")} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder={t("customers.namePlaceholder")}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none ring-[#000080] focus:ring-1"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 group-focus-within:text-indigo-600 transition-colors">
                  {t("customers.phoneNumber")} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={form.phoneNumber}
                  onChange={handleChange}
                  placeholder={t("customers.phonePlaceholder")}
                  required
                  maxLength={14}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none ring-[#000080] focus:ring-1"
                />
              </div>

              {/* Complaint */}
              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 group-focus-within:text-indigo-600 transition-colors">
                  {t("customers.complaint")} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    name="complaint"
                    value={form.complaint}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none ring-[#000080] focus:ring-1 appearance-none cursor-pointer"
                  >
                    <option value="">{t("customers.complaintPlaceholder")}</option>
                    {CUSTOMER_COMPLAINTS.map((c) => (
                      <option key={c} value={c}>
                        {t(`customers.complaints.${c}`)}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-30 text-slate-400">
                    <ArrowLeft size={16} className="-rotate-90" />
                  </div>
                </div>
              </div>

              {/* Payment Status */}
              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 group-focus-within:text-indigo-600 transition-colors">
                  {t("customers.paymentStatus")} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    name="paymentStatus"
                    value={form.paymentStatus}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none ring-[#000080] focus:ring-1 appearance-none cursor-pointer"
                  >
                    <option value="">{t("customers.paymentPlaceholder")}</option>
                    {CUSTOMER_PAYMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {t(`customers.paymentStatuses.${s}`)}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-30 text-slate-400">
                    <ArrowLeft size={16} className="-rotate-90" />
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mt-4 space-y-2 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 group-focus-within:text-indigo-600 transition-colors">
                {t("customers.description")}
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder={t("customers.descriptionPlaceholder")}
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none ring-[#000080] focus:ring-1 resize-none"
              />
            </div>
          </div>
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
              {/* Photo preview + upload */}
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
                  {t("customers.paymentStatus")}
                </div>
                <p className="mt-1">{t("customers.paymentHint")}</p>
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
                onClick={() => navigate(-1)}
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