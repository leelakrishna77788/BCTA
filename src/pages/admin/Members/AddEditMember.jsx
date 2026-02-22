import React, { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { doc } from "firebase/firestore";
import { db, storage } from "../../../firebase/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";
import { Upload, ArrowLeft } from "lucide-react";
import { membersApi } from "../../../services/api";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const GENDERS = ["Male", "Female", "Other"];

const generateMemberId = () => {
    const year = new Date().getFullYear();
    const num = Math.floor(Math.random() * 900) + 100;
    return `BCTA-${year}-${num}`;
};

const AddEditMember = () => {
    const { createMember } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [photoFile, setPhotoFile] = useState(null);

    const [form, setForm] = useState({
        surname: "", name: "", age: "", gender: "Male",
        bloodGroup: "O+", email: "", password: "",
        aadhaarLast4: "", shopAddress: "",
        nomineeName: "", nomineeRelation: "", nomineePhone: "",
    });

    const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

    const handlePhoto = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.aadhaarLast4.length !== 4 || isNaN(form.aadhaarLast4)) {
            return toast.error("Aadhaar must be last 4 digits only");
        }
        setLoading(true);
        try {
            const memberId = generateMemberId();
            let photoURL = "";

            // Upload photo if provided first (so we don't have to update later if possible, but backend handles creating doc)
            // Wait, backend creates the document, so if we upload photo to a generic path or wait until uid is known.
            // Since backend is creating the UID, we should upload photo AFTER backend succeeds, then update doc.

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
            const newUid = response.member.uid;

            // Upload photo if provided
            if (photoFile) {
                const storageRef = ref(storage, `member-photos/${newUid}`);
                await uploadBytes(storageRef, photoFile);
                photoURL = await getDownloadURL(storageRef);
                const { updateDoc } = await import("firebase/firestore");
                await updateDoc(doc(db, "users", newUid), { photoURL });
            }

            toast.success(`Member ${memberId} created successfully!`);
            navigate("/admin/members");
        } catch (err) {
            toast.error(err.message || "Failed to create member");
        } finally {
            setLoading(false);
        }
    };

    const Field = ({ label, name, type = "text", placeholder, required, ...rest }) => (
        <div>
            <label className="label">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
            <input
                type={type}
                name={name}
                value={form[name]}
                onChange={handleChange}
                placeholder={placeholder}
                required={required}
                className="input-field"
                {...rest}
            />
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in pb-12 max-w-5xl mx-auto">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200/60 text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm hover:shadow-md hover:-translate-x-0.5"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="page-title mb-1 drop-shadow-sm text-3xl">Add New Member</h1>
                    <p className="text-slate-500 font-medium text-sm">Fill in the official member registration details</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Photo Upload */}
                <div className="card bg-white/60 backdrop-blur-xl border border-white shadow-xl shadow-slate-200/50 hover:shadow-xl shadow-slate-200/50 transition-shadow">
                    <h2 className="text-sm font-bold text-slate-800 mb-5 tracking-tight uppercase">Profile Photo</h2>
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-blue-100 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
                            <div className="relative w-28 h-28 rounded-[2rem] border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center bg-slate-50 shadow-inner group-hover:border-blue-300 transition-colors">
                                {photoPreview ? (
                                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-center group-hover:text-blue-500 transition-colors">
                                        <Upload size={28} className="text-slate-300 mx-auto group-hover:text-blue-400 transition-colors" />
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
                <div className="card bg-white/60 backdrop-blur-xl border border-white shadow-xl shadow-slate-200/50 hover:shadow-xl shadow-slate-200/50 transition-shadow">
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
                <div className="card bg-white/60 backdrop-blur-xl border border-white shadow-xl shadow-slate-200/50 hover:shadow-xl shadow-slate-200/50 transition-shadow">
                    <h2 className="text-sm font-bold text-slate-800 mb-6 tracking-tight uppercase">Account & Contact</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Email Address" name="email" type="email" placeholder="member@example.com" required />
                        <Field label="Temporary Password" name="password" type="password" placeholder="Minimum 6 characters" required minLength={6} />
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
                <div className="card bg-white/60 backdrop-blur-xl border border-white shadow-xl shadow-slate-200/50 hover:shadow-xl shadow-slate-200/50 transition-shadow">
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

                <div className="flex gap-4 pt-4 border-t border-slate-200/60 sticky bottom-4 bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white z-20">
                    <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1 sm:flex-none py-3 font-semibold shadow-sm">Cancel</button>
                    <button type="submit" disabled={loading} className="btn-primary flex-1 py-3 font-semibold shadow-xl shadow-slate-200/50 hover:shadow-xl shadow-slate-200/50 transition-all flex items-center justify-center gap-2">
                        {loading ? (
                            <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating Member Record...</>
                        ) : "Submit & Create Member"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddEditMember;
