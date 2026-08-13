import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { doc, getDoc, Timestamp, DocumentData } from "firebase/firestore";
import { db } from "../../../firebase/firebaseConfig";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  UserX,
  UserCheck,
  Trash2,
  Mail,
  Phone,
  Shield,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  CalendarDays,
  UserRound,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../context/AuthContext";
import { adminsApi } from "../../../services/adminService";
import LoadingSkeleton, {
  CardSkeleton,
} from "../../../components/shared/LoadingSkeleton";

interface AdminDoc extends DocumentData {
  id: string;
  uid?: string;
  name?: string;
  surname?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
  imageUrl?: string;
  imagePublicId?: string;
  createdAt?: Timestamp | string | any;
}

type ConfirmType = "block" | "unblock" | "delete";

const AdminDetail: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [admin, setAdmin] = useState<AdminDoc | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [confirmType, setConfirmType] = useState<ConfirmType | null>(null);
  const [isWorking, setIsWorking] = useState<boolean>(false);

  useEffect(() => {
    const fetchAdmin = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const snap = await getDoc(doc(db, "users", id));
        if (snap.exists()) {
          const data = snap.data() as AdminDoc;
          if (String(data.role).toLowerCase() !== "admin") {
            setAdmin(null);
          } else {
            setAdmin({ ...data, uid: snap.id, id: snap.id } as AdminDoc);
          }
        } else {
          setAdmin(null);
        }
      } catch (err) {
        console.error("Admin load error:", err);
        toast.error(t("adminList.updateFailed"));
      } finally {
        setLoading(false);
      }
    };
    fetchAdmin();
  }, [id, t]);

  useEffect(() => {
    if (!confirmType) return;

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
  }, [confirmType]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6 px-3 sm:px-0 animate-fade-in">
        <LoadingSkeleton height="2rem" width="220px" className="mb-2" />
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center min-h-[60vh] flex items-center justify-center">
        <div className="card shadow-2xl border border-slate-200/60 p-12 max-w-lg bg-white rounded-3xl">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <AlertTriangle size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">
            {t("adminDetail.recordNotFound")}
          </h2>
          <p className="text-slate-500 mb-8 font-medium leading-relaxed">
            {t("adminDetail.recordNotFoundDesc")}
          </p>
          <button
            onClick={() => navigate("/admin/admins")}
            className="btn-primary w-full py-4 text-base shadow-xl shadow-slate-200 hover:shadow-slate-300 transition-all font-bold rounded-2xl"
          >
            {t("adminDetail.backToDirectory")}
          </button>
        </div>
      </div>
    );
  }

  const isSelf = currentUser?.uid === admin.id;
  const isActive = admin.status === "active";
  const fullName = `${admin.name ?? ""} ${admin.surname ?? ""}`.trim();

  const formatDate = () => {
    if (!admin.createdAt) return t("adminDetail.unknownDate");
    try {
      const d =
        admin.createdAt instanceof Timestamp
          ? admin.createdAt.toDate()
          : typeof admin.createdAt.toDate === "function"
            ? admin.createdAt.toDate()
            : new Date(admin.createdAt);
      return d.toLocaleDateString(i18n.language === "te" ? "te-IN" : "en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch (err) {
      return t("adminDetail.unknownDate");
    }
  };

  const getConfirmCopy = (type: ConfirmType) => {
    switch (type) {
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

  const confirmAction = async () => {
    if (!confirmType || isWorking) return;
    setIsWorking(true);

    try {
      if (confirmType === "delete") {
        await adminsApi.delete(admin.id);
        toast.success(t("adminList.adminDeleted"));
        navigate("/admin/admins");
      } else {
        const newStatus = confirmType === "block" ? "blocked" : "active";
        await adminsApi.updateStatus(admin.id, newStatus);
        if (newStatus === "blocked") {
          adminsApi.revokeTokens(admin.id).catch((err) =>
            console.warn("Token revocation failed (non-critical):", err),
          );
        }
        setAdmin((p) => (p ? { ...p, status: newStatus } : p));
        toast.success(
          newStatus === "active"
            ? t("adminList.adminUnblocked")
            : t("adminList.adminBlocked"),
        );
      }
    } catch (err) {
      console.error("Admin action failed:", err);
      toast.error(
        confirmType === "delete"
          ? t("adminList.deleteFailed")
          : t("adminList.updateFailed"),
      );
    } finally {
      setConfirmType(null);
      setIsWorking(false);
    }
  };

  const detailRows = [
    { label: t("adminDetail.name"), value: fullName || "—", icon: UserRound },
    { label: t("adminDetail.email"), value: admin.email || "—", icon: Mail },
    { label: t("adminDetail.phone"), value: admin.phone || t("adminDetail.noPhone"), icon: Phone },
    { label: t("adminDetail.role"), value: admin.role || "admin", icon: Shield },
    { label: t("adminDetail.status"), value: t(`common.${admin.status || "active"}`), icon: ShieldCheck },
    { label: t("adminDetail.createdAt"), value: formatDate(), icon: CalendarDays },
  ];

  return (
    <>
      {confirmType && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 backdrop-blur-lg animate-fade-in p-4"
          onClick={() => {
            if (!isWorking) setConfirmType(null);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-scale-up relative"
            style={{ maxHeight: "calc(100vh - 32px)", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const copy = getConfirmCopy(confirmType);
              const isRed = copy.tone === "red";
              return (
                <>
                  <div
                    className={`flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full ${isRed ? "bg-red-100" : "bg-emerald-100"}`}
                  >
                    {confirmType === "unblock" ? (
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
                      onClick={() => setConfirmType(null)}
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

      <div className="mx-auto w-full max-w-4xl space-y-6 p-0 animate-fade-in pb-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                {t("adminDetail.profileTitle")}
              </h1>
              <p className="text-sm text-slate-500">
                {t("adminDetail.profileSubtitle")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isSelf && (
              <>
                {isActive ? (
                  <button
                    onClick={() => setConfirmType("block")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                  >
                    <UserX size={14} /> {t("adminDetail.blockAdmin")}
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmType("unblock")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <UserCheck size={14} /> {t("adminDetail.unblockAdmin")}
                  </button>
                )}
                <button
                  onClick={() => setConfirmType("delete")}
                  className="h-9 w-9 flex items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50"
                  title={t("adminDetail.deleteAdmin")}
                >
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </div>
        </div>

        <section
          className="relative overflow-hidden rounded-4xl border border-blue-100 p-5 text-white shadow-xl sm:p-8"
          style={{
            background: "linear-gradient(135deg, #0a1f5e 0%, #183b9a 50%, #2b62d4 100%)",
          }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_46%)]" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col items-center gap-5 sm:flex-row">
            {admin.imageUrl ? (
              <img
                src={admin.imageUrl}
                alt=""
                className="h-24 w-24 rounded-3xl object-cover ring-4 ring-white/20 shadow-xl sm:h-28 sm:w-28"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/15 text-4xl font-bold ring-4 ring-white/20 shadow-xl sm:h-28 sm:w-28">
                {(fullName || admin.email || "A")[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {fullName || admin.name || "—"}
              </h2>
              <p className="text-sm text-white/80">{admin.email || "—"}</p>
              <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    isActive
                      ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-100"
                      : "border-rose-300/40 bg-rose-400/10 text-rose-100"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-rose-400"}`}
                  />
                  {t(`common.${admin.status || "active"}`)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                  <ShieldCheck size={12} /> {admin.role || "admin"}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="card rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {t("adminDetail.accountInfo")}
              </h2>
              <p className="text-sm text-slate-500">
                {t("adminDetail.adminSince")}: {formatDate()}
              </p>
            </div>
            <Shield className="text-[#000080]" size={20} />
          </div>

          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {detailRows.map((item) => {
              const Icon = item.icon;
              const isStatus = item.label === t("adminDetail.status");
              return (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                >
                  <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <Icon size={13} className="text-[#000080]" />
                    {item.label}
                  </dt>
                  <dd
                    className={`mt-2 text-sm font-semibold wrap-break-word ${
                      isStatus
                        ? isActive
                          ? "text-emerald-700"
                          : "text-rose-700"
                        : "text-slate-900"
                    }`}
                  >
                    {item.value}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>
    </>
  );
};

export default AdminDetail;
