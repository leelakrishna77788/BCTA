import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import {
  Archive,
  ArrowLeft,
  Eye,
  Loader2,
  MapPin,
  RotateCcw,
  Search,
  Store,
  Users,
  Wheat,
  Building2,
  X,
} from "lucide-react";
import { getDeletedMembers, membersApi } from "../../../services/membersService";
import { TableSkeleton } from "../../../components/shared/LoadingSkeleton";
import { formatDateTime, toDate } from "../../../utils/date";
import type { Member } from "../../../types/member.types";

interface LocationBlock {
  key: string;
  label: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  bg: string;
  borderColor: string;
}

const DeletedMembers: React.FC = () => {
  const { t } = useTranslation();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getDeletedMembers();
      setMembers(list);
    } catch (err) {
      console.error("[DeletedMembers] fetch failed:", err);
      toast.error(t("deletedMembers.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return members;
    return members.filter((m) => {
      const haystack = [
        m.name,
        m.surname,
        m.memberId,
        m.email,
        m.phone,
        m.shopName,
        m.shopAddress,
        m.location,
        m.place,
      ]
        .map((v) => String(v ?? ""))
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [members, searchTerm]);

  const locationBlocks = useMemo<LocationBlock[]>(() => {
    const town1 = members.filter((m) => (m.location || "town1") === "town1").length;
    const town2 = members.filter((m) => m.location === "town2").length;
    const rural = members.filter((m) => m.location === "rural").length;

    const blocks: LocationBlock[] = [];
    if (town1 > 0) {
      blocks.push({
        key: "town1",
        label: t("locations.town1"),
        count: town1,
        icon: <Building2 size={20} />,
        color: "text-blue-600",
        bg: "bg-blue-50",
        borderColor: "border-blue-200",
      });
    }
    if (town2 > 0) {
      blocks.push({
        key: "town2",
        label: t("locations.town2"),
        count: town2,
        icon: <Building2 size={20} />,
        color: "text-violet-600",
        bg: "bg-violet-50",
        borderColor: "border-violet-200",
      });
    }
    if (rural > 0) {
      blocks.push({
        key: "rural",
        label: t("locations.rural"),
        count: rural,
        icon: <Wheat size={20} />,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        borderColor: "border-emerald-200",
      });
    }
    return blocks;
  }, [members, t]);

  const handleRestore = async (uid: string, name: string) => {
    setRestoringId(uid);
    try {
      await membersApi.restore(uid);
      toast.success(t("deletedMembers.restored", { name }));
      await loadMembers();
    } catch (err: any) {
      console.error("[DeletedMembers] restore failed:", err);
      toast.error(err.message || t("deletedMembers.restoreFailed"));
    } finally {
      setRestoringId(null);
    }
  };

  const locationLabel = (m: Member) => {
    if (m.location === "rural") {
      return m.place ? `${t("locations.rural")} – ${m.place}` : t("locations.rural");
    }
    if (m.location === "town2") return t("locations.town2");
    return t("locations.town1");
  };

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end justify-between">
        <div>
          <Link
            to="/admin/members"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors mb-3"
          >
            <ArrowLeft size={14} /> {t("memberDetail.backToMembers")}
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-7 rounded-full bg-amber-500" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              {t("deletedMembers.title")}
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-2 max-w-2xl">{t("deletedMembers.subtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs font-black uppercase tracking-wider text-amber-700">
            {t("deletedMembers.totalArchived")}
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900 tracking-tight">{members.length}</p>
        </div>
        {locationBlocks.map((block) => (
          <div key={block.key} className={`rounded-2xl border ${block.borderColor} ${block.bg} p-5`}>
            <p className={`text-xs font-black uppercase tracking-wider ${block.color}`}>{block.label}</p>
            <p className="mt-2 text-3xl font-black text-slate-900 tracking-tight">{block.count}</p>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl sm:rounded-3xl border border-white/15 p-3.5 sm:p-4"
        style={{ background: "rgba(255, 255, 255, 0.18)" }}
      >
        <div className="relative min-w-0">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("deletedMembers.searchPlaceholder")}
            className="w-full h-11 pl-10 pr-10 bg-white/40 border border-slate-200/60 rounded-2xl font-semibold text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
          />
          {searchTerm ? (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label={t("common.clear")}
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="p-8">
          <TableSkeleton rows={6} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 px-4 rounded-3xl border border-dashed flex flex-col items-center justify-center gap-4">
          <span className="text-6xl opacity-20"><Archive size={64} /></span>
          <p className="font-bold text-slate-600 mb-1">{t("deletedMembers.none")}</p>
          <p className="text-sm font-medium text-slate-400">{t("deletedMembers.noneHint")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((m) => {
            const uid = m.uid;
            const isRestoring = restoringId === uid;
            return (
              <div
                key={uid}
                className="glass-card bg-white/35 hover:bg-white/45 rounded-2xl p-4 sm:p-5 lg:p-6 transition-all duration-300 border border-white/30 shadow-md hover:shadow-lg"
              >
                <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:gap-6">
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="relative shrink-0">
                      {m.imageUrl || m.photoURL ? (
                        <img
                          src={m.imageUrl || m.photoURL}
                          alt=""
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl object-cover shadow-md border-2 border-white grayscale"
                        />
                      ) : (
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-100 rounded-xl sm:rounded-2xl flex items-center justify-center text-slate-400 font-black border-2 border-slate-200 text-xl sm:text-2xl">
                          {m.name?.[0] || "?"}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white bg-slate-400 shadow-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-slate-900 text-base sm:text-lg tracking-tight truncate">
                        {m.name} {m.surname}
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold truncate flex items-center gap-1">
                        <Store size={12} className="shrink-0" />
                        {m.shopName || m.email || "-"}
                      </p>
                      {m.shopAddress ? (
                        <p className="text-xs text-slate-400 font-medium truncate flex items-center gap-1">
                          <MapPin size={12} className="shrink-0" />
                          {m.shopAddress}
                        </p>
                      ) : null}
                      <span className="inline-block mt-1 font-mono text-[10px] uppercase font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 shadow-sm">
                        {m.memberId || "-"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:gap-3 w-full lg:w-auto">
                    <div className="rounded-xl px-3 py-2.5 text-center sm:px-4 bg-white/80 border border-white/80 min-h-[64px] flex flex-col justify-center">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                        {t("deletedMembers.idCard")}
                      </p>
                      <p className="text-sm font-black text-slate-800 font-mono">{m.aadhaarLast4 || "-"}</p>
                    </div>
                    <div className="rounded-xl px-3 py-2.5 text-center sm:px-4 bg-white/80 border border-white/80 min-h-[64px] flex flex-col justify-center">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                        {t("memberList.phone")}
                      </p>
                      <p className="text-sm font-black text-slate-800">{m.phone || "-"}</p>
                    </div>
                    <div className="rounded-xl px-3 py-2.5 text-center sm:px-4 bg-white/80 border border-white/80 min-h-[64px] flex flex-col justify-center">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                        {t("deletedMembers.location")}
                      </p>
                      <p className="text-sm font-black text-slate-800">{locationLabel(m)}</p>
                    </div>
                    <div className="rounded-xl px-3 py-2.5 text-center sm:px-4 bg-white/80 border border-white/80 min-h-[64px] flex flex-col justify-center">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                        {t("deletedMembers.deletedDate")}
                      </p>
                      <p className="text-xs font-black text-slate-800">
                        {toDate(m.deletedAt) ? formatDateTime(m.deletedAt) : "-"}
                      </p>
                    </div>
                    <div className="rounded-xl px-3 py-2.5 text-center sm:px-4 bg-white/80 border border-white/80 min-h-[64px] flex flex-col justify-center col-span-2 sm:col-span-1">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                        {t("deletedMembers.deletedBy")}
                      </p>
                      <p className="text-sm font-black text-slate-800 truncate">
                        {m.deletedByName || t("common.unknown")}
                      </p>
                    </div>
                  </div>

                  <div className="w-full md:w-auto md:shrink-0 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg shadow-slate-200/60">
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        to={`/admin/members/${uid}`}
                        className="h-12 sm:h-10 min-w-0 px-1.5 sm:px-2 flex flex-col sm:flex-row items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 shadow-md shadow-slate-200/60 transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 font-bold text-[11px] sm:text-xs leading-tight text-center"
                      >
                        <Eye size={16} /> <span className="inline">{t("common.view")}</span>
                      </Link>
                      <button
                        onClick={() => handleRestore(uid, `${m.name} ${m.surname || ""}`.trim())}
                        disabled={isRestoring}
                        className="h-12 sm:h-10 min-w-0 px-1.5 sm:px-2 flex flex-col sm:flex-row items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-white text-emerald-600 shadow-md shadow-emerald-100 transition-all font-bold text-[11px] sm:text-xs leading-tight text-center hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isRestoring ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <RotateCcw size={16} />
                        )}
                        <span className="inline">
                          {isRestoring ? t("deletedMembers.restoring") : t("deletedMembers.restoreMember")}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
        <Users size={13} /> {t("deletedMembers.preservedNote")}
      </p>
    </div>
  );
};

export default DeletedMembers;
