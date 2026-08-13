import React, { useEffect, useState } from "react";
import { doc, getDoc, onSnapshot, Timestamp, DocumentData } from "firebase/firestore";
import { db } from "../../../firebase/firebaseConfig";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Edit3,
  Save,
  Loader2,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  UserRound,
  Camera,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../context/AuthContext";
import { adminsApi } from "../../../services/adminService";
import { uploadImage, deleteImage, ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "../../../utils/cloudinary";
import LoadingSkeleton, {
  CardSkeleton,
} from "../../../components/shared/LoadingSkeleton";

interface AdminProfileDoc extends DocumentData {
  id: string;
  uid?: string;
  name?: string;
  surname?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
  imageUrl?: string;
  createdAt?: Timestamp | string | any;
}

interface EditForm {
  name: string;
  phone: string;
}

const AdminProfile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<AdminProfileDoc | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isPhotoUploading, setIsPhotoUploading] = useState<boolean>(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [uploadedPhoto, setUploadedPhoto] = useState<{ url: string; publicId: string } | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", phone: "" });

  useEffect(() => {
    if (!currentUser?.uid) return;
    const docRef = doc(db, "users", currentUser.uid);

    const unsub = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as AdminProfileDoc;
          if (String(data.role).toLowerCase() !== "admin" && String(data.role).toLowerCase() !== "superadmin") {
            setProfile(null);
          } else {
            setProfile({ ...data, uid: snap.id, id: snap.id } as AdminProfileDoc);
          }
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Profile listener error:", err);
        toast.error(t("adminProfile.toastLoadFailed"));
        setLoading(false);
      },
    );

    return () => unsub();
  }, [currentUser?.uid, t]);

  useEffect(() => {
    if (!profile) return;
    setEditForm({
      name: profile.name || "",
      phone: profile.phone || "",
    });
    setPhotoPreview(profile.imageUrl || (currentUser?.photoURL as string) || "");
    setPhotoFile(null);
    setUploadedPhoto(null);
  }, [profile]);

  const fullName = `${profile?.name ?? ""} ${profile?.surname ?? ""}`.trim() || profile?.name || "—";
  const isActive = profile?.status === "active";

  const onCancelEdit = () => {
    if (!profile) return;
    setIsEditing(false);
    setEditForm({
      name: profile.name || "",
      phone: profile.phone || "",
    });
    if (photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview(profile.imageUrl || (currentUser?.photoURL as string) || "");
    setPhotoFile(null);
    setUploadedPhoto(null);
  };

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error(t("adminProfile.invalidImageType"));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(t("adminProfile.imageTooLarge"));
      return;
    }

    if (photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setUploadedPhoto(null);
    setIsPhotoUploading(true);

    try {
      const result = await uploadImage(file, "admins");
      setUploadedPhoto(result);
    } catch (err: any) {
      console.error("Photo upload failed:", err);
      toast.error(err?.message || t("adminProfile.toastPhotoFailed"));
      setPhotoFile(null);
      setIsPhotoUploading(false);
      if (photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
      setPhotoPreview(profile?.imageUrl || (currentUser?.photoURL as string) || "");
      return;
    }
    setIsPhotoUploading(false);
  };

  const onSave = async () => {
    if (!profile) return;

    if (!editForm.name.trim()) {
      toast.error(t("adminProfile.nameRequired"));
      return;
    }
    const phoneDigits = editForm.phone.replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      toast.error(t("adminProfile.phoneLength"));
      return;
    }

    setIsSaving(true);
    try {
      if (isPhotoUploading) {
        toast(t("adminProfile.photoUploading"));
      }

      const nextPhoto = uploadedPhoto || null;

      await adminsApi.updateMyProfile({
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        imageUrl: nextPhoto?.url ?? null,
        imagePublicId: nextPhoto?.publicId ?? null,
      });

      if (nextPhoto && profile?.imagePublicId && profile.imagePublicId !== nextPhoto.publicId) {
        deleteImage(profile.imagePublicId).catch((e) =>
          console.warn("Failed to delete old profile image (non-critical):", e),
        );
      }

      await refreshProfile();
      setIsEditing(false);
      setPhotoFile(null);
      setUploadedPhoto(null);
      toast.success(t("adminProfile.toastUpdated"));
    } catch (err: any) {
      console.error("Profile update failed:", err);
      toast.error(
        err?.message || t("adminProfile.toastUpdateFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const getProfilePhoto = () => {
    const url = photoPreview || profile?.imageUrl || (currentUser?.photoURL as string) || "";
    if (url) {
      return <img src={url} alt="" className="h-24 w-24 rounded-3xl object-cover ring-4 ring-white/20 shadow-xl sm:h-28 sm:w-28" />;
    }
    return (
      <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/15 text-4xl font-bold ring-4 ring-white/20 shadow-xl sm:h-28 sm:w-28">
        {(fullName || profile?.email || "A")[0]?.toUpperCase()}
      </div>
    );
  };

  const detailRows = [
    {
      label: t("adminProfile.name"),
      value: fullName,
      icon: UserRound,
      isEditField: true,
    },
    { label: t("adminProfile.email"), value: profile?.email || "—", icon: Mail },
    {
      label: t("adminProfile.phone"),
      value: profile?.phone || t("adminProfile.noPhone"),
      icon: Phone,
      isEditField: true,
    },
    { label: t("adminProfile.role"), value: profile?.role || "admin", icon: Shield },
    { label: t("adminProfile.status"), value: t(`common.${profile?.status || "active"}`), icon: ShieldCheck },
  ];

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

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center min-h-[60vh] flex items-center justify-center">
        <div className="card shadow-2xl border border-slate-200/60 p-12 max-w-lg bg-white rounded-3xl">
          <div className="w-20 h-20 bg-slate-50 text-slate-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <UserRound size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">
            {t("adminProfile.notFound")}
          </h2>
          <p className="text-slate-500 mb-8 font-medium leading-relaxed">
            {t("adminProfile.notFoundDesc")}
          </p>
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="btn-primary w-full py-4 text-base shadow-xl shadow-slate-200 hover:shadow-slate-300 transition-all font-bold rounded-2xl"
          >
            {t("adminProfile.backToDashboard")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
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
                {t("adminProfile.title")}
              </h1>
              <p className="text-sm text-slate-500">
                {t("adminProfile.subtitle")}
              </p>
            </div>
          </div>

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#000080] px-4 py-2 text-xs font-bold text-white hover:bg-[#000066] transition-colors"
            >
              <Edit3 size={14} /> {t("adminProfile.editProfile")}
            </button>
          ) : null}
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
            {getProfilePhoto()}
            <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {fullName}
              </h2>
              <p className="text-sm text-white/80">{profile?.email || "—"}</p>
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
                  {t(`common.${profile?.status || "active"}`)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                  <ShieldCheck size={12} /> {profile?.role || "admin"}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="card rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {t("adminProfile.accountInfo")}
              </h2>
              <p className="text-sm text-slate-500">
                {t("adminProfile.accountInfoDesc")}
              </p>
            </div>
            <Shield className="text-[#000080]" size={20} />
          </div>

          {isEditing && (
            <div className="mb-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-6">
              <h3 className="text-base font-bold text-slate-900">
                {t("adminProfile.editTitle")}
              </h3>
              <p className="mt-0.5 text-xs text-slate-600">
                {t("adminProfile.editDesc")}
              </p>

              {/* Profile Photo */}
              <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-700">
                  {t("adminProfile.profilePhoto")}
                </p>
                <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row">
                  <div className="flex-shrink-0">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Profile preview"
                        className="h-20 w-20 rounded-xl object-cover border-2 border-slate-200 shadow-sm"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-xl border-2 border-dashed border-slate-300 bg-slate-100 flex items-center justify-center text-xs text-slate-400 font-semibold">
                        {t("adminProfile.noPhoto")}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 w-full">
                    <label className="flex items-center justify-center w-auto cursor-pointer rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition">
                      <Camera size={14} className="mr-1.5" />
                      {photoFile || uploadedPhoto
                        ? t("adminProfile.changePhoto")
                        : t("adminProfile.choosePhoto")}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={onPickPhoto}
                        disabled={isPhotoUploading}
                        className="hidden"
                      />
                    </label>
                    {isPhotoUploading && (
                      <p className="mt-2 text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                        <Loader2 size={12} className="animate-spin" />
                        {t("adminProfile.photoUploading")}
                      </p>
                    )}
                    {uploadedPhoto && (
                      <p className="mt-2 text-xs text-emerald-600 font-semibold">
                        {t("adminProfile.photoReady")}
                      </p>
                    )}
                    {(photoFile || uploadedPhoto) && (profile?.imageUrl || profile?.imagePublicId) ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (photoPreview.startsWith("blob:")) {
                            URL.revokeObjectURL(photoPreview);
                          }
                          setPhotoFile(null);
                          setUploadedPhoto(null);
                          setPhotoPreview(
                            profile.imageUrl || (currentUser?.photoURL as string) || "",
                          );
                        }}
                        disabled={isPhotoUploading}
                        className="mt-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-60"
                      >
                        {t("adminProfile.removePhoto")}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    {t("adminProfile.name")}
                  </label>
                  <input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder={t("adminProfile.namePlaceholder")}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-[#000080] focus:ring-1"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    {t("adminProfile.phone")}
                  </label>
                  <input
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                      }))
                    }
                    placeholder={t("adminProfile.phonePlaceholder")}
                    inputMode="numeric"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-[#000080] focus:ring-1"
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-start">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={onSave}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#000080] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#000066] disabled:cursor-not-allowed disabled:opacity-60 transition shadow-md hover:shadow-lg"
                >
                  {isSaving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  {isSaving ? t("adminProfile.saving") : t("adminProfile.saveChanges")}
                </button>
                <button
                  type="button"
                  onClick={onCancelEdit}
                  disabled={isSaving}
                  className="rounded-lg border-2 border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                >
                  {t("adminProfile.cancel")}
                </button>
              </div>
            </div>
          )}

          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {detailRows.map((item) => {
              const Icon = item.icon;
              const isStatus = item.label === t("adminProfile.status");
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

export default AdminProfile;
