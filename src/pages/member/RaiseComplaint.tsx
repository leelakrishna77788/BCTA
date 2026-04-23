import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase/firebaseConfig";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";
import { Send, AlertCircle } from "lucide-react";

const RaiseComplaint: React.FC = () => {
    const { currentUser, userProfile, loading } = useAuth();
    const { t } = useTranslation();
    const [description, setDescription] = useState<string>("");
    const [title, setTitle] = useState<string>("");
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [submitted, setSubmitted] = useState<boolean>(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentUser || !userProfile) {
            toast.error(t("complaint.toastProfileNotFound"));
            return;
        }

        if (!description.trim()) {
            toast.error(t("complaint.toastProvideDescription"));
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
            toast.success(t("complaint.toastSuccess"));
        } catch (err: any) {
            console.error("Error submitting complaint:", err);
            toast.error(err?.message || t("complaint.toastFailed"));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <div className="w-10 h-10 border-4 border-indigo-100 border-t-[#4f46e5] rounded-full animate-spin mb-4" />
                <p className="text-slate-500 text-sm">{t("complaint.loadingProfile")}</p>
            </div>
        );
    }

    if (submitted) return (
        <div className="max-w-md mx-auto card text-center py-12 animate-fade-in">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Send size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">{t("complaint.complaintRecorded")}</h2>
            <p className="text-slate-500 text-sm mb-8 px-6">{t("complaint.issueLogged")}</p>
            <button onClick={() => { setSubmitted(false); setTitle(""); setDescription(""); }}
                className="btn-primary w-full max-w-xs mx-auto">{t("complaint.raiseAnother")}</button>
        </div>
    );

    return (
        <div className="w-full max-w-lg mx-auto px-4 sm:px-0 flex flex-col animate-fade-in md:pt-8" style={{ minHeight: "calc(100vh - 10rem)" }}>
            <div className="text-center mb-4">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-1">{t("complaint.helpSupport")}</h1>
                <p className="text-slate-500 text-sm sm:text-base font-medium">{t("complaint.provideDetails")}</p>
            </div>

            {!userProfile && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 text-amber-800 animate-pulse mb-4">
                    <AlertCircle className="shrink-0" />
                    <p className="text-sm">{t("complaint.profileWarning")}</p>
                </div>
            )}

            <div className="card shadow-xl shadow-slate-200/50 border-none flex-1 flex flex-col">
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-4">
                    <div>
                        <label className="label">{t("complaint.titleOptional")}</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder={t("complaint.titlePlaceholder")}
                            className="input-field bg-slate-50 border-slate-100 focus:bg-white transition-all"
                            maxLength={100}
                        />
                    </div>

                    <div className="flex flex-col flex-1">
                        <label className="label">{t("complaint.detailedDescription")}</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            required
                            placeholder={t("complaint.descPlaceholder")}
                            className="input-field resize-none bg-slate-50 border-slate-100 focus:bg-white transition-all p-4 text-base flex-1 h-0"
                        />
                    </div>

                    <button type="submit" disabled={submitting || !userProfile} className="btn-primary w-full py-3 sm:py-4 rounded-2xl text-base sm:text-lg shadow-xl shadow-indigo-900/10 transition-all hover:scale-[1.01] active:scale-[0.98]">
                        {submitting ? (
                            <span className="flex items-center gap-3">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                {t("complaint.transmitting")}
                            </span>
                        ) : (
                            <span className="flex items-center gap-3 justify-center">
                                <Send size={20} />
                                {t("complaint.fileComplaint")}
                            </span>
                        )}
                    </button>

                    <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
                        {t("complaint.secureGateway")}
                    </p>
                </form>
            </div>
        </div>
    );
};

export default RaiseComplaint;
