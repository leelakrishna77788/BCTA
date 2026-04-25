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

  const inputCls = "w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-slate-800 placeholder:text-slate-400 outline-none text-sm";
  const labelCls = "flex items-center gap-1.5 text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5";

  return (
    <form onSubmit={handleSubmit}>
      {/* ── Desktop: two-column layout ── */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">

        {/* LEFT — form fields */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Name */}
          <div>
            <label className={labelCls}><User size={11} className="text-indigo-500" /> Name <span className="text-red-400">*</span></label>
            <input value={form.name} onChange={set("name")} required placeholder="Full name" className={inputCls} />
          </div>

          {/* Year */}
          <div>
            <label className={labelCls}><Calendar size={11} className="text-indigo-500" /> Year / Term <span className="text-red-400">*</span></label>
            <input value={form.year} onChange={set("year")} required placeholder="e.g. 2022 – 2024" className={inputCls} />
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}><FileText size={11} className="text-indigo-500" /> Description <span className="text-red-400">*</span></label>
            <textarea
              value={form.description}
              onChange={set("description")}
              required
              rows={6}
              placeholder="Brief description of their tenure and achievements..."
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-slate-800 placeholder:text-slate-400 outline-none resize-none text-sm"
            />
          </div>

          {/* Buttons — desktop only */}
          <div className="hidden lg:flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 h-11 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-sm shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {(submitting || uploading) ? (
                <><Loader2 size={15} className="animate-spin" />{uploading ? "Uploading..." : "Saving..."}</>
              ) : submitLabel}
            </button>
          </div>
        </div>

        {/* RIGHT — image upload, equal flex so it fills space */}
        <div className="lg:flex-1 shrink-0 flex flex-col gap-4">

          <div>
            <label className={labelCls}>
              <ImageIcon size={11} className="text-indigo-500" /> Photo
              {!initialValues?.imageUrl && <span className="text-red-400">*</span>}
            </label>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`rounded-2xl border-2 border-dashed transition-all ${dragOver ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-slate-50 hover:border-indigo-300"}`}
            >
              {preview ? (
                <div className="flex flex-col items-center p-5 gap-4">
                  {/* Large preview on desktop */}
                  <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white shadow-lg">
                    <img src={preview} alt="preview" className="w-full h-full object-cover object-top" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-lg px-2 py-1">
                      <Crown size={10} className="text-white/80 shrink-0" />
                      <span className="text-white text-[10px] font-bold truncate">{form.name || "President"}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-600 truncate max-w-[180px]">{imageFile?.name ?? "Current photo"}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Drag or click to replace</p>
                  </div>
                  <label className="cursor-pointer h-9 px-5 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-700 transition-colors w-full justify-center">
                    <Upload size={13} /> Change Photo
                    <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) applyFile(f); }} className="hidden" />
                  </label>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center py-16 px-4 cursor-pointer text-center">
                  <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-3">
                    <Upload size={28} className="text-indigo-500" />
                  </div>
                  <p className="text-sm font-bold text-slate-600">Drop photo here</p>
                  <p className="text-xs text-slate-400 mt-1">or <span className="text-indigo-600 font-semibold">browse files</span></p>
                  <p className="text-[11px] text-slate-300 mt-2">PNG, JPG, WEBP · max 10MB</p>
                  <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) applyFile(f); }} required={!initialValues?.imageUrl} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* Tips card */}
          <div className="hidden lg:block bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
            <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-2">Tips</p>
            <ul className="space-y-1.5">
              {["Use a clear portrait photo", "Square or portrait ratio works best", "High resolution recommended"].map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-indigo-500">
                  <span className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Buttons — mobile only */}
      <div className="flex lg:hidden gap-3 mt-5">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-11 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-sm shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {(submitting || uploading) ? (
            <><Loader2 size={15} className="animate-spin" />{uploading ? "Uploading..." : "Saving..."}</>
          ) : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default PresidentForm;
