import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Crown } from "lucide-react";
import toast from "react-hot-toast";
import { addPresident } from "../../../services/presidentsService";
import PresidentForm from "../../../components/shared/PresidentForm";
import type { CreatePresidentInput } from "../../../types/president.types";

const AddPresident: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSubmit = async (data: CreatePresidentInput) => {
    try {
      await addPresident(data);
      toast.success(t("adminPresidents.toast.addSuccess"));
      navigate("/admin/presidents");
    } catch {
      toast.error(t("adminPresidents.toast.addError"));
    }
  };

  return (
    <div className="animate-fade-in min-h-full flex flex-col">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-slate-400 hover:text-[#000080] font-semibold mb-6 transition-colors text-sm w-fit"
      >
        <ArrowLeft size={16} /> {t("adminPresidents.back")}
      </button>

      <div className="max-w-4xl mx-auto w-full px-3 sm:px-6">
        <div className="card rounded-[1.75rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shrink-0">
                <Crown size={22} className="text-[#000080]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">{t("adminPresidents.addPresident")}</h1>
                <p className="text-slate-500 text-xs mt-0.5">{t("adminPresidents.addHeaderDesc")}</p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-5 sm:p-8">
            <PresidentForm
              onSubmit={handleSubmit}
              submitLabel={t("adminPresidents.addPresident")}
              onCancel={() => navigate(-1)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddPresident;