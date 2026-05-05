import React, { useState } from "react";
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
  const [form, setForm] = useState<CreatePresidentInput>({ ...EMPTY, ...initialValues });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>(initialValues?.imageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const set = (key: keyof CreatePresidentInput) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }));

  const applyFile = (file: File) => {
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
            <Upload size={14} /> {preview ? "Replace Photo" : "Upload Photo"}
            <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) applyFile(f); }} className="hidden" />
          </label>
        </div>

        {/* Form Fields - Right Side on Desktop */}
        <div className="flex-1 space-y-4 w-full text-left">
          <div className="group">
            <label className={labelCls}>Name <span className="text-rose-500">*</span></label>
            <input value={form.name} onChange={set("name")} required placeholder="Enter full name" className={inputCls} />
          </div>

          <div className="group">
            <label className={labelCls}>Year / Term <span className="text-rose-500">*</span></label>
            <input value={form.year} onChange={set("year")} required placeholder="e.g. 2022 – 2024" className={inputCls} />
          </div>

          <div className="group">
            <label className={labelCls}>Description <span className="text-rose-500">*</span></label>
            <textarea
              value={form.description}
              onChange={set("description")}
              required
              rows={5}
              placeholder="Brief description of their tenure and achievements..."
              className={`${inputCls} resize-none py-3`}
            />
          </div>

          {/* Buttons */}
          <div className="pt-4 space-y-3">
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-xl bg-[#000080] text-white font-bold text-sm shadow-sm hover:bg-[#000066] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {(submitting || uploading) ? (
                <><Loader2 size={16} className="animate-spin" />{uploading ? "Processing..." : "Saving..."}</>
              ) : submitLabel}
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full h-12 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default PresidentForm;