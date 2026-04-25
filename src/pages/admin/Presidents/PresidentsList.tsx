import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Plus, AlertTriangle, X, Users } from "lucide-react";
import toast from "react-hot-toast";
import { getPresidents, deletePresident } from "../../../services/presidentsService";
import PresidentCard from "../../../components/shared/PresidentCard";
import type { President } from "../../../types/president.types";

const PresidentsList: React.FC = () => {
  const navigate = useNavigate();
  const [presidents, setPresidents] = useState<President[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingPresident, setDeletingPresident] = useState<President | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      const data = await getPresidents();
      setPresidents([...data].reverse());
    } catch {
      toast.error("Failed to load presidents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deletingPresident) return;
    setDeleting(true);
    try {
      await deletePresident(deletingPresident.id, deletingPresident.imagePublicId);
      toast.success("President deleted.");
      setDeletingPresident(null);
      load();
    } catch {
      toast.error("Failed to delete president.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
            <Crown size={26} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">Presidents</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Users size={12} className="text-slate-400" />
              <p className="text-slate-400 font-semibold text-sm">{presidents.length} record{presidents.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate("/admin/presidents/add")}
          className="h-12 px-6 rounded-2xl font-bold flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all active:scale-95 text-sm"
        >
          <Plus size={18} /> Add President
        </button>
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white/60 rounded-3xl border border-slate-200/60 animate-pulse" />
          ))}
        </div>
      ) : presidents.length === 0 ? (
        <div className="text-center py-24 bg-white/60 rounded-3xl border border-slate-100">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Crown size={36} className="text-indigo-300" />
          </div>
          <p className="font-black text-slate-700 text-lg">No presidents yet</p>
          <p className="text-slate-400 text-sm mt-1 mb-6">Add the first president to get started</p>
          <button
            onClick={() => navigate("/admin/presidents/add")}
            className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200"
          >
            <Plus size={16} /> Add President
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {presidents.map((p, i) => (
            <PresidentCard
              key={p.id}
              president={p}
              index={i}
              onEdit={(id) => navigate(`/admin/presidents/${id}/edit`)}
              onDelete={setDeletingPresident}
            />
          ))}
        </div>
      )}

      {/* ── Delete Modal ── */}
      {deletingPresident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 text-center relative">
            <button
              onClick={() => setDeletingPresident(null)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
            >
              <X size={16} />
            </button>

            {/* President preview */}
            <img
              src={deletingPresident.imageUrl}
              alt={deletingPresident.name}
              className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4 border-2 border-red-100 shadow-md"
            />

            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={24} />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-1">Delete President</h2>
            <p className="text-sm text-slate-500 mb-6">
              Remove <strong className="text-slate-700">{deletingPresident.name}</strong> permanently?<br />
              <span className="text-xs text-red-400">This also deletes the image from Cloudinary.</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingPresident(null)}
                className="flex-1 h-11 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-md shadow-red-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting...</>
                ) : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PresidentsList;
