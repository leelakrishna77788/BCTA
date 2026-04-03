import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase/firebaseConfig";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";
import { Send, AlertCircle } from "lucide-react";

const RaiseComplaint: React.FC = () => {
    const { currentUser, userProfile, loading } = useAuth();
    const [description, setDescription] = useState<string>("");
    const [title, setTitle] = useState<string>("");
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [submitted, setSubmitted] = useState<boolean>(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!currentUser || !userProfile) {
            toast.error("User profile not found. Please try again.");
            return;
        }

        if (!description.trim()) {
            toast.error("Please provide a description of your complaint.");
            return;
        }

        setSubmitting(true);

        try {
            const docRef = await addDoc(collection(db, "complaints"), {
                submittedByUID: currentUser.uid,
                submittedByName: `${userProfile.name} ${userProfile.surname || ""}`.trim(),
                memberId: userProfile.memberId || "N/A",
                title: title || "Complaint",
                description,
                imageURL: "",
                status: "open",
                resolution: "",
                resolvedByUID: null,
                resolvedAt: null,
                createdAt: serverTimestamp(),
            });

            console.log("Complaint submitted with ID:", docRef.id);
            setSubmitted(true);
            toast.success("Complaint submitted successfully!");
        } catch (err: any) {
            console.error("Error submitting complaint:", err);
            toast.error(err?.message || "Failed to submit complaint.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <div className="w-10 h-10 border-4 border-blue-100 border-t-[#000080] rounded-full animate-spin mb-4" />
                <p className="text-slate-500 text-sm">Loading your profile...</p>
            </div>
        );
    }

    if (submitted) return (
        <div className="max-w-md mx-auto card text-center py-12 animate-fade-in">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Send size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Complaint Recorded</h2>
            <p className="text-slate-500 text-sm mb-8 px-6">Your issue has been logged securely. Our administrative team will review this and provide a resolution shortly.</p>
            <button onClick={() => { setSubmitted(false); setTitle(""); setDescription(""); }}
                className="btn-primary w-full max-w-xs mx-auto">Raise Another Issue</button>
        </div>
    );

    return (
        <div className="max-w-lg mx-auto space-y-6 animate-fade-in pb-12">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-1">Help & Support</h1>
                <p className="text-slate-500 font-medium">Please provide specific details about your complaint</p>
            </div>

            {!userProfile && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 text-amber-800 animate-pulse">
                    <AlertCircle className="shrink-0" />
                    <p className="text-sm">We're having trouble retrieving your membership details. Submission might be restricted.</p>
                </div>
            )}

            <div className="card shadow-2xl shadow-slate-200/50 border-none">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="label">Title (Optional)</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Brief summary of your issue"
                            className="input-field bg-slate-50 border-slate-100 focus:bg-white transition-all"
                            maxLength={100}
                        />
                    </div>

                    <div>
                        <label className="label">Detailed Description*</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            required rows={6}
                            placeholder="Please describe exactly what happened..."
                            className="input-field resize-none bg-slate-50 border-slate-100 focus:bg-white transition-all p-4 text-base"
                        />
                    </div>

                    <button type="submit" disabled={submitting || !userProfile} className="btn-primary w-full py-4 rounded-2xl text-lg shadow-xl shadow-blue-900/10 transition-all hover:scale-[1.01] active:scale-[0.98]">
                        {submitting ? (
                            <span className="flex items-center gap-3">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Transmitting...
                            </span>
                        ) : (
                            <span className="flex items-center gap-3 justify-center">
                                <Send size={20} />
                                File Complaint Securely
                            </span>
                        )}
                    </button>
                    
                    <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
                        🛡️ Your identity is verified via BCTA secure gateway
                    </p>
                </form>
            </div>
        </div>
    );
};

export default RaiseComplaint;
