import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Crown } from "lucide-react";
import toast from "react-hot-toast";
import { getPresidentById, updatePresident, deletePresidentImage } from "../../../services/presidentsService";
import PresidentForm from "../../../components/shared/PresidentForm";
import type { CreatePresidentInput } from "../../../types/president.types";

const EditPresident: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [initial, setInitial] = useState<CreatePresidentInput | null>(null);
  const [oldPublicId, setOldPublicId] = useState("");

  useEffect(() => {
    if (!id) return;
    getPresidentById(id)
      .then((p) => {
        if (!p) { toast.error("President not found."); navigate("/admin/presidents"); return; }
        setOldPublicId(p.imagePublicId);
        setInitial({ name: p.name, year: p.year, description: p.description, imageUrl: p.imageUrl, imagePublicId: p.imagePublicId });
      })
      .catch(() => toast.error("Failed to load president."));
  }, [id, navigate]);

  const handleSubmit = async (data: CreatePresidentInput) => {
    if (!id) return;
    try {
      if (data.imagePublicId && data.imagePublicId !== oldPublicId && oldPublicId) {
        await deletePresidentImage(oldPublicId);
      }
      await updatePresident(id, data);
      toast.success("President updated!");
      navigate("/admin/presidents");
    } catch {
      toast.error("Failed to update president.");
    }
  };

  if (!initial) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in min-h-full flex flex-col">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-slate-400 hover:text-[#000080] font-semibold mb-6 transition-colors text-sm w-fit"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="max-w-4xl mx-auto w-full px-3 sm:px-6">
        <div className="card rounded-[1.75rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <img
                  src={initial.imageUrl}
                  alt={initial.name}
                  className="w-11 h-11 rounded-2xl object-cover border border-slate-100 shadow-sm"
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#000080] rounded-lg flex items-center justify-center shadow">
                  <Crown size={10} className="text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">Edit President</h1>
                <p className="text-slate-500 text-xs mt-0.5 truncate max-w-[200px]">{initial.name}</p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-5 sm:p-8">
            <PresidentForm
              initialValues={initial}
              onSubmit={handleSubmit}
              submitLabel="Save Changes"
              onCancel={() => navigate(-1)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPresident;