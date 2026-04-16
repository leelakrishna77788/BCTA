import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db, storage } from "../../firebase/firebaseConfig";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import {
    AlertCircle,
    BadgeCheck,
    CalendarDays,
    CheckCircle2,
    CreditCard,
    Droplet,
    Edit3,
    Mail,
    MapPin,
    Phone,
    Save,
    ShieldCheck,
    User,
} from "lucide-react";
import LoadingSkeleton, { CardSkeleton } from "../../components/shared/LoadingSkeleton";
import { updateMember } from "../../services/membersService";
import toast from "react-hot-toast";

interface AttendanceRecord {
    [key: string]: any;
}

interface ProfileEditForm {
    name: string;
    surname: string;
    phone: string;
    age: string;
    gender: string;
    bloodGroup: string;
    aadhaarLast4: string;
    shopAddress: string;
    nomineeName: string;
    nomineeRelation: string;
    nomineePhone: string;
}

const buildProfileEditForm = (userProfile: any): ProfileEditForm => ({
    name: userProfile?.name || "",
    surname: userProfile?.surname || "",
    phone: userProfile?.phone || "",
    age: userProfile?.age ? String(userProfile.age) : "",
    gender: userProfile?.gender || "",
    bloodGroup: userProfile?.bloodGroup || "",
    aadhaarLast4: userProfile?.aadhaarLast4 || "",
    shopAddress: userProfile?.shopAddress || "",
    nomineeName: userProfile?.nomineeDetails?.name || "",
    nomineeRelation: userProfile?.nomineeDetails?.relation || "",
    nomineePhone: userProfile?.nomineeDetails?.phone || "",
});

const MEMBER_ID_PATTERN = /^BCTA-\d{4}-\d+$/;

const MAX_UPLOAD_SIZE_BYTES = 8 * 1024 * 1024;

const optimizeImageForUpload = async (file: File): Promise<File> => {
    if (!file.type.startsWith("image/") || file.size < 300 * 1024) return file;

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Unable to process selected image."));
        };
        image.src = objectUrl;
    });

    const maxSide = 720;
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const targetWidth = Math.max(1, Math.round(img.width * scale));
    const targetHeight = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    const outputType = "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outputType, 0.65));
    if (!blob) return file;

    const baseName = file.name.replace(/\.[^/.]+$/, "") || "profile-photo";
    return new File([blob], `${baseName}.jpg`, { type: outputType });
};

const MyProfile: React.FC = () => {
    const { userProfile, currentUser, refreshProfile } = useAuth();
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [isPhotoUploading, setIsPhotoUploading] = useState<boolean>(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [originalForm, setOriginalForm] = useState<ProfileEditForm | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string>("");
    const [uploadedPhotoURL, setUploadedPhotoURL] = useState<string>("");
    const [editForm, setEditForm] = useState<ProfileEditForm>({
        name: "",
        surname: "",
        phone: "",
        age: "",
        gender: "",
        bloodGroup: "",
        aadhaarLast4: "",
        shopAddress: "",
        nomineeName: "",
        nomineeRelation: "",
        nomineePhone: "",
    });

    const memberId = userProfile?.memberId?.trim() || "";
    const hasMemberId = memberId.length > 0;
    const memberIdVerified = hasMemberId && MEMBER_ID_PATTERN.test(memberId);
    const fullName = userProfile ? `${userProfile.name ?? ""} ${userProfile.surname ?? ""}`.trim() : "";
    const createdAt = userProfile?.createdAt;
    const memberSince = createdAt && "toDate" in createdAt
        ? createdAt.toDate().getFullYear()
        : new Date().getFullYear();
    const profileInitial = (userProfile?.name?.[0] ?? currentUser?.email?.[0] ?? "M").toUpperCase();
    const activePhotoURL = (isEditing ? photoPreview : "") || userProfile?.photoURL || uploadedPhotoURL || "";
    const paymentTone = userProfile?.paymentStatus === "paid"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-amber-50 text-amber-700 border-amber-200";
    const statusTone = userProfile?.status === "active"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-red-50 text-red-700 border-red-200";

    useEffect(() => {
        if (!currentUser) return;
        const q = query(collection(db, "attendance"), where("memberUID", "==", currentUser.uid));
        const unsubscribe = onSnapshot(
            q,
            (snap) => setAttendance(snap.docs.map((d) => d.data() as AttendanceRecord)),
            (error) => console.error("Attendance listener error:", error)
        );
        return () => unsubscribe();
    }, [currentUser]);

    useEffect(() => {
        if (!userProfile) return;
        const nextForm = buildProfileEditForm(userProfile);
        setEditForm(nextForm);
        setOriginalForm(nextForm);
        setPhotoPreview(userProfile.photoURL || "");
        setPhotoFile(null);
        setUploadedPhotoURL("");
        setIsPhotoUploading(false);
        setUploadProgress(null);
    }, [userProfile]);

    const isFieldChanged = (field: keyof ProfileEditForm) => {
        if (!originalForm) return false;
        return (editForm[field] || "").trim() !== (originalForm[field] || "").trim();
    };

    const changedFields = (Object.keys(editForm) as Array<keyof ProfileEditForm>)
        .filter((field) => isFieldChanged(field));

    const changedInputClass = (field: keyof ProfileEditForm) =>
        `rounded-xl border bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-[#000080] focus:ring-1 ${isFieldChanged(field)
            ? "border-indigo-400 bg-indigo-50/40"
            : "border-slate-200"
        }`;

    const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please select a valid image file.");
            return;
        }

        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
            toast.error("Image is too large. Please choose an image under 8MB.");
            return;
        }

        if (photoPreview.startsWith("blob:")) {
            URL.revokeObjectURL(photoPreview);
        }

        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));

        if (!currentUser) {
            toast.error("Please login again and retry.");
            return;
        }

        setUploadedPhotoURL("");
        setIsPhotoUploading(true);
        setUploadProgress(0);
        try {
            const optimizedPhoto = await optimizeImageForUpload(file);
            const photoRef = ref(storage, `member-photos/${currentUser.uid}/${Date.now()}-${optimizedPhoto.name}`);

            await new Promise<void>((resolve, reject) => {
                const task = uploadBytesResumable(photoRef, optimizedPhoto, {
                    contentType: optimizedPhoto.type,
                    cacheControl: "public,max-age=3600",
                });

                task.on(
                    "state_changed",
                    (snapshot) => {
                        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                        setUploadProgress(progress);
                    },
                    (error) => reject(error),
                    () => resolve()
                );
            });

            const url = await getDownloadURL(photoRef);
            await updateMember(currentUser.uid, { photoURL: url });
            setUploadedPhotoURL(url);
            await refreshProfile();
            toast.success("Image uploaded and saved.");
        } catch (error: any) {
            console.error("Photo upload failed:", error);
            setUploadedPhotoURL("");
            toast.error(error?.message || "Image upload failed. Please try another image.");
        } finally {
            setIsPhotoUploading(false);
        }
    };

    const onFormChange = (field: keyof ProfileEditForm, value: string) => {
        setEditForm((prev) => ({ ...prev, [field]: value }));
    };

    const onCancelEdit = () => {
        if (!userProfile) return;
        setIsEditing(false);
        const resetForm = buildProfileEditForm(userProfile);
        setEditForm(resetForm);
        setOriginalForm(resetForm);
        if (photoPreview.startsWith("blob:")) {
            URL.revokeObjectURL(photoPreview);
        }
        setPhotoFile(null);
        setPhotoPreview(userProfile.photoURL || "");
        setUploadedPhotoURL("");
        setIsPhotoUploading(false);
        setUploadProgress(null);
    };

    const onSaveProfile = async () => {
        if (!currentUser) {
            toast.error("Please login again and retry.");
            return;
        }

        const parsedAge = editForm.age.trim() === "" ? null : Number(editForm.age);
        if (parsedAge !== null && (Number.isNaN(parsedAge) || parsedAge < 0 || parsedAge > 120)) {
            toast.error("Please enter a valid age.");
            return;
        }

        if (editForm.aadhaarLast4 && !/^\d{4}$/.test(editForm.aadhaarLast4.trim())) {
            toast.error("Aadhaar last 4 must be exactly 4 digits.");
            return;
        }

        setIsSaving(true);
        try {
            if (photoFile && isPhotoUploading) {
                toast("Image upload is still in progress. Saving other details now.");
            }

            const nextPhotoURL = uploadedPhotoURL || userProfile?.photoURL || "";

            await updateMember(currentUser.uid, {
                name: editForm.name.trim(),
                surname: editForm.surname.trim(),
                phone: editForm.phone.trim(),
                age: parsedAge,
                gender: (editForm.gender as any) || "",
                bloodGroup: (editForm.bloodGroup as any) || "",
                aadhaarLast4: editForm.aadhaarLast4.trim(),
                shopAddress: editForm.shopAddress.trim(),
                nomineeDetails: {
                    name: editForm.nomineeName.trim(),
                    relation: editForm.nomineeRelation.trim(),
                    phone: editForm.nomineePhone.trim(),
                },
                photoURL: nextPhotoURL,
            });

            await refreshProfile();
            setIsEditing(false);
            setPhotoFile(null);
            setUploadedPhotoURL("");
            setUploadProgress(null);
            toast.success("Profile updated from backend.");
        } catch (error: any) {
            console.error("Profile update failed:", error);
            if (error?.code === "permission-denied") {
                toast.error("Profile update blocked by backend rules. Please refresh and retry.");
            } else {
                toast.error(error?.message || "Failed to update profile. Try again.");
            }
        } finally {
            setIsSaving(false);
            setUploadProgress(null);
        }
    };

    if (!userProfile) return (
        <div className="mx-auto w-full max-w-6xl space-y-6 px-3 sm:px-0 animate-fade-in">
            <LoadingSkeleton height="2rem" width="180px" className="mb-2" />
            <div className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
                <CardSkeleton />
                <CardSkeleton />
            </div>
            <div className="card space-y-4">
                <LoadingSkeleton height="1rem" width="40%" />
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex justify-between">
                            <LoadingSkeleton height="0.75rem" width="30%" />
                            <LoadingSkeleton height="0.75rem" width="50%" />
                        </div>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <LoadingSkeleton height="80px" borderRadius="1rem" />
                <LoadingSkeleton height="80px" borderRadius="1rem" />
                <LoadingSkeleton height="80px" borderRadius="1rem" />
            </div>
        </div>
    );

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6 p-0 animate-fade-in">
            <section className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-[#0a1f5e] via-[#183b9a] to-[#2b62d4] p-5 text-white shadow-xl sm:p-8">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.22),_transparent_46%)]" />
                <div className="pointer-events-none absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
                <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.95fr)] lg:items-center sm:grid-cols-none">
                    <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
                        {/* Mobile: centered avatar, SM+: left-aligned */}
                        <div className="flex justify-center sm:justify-start">
                            {activePhotoURL ? (
                                <img
                                    src={activePhotoURL}
                                    alt={`${fullName} profile photo`}
                                    className="h-24 w-24 rounded-3xl object-cover ring-4 ring-white/20 shadow-xl sm:h-28 sm:w-28"
                                />
                            ) : (
                                <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/15 text-4xl font-bold ring-4 ring-white/20 shadow-xl sm:h-28 sm:w-28">
                                    {profileInitial}
                                </div>
                            )}
                        </div>

                        <div className="min-w-0 space-y-4">
                            <div className="space-y-1 text-center sm:text-left">
                                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{fullName || userProfile.name}</h1>
                            </div>

                            {/* Mobile: blood + member ID + member since, SM+: add active status */}
                            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold" style={{...(statusTone ? {borderColor: 'inherit'} : {})}}>
                                    <ShieldCheck size={12} /> {userProfile.status}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs">
                                    <Droplet size={10} className="sm:w-3 sm:h-3" /> {userProfile.bloodGroup || "Blood group"}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs">
                                    <BadgeCheck size={10} className="sm:w-3 sm:h-3" /> {hasMemberId ? memberId : "Member ID pending"}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white sm:hidden">
                                    <CalendarDays size={10} /> {memberSince}
                                </span>
                            </div>

                            {/* Mobile hidden, SM+ visible */}
                            <div className="hidden sm:flex flex-wrap items-center gap-2 text-xs text-white/70">
                                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold ${memberIdVerified ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-100" : "border-amber-300/40 bg-amber-400/10 text-amber-100"}`}>
                                    {memberIdVerified ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                    {memberIdVerified ? "Member ID verified" : "Member ID pending check"}
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 font-semibold text-white/80">
                                    Joined {memberSince}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Mobile: 3 columns compact, SM: 2 cols, LG: 3 cols */}
                    <div className="grid gap-2 grid-cols-3 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
                        <div className="rounded-2xl border border-white/15 bg-white/10 p-2.5 backdrop-blur sm:p-4">
                            <p className="text-[9px] uppercase tracking-[0.18em] text-white/60 sm:text-xs">Meetings</p>
                            <p className="mt-1 text-xl font-bold sm:text-3xl">{attendance.length}</p>
                            <p className="mt-0.5 text-[9px] text-white/65 sm:text-xs">attended</p>
                        </div>
                        <div className="rounded-2xl border border-white/15 bg-white/10 p-2.5 backdrop-blur sm:p-4">
                            <p className="text-[9px] uppercase tracking-[0.18em] text-white/60 sm:text-xs">Payment</p>
                            <p className={`mt-1 text-lg font-bold capitalize sm:text-2xl ${userProfile.paymentStatus === "paid" ? "text-emerald-300" : "text-amber-300"}`}>
                                {userProfile.paymentStatus}
                            </p>
                            <p className="mt-0.5 text-[9px] text-white/65 sm:text-xs">status</p>
                        </div>
                        <div className="rounded-2xl border border-white/15 bg-white/10 p-2.5 backdrop-blur sm:p-4 sm:col-span-2 xl:col-span-1">
                            <p className="text-[9px] uppercase tracking-[0.18em] text-white/60 sm:text-xs">Member since</p>
                            <p className="mt-1 text-xl font-bold sm:text-3xl">{memberSince}</p>
                            <p className="mt-0.5 text-[9px] text-white/65 sm:text-xs">year</p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.85fr)]">
                <div className="min-w-0 space-y-6">
                    <div className="card rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Personal Details</h2>
                                <p className="text-sm text-slate-500">Key identity, member ID, and contact information.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => (isEditing ? onCancelEdit() : setIsEditing(true))}
                                    className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    <Edit3 size={13} /> {isEditing ? "Cancel" : "Edit details"}
                                </button>
                                <User className="text-[#000080]" size={20} />
                            </div>
                        </div>

                        {isEditing && (
                            <div className="mb-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-6">
                                <h3 className="text-base font-bold text-slate-900">Edit Profile Details</h3>
                                <p className="mt-0.5 text-xs text-slate-600">Make changes below and save to update your profile.</p>

                                {/* Profile Photo Section */}
                                <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-700">Profile Photo</p>
                                    <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                                        <div className="flex-shrink-0">
                                            {photoPreview ? (
                                                <img src={photoPreview} alt="Profile preview" className="h-20 w-20 rounded-xl object-cover border-2 border-slate-200 shadow-sm" />
                                            ) : (
                                                <div className="h-20 w-20 rounded-xl border-2 border-dashed border-slate-300 bg-slate-100 flex items-center justify-center text-xs text-slate-400 font-semibold">No Photo</div>
                                            )}
                                        </div>
                                        <div className="flex-1 w-full">
                                            <label className="flex items-center justify-center w-full sm:w-auto cursor-pointer rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 px-4 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition">
                                                + Choose Photo
                                                <input type="file" accept="image/*" onChange={onPickPhoto} className="hidden" />
                                            </label>
                                            {photoFile && <p className="mt-2 text-xs text-indigo-600 font-semibold">✓ Selected: {photoFile.name}</p>}
                                            {photoFile && uploadedPhotoURL && <p className="text-xs text-emerald-600 font-semibold">✓ Ready to save</p>}
                                        </div>
                                    </div>
                                    {uploadProgress !== null && photoFile && (
                                        <div className="mt-4">
                                            <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
                                                <div className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all" style={{ width: `${uploadProgress}%` }} />
                                            </div>
                                            <p className="mt-2 text-xs font-semibold text-slate-600">
                                                {isPhotoUploading ? `Uploading: ${uploadProgress}%` : `Complete: ${uploadProgress}%`}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Changed Fields Badge */}
                                {changedFields.length > 0 && (
                                    <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
                                        <p className="text-xs font-bold text-blue-800">
                                            {changedFields.length === 1 ? "1 field changed" : `${changedFields.length} fields changed`}: {changedFields.join(", ")}
                                        </p>
                                    </div>
                                )}

                                {/* Form Fields Grid */}
                                <div className="mt-5 space-y-3">
                                    {/* Row 1: Name Fields */}
                                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">First Name</label>
                                            <input value={editForm.name} onChange={(e) => onFormChange("name", e.target.value)} placeholder="First name" className={`w-full ${changedInputClass("name")}`} />
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Surname</label>
                                            <input value={editForm.surname} onChange={(e) => onFormChange("surname", e.target.value)} placeholder="Surname" className={`w-full ${changedInputClass("surname")}`} />
                                        </div>
                                    </div>

                                    {/* Row 2: Phone & Age */}
                                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Phone</label>
                                            <input value={editForm.phone} onChange={(e) => onFormChange("phone", e.target.value)} placeholder="Phone" className={`w-full ${changedInputClass("phone")}`} />
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Age</label>
                                            <input value={editForm.age} onChange={(e) => onFormChange("age", e.target.value)} placeholder="Age" inputMode="numeric" className={`w-full ${changedInputClass("age")}`} />
                                        </div>
                                    </div>

                                    {/* Row 3: Gender & Blood Group */}
                                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Gender</label>
                                            <select value={editForm.gender} onChange={(e) => onFormChange("gender", e.target.value)} className={`w-full ${changedInputClass("gender")}`}>
                                                <option value="">Select Gender</option>
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Blood Group</label>
                                            <select value={editForm.bloodGroup} onChange={(e) => onFormChange("bloodGroup", e.target.value)} className={`w-full ${changedInputClass("bloodGroup")}`}>
                                                <option value="">Select Blood Group</option>
                                                <option value="A+">A+</option>
                                                <option value="A-">A-</option>
                                                <option value="B+">B+</option>
                                                <option value="B-">B-</option>
                                                <option value="AB+">AB+</option>
                                                <option value="AB-">AB-</option>
                                                <option value="O+">O+</option>
                                                <option value="O-">O-</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Row 4: Aadhaar & Shop Address */}
                                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Aadhaar Last 4</label>
                                            <input value={editForm.aadhaarLast4} onChange={(e) => onFormChange("aadhaarLast4", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Aadhaar last 4" inputMode="numeric" className={`w-full ${changedInputClass("aadhaarLast4")}`} />
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Shop Address</label>
                                            <input value={editForm.shopAddress} onChange={(e) => onFormChange("shopAddress", e.target.value)} placeholder="Shop address" className={`w-full ${changedInputClass("shopAddress")}`} />
                                        </div>
                                    </div>

                                    {/* Row 5: Nominee Info */}
                                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Nominee Name</label>
                                            <input value={editForm.nomineeName} onChange={(e) => onFormChange("nomineeName", e.target.value)} placeholder="Nominee name" className={`w-full ${changedInputClass("nomineeName")}`} />
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Nominee Relation</label>
                                            <input value={editForm.nomineeRelation} onChange={(e) => onFormChange("nomineeRelation", e.target.value)} placeholder="Nominee relation" className={`w-full ${changedInputClass("nomineeRelation")}`} />
                                        </div>
                                    </div>

                                    {/* Full Width: Nominee Phone */}
                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-slate-700">Nominee Phone</label>
                                        <input value={editForm.nomineePhone} onChange={(e) => onFormChange("nomineePhone", e.target.value)} placeholder="Nominee phone" className={`w-full ${changedInputClass("nomineePhone")}`} />
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-start">
                                    <button
                                        type="button"
                                        disabled={isSaving}
                                        onClick={onSaveProfile}
                                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#000080] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#000066] disabled:cursor-not-allowed disabled:opacity-60 transition shadow-md hover:shadow-lg"
                                    >
                                        <Save size={14} /> {isSaving ? "Saving..." : "Save Changes"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onCancelEdit}
                                        className="rounded-lg border-2 border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {[
                                {
                                    label: "Member ID",
                                    value: hasMemberId ? memberId : "Pending assignment",
                                    icon: BadgeCheck,
                                },
                                { label: "Full Name", value: fullName || "—" },
                                { label: "Age", value: userProfile.age ? `${userProfile.age} years` : "—" },
                                { label: "Gender", value: userProfile.gender || "—" },
                                { label: "Blood Group", value: userProfile.bloodGroup || "—" },
                                { label: "Email", value: userProfile.email || currentUser?.email || "—", icon: Mail },
                                { label: "Aadhaar", value: userProfile.aadhaarLast4 ? `XXXX-XXXX-XXXX-${userProfile.aadhaarLast4}` : "—", icon: CreditCard },
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                        <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                            {Icon ? <Icon size={13} className="text-[#000080]" /> : null}
                                            {item.label}
                                        </dt>
                                        <dd className="mt-2 text-sm font-semibold text-slate-900 break-words">{item.value}</dd>
                                    </div>
                                );
                            })}
                        </dl>
                    </div>

                    <div className="card rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
                        <div className="mb-5 flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Shop & Nominee</h2>
                                <p className="text-sm text-slate-500">Residence, shop address, and emergency contact.</p>
                            </div>
                            <MapPin className="text-[#000080]" size={20} />
                        </div>

                        <div className="space-y-4">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 rounded-xl bg-[#000080]/10 p-2 text-[#000080]">
                                        <MapPin size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Shop address</p>
                                        <p className="mt-1 text-sm font-medium text-slate-800 leading-6">{userProfile.shopAddress || "No address on file"}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Phone</p>
                                    <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-900 break-words">
                                        <Phone size={14} className="text-[#000080]" />
                                        {userProfile.phone || "—"}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Payment status</p>
                                    <p className={`mt-2 inline-flex rounded-full border px-3 py-1.5 text-sm font-semibold capitalize ${paymentTone}`}>
                                        {userProfile.paymentStatus}
                                    </p>
                                </div>
                            </div>

                            {userProfile.nomineeDetails?.name ? (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Nominee</p>
                                    <div className="mt-3 space-y-1">
                                        <p className="text-sm font-semibold text-slate-900">{userProfile.nomineeDetails.name}</p>
                                        <p className="text-sm text-slate-600">{userProfile.nomineeDetails.relation || "Relation not set"}</p>
                                        <p className="text-sm text-slate-600">{userProfile.nomineeDetails.phone || "Phone not set"}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-4 text-sm text-slate-500">
                                    No nominee details have been added yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <aside className="min-w-0 space-y-6">
                    <div className="card rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
                        <div className="mb-5 flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Membership Snapshot</h2>
                                <p className="text-sm text-slate-500">A quick view of your account status and ID check.</p>
                            </div>
                            <CalendarDays className="text-[#000080]" size={20} />
                        </div>

                        <div className="space-y-3">
                            <div className={`rounded-2xl border p-4 ${statusTone}`}>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em]">Account status</p>
                                <p className="mt-1 text-lg font-bold capitalize">{userProfile.status}</p>
                            </div>
                            <div className={`rounded-2xl border p-4 ${memberIdVerified ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Member ID check</p>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <p className="font-mono text-sm font-semibold text-slate-900 break-all">{hasMemberId ? memberId : "Member ID pending"}</p>
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${memberIdVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                        {memberIdVerified ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                                        {memberIdVerified ? "Verified" : "Needs check"}
                                    </span>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Joined year</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">{memberSince}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                        <div className="card rounded-[1.5rem] border border-slate-200 bg-white p-5 text-left shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Meetings attended</p>
                            <p className="mt-2 text-3xl font-bold text-[#000080]">{attendance.length}</p>
                            <p className="mt-1 text-sm text-slate-500">Attendance summary pulled from meeting records.</p>
                        </div>
                        <div className="card rounded-[1.5rem] border border-slate-200 bg-white p-5 text-left shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Payment</p>
                            <p className={`mt-2 text-3xl font-bold capitalize ${userProfile.paymentStatus === "paid" ? "text-emerald-600" : "text-amber-500"}`}>
                                {userProfile.paymentStatus}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">Keep this updated with the admin office.</p>
                        </div>
                        <div className="card rounded-[1.5rem] border border-slate-200 bg-white p-5 text-left shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Quick contact</p>
                            <div className="mt-3 space-y-2 text-sm text-slate-700">
                                <p className="flex items-center gap-2 break-words"><Mail size={14} className="text-[#000080]" /> {userProfile.email || currentUser?.email || "—"}</p>
                                <p className="flex items-center gap-2 break-words"><Phone size={14} className="text-[#000080]" /> {userProfile.phone || "—"}</p>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default MyProfile;
