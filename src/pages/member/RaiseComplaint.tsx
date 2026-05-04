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
            <div className="flex-1 flex items-center justify-center overflow-hidden">
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-[3px] border-indigo-100 border-t-[var(--primary-vivid)] rounded-full animate-spin mb-5" />
                    <p className="text-slate-400 text-sm font-medium">{t("complaint.loadingProfile")}</p>
                </div>
            </div>
        );
    }

    if (submitted) return (
        <div className="flex-1 flex items-center justify-center overflow-hidden animate-fade-in">
            <div className="w-full max-w-sm sm:max-w-md mx-auto">
                <div className="bg-white rounded-2xl p-8 sm:p-10 text-center"
                     style={{ boxShadow: 'var(--shadow-xl), 0 0 0 1px rgba(0,0,0,0.03)' }}>
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Send size={36} />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight mb-2">{t("complaint.complaintRecorded")}</h2>
                    <p className="text-slate-500 text-sm sm:text-base mb-8 leading-relaxed">{t("complaint.issueLogged")}</p>
                    <button onClick={() => { setSubmitted(false); setTitle(""); setDescription(""); }}
                        className="btn-primary w-full py-3.5 rounded-2xl text-base">{t("complaint.raiseAnother")}</button>
                </div>
            </div>
        </div>
    );

    return (
        /* ── Parent: fills viewport, no scroll ── */
        <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">

            {/* ── Header (pinned) ── */}
            <div className="shrink-0 text-center py-4 sm:py-5">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-1.5">
                    {t("complaint.helpSupport")}
                </h1>
                <p className="text-slate-400 text-sm sm:text-base font-medium">
                    {t("complaint.provideDetails")}
                </p>
            </div>

            {/* ── Profile Warning (pinned) ── */}
            {!userProfile && (
                <div className="shrink-0 max-w-sm sm:max-w-md lg:max-w-lg mx-auto w-full mb-4">
                    <div className="bg-amber-50/80 border border-amber-200/60 p-4 rounded-2xl flex gap-3 items-start text-amber-800">
                        <AlertCircle className="shrink-0 mt-0.5" size={20} />
                        <p className="text-sm leading-relaxed">{t("complaint.profileWarning")}</p>
                    </div>
                </div>
            )}

            {/* ── Card container (fills remaining space) ── */}
            <div className="flex-1 min-h-0 flex flex-col max-w-sm sm:max-w-md lg:max-w-lg mx-auto w-full md:-translate-y-10 transition-transform duration-300">
                <div className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl transition-shadow duration-300 overflow-hidden"
                     style={{ boxShadow: 'var(--shadow-lg), 0 0 0 1px rgba(0,0,0,0.03)' }}>

                    {/* ── Scrollable form content ── */}
                    <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
                        <div className="flex-1 overflow-y-auto p-5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 scrollbar-hide">
                            {/* Title Input */}
                            <div>
                                <label className="label">{t("complaint.titleOptional")}</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder={t("complaint.titlePlaceholder")}
                                    className="input-field py-3.5 bg-slate-50/80 border-slate-200/60 focus:bg-white focus:border-[var(--border-focus)] focus:ring-2 focus:ring-indigo-500/10 rounded-xl transition-all duration-200"
                                    maxLength={100}
                                />
                            </div>

                            {/* Description Textarea */}
                            <div>
                                <label className="label">{t("complaint.detailedDescription")}</label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    required
                                    rows={5}
                                    placeholder={t("complaint.descPlaceholder")}
                                    className="input-field resize-none py-3.5 bg-slate-50/80 border-slate-200/60 focus:bg-white focus:border-[var(--border-focus)] focus:ring-2 focus:ring-indigo-500/10 rounded-xl transition-all duration-200 text-base leading-relaxed"
                                />
                            </div>
                        </div>

                        {/* ── CTA (pinned at bottom of card) ── */}
                        <div className="shrink-0 px-5 sm:px-6 lg:px-8 pb-5 sm:pb-6 lg:pb-8 pt-3 space-y-3 border-t border-slate-100/60">
                            <button
                                type="submit"
                                disabled={submitting || !userProfile}
                                className="btn-primary w-full py-4 rounded-2xl text-base sm:text-lg font-bold tracking-wide transition-all duration-200 hover:scale-[1.01] active:scale-[0.98]"
                                style={{ boxShadow: 'var(--shadow-lg), 0 4px 20px -4px rgba(79,70,229,0.3)' }}
                            >
                                {submitting ? (
                                    <span className="flex items-center gap-3 justify-center">
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

                            <p className="text-[10px] text-center text-slate-300 font-bold uppercase tracking-widest">
                                {t("complaint.secureGateway")}
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RaiseComplaint;
