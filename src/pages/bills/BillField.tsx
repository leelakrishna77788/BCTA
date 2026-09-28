import React, { useEffect, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";

export interface FieldOption {
  value: string;
  label: string;
}

export interface BillFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  options?: FieldOption[];
  rows?: number;
  hint?: string;
  prefix?: string;
}

/**
 * Plain controlled form control for the manual bill / service detail form.
 * It renders exactly what the user typed — it never formats, sums or rewrites
 * the value, and it never supplies a default.
 */
export const BillField: React.FC<BillFieldProps> = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  options,
  rows = 4,
  hint,
  prefix,
}) => {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="space-y-2">
      <label
        htmlFor={`bill-field-${name}`}
        className={`block text-[10px] font-black uppercase tracking-[0.2em] pl-1 transition-colors ${
          isFocused ? "text-indigo-600" : "text-slate-400"
        }`}
      >
        {label} {required && <span className="text-rose-500">*</span>}
      </label>

      {options ? (
        <select
          id={`bill-field-${name}`}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none ring-indigo-600 focus:ring-1 appearance-none cursor-pointer"
        >
          <option value="">{t("serviceBills.selectPlaceholder")}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          id={`bill-field-${name}`}
          name={name}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          required={required}
          rows={rows}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none ring-indigo-600 focus:ring-1 resize-y"
        />
      ) : (
        <div className="relative">
          {prefix ? (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 pointer-events-none">
              {prefix}
            </span>
          ) : null}
          <input
            id={`bill-field-${name}`}
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            required={required}
            className={`w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm text-slate-800 outline-none ring-indigo-600 focus:ring-1 ${
              prefix ? "pl-7 pr-3" : "px-3"
            }`}
          />
        </div>
      )}

      {hint ? <p className="text-[11px] text-slate-400 pl-1">{hint}</p> : null}
    </div>
  );
};

export default BillField;
