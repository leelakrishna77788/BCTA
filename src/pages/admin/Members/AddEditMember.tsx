import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useAuth } from "../../../context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db, storage } from "../../../firebase/firebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Upload, ArrowLeft, Loader2 } from "lucide-react";
import LoadingSkeleton, { CardSkeleton } from "../../../components/shared/LoadingSkeleton";
import { membersApi } from "../../../services/membersService";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const GENDERS = ["Male", "Female", "Other"];

const generateMemberId = () => {
    const year = new Date().getFullYear();
    const num = Math.floor(Math.random() * 900) + 100;
    return `BCTA-${year}-${num}`;
};

interface FormData {
    surname: string;
    name: string;
    age: string;
    gender: string;
    bloodGroup: string;
    email: string;
    password?: string;
    aadhaarLast4: string;
    shopAddress: string;
    nomineeName: string;
    nomineeRelation: string;
    nomineePhone: string;
    [key: string]: any;
}

const AddEditMember: React.FC = () => {
    useAuth();
    const navigate = useNavigate();
    const { id } = useParams<{ id?: string }>();
    const isEditMode = Boolean(id);
    
    const [loading, setLoading] = useState<boolean>(false);
    const [fetchingMember, setFetchingMember] = useState<boolean>(isEditMode);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [existingPhotoURL, setExistingPhotoURL] = useState<string | null>(null);
    const [memberUid, setMemberUid] = useState<string | null>(null);

    const [form, setForm] = useState<FormData>({
        surname: "", name: "", age: "", gender: "Male",
        bloodGroup: "O+", email: "", password: "",
        aadhaarLast4: "", shopAddress: "",
        nomineeName: "", nomineeRelation: "", nomineePhone: "",
    });

    // Fetch member data if in edit mode
    useEffect(() => {
        if (!isEditMode || !id) return;

        const fetchMember = async () => {
            setFetchingMember(true);
            try {
                let memberDoc = null;
                
                // Try to get by document ID first
                const docRef = doc(db, "users", id);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    memberDoc = docSnap;
                    setMemberUid(docSnap.id);
                } else {
                    // Try to find by memberId
                    const { collection, query, where, getDocs } = await import("firebase/firestore");
                    const q = query(collection(db, "users"), where("memberId", "==", id));
                    const qSnap = await getDocs(q);
                    
                    if (!qSnap.empty) {
                        memberDoc = qSnap.docs[0];
                        setMemberUid(memberDoc.id);
                    }
                }

                if (memberDoc) {
                    const data = memberDoc.data();
                    setForm({
                        surname: data.surname || "",
                        name: data.name || "",
                        age: data.age?.toString() || "",
                        gender: data.gender || "Male",
                        bloodGroup: data.bloodGroup || "O+",
                        email: data.email || "",
                        password: "", // Don't prefill password for security
                        aadhaarLast4: data.aadhaarLast4 || "",
                        shopAddress: data.shopAddress || "",
                        nomineeName: data.nomineeDetails?.name || "",
                        nomineeRelation: data.nomineeDetails?.relation || "",
                        nomineePhone: data.nomineeDetails?.phone || "",
                    });
                    if (data.photoURL) {
                        setPhotoPreview(data.photoURL);
                        setExistingPhotoURL(data.photoURL);
                    }
                    toast.success("Member data loaded for editing");
                } else {
                    toast.error("Member not found");
                    navigate("/admin/members");
                }
            } catch (err: any) {
                console.error("Error fetching member:", err);
                toast.error("Failed to load member data");
            } finally {
                setFetchingMember(false);
            }
        };

        fetchMember();
    }, [isEditMode, id, navigate]);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => 
        setForm(p => ({ ...p, [e.target.name]: e.target.value }));

    const handlePhoto = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        
        if (!isEditMode && (form.aadhaarLast4.length !== 4 || isNaN(Number(form.aadhaarLast4)))) {
            toast.error("Aadhaar must be last 4 digits only");
            return;
        }
        
        if (!isEditMode && (!form.password || form.password.length < 6)) {
            toast.error("Password must be at least 6 characters");
            return;
        }
        
        setLoading(true);
        try {
            if (isEditMode && memberUid) {
                // UPDATE EXISTING MEMBER
                const { updateDoc } = await import("firebase/firestore");
                const memberId = id;

                const updatePayload: any = {
                    surname: form.surname,
                    name: form.name,
                    age: parseInt(form.age),
                    gender: form.gender,
                    bloodGroup: form.bloodGroup,
                    email: form.email,
                    shopAddress: form.shopAddress,
                    nomineeDetails: {
                        name: form.nomineeName,
                        relation: form.nomineeRelation,
                        phone: form.nomineePhone,
                    }
                };

                await updateDoc(doc(db, "users", memberUid), updatePayload);

                // Upload new photo if changed
                if (photoFile) {
                    const storageRef = ref(storage, `member-photos/${memberUid}`);
                    await uploadBytes(storageRef, photoFile);
                    const newPhotoURL = await getDownloadURL(storageRef);
                    await updateDoc(doc(db, "users", memberUid), { photoURL: newPhotoURL });
                }

                toast.success("Member updated successfully!");
                navigate("/admin/members");
            } else {
                // CREATE NEW MEMBER
                const memberId = generateMemberId();
                let photoURL = "";

                const payload = {
                    surname: form.surname,
                    name: form.name,
                    age: parseInt(form.age),
                    gender: form.gender,
                    bloodGroup: form.bloodGroup,
                    email: form.email,
                    password: form.password,
                    aadhaarLast4: form.aadhaarLast4,
                    shopAddress: form.shopAddress,
                    memberId: memberId,
                    nomineeDetails: {
                        name: form.nomineeName,
                        relation: form.nomineeRelation,
                        phone: form.nomineePhone,
                    }
                };

                const response = await membersApi.create(payload);
                const newUid = response.member?.uid;

                // Upload photo if provided
                if (photoFile && newUid) {
                    const storageRef = ref(storage, `member-photos/${newUid}`);
                    await uploadBytes(storageRef, photoFile);
                    photoURL = await getDownloadURL(storageRef);
                    const { updateDoc } = await import("firebase/firestore");
                    await updateDoc(doc(db, "users", newUid), { photoURL });
                }

                toast.success(`Member ${memberId} created successfully!`);
                // Reset form to add another member
                setForm({
                    surname: "", name: "", age: "", gender: "Male",
                    bloodGroup: "O+", email: "", password: "",
                    aadhaarLast4: "", shopAddress: "",
                    nomineeName: "", nomineeRelation: "", nomineePhone: "",
                });
                setPhotoPreview(null);
                setPhotoFile(null);
            }
        } catch (err: any) {
            toast.error(err.message || `Failed to ${isEditMode ? "update" : "create"} member`);
        } finally {
            setLoading(false);
        }
    };

    interface FieldProps {
        label: string;
        name: string;
        type?: string;
        placeholder?: string;
        required?: boolean;
        minLength?: number;
        max?: string;
        min?: string;
        maxLength?: number;
    }

    const Field: React.FC<FieldProps> = ({ label, name, type = "text", placeholder, required, ...rest }) => (
        <div>
            <label className="label">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
            <input
                type={type}
                name={name}
                value={form[name] || ""}
                onChange={handleChange}
                placeholder={placeholder}
                required={required}
                className="input-field"
                {...rest}
            />
        </div>
    );

    if (fetchingMember) {
        return (
            <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
                <div className="flex items-center gap-4">
                    <LoadingSkeleton width="40px" height="40px" borderRadius="0.75rem" />
                    <div>
                        <LoadingSkeleton width="200px" height="2rem" />
                        <LoadingSkeleton width="300px" height="1rem" className="mt-2" />
                    </div>
                </div>
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in pb-12 max-w-5xl mx-auto">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200/60 text-slate-500 hover:text-[#000080] hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md hover:-translate-x-0.5"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="page-title mb-1 drop-shadow-sm text-3xl">
                        {isEditMode ? "Edit Member" : "Add New Member"}
                    </h1>
                    <p className="text-slate-500 font-medium text-sm">
                        {isEditMode ? "Update member registration details" : "Fill in the official member registration details"}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Photo Upload */}
                <div className="card bg-white border border-slate-200 shadow-sm rounded-xl transition-shadow">
                    <h2 className="text-sm font-bold text-slate-800 mb-5 tracking-tight uppercase">Profile Photo</h2>
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-slate-100 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
                            <div className="relative w-28 h-28 rounded-[2rem] border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center bg-slate-50 shadow-inner group-hover:border-slate-300 transition-colors">
                                {photoPreview ? (
                                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-center group-hover:text-[#000080] transition-colors">
                                        <Upload size={28} className="text-slate-300 mx-auto group-hover:text-[#000080] transition-colors" />
                                        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mt-2">Upload</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="btn-secondary cursor-pointer inline-flex items-center gap-2 shadow-sm font-semibold text-sm">
                                <Upload size={16} /> Choose Photo
                                <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                            </label>
                            <p className="text-[11px] font-medium text-slate-400 mt-2 ml-1">JPG, PNG up to 5MB (Square aspect ratio recommended)</p>
                        </div>
                    </div>
                </div>

                {/* Personal Information */}
                <div className="card bg-white border border-slate-200 shadow-sm rounded-xl transition-shadow">
                    <h2 className="text-sm font-bold text-slate-800 mb-6 tracking-tight uppercase">Personal Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <Field label="Surname" name="surname" placeholder="e.g. Sharma" required />
                        <Field label="Given Name" name="name" placeholder="e.g. Ravi" required />
                        <Field label="Age" name="age" type="number" placeholder="e.g. 30" required min="18" max="80" />
                        <div>
                            <label className="label">Gender<span className="text-red-500 ml-1">*</span></label>
                            <div className="relative">
                                <select name="gender" value={form.gender} onChange={handleChange} className="input-field appearance-none pr-10" required>
                                    {GENDERS.map(g => <option key={g}>{g}</option>)}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="label">Blood Group<span className="text-red-500 ml-1">*</span></label>
                            <div className="relative">
                                <select name="bloodGroup" value={form.bloodGroup} onChange={handleChange} className="input-field appearance-none pr-10 font-bold text-slate-700" required>
                                    {BLOOD_GROUPS.map(b => <option key={b}>{b}</option>)}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="label flex items-center justify-between">
                                <span>Aadhaar (Last 4) <span className="text-red-500 ml-1">*</span></span>
                                <span className="text-[10px] text-slate-400 font-normal lowercase bg-slate-100 px-1.5 py-0.5 rounded">masked</span>
                            </label>
                            <input
                                type="text"
                                name="aadhaarLast4"
                                value={form.aadhaarLast4}
                                onChange={handleChange}
                                maxLength={4}
                                placeholder="XXXX"
                                required
                                className="input-field font-mono tracking-[0.5em] font-bold text-center placeholder:tracking-normal placeholder:font-sans"
                            />
                        </div>
                    </div>
                </div>

                {/* Account & Shop */}
                <div className="card bg-white border border-slate-200 shadow-sm rounded-xl transition-shadow">
                    <h2 className="text-sm font-bold text-slate-800 mb-6 tracking-tight uppercase">Account & Contact</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Email Address" name="email" type="email" placeholder="member@example.com" required />
                        <Field label="Temporary Password" name="password" type="password" placeholder={isEditMode ? "Leave blank to keep current" : "Minimum 6 characters"} minLength={isEditMode ? 0 : 6} />
                        <div className="md:col-span-2">
                            <label className="label">Registered Shop Address</label>
                            <textarea
                                name="shopAddress"
                                value={form.shopAddress}
                                onChange={handleChange}
                                rows={2}
                                placeholder="Full shop address including street and landmarks..."
                                className="input-field resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Nominee Details */}
                <div className="card bg-white border border-slate-200 shadow-sm rounded-xl transition-shadow">
                    <h2 className="text-sm font-bold text-slate-800 mb-6 tracking-tight uppercase flex items-center justify-between">
                        <span>Nominee Details</span>
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded normal-case font-medium">Optional</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <Field label="Nominee Name" name="nomineeName" placeholder="Full name of nominee" />
                        <Field label="Relation" name="nomineeRelation" placeholder="e.g. Wife, Son, Brother" />
                        <Field label="Contact Phone" name="nomineePhone" type="tel" placeholder="10-digit number" />
                    </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-slate-200/60 sticky bottom-4 bg-white p-4 rounded-xl shadow-md border border-slate-200 z-20">
                    <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1 sm:flex-none py-3 font-semibold shadow-sm">Cancel</button>
                    <button type="submit" disabled={loading} className="btn-primary flex-1 py-3 font-semibold shadow-xl shadow-slate-200/50 hover:shadow-xl shadow-slate-200/50 transition-all flex items-center justify-center gap-2">
                        {loading ? (
                            <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />{isEditMode ? "Updating..." : "Creating..."}</>
                        ) : isEditMode ? "Save Changes" : "Submit & Create Member"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddEditMember;
