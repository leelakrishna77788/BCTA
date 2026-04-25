import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Crown } from "lucide-react";
import toast from "react-hot-toast";
import { addPresident } from "../../../services/presidentsService";
import PresidentForm from "../../../components/shared/PresidentForm";
import type { CreatePresidentInput } from "../../../types/president.types";

const AddPresident: React.FC = () => {
  const navigate = useNavigate();

  const handleSubmit = async (data: CreatePresidentInput) => {
    try {
      await addPresident(data);
      toast.success("President added successfully!");
      navigate("/admin/presidents");
    } catch {
      toast.error("Failed to add president.");
    }
  };

  return (
    <div className="animate-fade-in min-h-full flex flex-col">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-semibold mb-6 transition-colors text-sm w-fit"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Container — full width on desktop to use space */}
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
            <Crown size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Add President</h1>
            <p className="text-slate-400 text-xs mt-0.5">Add a new president to BCTA records</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-7">
          <PresidentForm
            onSubmit={handleSubmit}
            submitLabel="Add President"
            onCancel={() => navigate(-1)}
          />
        </div>
      </div>
    </div>
  );
};

export default AddPresident;
