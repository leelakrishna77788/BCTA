import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, UserPlus, Save, Loader2, AlertCircle, ShieldCheck, Upload } from "lucide-react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../firebase/firebaseConfig";
import { membersApi } from "../../../services/membersService";
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
                        className="w-full py-4 px-6 bg-slate-50/50 border border-slate-200/60 focus:bg-white focus:border-indigo-600 rounded-2xl font-bold text-slate-700 transition-all appearance-none cursor-pointer outline-none"
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
                    className="w-full py-4 px-6 bg-slate-50/50 border border-slate-200/60 focus:bg-white focus:border-indigo-600 rounded-2xl font-bold text-slate-700 transition-all placeholder:text-slate-300 outline-none resize-none"
                />
            ) : (
                <input
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    required={required}
                    maxLength={maxLength}
                    className="w-full py-4 px-6 bg-slate-50/50 border border-slate-200/60 focus:bg-white focus:border-indigo-600 rounded-2xl font-bold text-slate-700 transition-all placeholder:text-slate-300 outline-none"
                />
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
        aadhaarLast4: "",
        nomineeName: "",
        nomineeRelation: "",
        nomineePhone: "",
        password: "password123", // Default for new members
    });

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
        
        if (!isEdit && (form.aadhaarLast4.length !== 4 || isNaN(Number(form.aadhaarLast4)))) {
            toast.error("Aadhaar must be exactly 4 digits");
            return;
        }

        setLoading(true);
        try {
            const commonData = {
                name: form.name.trim(),
                surname: form.surname.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
                age: Number(form.age),
                gender: form.gender,
                bloodGroup: form.bloodGroup,
                shopAddress: form.shopAddress.trim(),
                aadhaarLast4: form.aadhaarLast4.trim(),
                nomineeDetails: {
                    name: form.nomineeName.trim(),
                    relation: form.nomineeRelation.trim(),
                    phone: form.nomineePhone.trim()
                }
            };

            let uid = id;

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
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in p-4 sm:p-0">
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
        <div className="space-y-6 sm:space-y-10 animate-fade-in pb-20 max-w-5xl mx-auto px-1 sm:px-0">
            {/* Header / Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl glass-card border border-white/40 text-slate-500 hover:text-indigo-600 hover:scale-105 transition-all shadow-lg"
                    >
                        <ArrowLeft size={22} strokeWidth={2.5} />
                    </button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
                            {isEdit ? "Update Profile" : "New Registration"}
                        </h1>
                        <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">
                            {isEdit ? `Record ID: ${form.memberId}` : "BCTA Official Onboarding"}
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
                {/* Photo Upload Section */}
                <div className="glass-card rounded-2xl sm:rounded-[2.5rem] border border-white/40 p-5 sm:p-10 premium-shadow relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-[0.03] text-indigo-600">
                        <Upload size={180} />
                    </div>
                    
                    <h2 className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 sm:mb-10 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                        Identification Photo
                    </h2>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-10">
                        <div className="relative group">
                            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center bg-white/50 group-hover:border-indigo-400 transition-all duration-500">
                                {photoPreview ? (
                                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-center">
                                        <Upload size={32} className="text-slate-300 mx-auto" />
                                        <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mt-2">No Photo</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 space-y-4 text-center sm:text-left">
                            <label className="inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs cursor-pointer shadow-xl shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-1 transition-all active:scale-95">
                                <Upload size={18} /> {photoPreview ? "Replace Photo" : "Upload Photo"}
                                <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                            </label>
                            <p className="text-[11px] font-bold text-slate-400 leading-relaxed max-w-sm">
                                Standard JPG/PNG supported. Square frames are recommended for optimal ID card generation.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Primary Info */}
                    <div className="lg:col-span-2 space-y-6 sm:space-y-10">
                        <div className="glass-card rounded-2xl sm:rounded-[2.5rem] border border-white/40 p-5 sm:p-10 premium-shadow relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-12 opacity-[0.02] text-indigo-600 group-hover:scale-110 transition-transform duration-1000">
                                <ShieldCheck size={180} />
                            </div>
                            
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-10 flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                Bio Details
                            </h2>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <Field label="First Name" name="name" value={form.name} onChange={handleChange} placeholder="First Name" required />
                                <Field label="Surname" name="surname" value={form.surname} onChange={handleChange} placeholder="Surname" required />
                                <Field label="Contact Number" name="phone" value={form.phone} onChange={handleChange} placeholder="+91 XXXXX XXXXX" required />
                                <Field label="Email Address" name="email" value={form.email} onChange={handleChange} type="email" placeholder="example@bcta.in" required />
                                <Field label="Age" name="age" value={form.age} onChange={handleChange} type="number" placeholder="28" required />
                                <Field label="Gender" name="gender" value={form.gender} onChange={handleChange} type="select" required options={GENDERS} />
                                <Field label="Blood Group" name="bloodGroup" value={form.bloodGroup} onChange={handleChange} type="select" required options={BLOOD_GROUPS} />
                                <Field label="Aadhaar (Last 4)" name="aadhaarLast4" value={form.aadhaarLast4} onChange={handleChange} maxLength={4} placeholder="XXXX" required />
                            </div>

                            <div className="mt-10">
                                <Field label="Shop / Residential Address" name="shopAddress" value={form.shopAddress} onChange={handleChange} type="textarea" placeholder="Complete address for official records..." required />
                            </div>
                        </div>

                        {!isEdit && (
                            <div className="glass-card bg-slate-900 border-none rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-10 text-white shadow-2xl">
                                <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-10 flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                    Secure Account Setup
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-end">
                                    <Field label="Initial Password" name="password" value={form.password || ""} onChange={handleChange} type="password" placeholder="••••••••" required />
                                    <div className="p-5 bg-white/5 rounded-2xl border border-white/10 flex gap-4">
                                        <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
                                            <ShieldCheck size={20} />
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 leading-tight">This password will be required for the member's first authentication.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Secondary Info (Nominee) */}
                    <div className="space-y-6 sm:space-y-10">
                        <div className="glass-card rounded-2xl sm:rounded-[2.5rem] border border-white/40 p-6 sm:p-10 premium-shadow relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-10">
                                Emergency Nominee
                            </h2>
                            <div className="space-y-8">
                                <Field label="Nominee Name" name="nomineeName" value={form.nomineeName} onChange={handleChange} placeholder="Full Name" required />
                                <Field label="Relationship" name="nomineeRelation" value={form.nomineeRelation} onChange={handleChange} placeholder="e.g. Spouse" required />
                                <Field label="Nominee Phone" name="nomineePhone" value={form.nomineePhone} onChange={handleChange} placeholder="Contact Details" required />
                            </div>
                            <div className="mt-10 p-6 bg-slate-50/50 rounded-2xl border border-slate-100 flex gap-4">
                                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                                    <AlertCircle size={20} />
                                </div>
                                <p className="text-[9px] font-black text-slate-400 leading-relaxed uppercase tracking-widest">Nominee records are vital for insurance and welfare protocols.</p>
                            </div>
                        </div>

                        {/* Submit Actions */}
                        <div className="flex flex-col gap-4 sticky bottom-8 pt-4">
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full py-5 rounded-4xl bg-indigo-600 text-white font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-100 hover:shadow-indigo-300 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-3"
                            >
                                {loading ? <Loader2 size={24} className="animate-spin" /> : (isEdit ? <Save size={24} /> : <UserPlus size={24} />)}
                                {loading ? "Processing..." : (isEdit ? "Update Registry" : "Onboard Member")}
                            </button>
                            <button 
                                type="button" 
                                onClick={() => navigate(-1)}
                                className="w-full py-5 rounded-4xl bg-white border border-slate-200 text-slate-500 font-black uppercase tracking-[0.2em] hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center"
                            >
                                Discard Changes
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default AddEditMember;
