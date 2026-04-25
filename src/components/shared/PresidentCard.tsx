import React from "react";
import { Calendar, Pencil, Trash2 } from "lucide-react";
import type { President } from "../../types/president.types";

interface PresidentCardProps {
  president: President;
  index: number;
  onEdit: (id: string) => void;
  onDelete: (president: President) => void;
}

const COLORS = [
  { bar: "from-amber-400 to-orange-400",   badge: "bg-amber-100 text-amber-700"   },
  { bar: "from-sky-400 to-blue-500",       badge: "bg-sky-100 text-sky-700"       },
  { bar: "from-violet-400 to-purple-500",  badge: "bg-violet-100 text-violet-700" },
  { bar: "from-emerald-400 to-teal-500",   badge: "bg-emerald-100 text-emerald-700"},
];

const PresidentCard: React.FC<PresidentCardProps> = ({ president, index, onEdit, onDelete }) => {
  const color = COLORS[index % COLORS.length];
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
      <div className="flex items-stretch">

        {/* Accent bar */}
        <div className={`w-1 shrink-0 bg-gradient-to-b ${color.bar}`} />

        {/* Photo */}
        <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 self-center ml-3 my-3 rounded-xl overflow-hidden border border-slate-100 shadow-sm">
          <img
            src={president.imageUrl}
            alt={president.name}
            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 px-3 py-3 sm:px-4">
          <div className="flex items-start gap-2 justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="font-black text-slate-900 text-sm sm:text-base leading-tight truncate">{president.name}</h3>
              <div className="flex items-center gap-1 text-slate-400 text-xs font-medium mt-0.5">
                <Calendar size={10} /><span>{president.year}</span>
              </div>
            </div>
            <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full ${color.badge} mt-0.5`}>
              #{index + 1}
            </span>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mt-1.5 line-clamp-2">{president.description}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 justify-center px-2 sm:px-3 shrink-0 border-l border-slate-100">
          <button
            onClick={() => onEdit(president.id)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-500 hover:bg-indigo-100 flex items-center justify-center transition-all hover:scale-110"
            title="Edit"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => onDelete(president)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-red-50 border border-red-100 text-red-400 hover:bg-red-100 flex items-center justify-center transition-all hover:scale-110"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PresidentCard;
