import React, { useEffect, useRef, useState } from "react";
import { doc, getDoc, updateDoc, collection, getDocs, query, where, Timestamp, DocumentData } from "firebase/firestore";
import { db } from "../../../firebase/firebaseConfig";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
    ArrowLeft, Edit, UserX, UserCheck, Phone, MapPin,
    Droplet, CreditCard, Activity,
    ShieldCheck, Mail, AlertTriangle, Package, Trash2, X, QrCode, Download,
    BadgeCheck, CheckCircle2, CalendarDays
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { membersApi } from "../../../services/membersService";
import LoadingSkeleton, { CardSkeleton } from "../../../components/shared/LoadingSkeleton";
import { useTranslation } from "react-i18next";

interface MemberDoc extends DocumentData {
    id: string;
    status?: string;
    photoURL?: string;
    name?: string;
    surname?: string;
    memberId?: string;
    email?: string;
    phone?: string;
    bloodGroup?: string;
    age?: number | string;
    paymentStatus?: string;
    shopAddress?: string;
    createdAt?: Timestamp;
    nomineeDetails?: {
        name: string;
        relation: string;
        phone: string;
    };
}

interface ProductDoc extends DocumentData {
    totalAmount?: number;
    paidAmount?: number;
    remainingAmount?: number;
    productName?: string;
    quantity?: number;
    distributedAt?: Timestamp;
}

const MEMBER_ID_PATTERN = /^BCTA-\d{4}-\d+$/;

const escapeHtml = (value: string) => value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");

const MemberDetail: React.FC = () => {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const idCardRef = useRef<HTMLDivElement>(null);
    const [member, setMember] = useState<MemberDoc | null>(null);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [products, setProducts] = useState<ProductDoc[]>([]);
    const [meetings, setMeetings] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [showID, setShowID] = useState<boolean>(false);
    const [isDownloadingID, setIsDownloadingID] = useState<boolean>(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                setLoading(true);
                let memberData: MemberDoc | null = null;
                const memberSnap = await getDoc(doc(db, "users", id));

                if (memberSnap.exists()) {
                    memberData = { id: memberSnap.id, ...memberSnap.data() } as MemberDoc;
                } else {
                    const qMember = query(collection(db, "users"), where("memberId", "==", id));
                    const qSnap = await getDocs(qMember);
                    if (!qSnap.empty) {
                        const foundDoc = qSnap.docs[0];
                        memberData = { id: foundDoc.id, ...foundDoc.data() } as MemberDoc;
                    }
                }

                if (memberData) {
                    // Start parallel data fetches
                    const canonicalId = memberData.id;
                    const now = new Date();
                    const currentMonth = now.getMonth() + 1;
                    const currentYear = now.getFullYear();

                    // Parallel execution to maintain performance
                    const [paymentSnap, attSnap, prodSnap, meetSnap] = await Promise.allSettled([
                        getDocs(query(collection(db, "payments"), where("memberUID", "==", canonicalId), where("month", "==", currentMonth), where("year", "==", currentYear))),
                        getDocs(query(collection(db, "attendance"), where("memberUID", "==", canonicalId))),
                        getDocs(query(collection(db, "products"), where("memberUID", "==", canonicalId))),
                        getDocs(collection(db, "meetings"))
                    ]);

                    // Assign dynamic paymentStatus based on whether a payment record exists for current month
                    if (paymentSnap.status === 'fulfilled') {
                        memberData.paymentStatus = !paymentSnap.value.empty ? "paid" : "unpaid";
                    } else {
                        memberData.paymentStatus = "unpaid"; // fallback if error
                    }
                    
                    setMember(memberData);

                    if (attSnap.status === 'fulfilled') {
                        setAttendance(attSnap.value.docs.map((d) => d.data()));
                    } else {
                        console.error("Attendance fetch error:", attSnap.reason);
                    }

                    if (prodSnap.status === 'fulfilled') {
                        setProducts(prodSnap.value.docs.map((d) => d.data() as ProductDoc));
                    } else {
                        console.error("Products fetch error:", prodSnap.reason);
                    }

                    if (meetSnap.status === 'fulfilled') {
                        setMeetings(meetSnap.value.docs.map((d) => ({ id: d.id, ...d.data() })));
                    } else {
                        console.error("Meetings fetch error:", meetSnap.reason);
                    }
                }
            } catch (err) {
                console.error("Profile load error:", err);
                toast.error(t("addEditMember.errors.fetchFailed"));
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    // Lock background scroll while Digital ID modal is open.
    useEffect(() => {
        if (!showID) return;

        const scrollY = window.scrollY;
        const previousBodyOverflow = document.body.style.overflow;
        const previousBodyPosition = document.body.style.position;
        const previousBodyTop = document.body.style.top;
        const previousBodyLeft = document.body.style.left;
        const previousBodyRight = document.body.style.right;
        const previousBodyWidth = document.body.style.width;
        const previousHtmlOverflow = document.documentElement.style.overflow;

        // Freeze page exactly where it is (prevents background movement on mobile).
        document.body.style.overflow = "hidden";
        document.body.style.position = "fixed";
        document.body.style.top = `-${scrollY}px`;
        document.body.style.left = "0";
        document.body.style.right = "0";
        document.body.style.width = "100%";
        document.documentElement.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousBodyOverflow;
            document.body.style.position = previousBodyPosition;
            document.body.style.top = previousBodyTop;
            document.body.style.left = previousBodyLeft;
            document.body.style.right = previousBodyRight;
            document.body.style.width = previousBodyWidth;
            document.documentElement.style.overflow = previousHtmlOverflow;
            window.scrollTo(0, scrollY);
        };
    }, [showID]);

    const toggleBlock = () => {
        if (!member) return;
        const previousStatus = member.status;
        const newStatus = previousStatus === "active" ? "blocked" : "active";

        const updatePayload: any = { status: newStatus };
        let actionText = newStatus === "active" ? "unblocked" : "blocked";

        if (previousStatus === "pending" && newStatus === "active") {
            const year = new Date().getFullYear();
            const num = Math.floor(Math.random() * 900) + 100;
            updatePayload.memberId = `BCTA-${year}-${num}`;
            actionText = "approved";
        }

        setMember((p) => (p ? { ...p, ...updatePayload } : null));
        
        let toastMsg = "";
        if (actionText === "approved") toastMsg = t("memberList.memberApproved");
        else if (actionText === "blocked") toastMsg = t("memberDetail.toastBlocked");
        else if (actionText === "unblocked") toastMsg = t("memberDetail.toastUnblocked");
        toast.success(toastMsg || `Member ${actionText}`);

        (async () => {
            try {
                const memberRef = doc(db, "users", member.id);
                await updateDoc(memberRef, updatePayload);
                if (newStatus === "blocked") {
                    await membersApi.revokeTokens(member.id);
                }
            } catch (err) {
                console.error("Block/unblock failed:", err);
                setMember((p) => (p ? { ...p, status: previousStatus } : null));
                toast.error(t("memberList.updateFailed"));
            }
        })();
    };

    const handleDelete = () => {
        if (!member) return;
        if (!window.confirm(t("memberDetail.deleteConfirm"))) return;

        toast.success(t("memberList.blocking")); // Reusing blocking string for background process msg
        navigate("/admin/members");

        membersApi.delete(member.id).then(() => {
            toast.success(t("memberDetail.toastDeleted"));
        }).catch((err: any) => {
            console.error("Deletion failed:", err);
            toast.error(err.message || t("memberDetail.toastDeleteFailed"));
        });
    };

    const handlePrintID = () => {
        console.log("PRINT CLICKED");
        console.log("REF:", idCardRef.current);

        const buildCaptureCanvas = async () => {
            if (!idCardRef.current || !member) return null;

            const qrSvg = idCardRef.current.querySelector("svg")?.outerHTML || "";
            const fullNameSafe = escapeHtml(`${member.name || ""} ${member.surname || ""}`.trim() || "Member");
            const memberIdSafe = escapeHtml(member.memberId || "MEMBER ID PENDING");
            const statusSafe = escapeHtml(member.status || "unknown");
            const yearSafe = escapeHtml(String(memberSince));
            const photoUrl = member.photoURL || "";

            const host = document.createElement("div");
            host.style.position = "fixed";
            host.style.left = "-99999px";
            host.style.top = "0";
            host.style.width = "420px";
            host.style.height = "auto";
            host.style.zIndex = "-1";
            host.style.pointerEvents = "none";
            host.style.background = "#ffffff";

            host.innerHTML = `
                <div style="all: initial; box-sizing: border-box; width: 420px; border-radius: 24px; overflow: hidden; border: 1px solid #1e293b; background: #020617; color: #ffffff; font-family: Arial, Helvetica, sans-serif;">
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; border-bottom:1px solid rgba(255,255,255,0.12);">
                        <div style="display:flex; align-items:center; gap:8px; min-width:0;">
                            <div style="width:30px; height:30px; border-radius:8px; background:rgba(255,255,255,0.12);"></div>
                            <div style="min-width:0;">
                                <div style="font-size:10px; font-weight:800; letter-spacing:0.16em; text-transform:uppercase; color:#e2e8f0; white-space:nowrap;">BCTA MEMBER</div>
                                <div style="font-size:10px; font-weight:600; color:#94a3b8;">${t("memberDetail.digitalIdentityPass")}</div>
                            </div>
                        </div>
                        <div style="font-size:10px; font-weight:700; color:#34d399; border:1px solid rgba(255,255,255,0.12); border-radius:999px; padding:4px 8px; background:rgba(255,255,255,0.1);">${t("memberDetail.verified")}</div>
                    </div>

                    <div style="padding:16px;">
                        <div style="display:flex; gap:14px; align-items:flex-start;">
                            <div style="width:88px; height:88px; border-radius:16px; overflow:hidden; border:1px solid rgba(255,255,255,0.15); background:#1e1b4b; color:#fff; display:flex; align-items:center; justify-content:center; font-size:30px; font-weight:700; text-transform:uppercase;">
                                ${photoUrl ? `<img src="${photoUrl}" crossorigin="anonymous" referrerpolicy="no-referrer" style="width:100%; height:100%; object-fit:cover;"/>` : escapeHtml((member.name?.[0] || "M").toUpperCase())}
                            </div>
                            <div style="flex:1; min-width:0;">
                                <div style="font-size:22px; font-weight:800; color:#ffffff; line-height:1.15; word-break:break-word;">${fullNameSafe}</div>
                                <div style="margin-top:6px; font-size:11px; font-weight:800; letter-spacing:0.12em; text-transform:uppercase; color:#a5b4fc; word-break:break-all;">${memberIdSafe}</div>
                                <div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">
                                    <span style="font-size:10px; font-weight:600; color:#e2e8f0; border:1px solid rgba(255,255,255,0.2); background:rgba(255,255,255,0.1); border-radius:999px; padding:2px 8px; text-transform:capitalize;">${statusSafe}</span>
                                    <span style="font-size:10px; font-weight:600; color:#e2e8f0; border:1px solid rgba(255,255,255,0.2); background:rgba(255,255,255,0.1); border-radius:999px; padding:2px 8px;">${yearSafe}</span>
                                </div>
                            </div>
                        </div>

                        <div style="display:flex; justify-content:center; margin-top:16px;">
                            <div style="border-radius:16px; border:1px solid rgba(255,255,255,0.2); background:#ffffff; padding:14px;">
                                ${qrSvg || `<div style='width:140px; height:140px; display:flex; align-items:center; justify-content:center; color:#0f172a; font-size:12px;'>QR</div>`}
                            </div>
                        </div>

                        <div style="margin-top:14px; text-align:center; font-size:9px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:rgba(255,255,255,0.45);">${t("memberDetail.securedThrough")}</div>
                        <div style="margin-top:4px; text-align:center; font-size:9px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:rgba(255,255,255,0.45);">${t("memberDetail.validForYear", { year: new Date().getFullYear() })}</div>
                    </div>
                    <div style="height:6px; background:linear-gradient(90deg, #1e1b4b, #4f46e5, #1e1b4b);"></div>
                </div>
            `;

            document.body.appendChild(host);
            try {
                const { default: html2canvas } = await import("html2canvas");
                return await html2canvas(host.firstElementChild as HTMLElement, {
                    backgroundColor: "#ffffff",
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    logging: false,
                });
            } finally {
                host.remove();
            }
        };

        const runPrint = async () => {
            if (!idCardRef.current) return;
            try {
                const canvas = await buildCaptureCanvas();
                if (!canvas) return;

                const printWindow = window.open("", "_blank", "width=900,height=1200");
                if (!printWindow) {
                    alert("Popup blocked!");
                    toast.error(t("common.popupBlocked"));
                    return;
                }

                const imageData = canvas.toDataURL("image/png");
                printWindow.document.write(`
                    <!doctype html>
                    <html>
                        <head>
                            <meta charset="utf-8" />
                            <title>BCTA Digital ID</title>
                            <style>
                                html, body { margin: 0; padding: 0; background: #ffffff; }
                                body { display: flex; justify-content: center; align-items: flex-start; padding: 20px; }
                                img { width: 420px; max-width: 100%; height: auto; display: block; }
                                @media print {
                                    @page { size: A4 portrait; margin: 10mm; }
                                    body { padding: 0; }
                                    img { width: 420px; }
                                }
                            </style>
                        </head>
                        <body>
                            <img id="printCard" src="${imageData}" alt="BCTA Digital ID" />
                            <script>
                                (function () {
                                    var card = document.getElementById('printCard');
                                    var printed = false;

                                    function runPrint() {
                                        if (printed) return;
                                        printed = true;
                                        window.focus();
                                        window.print();
                                    }

                                    if (card && card.complete) {
                                        runPrint();
                                    } else if (card) {
                                        card.addEventListener('load', runPrint, { once: true });
                                        card.addEventListener('error', runPrint, { once: true });
                                    } else {
                                        runPrint();
                                    }

                                    window.addEventListener('afterprint', function () {
                                        window.close();
                                    }, { once: true });
                                })();
                            </script>
                        </body>
                    </html>
                `);
                printWindow.document.close();
            } catch (error) {
                console.error("Print failed:", error);
                toast.error(t("memberDetail.toastPrintFailed") || "Failed to print ID card");
            }
        };

        void runPrint();
    };

    const handleDownloadID = async () => {
        console.log("DOWNLOAD CLICKED");
        console.log("REF:", idCardRef.current);

        if (!idCardRef.current) return;

        const buildCaptureCanvas = async () => {
            if (!idCardRef.current || !member) return null;

            const qrSvg = idCardRef.current.querySelector("svg")?.outerHTML || "";
            const fullNameSafe = escapeHtml(`${member.name || ""} ${member.surname || ""}`.trim() || "Member");
            const memberIdSafe = escapeHtml(member.memberId || "MEMBER ID PENDING");
            const statusSafe = escapeHtml(member.status || "unknown");
            const yearSafe = escapeHtml(String(memberSince));
            const photoUrl = member.photoURL || "";

            const host = document.createElement("div");
            host.style.position = "fixed";
            host.style.left = "-99999px";
            host.style.top = "0";
            host.style.width = "420px";
            host.style.height = "auto";
            host.style.zIndex = "-1";
            host.style.pointerEvents = "none";
            host.style.background = "#ffffff";

            host.innerHTML = `
                <div style="all: initial; box-sizing: border-box; width: 420px; border-radius: 24px; overflow: hidden; border: 1px solid #1e293b; background: #020617; color: #ffffff; font-family: Arial, Helvetica, sans-serif;">
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; border-bottom:1px solid rgba(255,255,255,0.12);">
                        <div style="display:flex; align-items:center; gap:8px; min-width:0;">
                            <div style="width:30px; height:30px; border-radius:8px; background:rgba(255,255,255,0.12);"></div>
                            <div style="min-width:0;">
                                <div style="font-size:10px; font-weight:800; letter-spacing:0.16em; text-transform:uppercase; color:#e2e8f0; white-space:nowrap;">BCTA MEMBER</div>
                                <div style="font-size:10px; font-weight:600; color:#94a3b8;">${t("memberDetail.digitalIdentityPass")}</div>
                            </div>
                        </div>
                        <div style="font-size:10px; font-weight:700; color:#34d399; border:1px solid rgba(255,255,255,0.12); border-radius:999px; padding:4px 8px; background:rgba(255,255,255,0.1);">${t("memberDetail.verified")}</div>
                    </div>

                    <div style="padding:16px;">
                        <div style="display:flex; gap:14px; align-items:flex-start;">
                            <div style="width:88px; height:88px; border-radius:16px; overflow:hidden; border:1px solid rgba(255,255,255,0.15); background:#1e1b4b; color:#fff; display:flex; align-items:center; justify-content:center; font-size:30px; font-weight:700; text-transform:uppercase;">
                                ${photoUrl ? `<img src="${photoUrl}" crossorigin="anonymous" referrerpolicy="no-referrer" style="width:100%; height:100%; object-fit:cover;"/>` : escapeHtml((member.name?.[0] || "M").toUpperCase())}
                            </div>
                            <div style="flex:1; min-width:0;">
                                <div style="font-size:22px; font-weight:800; color:#ffffff; line-height:1.15; word-break:break-word;">${fullNameSafe}</div>
                                <div style="margin-top:6px; font-size:11px; font-weight:800; letter-spacing:0.12em; text-transform:uppercase; color:#a5b4fc; word-break:break-all;">${memberIdSafe}</div>
                                <div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">
                                    <span style="font-size:10px; font-weight:600; color:#e2e8f0; border:1px solid rgba(255,255,255,0.2); background:rgba(255,255,255,0.1); border-radius:999px; padding:2px 8px; text-transform:capitalize;">${statusSafe}</span>
                                    <span style="font-size:10px; font-weight:600; color:#e2e8f0; border:1px solid rgba(255,255,255,0.2); background:rgba(255,255,255,0.1); border-radius:999px; padding:2px 8px;">${yearSafe}</span>
                                </div>
                            </div>
                        </div>

                        <div style="display:flex; justify-content:center; margin-top:16px;">
                            <div style="border-radius:16px; border:1px solid rgba(255,255,255,0.2); background:#ffffff; padding:14px;">
                                ${qrSvg || `<div style='width:140px; height:140px; display:flex; align-items:center; justify-content:center; color:#0f172a; font-size:12px;'>QR</div>`}
                            </div>
                        </div>

                        <div style="margin-top:14px; text-align:center; font-size:9px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:rgba(255,255,255,0.45);">${t("memberDetail.securedThrough")}</div>
                        <div style="margin-top:4px; text-align:center; font-size:9px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:rgba(255,255,255,0.45);">${t("memberDetail.validForYear", { year: new Date().getFullYear() })}</div>
                    </div>
                    <div style="height:6px; background:linear-gradient(90deg, #1e1b4b, #4f46e5, #1e1b4b);"></div>
                </div>
            `;

            document.body.appendChild(host);
            try {
                const { default: html2canvas } = await import("html2canvas");
                return await html2canvas(host.firstElementChild as HTMLElement, {
                    backgroundColor: "#ffffff",
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    logging: false,
                });
            } finally {
                host.remove();
            }
        };

        try {
            setIsDownloadingID(true);
            const canvas = await buildCaptureCanvas();
            if (!canvas) return;
            const safeName = `${member?.name || "member"}-${member?.surname || "id"}`.replace(/\s+/g, "-").toLowerCase();
            const fileName = `${safeName}-digital-id.png`;

            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob((result) => {
                    if (result) resolve(result);
                    else reject(new Error("Unable to generate image blob"));
                }, "image/png");
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 1000);

            toast.success(t("memberDetail.idCardDownloaded"));
        } catch (error) {
            console.error("Download failed:", error);
            toast.error(t("memberDetail.toastDownloadFailed") || "Failed to download ID card");
        } finally {
            setIsDownloadingID(false);
        }
    };

    if (loading) {
        return (
            <div className="mx-auto w-full max-w-6xl space-y-6 px-3 sm:px-0 animate-fade-in">
                <LoadingSkeleton height="2rem" width="220px" className="mb-2" />
                <div className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
                    <CardSkeleton />
                    <CardSkeleton />
                </div>
                <div className="card space-y-4">
                    <LoadingSkeleton height="1rem" width="35%" />
                    <LoadingSkeleton height="220px" borderRadius="1rem" />
                </div>
            </div>
        );
    }

    if (!member) return (
        <div className="max-w-6xl mx-auto p-8 text-center min-h-[60vh] flex items-center justify-center">
            <div className="card shadow-2xl border border-slate-200/60 p-12 max-w-lg bg-white rounded-3xl">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <AlertTriangle size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">{t("memberDetail.recordNotFound")}</h2>
                <p className="text-slate-500 mb-8 font-medium leading-relaxed">{t("memberDetail.recordNotFoundDesc")}</p>
                <button onClick={() => navigate("/admin/members")} className="btn-primary w-full py-4 text-base shadow-xl shadow-slate-200 hover:shadow-slate-300 transition-all font-bold rounded-2xl">
                    {t("memberDetail.backToDirectory")}
                </button>
            </div>
        </div>
    );

    const totalSpent = products.reduce((s, p) => s + (p.totalAmount || 0), 0);
    const totalPaid = products.reduce((s, p) => s + (p.paidAmount || 0), 0);
    const totalDue = products.reduce((s, p) => s + (p.remainingAmount || 0), 0);
    const attendanceRate = meetings.length > 0 ? Math.round((attendance.length / meetings.length) * 100) : 0;
    const paymentProgress = totalSpent > 0 ? Math.round((totalPaid / totalSpent) * 100) : 100;
    const fullName = `${member.name ?? ""} ${member.surname ?? ""}`.trim();
    const memberId = member.memberId?.trim() || "";
    const hasMemberId = memberId.length > 0;
    const memberIdVerified = hasMemberId && MEMBER_ID_PATTERN.test(memberId);
    const profileInitial = (member.name?.[0] ?? member.email?.[0] ?? "M").toUpperCase();
    const memberSince = member.createdAt && typeof member.createdAt.toDate === "function"
        ? member.createdAt.toDate().getFullYear()
        : new Date().getFullYear();
    const derivedPaymentStatus = member.paymentStatus || (totalDue <= 0 ? "paid" : "unpaid");
    const statusTone = member.status === "active"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-red-50 text-red-700 border-red-200";
    const paymentTone = derivedPaymentStatus === "paid"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-amber-50 text-amber-700 border-amber-200";

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6 p-0 animate-fade-in pb-20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t("memberDetail.profileTitle")}</h1>
                        <p className="text-sm text-slate-500">{t("memberDetail.profileSubtitle")}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/admin/members/${member.id}/edit`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        <Edit size={14} /> {t("memberDetail.editMember")}
                    </Link>
                    <button
                        onClick={() => setShowID(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        <QrCode size={14} /> {t("memberDetail.digitalId")}
                    </button>
                    {member.status === "pending" ? (
                        <button onClick={toggleBlock} className="inline-flex items-center gap-1.5 rounded-lg bg-[#000080] px-3 py-2 text-xs font-semibold text-white hover:bg-[#000066]">
                            <UserCheck size={14} /> {t("memberList.approve")}
                        </button>
                    ) : (
                        <button
                            onClick={toggleBlock}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${member.status === "active" ? "border border-red-200 bg-white text-red-700 hover:bg-red-50" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                        >
                            {member.status === "active" ? <><UserX size={14} /> {t("memberDetail.blockMember")}</> : <><UserCheck size={14} /> {t("memberDetail.unblockMember")}</>}
                        </button>
                    )}
                    <button
                        onClick={handleDelete}
                        className="h-9 w-9 flex items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>

            <section className="relative overflow-hidden rounded-4xl border border-blue-100 bg-linear-to-br from-[#0a1f5e] via-[#183b9a] to-[#2b62d4] p-5 text-white shadow-xl sm:p-8">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_46%)]" />
                <div className="pointer-events-none absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
                <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.95fr)] lg:items-center">
                    <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
                        {/* Mobile: centered avatar, SM+: left-aligned */}
                        <div className="flex justify-center sm:justify-start">
                            {member.photoURL ? (
                                <img
                                    src={member.photoURL}
                                    alt={t("common.userProfile")}
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
                                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{fullName || member.name}</h2>
                                <p className="text-sm text-white/80">{member.email || t("memberDetail.noEmail")}</p>
                            </div>

                            {/* Mobile: blood + member ID + member since, SM+: add active status */}
                            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold" style={{...(statusTone ? {borderColor: 'inherit'} : {})}}>
                                    <ShieldCheck size={12} /> {member.status || "unknown"}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs">
                                    <Droplet size={10} className="sm:w-3 sm:h-3" /> {member.bloodGroup || t("memberDetail.bloodGroup")}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs">
                                    <BadgeCheck size={10} className="sm:w-3 sm:h-3" /> {hasMemberId ? memberId : t("memberDetail.memberIdStatus")}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white sm:hidden">
                                    <CalendarDays size={10} /> {memberSince}
                                </span>
                            </div>

                            {/* Mobile hidden, SM+ visible */}
                            <div className="hidden sm:flex flex-wrap items-center gap-2 text-xs text-white/70">
                                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold ${memberIdVerified ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-100" : "border-amber-300/40 bg-amber-400/10 text-amber-100"}`}>
                                    {memberIdVerified ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                                    {memberIdVerified ? t("memberDetail.verified") : t("memberDetail.needsCheck")}
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 font-semibold text-white/80">
                                    {t("memberList.joinedOn")} {memberSince}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Mobile: 3 columns compact, SM: 2 cols, LG: 3 cols */}
                    <div className="grid gap-2 grid-cols-3 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
                        <div className="rounded-2xl border border-white/15 bg-white/10 p-2.5 backdrop-blur sm:p-4">
                            <p className="text-[9px] uppercase tracking-[0.18em] text-white/60 sm:text-xs">{t("memberDetail.attendanceInfo")}</p>
                            <p className="mt-1 text-xl font-bold sm:text-3xl">{attendance.length}</p>
                            <p className="mt-0.5 text-[9px] text-white/65 sm:text-xs">{t("memberDetail.attendedCount")}</p>
                        </div>
                        <div className="rounded-2xl border border-white/15 bg-white/10 p-2.5 backdrop-blur sm:p-4">
                            <p className="text-[9px] uppercase tracking-[0.18em] text-white/60 sm:text-xs">{t("memberList.payment")}</p>
                            <p className={`mt-1 text-lg font-bold capitalize sm:text-2xl ${derivedPaymentStatus === "paid" ? "text-emerald-300" : "text-amber-300"}`}>
                                {t(`paymentsDash.filter${derivedPaymentStatus.charAt(0).toUpperCase() + derivedPaymentStatus.slice(1)}`)}
                            </p>
                            <p className="mt-0.5 text-[9px] text-white/65 sm:text-xs">{t("memberDetail.accountStatus")}</p>
                        </div>
                        <div className="rounded-2xl border border-white/15 bg-white/10 p-2.5 backdrop-blur sm:p-4 sm:col-span-2 xl:col-span-1">
                            <p className="text-[9px] uppercase tracking-[0.18em] text-white/60 sm:text-xs">{t("memberDetail.memberSince")}</p>
                            <p className="mt-1 text-xl font-bold sm:text-3xl">{memberSince}</p>
                            <p className="mt-0.5 text-[9px] text-white/65 sm:text-xs">{t("memberList.status")}</p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.85fr)]">
                <div className="min-w-0 space-y-6">
                    <div className="card rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">{t("memberDetail.personalDetails")}</h2>
                                <p className="text-sm text-slate-500">{t("memberDetail.personalDesc")}</p>
                            </div>
                            <Activity className="text-[#000080]" size={20} />
                        </div>

                        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {[
                                { label: t("memberDetail.memberId"), value: hasMemberId ? memberId : t("common.pending"), icon: BadgeCheck },
                                { label: t("memberDetail.fullName"), value: fullName || "-" },
                                { label: t("memberDetail.age"), value: member.age ? t("memberDetail.ageValue", { age: member.age }) : "-" },
                                { label: t("memberDetail.bloodGroup"), value: member.bloodGroup || "-", icon: Droplet },
                                { label: t("memberList.meetings"), value: member.email || "-", icon: Mail }, // email but icon says meeting? wait. Icon: Mail.
                                { label: t("addMember.phone"), value: member.phone || "-", icon: Phone },
                                { label: t("memberDetail.aadhaarNumber"), value: member.aadhaarLast4 ? `XXXXXXXX${member.aadhaarLast4}` : "-", icon: ShieldCheck },
                                { label: t("memberDetail.attendanceInfo"), value: `${attendance.length} / ${meetings.length || 0} ${t("memberList.meetings")}` },
                                { label: t("memberDetail.balanceDue"), value: `${t("memberDetail.rs")} ${totalDue.toLocaleString()}`, icon: CreditCard },
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                        <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                            {Icon ? <Icon size={13} className="text-[#000080]" /> : null}
                                            {item.label}
                                        </dt>
                                        <dd className="mt-2 text-sm font-semibold text-slate-900 wrap-break-word">{item.value}</dd>
                                    </div>
                                );
                            })}
                        </dl>
                    </div>

                    <div className="card rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-base font-bold text-slate-900">{t("memberDetail.shopAndNominee")}</h2>
                                <p className="text-xs text-slate-500">{t("memberDetail.shopNomineeDesc")}</p>
                            </div>
                            <MapPin className="text-[#000080]" size={18} />
                        </div>

                        <div className="space-y-2.5">
                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                                <div className="flex items-start gap-2.5">
                                    <div className="mt-0.5 rounded-lg bg-[#000080]/10 p-2 text-[#000080]">
                                        <MapPin size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-1.5">{t("addMember.shopAddress")}</p>
                                        <p className="text-xs font-medium text-slate-800 leading-5 line-clamp-2">{member.shopAddress || t("memberDetail.noAddress")}</p>
                                    </div>
                                </div>
                            </div>

                            {member.nomineeDetails?.name ? (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">{t("memberDetail.nomineeDetails")}</p>
                                    <div className="space-y-1.5">
                                        <div>
                                            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{t("addMember.firstName")}</p>
                                            <p className="text-xs font-semibold text-slate-900 mt-0.5">{member.nomineeDetails.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{t("memberDetail.relationship")}</p>
                                            <p className="text-xs font-semibold text-slate-600 mt-0.5">{member.nomineeDetails.relation || t("common.pending")}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{t("memberDetail.contactInfo")}</p>
                                            <p className="text-xs font-semibold text-slate-600 mt-0.5">{member.nomineeDetails.phone || t("common.pending")}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-3 text-xs text-slate-500">
                                    {t("memberDetail.noNominee")}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <aside className="min-w-0 space-y-6">
                    <div className="card rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-base font-bold text-slate-900">{t("memberDetail.membershipSnapshot")}</h2>
                                <p className="text-xs text-slate-500">{t("memberDetail.membershipSnapshotDesc")}</p>
                            </div>
                            <CalendarDays className="text-[#000080]" size={18} />
                        </div>

                        <div className="space-y-2.5">
                            <div className={`rounded-xl border p-3 ${memberIdVerified ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{t("memberDetail.memberIdCheck")}</p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                    <p className="font-mono text-xs font-semibold text-slate-900 break-all">{hasMemberId ? memberId : t("common.pending")}</p>
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${memberIdVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                        {memberIdVerified ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                                        {t(`memberDetail.${memberIdVerified ? "verified" : "needsCheck"}`)}
                                    </span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className={`rounded-xl border p-3 ${statusTone}`}>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">{t("memberDetail.accountStatus")}</p>
                                    <p className="mt-1 text-base font-bold capitalize">{member.status || "unknown"}</p>
                                </div>
                                <div className={`rounded-xl border p-3 ${paymentTone}`}>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">{t("memberDetail.paymentStatus")}</p>
                                    <p className="mt-1 text-base font-bold capitalize">{t(`paymentsDash.filter${derivedPaymentStatus.charAt(0).toUpperCase() + derivedPaymentStatus.slice(1)}`)}</p>
                                </div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{t("memberDetail.joinedYear")}</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">{memberSince}</p>
                            </div>
                        </div>
                    </div>

                    <div className="card rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-base font-bold text-slate-900">{t("memberDetail.activityContact")}</h2>
                                <p className="text-xs text-slate-500">{t("memberDetail.activityContactDesc")}</p>
                            </div>
                            <Activity className="text-[#000080]" size={18} />
                        </div>

                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{t("memberDetail.meetingsAttended")}</p>
                                    <p className="mt-1.5 text-2xl font-bold text-[#000080]">{attendance.length}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{t("memberDetail.paymentsCollected")}</p>
                                    <p className="mt-1.5 text-2xl font-bold text-emerald-600">{t("memberDetail.rs")} {totalPaid.toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">{t("memberDetail.quickContact")}</p>
                                <div className="space-y-1.5 text-xs text-slate-700">
                                    <p className="flex items-center gap-1.5 wrap-break-word"><Mail size={12} className="text-[#000080] shrink-0" /> {member.email || "-"}</p>
                                    <p className="flex items-center gap-1.5 wrap-break-word"><Phone size={12} className="text-[#000080] shrink-0" /> {member.phone || "-"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {showID && member && (
                <div className="fixed inset-0 z-100 bg-white/70 backdrop-blur-md animate-fade-in overflow-hidden overscroll-none">
                    <div className="h-full w-full flex items-start justify-center overflow-hidden">
                        <div className="w-full max-w-88 sm:max-w-96 md:max-w-104 relative overflow-hidden scale-[0.9] sm:scale-100 origin-top">
                            <button
                                onClick={() => setShowID(false)}
                                className="absolute top-2.5 right-2.5 text-white/70 hover:text-white transition-colors z-50 p-1.5 bg-white/10 rounded-full"
                                aria-label={t("memberDetail.closeDigitalId")}
                            >
                                <X size={18} />
                            </button>

                            <div className="relative group animate-scale-up">
                                <div className="absolute inset-0 bg-conic-to-r from-white via-slate-100 to-white rounded-[2.1rem] animate-spin-slow opacity-50 blur-sm" />

                                <div ref={idCardRef} className="card p-0! overflow-hidden bg-black border border-white/10 shadow-2xl rounded-[1.6rem] relative" style={{ backgroundColor: "#020617", color: "#ffffff" }}>
                                    <div className="p-2 sm:p-2.5 pr-10 sm:pr-12 flex items-center justify-between border-b border-white/5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                                            <div className="w-4 h-4 bg-indigo-500 rounded-sm rotate-45" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-white/80 uppercase tracking-[0.2em]">{t("common.bctaMember")}</p>
                                            <p className="text-[10px] font-semibold text-white/55">{t("memberDetail.digitalIdentityPass")}</p>
                                        </div>
                                    </div>
                                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold bg-white/10 text-emerald-300 border border-white/10">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                        {t("memberDetail.verified")}
                                    </span>
                                </div>

                                <div className="p-4 sm:p-5">
                                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:gap-5">
                                        <div className="shrink-0">
                                            <div className="w-18 h-18 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-white/10 bg-[#1e1b4b] flex items-center justify-center text-white font-bold text-2xl sm:text-3xl">
                                                {member.photoURL ? (
                                                    <img src={member.photoURL} alt={t("common.userProfile")} className="w-full h-full object-cover" />
                                                ) : (
                                                    member.name?.[0]
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex-1 flex flex-col justify-center min-w-0">
                                            <h3 className="text-base sm:text-lg font-black text-white tracking-tight wrap-break-word leading-tight">
                                                {member.name} {member.surname}
                                            </h3>
                                            <p className="mt-1 text-[10px] sm:text-xs font-black text-indigo-300 uppercase tracking-[0.14em] break-all">
                                                {member.memberId || t("memberDetail.memberIdStatus")}
                                            </p>
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                <span className="text-[9px] font-semibold text-white/80 border border-white/15 bg-white/10 rounded-full px-2 py-0.5">
                                                    {t("common." + (member.status || "unknown"))}
                                                </span>
                                                <span className="text-[9px] font-semibold text-white/80 border border-white/15 bg-white/10 rounded-full px-2 py-0.5">
                                                    {memberSince}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-center mb-4">
                                        <div className="rounded-2xl border border-white/10 bg-white p-3.5 sm:p-5 shadow-sm">
                                            <div className="sm:hidden">
                                                <QRCodeSVG
                                                    value={JSON.stringify({ type: "member", uid: member.id, memberId: member.memberId })}
                                                    size={108}
                                                    level="H"
                                                    includeMargin={false}
                                                    fgColor="#1e1b4b"
                                                />
                                            </div>
                                            <div className="hidden sm:block">
                                                <QRCodeSVG
                                                    value={JSON.stringify({ type: "member", uid: member.id, memberId: member.memberId })}
                                                    size={140}
                                                    level="H"
                                                    includeMargin={false}
                                                    fgColor="#1e1b4b"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-center">
                                        <p className="text-[8px] text-white/35 font-bold uppercase tracking-[0.14em]">
                                            {t("memberDetail.securedThrough")}
                                        </p>
                                        <p className="text-[8px] text-white/35 font-bold uppercase tracking-[0.14em] mt-0.5">
                                            {t("memberDetail.validForYear", { year: new Date().getFullYear() })}
                                        </p>
                                    </div>
                                </div>
                                <div className="h-1.5 bg-linear-to-r from-[#1e1b4b] via-indigo-600 to-[#1e1b4b] opacity-90" />
                                </div>
                            </div>

                            <div className="mt-2 grid grid-cols-3 gap-2 pb-1">
                                <button onClick={handlePrintID} className="min-w-0 w-full h-9 sm:h-10 px-1.5 sm:px-2 bg-white text-slate-800 rounded-lg font-bold text-[9px] sm:text-[10px] uppercase tracking-[0.08em] leading-none transition-all border border-slate-300 hover:bg-slate-50">
                                    <span className="truncate block sm:hidden">{t("common.print")}</span>
                                    <span className="truncate hidden sm:block">{t("memberList.printPass")}</span>
                                </button>
                                <button
                                    onClick={handleDownloadID}
                                    disabled={isDownloadingID}
                                    className="min-w-0 w-full h-9 sm:h-10 px-1.5 sm:px-2 bg-slate-900 text-white rounded-lg font-bold text-[9px] sm:text-[10px] uppercase tracking-[0.08em] leading-none transition-all border border-slate-900 inline-flex items-center justify-center gap-1 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    <Download size={11} className="shrink-0" />
                                    <span className="truncate sm:hidden">{isDownloadingID ? t("common.saving") : t("common.save")}</span>
                                    <span className="truncate hidden sm:inline">{isDownloadingID ? t("common.saving") : t("common.download")}</span>
                                </button>
                                <button onClick={() => setShowID(false)} className="min-w-0 w-full h-9 sm:h-10 px-1.5 sm:px-2 bg-white text-slate-900 rounded-lg font-black text-[9px] sm:text-[10px] uppercase tracking-[0.08em] leading-none hover:bg-slate-100 transition-all border border-slate-300">
                                    {t("common.close")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MemberDetail;
