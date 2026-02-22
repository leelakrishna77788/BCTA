import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, storage } from "../../firebase/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";
import { Upload, Send } from "lucide-react";

const RaiseComplaint = () => {
    const { currentUser, userProfile } = useAuth();
    const [description, setDescription] = useState("");
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleImage = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            let imageURL = "";
            if (imageFile) {
                const storageRef = ref(storage, `complaints/${currentUser.uid}/${Date.now()}`);
                await uploadBytes(storageRef, imageFile);
                imageURL = await getDownloadURL(storageRef);
            }
            await addDoc(collection(db, "complaints"), {
                raisedBy: currentUser.uid,
                memberId: userProfile.memberId,
                memberName: `${userProfile.name} ${userProfile.surname}`,
                description,
                imageURL,
                status: "open",
                createdAt: serverTimestamp(),
            });
            setSubmitted(true);
            toast.success("Complaint submitted!");
        } catch { toast.error("Failed to submit"); }
        finally { setSubmitting(false); }
    };

    if (submitted) return (
        <div className="max-w-md mx-auto card text-center py-12 animate-fade-in">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Complaint Submitted</h2>
            <p className="text-slate-500 text-sm mb-4">Your complaint has been recorded. Admin will review it shortly.</p>
            <button onClick={() => { setSubmitted(false); setDescription(""); setImagePreview(null); setImageFile(null); }}
                className="btn-secondary">Raise Another</button>
        </div>
    );

    return (
        <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
            <div>
                <h1 className="page-title mb-0">Raise a Complaint</h1>
                <p className="text-slate-500 text-sm">Describe your issue below</p>
            </div>

            <div className="card">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Description*</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            required rows={5}
                            placeholder="Describe your complaint in detail..."
                            className="input-field resize-none"
                        />
                    </div>

                    <div>
                        <label className="label">Attach Image (Optional)</label>
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-4 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="max-h-40 rounded-lg object-contain" />
                            ) : (
                                <>
                                    <Upload size={24} className="text-slate-400 mb-2" />
                                    <p className="text-sm text-slate-500">Click to upload image</p>
                                    <p className="text-xs text-slate-400 mt-0.5">JPG, PNG up to 5MB</p>
                                </>
                            )}
                            <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
                        </label>
                    </div>

                    <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2">
                        <Send size={16} /> {submitting ? "Submitting..." : "Submit Complaint"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RaiseComplaint;
