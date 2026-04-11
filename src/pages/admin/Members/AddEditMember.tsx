import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    ArrowLeft,
    UserPlus,
    Save,
    Loader2,
    AlertCircle,
    ShieldCheck,
    Upload,
    BadgeCheck,
    RefreshCcw,
    User,
    Eye,
    EyeOff
} from "lucide-react";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../firebase/firebaseConfig";
import { generateSequentialMemberId, membersApi } from "../../../services/membersService";
import type { Gender, BloodGroup } from "../../../types/member.types";
import LoadingSkeleton, { CardSkeleton } from "../../../components/shared/LoadingSkeleton";

interface FormState {
    name: string;
    surname: string;
    email: string;
    phone: string;
    age: string;
    gender: Gender;
    bloodGroup: BloodGroup;
    shopAddress: string;
    aadhaarFull: string;
    aadhaarLast4: string;
    nomineeName: string;
    nomineeRelation: string;
    nomineePhone: string;
    password?: string;
    memberId?: string;
}

const BLOOD_GROUPS: { value: BloodGroup; label: string }[] = [
    { value: "A+", label: "A+" },
    { value: "A-", label: "A-" },
    { value: "B+", label: "B+" },
    { value: "B-", label: "B-" },
    { value: "O+", label: "O+" },
    { value: "O-", label: "O-" },
    { value: "AB+", label: "AB+" },
    { value: "AB-", label: "AB-" }
];

const GENDERS: { value: Gender; label: string }[] = [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "other", label: "Other" }
];

const Field: React.FC<{
    label: string;
    name: keyof FormState;
    value: string;
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    type?: string;
    placeholder?: string;
    required?: boolean;
    options?: { value: string; label: string }[];
    maxLength?: number;
}> = ({ label, name, value, onChange, type = "text", placeholder, required = false, options, maxLength }) => {
    const isTextArea = type === "textarea";
    const isSelect = type === "select";
    const isPassword = type === "password";
    const [showSecret, setShowSecret] = useState(false);

    return (
        <div className="space-y-2 group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 group-focus-within:text-indigo-600 transition-colors">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
            {isSelect ? (
                <div className="relative">
                    <select
                        name={name}
                        value={value}
                        onChange={onChange}
                        required={required}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none ring-[#000080] focus:ring-1 appearance-none cursor-pointer"
                    >
                        <option value="">Select {label}</option>
                        {options?.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-30 text-slate-400">
                        <ArrowLeft size={16} className="-rotate-90" />
                    </div>
                </div>
            ) : isTextArea ? (
                <textarea
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    required={required}
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none ring-[#000080] focus:ring-1 resize-none"
                />
            ) : (
                <div className="relative">
                    <input
                        type={isPassword && showSecret ? "text" : type}
                        name={name}
                        value={value}
                        onChange={onChange}
                        placeholder={placeholder}
                        required={required}
                        maxLength={maxLength}
                        className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none ring-[#000080] focus:ring-1 ${isPassword ? "pr-10" : ""}`}
                    />
                    {isPassword && (
                        <button
                            type="button"
                            onClick={() => setShowSecret((prev) => !prev)}
                            className="absolute inset-y-0 right-2 inline-flex items-center text-slate-500 hover:text-slate-700"
                            aria-label={showSecret ? "Hide password" : "Show password"}
                        >
                            {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

const AddEditMember: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEdit = Boolean(id);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEdit);
    const [memberIdLoading, setMemberIdLoading] = useState(false);
    const [showAadhaar, setShowAadhaar] = useState(false);
    
    // Photo state
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const [form, setForm] = useState<FormState>({
        name: "",
        surname: "",
        email: "",
        phone: "",
        age: "",
        gender: "",
        bloodGroup: "",
        shopAddress: "",
        aadhaarFull: "",
        aadhaarLast4: "",
        nomineeName: "",
        nomineeRelation: "",
        nomineePhone: "",
        password: "password123", // Default for new members
        memberId: "",
    });

    const profileTitle = isEdit ? "Update Member" : "Create Member";

    const assignNextMemberId = async (showToast = false) => {
        if (isEdit) return;
        setMemberIdLoading(true);
        try {
            const nextId = await generateSequentialMemberId();
            setForm((prev) => ({ ...prev, memberId: nextId }));
            if (showToast) toast.success(`Generated ID: ${nextId}`);
        } catch (error) {
            console.error("Member ID generation error:", error);
            const message = error instanceof Error
                ? error.message
                : "Unable to generate member ID. Please retry.";
            toast.error(message);
        } finally {
            setMemberIdLoading(false);
        }
    };

    useEffect(() => {
        if (isEdit && id) {
            const fetchMember = async () => {
                try {
                    const snap = await getDoc(doc(db, "users", id));
                    if (snap.exists()) {
                        const d = snap.data();
                        setForm({
                            name: d.name || "",
                            surname: d.surname || "",
                            email: d.email || "",
                            phone: d.phone || "",
                            age: String(d.age || ""),
                            gender: d.gender || "",
                            bloodGroup: d.bloodGroup || "",
                            shopAddress: d.shopAddress || "",
                            aadhaarFull: "",
                            aadhaarLast4: d.aadhaarLast4 || "",
                            nomineeName: d.nomineeDetails?.name || "",
                            nomineeRelation: d.nomineeDetails?.relation || "",
                            nomineePhone: d.nomineeDetails?.phone || "",
                            memberId: d.memberId
                        });
                        if (d.photoURL) setPhotoPreview(d.photoURL);
                    } else {
                        toast.error("Member not found");
                        navigate("/admin/members");
                    }
                } catch (err) {
                    console.error("Fetch member error:", err);
                    toast.error("Failed to load member profile");
                } finally {
                    setFetching(false);
                }
            };
            fetchMember();
        }
    }, [id, isEdit, navigate]);

    useEffect(() => {
        if (!isEdit) {
            assignNextMemberId();
        }
    }, [isEdit]);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm(p => ({ ...p, [name]: value }));
    };

    const handlePhoto = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const aadhaarDigits = form.aadhaarFull.replace(/\D/g, "");
        if (!isEdit && aadhaarDigits.length !== 12) {
            toast.error("Please enter full 12-digit Aadhaar number.");
            return;
        }

        if (isEdit && aadhaarDigits.length > 0 && aadhaarDigits.length !== 12) {
            toast.error("If updating Aadhaar, please enter all 12 digits.");
            return;
        }

        setLoading(true);
        try {
            const resolvedMemberId = isEdit ? form.memberId : (form.memberId || await generateSequentialMemberId());
            const resolvedAadhaarLast4 = aadhaarDigits.length === 12
                ? aadhaarDigits.slice(-4)
                : form.aadhaarLast4.trim();

            if (!/^\d{4}$/.test(resolvedAadhaarLast4)) {
                toast.error("Aadhaar last 4 digits are invalid.");
                return;
            }

            const commonData = {
                name: form.name.trim(),
                surname: form.surname.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
                age: Number(form.age),
                gender: form.gender,
                bloodGroup: form.bloodGroup,
                shopAddress: form.shopAddress.trim(),
                aadhaarLast4: resolvedAadhaarLast4,
                memberId: resolvedMemberId,
                nomineeDetails: {
                    name: form.nomineeName.trim(),
                    relation: form.nomineeRelation.trim(),
                    phone: form.nomineePhone.trim()
                }
            };

            if (isEdit && id) {
                await updateDoc(doc(db, "users", id), {
                    ...commonData,
                    updatedAt: serverTimestamp()
                });
                
                // Photo upload for edit
                if (photoFile) {
                    const storageRef = ref(storage, `member-photos/${id}`);
                    await uploadBytes(storageRef, photoFile);
                    const photoURL = await getDownloadURL(storageRef);
                    await updateDoc(doc(db, "users", id), { photoURL });
                }
                
                toast.success("Profile updated successfully!");
                navigate(`/admin/members/${id}`);
            } else {
                const response = await membersApi.create({
                    ...commonData,
                    memberId: resolvedMemberId,
                    password: form.password || "password123"
                });
                const newUid = response.member?.uid;
                
                // Photo upload for create
                if (photoFile && newUid) {
                    const storageRef = ref(storage, `member-photos/${newUid}`);
                    await uploadBytes(storageRef, photoFile);
                    const photoURL = await getDownloadURL(storageRef);
                    await updateDoc(doc(db, "users", newUid), { photoURL });
                }
                
                toast.success("Member successfully registered!");
                navigate("/admin/members");
            }
        } catch (err: any) {
            console.error("Submit error:", err);
            toast.error(err.message || "Failed to process record");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return (
        <div className="mx-auto w-full max-w-6xl space-y-6 p-0 animate-fade-in">
            <div className="flex items-center gap-6">
                <LoadingSkeleton width="56px" height="56px" borderRadius="1.25rem" />
                <div className="space-y-2">
                    <LoadingSkeleton width="240px" height="2.5rem" />
                    <LoadingSkeleton width="340px" height="1.25rem" />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <CardSkeleton />
                <CardSkeleton />
            </div>
        </div>
    );

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6 px-3 sm:px-0 animate-fade-in pb-14">
            <section className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-[#0a1f5e] via-[#183b9a] to-[#2b62d4] p-5 text-white shadow-xl sm:p-8">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.22),_transparent_46%)]" />
                <div className="pointer-events-none absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/10 text-white transition hover:bg-white/20"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div className="min-w-0">
                            <p className="text-xs uppercase tracking-[0.2em] text-white/75">Members</p>
                            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{profileTitle}</h1>
                            <p className="mt-1 text-xs text-white/80">
                                {isEdit ? "Update member details and nominee records" : "Create a member profile with an auto-generated ID"}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">Member ID</p>
                            <p className="mt-1 font-semibold text-white break-all">{form.memberId || (memberIdLoading ? "Generating..." : "Pending")}</p>
                        </div>
                        <div className="rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">Mode</p>
                            <p className="mt-1 font-semibold text-white">{isEdit ? "Edit Existing Member" : "New Registration"}</p>
                        </div>
                    </div>
                </div>
            </section>

            <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.85fr)]">
                <div className="min-w-0 space-y-6">
                    <div className="card rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Personal Details</h2>
                                <p className="text-sm text-slate-500">Identity, contact and onboarding information.</p>
                            </div>
                            <User className="text-[#000080]" size={20} />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="First Name" name="name" value={form.name} onChange={handleChange} placeholder="First Name" required />
                            <Field label="Surname" name="surname" value={form.surname} onChange={handleChange} placeholder="Surname" required />
                            <Field label="Contact Number" name="phone" value={form.phone} onChange={handleChange} placeholder="+91 XXXXX XXXXX" required />
                            <Field label="Email Address" name="email" value={form.email} onChange={handleChange} type="email" placeholder="example@bcta.in" required />
                            <Field label="Age" name="age" value={form.age} onChange={handleChange} type="number" placeholder="28" required />
                            <Field label="Gender" name="gender" value={form.gender} onChange={handleChange} type="select" required options={GENDERS} />
                            <Field label="Blood Group" name="bloodGroup" value={form.bloodGroup} onChange={handleChange} type="select" required options={BLOOD_GROUPS} />
                            <div className="space-y-2 group">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 group-focus-within:text-indigo-600 transition-colors">
                                    Aadhaar Number (12 Digits) <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showAadhaar ? "text" : "password"}
                                        inputMode="numeric"
                                        value={form.aadhaarFull}
                                        onChange={(e) => {
                                            const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
                                            setForm((prev) => ({ ...prev, aadhaarFull: digits }));
                                        }}
                                        placeholder={isEdit ? "Enter 12 digits only to update" : "Enter 12-digit Aadhaar"}
                                        required={!isEdit}
                                        maxLength={12}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm text-slate-800 outline-none ring-[#000080] focus:ring-1"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowAadhaar((prev) => !prev)}
                                        className="absolute inset-y-0 right-2 inline-flex items-center text-slate-500 hover:text-slate-700"
                                        aria-label={showAadhaar ? "Hide Aadhaar number" : "Show Aadhaar number"}
                                    >
                                        {showAadhaar ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    Visible format: {form.aadhaarFull.length > 0
                                        ? `XXXXXXXX${form.aadhaarFull.slice(-4).padStart(4, "X")}`
                                        : (form.aadhaarLast4 ? `XXXXXXXX${form.aadhaarLast4}` : "XXXXXXXX0000")}
                                </p>
                            </div>
                        </div>

                        <div className="mt-4">
                            <Field
                                label="Shop / Residential Address"
                                name="shopAddress"
                                value={form.shopAddress}
                                onChange={handleChange}
                                type="textarea"
                                placeholder="Complete address for official records..."
                                required
                            />
                        </div>
                    </div>

                    {!isEdit && (
                        <div className="card rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Account Setup</h2>
                                    <p className="text-sm text-slate-500">Password and member ID are set during onboarding.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => assignNextMemberId(true)}
                                    disabled={memberIdLoading || loading}
                                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {memberIdLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                                    Regenerate ID
                                </button>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Generated Member ID</p>
                                    <p className="mt-2 text-base font-semibold text-slate-900">{form.memberId || "Generating..."}</p>
                                </div>
                                <Field
                                    label="Initial Password"
                                    name="password"
                                    value={form.password || ""}
                                    onChange={handleChange}
                                    type="password"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-6 xl:sticky xl:top-6 self-start">
                    <div className="card rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
                        <div className="mb-5 flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Photo & Nominee</h2>
                                <p className="text-sm text-slate-500">Emergency contact and profile image.</p>
                            </div>
                            <ShieldCheck className="text-[#000080]" size={20} />
                        </div>

                        <div className="mb-5 flex flex-wrap items-center gap-4">
                            <div className="h-20 w-20 overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50">
                                {photoPreview ? (
                                    <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-slate-300">
                                        <Upload size={22} />
                                    </div>
                                )}
                            </div>
                            <label className="inline-flex w-full sm:w-auto cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#000080] px-3 py-2 text-xs font-semibold text-white hover:bg-[#000066]">
                                <Upload size={14} /> {photoPreview ? "Replace Photo" : "Upload Photo"}
                                <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                            </label>
                        </div>

                        <div className="space-y-4">
                            <Field label="Nominee Name" name="nomineeName" value={form.nomineeName} onChange={handleChange} placeholder="Full Name" required />
                            <Field label="Relationship" name="nomineeRelation" value={form.nomineeRelation} onChange={handleChange} placeholder="e.g. Spouse" required />
                            <Field label="Nominee Phone" name="nomineePhone" value={form.nomineePhone} onChange={handleChange} placeholder="Contact Details" required />
                        </div>

                        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2">
                            <AlertCircle size={14} className="mt-0.5 shrink-0" />
                            Nominee details are used for emergency and welfare support.
                        </div>
                    </div>

                    <div className="card rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
                        <div className="space-y-3">
                            <button
                                type="submit"
                                disabled={loading || memberIdLoading}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#000080] px-4 py-3 text-sm font-semibold text-white hover:bg-[#000066] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : (isEdit ? <Save size={16} /> : <UserPlus size={16} />)}
                                {loading ? "Processing..." : (isEdit ? "Update Member" : "Create Member")}
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                disabled={loading}
                                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Cancel
                            </button>
                        </div>

                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                            <div className="flex items-center gap-2 font-semibold text-slate-700">
                                <BadgeCheck size={14} className="text-[#000080]" />
                                Auto Member ID
                            </div>
                            <p className="mt-1 break-all">{form.memberId || "Will be generated before submit."}</p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default AddEditMember;
