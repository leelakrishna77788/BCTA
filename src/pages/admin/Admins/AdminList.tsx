import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Eye,
  UserX,
  UserCheck,
  Filter,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  X,
  Loader2,
  Search,
  RotateCcw,
  Mail,
  Phone,
  Shield,
} from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
  DocumentData,
} from "firebase/firestore";
import { db } from "../../../firebase/firebaseConfig";
import { useAuth } from "../../../context/AuthContext";
import { adminsApi, type AdminDoc } from "../../../services/adminService";
import { TableSkeleton } from "../../../components/shared/LoadingSkeleton";

interface ConfirmState {
  type: "block" | "unblock" | "delete";
  admin: AdminDoc;
}

const AdminList: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { currentUser, userRole } = useAuth();
  const [admins, setAdmins] = useState<AdminDoc[]>([]);
  const [filtered, setFiltered] = useState<AdminDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [isWorking, setIsWorking] = useState<boolean>(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const isAdminRole =
    userRole === "admin" || userRole === "superadmin";

  useEffect(() => {
    if (!confirmState) return;

    const preventDefault = (e: Event) => e.preventDefault();
    window.addEventListener("wheel", preventDefault, { passive: false });
    window.addEventListener("touchmove", preventDefault, { passive: false });
    const blockKeys = (e: KeyboardEvent) => {
      const keys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Space", " "];
      if (keys.includes(e.key)) e.preventDefault();
    };
    window.addEventListener("keydown", blockKeys);
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      window.removeEventListener("wheel", preventDefault);
      window.removeEventListener("touchmove", preventDefault);
      window.removeEventListener("keydown", blockKeys);
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [confirmState]);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "users"), where("role", "==", "admin"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map(
          (d) => ({ id: d.id, uid: d.id, ...d.data() }) as AdminDoc,
        );
        docs.sort((a, b) => {
          const dateA =
            a.createdAt instanceof Timestamp
              ? a.createdAt.toDate().getTime()
              : new Date(a.createdAt || 0).getTime();
          const dateB =
            b.createdAt instanceof Timestamp
              ? b.createdAt.toDate().getTime()
              : new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });
        setAdmins(docs);
        setLoading(false);
      },
      (err) => {
        console.error("Admins listener error:", err);
        toast.error(t("adminList.updateFailed"));
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    let result = [...admins];
    const term = searchTerm.trim().toLowerCase();

    if (term) {
      result = result.filter((a) => {
        const fullName = `${a.name || ""} ${a.surname || ""}`
          .trim()
          .toLowerCase();
        const email = String(a.email || "").toLowerCase();
        const role = String(a.role || "").toLowerCase();
        const status = String(a.status || "").toLowerCase();
        return (
          fullName.includes(term) ||
          email.includes(term) ||
          role.includes(term) ||
          status.includes(term)
        );
      });
    }

    if (statusFilter !== "all") {
      result = result.filter((a) => a.status === statusFilter);
    }
    setFiltered(result);
  }, [searchTerm, statusFilter, admins, i18n.language]);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  const updateAdminLocally = useCallback(
    (docId: string, updates: Partial<AdminDoc>) => {
      setAdmins((prev) =>
        prev.map((a) =>
          a.id === docId || a.uid === docId ? { ...a, ...updates } : a,
        ),
      );
    },
    [],
  );

  const handleToggleBlock = async (admin: AdminDoc) => {
    const docId = admin.id || admin.uid;
    if (!docId) {
      toast.error(t("adminList.adminIdMissing"));
      return;
    }
    if (togglingId === docId) return;
    setTogglingId(docId);

    const previousStatus = admin.status;
    const newStatus = previousStatus === "active" ? "blocked" : "active";

    updateAdminLocally(docId, { status: newStatus });
    toast.success(
      newStatus === "active"
        ? t("adminList.adminUnblocked")
        : t("adminList.adminBlocked"),
    );

    try {
      await adminsApi.updateStatus(docId, newStatus);
      if (newStatus === "blocked") {
        adminsApi.revokeTokens(docId).catch((err) =>
          console.warn("Token revocation failed (non-critical):", err),
        );
      }
    } catch (err) {
      console.error("Block/Unblock failed:", err);
      updateAdminLocally(docId, { status: previousStatus });
      toast.error(t("adminList.updateFailed"));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = (admin: AdminDoc) => {
    setConfirmState({ type: "delete", admin });
  };

  const handleBlock = (admin: AdminDoc) => {
    setConfirmState({
      type: admin.status === "active" ? "block" : "unblock",
      admin,
    });
  };

  const confirmAction = async () => {
    if (!confirmState || isWorking) return;
    setIsWorking(true);

    try {
      if (confirmState.type === "delete") {
        const docId = confirmState.admin.id || confirmState.admin.uid;
        if (!docId) throw new Error("Missing admin id");
        await adminsApi.delete(docId);
        toast.success(t("adminList.adminDeleted"));
      } else {
        await handleToggleBlock(confirmState.admin);
      }
    } catch (err: any) {
      console.error("Admin action failed:", err);
      toast.error(
        confirmState.type === "delete"
          ? t("adminList.deleteFailed")
          : t("adminList.updateFailed"),
      );
    } finally {
      setConfirmState(null);
      setIsWorking(false);
    }
  };

  const getConfirmCopy = () => {
    if (!confirmState) return null;
    switch (confirmState.type) {
      case "block":
        return {
          title: t("adminList.blockConfirmTitle"),
          message: t("adminList.blockConfirmMessage"),
          confirmLabel: t("adminList.block"),
          tone: "red" as const,
        };
      case "unblock":
        return {
          title: t("adminList.unblockConfirmTitle"),
          message: t("adminList.unblockConfirmMessage"),
          confirmLabel: t("adminList.unblock"),
          tone: "emerald" as const,
        };
      default:
        return {
          title: t("adminList.deleteConfirmTitle"),
          message: t("adminList.deleteConfirmMessage"),
          confirmLabel: t("adminList.delete"),
          tone: "red" as const,
        };
    }
  };

  if (!isAdminRole) {
    return null;
  }

  return (
    <>
      {confirmState && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 backdrop-blur-lg animate-fade-in p-4"
          onClick={() => {
            if (!isWorking) setConfirmState(null);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-scale-up relative"
            style={{ maxHeight: "calc(100vh - 32px)", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const copy = getConfirmCopy();
              if (!copy) return null;
              const isRed = copy.tone === "red";
              return (
                <>
                  <div
                    className={`flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full ${isRed ? "bg-red-100" : "bg-emerald-100"}`}
                  >
                    {confirmState.type === "unblock" ? (
                      <UserCheck className="text-emerald-600" size={32} />
                    ) : (
                      <AlertTriangle
                        className={isRed ? "text-red-600" : "text-amber-600"}
                        size={32}
                      />
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 text-center mb-3">
                    {copy.title}
                  </h2>
                  <p className="text-sm text-slate-600 text-center mb-6">
                    {copy.message}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setConfirmState(null)}
                      disabled={isWorking}
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                    >
                      {t("common.cancel") || "Cancel"}
                    </button>
                    <button
                      onClick={confirmAction}
                      disabled={isWorking}
                      className={`flex-1 px-4 py-3 rounded-xl text-white font-semibold transition-colors flex items-center justify-center gap-2 ${
                        isRed
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      } disabled:opacity-70 disabled:cursor-not-allowed`}
                    >
                      {isWorking && (
                        <Loader2 size={16} className="animate-spin" />
                      )}
                      {copy.confirmLabel}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>,
        document.body,
      )}

      <div className="space-y-6 animate-fade-in pb-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end justify-between mb-2">
          <div className="relative">
            <div className="absolute -left-4 top-0 w-1 bg-indigo-600 h-full rounded-full opacity-0 md:opacity-100" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-2">
              {t("adminList.title")}{" "}
              <span className="text-indigo-600">{t("adminList.directory")}</span>
            </h1>
            <p className="text-sm font-semibold text-slate-500">
              {t("adminList.subtitle")}
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap lg:w-auto lg:items-center">
            <Link
              to="/admin/admins/add"
              className="h-12 w-full justify-center px-6 rounded-2xl bg-indigo-600 text-white font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95 sm:w-auto"
            >
              <Plus size={20} strokeWidth={2.5} />
              <span>{t("adminList.addAdmin")}</span>
            </Link>
          </div>
        </div>

        <div
          className="glass-card rounded-2xl sm:rounded-3xl border border-white/15 p-3.5 sm:p-4"
          style={{ background: "rgba(255, 255, 255, 0.18)" }}
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-2 text-slate-400">
              <Filter size={16} />
              <span className="text-[11px] font-black uppercase tracking-widest">
                {t("adminList.filterResults")}
              </span>
            </div>
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,11rem)_auto] xl:items-center">
              <div className="relative min-w-0">
                <Search
                  size={15}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t("adminList.searchPlaceholder")}
                  className="w-full h-11 pl-10 pr-10 bg-white/40 border border-slate-200/60 rounded-2xl font-semibold text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                />
                {searchTerm ? (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={t("common.clear")}
                    title={t("common.clear")}
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>
              <div className="relative min-w-0">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-11 pl-4 pr-10 appearance-none bg-white/35 border border-slate-200/50 rounded-2xl font-bold text-slate-700 cursor-pointer focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                >
                  <option value="all">{t("adminList.allStatus")}</option>
                  <option value="active">{t("adminList.activeAdmins")}</option>
                  <option value="blocked">
                    {t("adminList.blockedAdmins")}
                  </option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none border-l pl-2 border-slate-200">
                  <Filter size={14} />
                </div>
              </div>
              <button
                type="button"
                onClick={clearFilters}
                className="h-11 inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/60 bg-white/40 px-4 text-sm font-bold text-slate-600 shadow-sm transition-all hover:bg-white hover:text-indigo-600 hover:shadow-md active:scale-[0.98] sm:col-span-2 xl:col-span-1"
                title={t("adminList.reset")}
              >
                <RotateCcw size={14} />
                {t("adminList.reset")}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-4xl overflow-hidden">
          <div className="space-y-4">
            {loading ? (
              <div className="p-8">
                <TableSkeleton rows={6} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 px-4 rounded-3xl border border-dashed flex flex-col items-center justify-center gap-4">
                <span className="text-6xl opacity-20">🛡️</span>
                <p className="font-bold text-slate-600 mb-1">
                  {t("adminList.noAdminsFound")}
                </p>
                <p className="text-sm font-medium text-slate-400">
                  {t("adminList.adjustFilters")}
                </p>
              </div>
            ) : (
              filtered.map((a) => {
                const docId = a.id || a.uid;
                const isSelf = currentUser?.uid === docId;
                const isToggling = togglingId === docId;
                return (
                  <div
                    key={docId}
                    className="glass-card bg-white/35 hover:bg-white/45 rounded-2xl p-4 sm:p-5 lg:p-6 transition-all duration-300 border border-white/30 shadow-md hover:shadow-lg group"
                  >
                    <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:gap-6">
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="relative shrink-0">
                          {a.imageUrl ? (
                            <img
                              src={a.imageUrl}
                              alt=""
                              className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl object-cover shadow-md border-2 border-white"
                            />
                          ) : (
                            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-indigo-50 rounded-xl sm:rounded-2xl flex items-center justify-center text-indigo-600 font-black border-2 border-indigo-100 shadow-inner text-xl sm:text-2xl">
                              {a.name?.[0] || a.email?.[0] || "A"}
                            </div>
                          )}
                          <div
                            className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white shadow-sm ${
                              a.status === "active"
                                ? "bg-emerald-500"
                                : "bg-rose-500"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-slate-900 text-base sm:text-lg tracking-tight truncate">
                              {a.name} {a.surname}
                            </h3>
                            {isSelf && (
                              <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 font-semibold truncate flex items-center gap-1">
                            <Mail size={12} className="shrink-0" />
                            {a.email || "—"}
                          </p>
                          {a.phone ? (
                            <p className="text-xs text-slate-400 font-medium truncate flex items-center gap-1">
                              <Phone size={12} className="shrink-0" />
                              {a.phone}
                            </p>
                          ) : null}
                          <span className="inline-block mt-1 font-mono text-[10px] uppercase font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 shadow-sm">
                            <ShieldCheck size={10} className="inline mr-1 -mt-0.5" />
                            {a.role || "admin"}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:gap-3 lg:gap-4 w-full lg:w-auto">
                        <div className="rounded-xl px-3 py-2.5 text-center sm:px-4 bg-white/80 border border-white/80 min-h-[64px] flex flex-col justify-center">
                          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                            {t("adminList.role")}
                          </p>
                          <p className="text-base sm:text-sm font-black text-slate-800 capitalize flex items-center justify-center gap-1">
                            <Shield size={13} className="text-indigo-500" />
                            {a.role || "admin"}
                          </p>
                        </div>
                        <div className="rounded-xl px-3 py-2.5 text-center sm:px-4 bg-white/80 border border-white/80 min-h-[64px] flex flex-col justify-center">
                          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                            {t("adminList.status")}
                          </p>
                          <p
                            className={`text-base sm:text-sm font-black uppercase flex items-center justify-center gap-1.5 ${
                              a.status === "active"
                                ? "text-emerald-700"
                                : "text-rose-700"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full inline-block ${
                                a.status === "active"
                                  ? "bg-emerald-500 animate-pulse"
                                  : "bg-rose-500"
                              }`}
                            />
                            {t(`common.${a.status || "active"}`)}
                          </p>
                        </div>
                      </div>

                      <div className="w-full md:w-auto md:shrink-0 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg shadow-slate-200/60 transition-shadow hover:shadow-xl hover:shadow-slate-200/80">
                        <div className="grid grid-cols-3 gap-2">
                          <Link
                            to={`/admin/admins/${docId}`}
                            className="h-12 sm:h-10 min-w-0 px-1.5 sm:px-2 flex flex-col sm:flex-row items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 shadow-md shadow-slate-200/60 transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-lg hover:shadow-indigo-100 hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-lg active:shadow-slate-300/80 font-bold text-[11px] sm:text-xs leading-tight text-center"
                            title={t("adminList.view")}
                          >
                            <Eye size={16} />{" "}
                            <span className="inline">{t("adminList.view")}</span>
                          </Link>
                          <button
                            onClick={() => handleBlock(a)}
                            disabled={isToggling || isSelf}
                            className={`h-12 sm:h-10 min-w-0 px-1.5 sm:px-2 flex flex-col sm:flex-row items-center justify-center gap-1 rounded-xl border bg-white shadow-md transition-all font-bold text-[11px] sm:text-xs leading-tight text-center disabled:cursor-not-allowed disabled:opacity-50 ${
                              a.status === "active"
                                ? "border-red-200 shadow-red-100 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:shadow-lg hover:shadow-red-100 hover:-translate-y-0.5 active:translate-y-0.5"
                                : "border-emerald-200 shadow-emerald-100 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-lg hover:shadow-emerald-100 hover:-translate-y-0.5 active:translate-y-0.5"
                            }`}
                            title={
                              isSelf
                                ? t("adminList.cannotModifySelf")
                                : a.status === "active"
                                  ? t("adminList.block")
                                  : t("adminList.unblock")
                            }
                          >
                            {isToggling ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : a.status === "active" ? (
                              <UserX size={16} />
                            ) : (
                              <UserCheck size={16} />
                            )}
                            <span className="inline">
                              {isToggling
                                ? a.status === "active"
                                  ? t("adminList.blocking")
                                  : t("adminList.unblocking")
                                : a.status === "active"
                                  ? t("adminList.block")
                                  : t("adminList.unblock")}
                            </span>
                          </button>
                          <button
                            onClick={() => handleDelete(a)}
                            disabled={isSelf}
                            className="h-12 sm:h-10 min-w-0 px-1.5 sm:px-2 flex flex-col sm:flex-row items-center justify-center gap-1 rounded-xl border border-red-200 bg-white text-red-500 shadow-md shadow-red-100 transition-all font-bold text-[11px] sm:text-xs leading-tight text-center hover:bg-red-50 hover:text-red-700 hover:shadow-lg hover:shadow-red-100 hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-lg active:shadow-red-200/70 disabled:cursor-not-allowed disabled:opacity-50"
                            title={
                              isSelf
                                ? t("adminList.cannotModifySelf")
                                : t("adminList.delete")
                            }
                          >
                            <Trash2 size={16} />{" "}
                            <span className="inline">
                              {t("adminList.delete")}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminList;
