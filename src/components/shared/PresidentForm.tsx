import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { User, Calendar, FileText, ImageIcon, Loader2, Upload, Crown } from "lucide-react";
import { uploadPresidentImage } from "../../services/presidentsService";
import type { CreatePresidentInput } from "../../types/president.types";

interface PresidentFormProps {
  initialValues?: Partial<CreatePresidentInput>;
  onSubmit: (data: CreatePresidentInput) => Promise<void>;
  submitLabel: string;
  onCancel: () => void;
}

const EMPTY: CreatePresidentInput = { name: "", year: "", description: "", imageUrl: "", imagePublicId: "" };

const PresidentForm: React.FC<PresidentFormProps> = ({ initialValues, onSubmit, submitLabel, onCancel }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<CreatePresidentInput>({ ...EMPTY, ...initialValues });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>(initialValues?.imageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState(false);

  const set = (key: keyof CreatePresidentInput) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }));

  const applyFile = (file: File) => {
    // Validate file type and size (< 2MB)
    const maxBytes = 2 * 1024 * 1024;
    const newErrors: Record<string, string> = { ...errors };
    if (!file.type.startsWith("image/")) {
      newErrors.image = t("adminPresidents.validation.imageOnly");
      setErrors(newErrors);
      return;
    }
    if (file.size > maxBytes) {
      newErrors.image = t("adminPresidents.validation.imageSize");
      setErrors(newErrors);
      return;
    }
    // clear image error
    delete newErrors.image;
    setErrors(newErrors);
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) applyFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // client-side validation
      const ok = validateAll();
      if (!ok) return;
      let finalForm = { ...form };
      if (imageFile) {
        setUploading(true);
        const { url, publicId } = await uploadPresidentImage(imageFile);
        setUploading(false);
        finalForm = { ...finalForm, imageUrl: url, imagePublicId: publicId };
      }
      await onSubmit(finalForm);
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  function validateYear(value: string) {
    if (!value || !value.trim()) return t("adminPresidents.validation.yearRequired");
    // Accept formats like "2022 - 2024", "2022–2024", "2022 – 2024" or single year "2022"
    const cleaned = value.replace(/[–—]/g, "-").replace(/\s+/g, "");
    const parts = cleaned.split("-");
    const isValidYear = (y: string) => /^\d{4}$/.test(y) && Number(y) >= 1900 && Number(y) <= 2100;
    if (parts.length === 1) {
      if (!isValidYear(parts[0])) return t("adminPresidents.validation.validYear");
      return "";
    }
    if (parts.length === 2) {
      if (!isValidYear(parts[0]) || !isValidYear(parts[1])) return t("adminPresidents.validation.validYears");
      if (Number(parts[0]) > Number(parts[1])) return t("adminPresidents.validation.startYearLess");
      return "";
    }
    return t("adminPresidents.validation.validRange");
  }

  function validateAll() {
    const next: Record<string, string> = {};
    if (!form.name || !form.name.trim()) next.name = t("adminPresidents.validation.nameRequired");
    const yErr = validateYear(form.year);
    if (yErr) next.year = yErr;
    if (!form.description || form.description.trim().length < 10) next.description = t("adminPresidents.validation.descLength");
    if (imageFile) {
      const maxBytes = 2 * 1024 * 1024;
      if (!imageFile.type.startsWith("image/")) next.image = t("adminPresidents.validation.imageOnly");
      else if (imageFile.size > maxBytes) next.image = t("adminPresidents.validation.imageSize");
    } else if (!form.imageUrl) {
      // if no new file and no existing url, require an image
      next.image = t("adminPresidents.validation.uploadRequired");
    }

    setErrors(next);
    const ok = Object.keys(next).length === 0;
    if (!ok) setSubmitting(false);
    return ok;
  }

  const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none ring-[#000080] focus:ring-1 transition-all";
  const labelCls = "text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 group-focus-within:text-[#000080] transition-colors mb-1.5 block text-left";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-10">
        {/* Photo Upload Section - Side by Side on Mobile, Stacked on Desktop */}
        <div className="flex flex-row sm:flex-col items-center sm:items-start gap-4 shrink-0 w-full sm:w-auto">
          <div
            className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-dashed transition-all overflow-hidden flex items-center justify-center bg-slate-50 shrink-0 ${dragOver ? "border-[#000080] bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {preview ? (
              <img src={preview} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center text-slate-300">
                <Upload size={24} />
              </div>
            )}
          </div>
          <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-[#000080] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#000066] transition-colors shadow-sm w-auto whitespace-nowrap">
            <Upload size={14} /> {preview ? t("adminPresidents.form.replacePhoto") : t("adminPresidents.form.uploadPhoto")}
            <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) applyFile(f); }} className="hidden" />
          </label>
          {errors.image && <p className="text-rose-500 text-xs mt-1">{errors.image}</p>}
        </div>

        {/* Form Fields - Right Side on Desktop */}
        <div className="flex-1 space-y-4 w-full text-left">
          <div className="group">
            <label className={labelCls}>{t("adminPresidents.form.name")} <span className="text-rose-500">*</span></label>
            <input value={form.name} onChange={set("name")} required placeholder={t("adminPresidents.form.namePlaceholder")} className={inputCls} />
            {errors.name && <p className="text-rose-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div className="group">
            <label className={labelCls}>{t("adminPresidents.form.year")} <span className="text-rose-500">*</span></label>
            <input value={form.year} onChange={set("year")} required placeholder={t("adminPresidents.form.yearPlaceholder")} className={inputCls} />
            {errors.year && <p className="text-rose-500 text-xs mt-1">{errors.year}</p>}
          </div>

          <div className="group">
            <label className={labelCls}>{t("adminPresidents.form.description")} <span className="text-rose-500">*</span></label>
            <textarea
              value={form.description}
              onChange={set("description")}
              required
              rows={5}
              placeholder={t("adminPresidents.form.descPlaceholder")}
              className={`${inputCls} resize-none py-3`}
            />
            {errors.description && <p className="text-rose-500 text-xs mt-1">{errors.description}</p>}
          </div>

          {/* Buttons */}
          <div className="pt-4 space-y-3">
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-xl bg-[#000080] text-white font-bold text-sm shadow-sm hover:bg-[#000066] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {(submitting || uploading) ? (
                <><Loader2 size={16} className="animate-spin" />{uploading ? t("adminPresidents.form.processing") : t("adminPresidents.form.saving")}</>
              ) : submitLabel}
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full h-12 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default PresidentForm;