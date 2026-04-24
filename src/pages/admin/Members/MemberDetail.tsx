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
import { assets } from "../../../assets/assets";

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
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
    const [deleteButtonPosition, setDeleteButtonPosition] = useState<{ top: number; left: number } | null>(null);

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
                    const canonicalId = memberData.id;
                    const now = new Date();
                    const currentMonth = now.getMonth() + 1;
                    const currentYear = now.getFullYear();

                    const [paymentSnap, attSnap, prodSnap, meetSnap] = await Promise.allSettled([
                        getDocs(query(collection(db, "payments"), where("memberUID", "==", canonicalId), where("month", "==", currentMonth), where("year", "==", currentYear))),
                        getDocs(query(collection(db, "attendance"), where("memberUID", "==", canonicalId))),
                        getDocs(query(collection(db, "products"), where("memberUID", "==", canonicalId))),
                        getDocs(collection(db, "meetings"))
                    ]);

                    if (paymentSnap.status === 'fulfilled') {
                        memberData.paymentStatus = !paymentSnap.value.empty ? "paid" : "unpaid";
                    } else {
                        memberData.paymentStatus = "unpaid";
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

    useEffect(() => {
        if (!showID && !showDeleteConfirm) return;

        const preventDefault = (e: Event) => e.preventDefault();

        window.addEventListener("wheel", preventDefault, { passive: false });
        window.addEventListener("touchmove", preventDefault, { passive: false });
        const blockKeys = (e: KeyboardEvent) => {
            const keys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Space", " "];
            if (keys.includes(e.key)) e.preventDefault();
        };
        window.addEventListener("keydown", blockKeys);

        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";

        return () => {
            window.removeEventListener("wheel", preventDefault);
            window.removeEventListener("touchmove", preventDefault);
            window.removeEventListener("keydown", blockKeys);
            document.body.style.overflow = "";
            document.documentElement.style.overflow = "";
        };
    }, [showID, showDeleteConfirm]);

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

    const handleDelete = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (!member) return;

        const buttonRect = event.currentTarget.getBoundingClientRect();
        const buttonTop = buttonRect.top + window.scrollY;

        const rowHeight = 150;
        const groupSize = 3;
        const groupIndex = Math.floor(buttonTop / (rowHeight * groupSize));
        const groupCenterY = (groupIndex * rowHeight * groupSize) + (rowHeight * groupSize / 2);

        setDeleteButtonPosition({
            top: groupCenterY,
            left: 0
        });

        setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
        if (!member) return;
        setShowDeleteConfirm(false);
        setDeleteButtonPosition(null);
        toast.success(t("memberList.blocking"));
        navigate("/admin/members");

        membersApi.delete(member.id).then(() => {
            toast.success(t("memberDetail.toastDeleted"));
        }).catch((err: any) => {
            console.error("Deletion failed:", err);
            toast.error(err.message || t("memberDetail.toastDeleteFailed"));
        });
    };

    const handlePrintID = () => {
        const buildCaptureCanvas = async () => {
            if (!idCardRef.current || !member) return null;

            const qrSvg = idCardRef.current.querySelector("svg")?.outerHTML || "";
            const fullNameSafe = escapeHtml(`${member.name || ""} ${member.surname || ""}`.trim() || "Member");
            const memberIdSafe = escapeHtml(member.memberId || "MEMBER ID PENDING");
            const statusSafe = escapeHtml(member.status || "unknown");
            const yearSafe = escapeHtml(String(memberSince));
            const photoUrl = member.photoURL || "";

            const CARD_W = 380;
            const host = document.createElement("div");
            host.style.cssText = `position:fixed;left:-99999px;top:0;width:${CARD_W}px;background:#ffffff;padding:0;margin:0;`;

            host.innerHTML = `
                <div style="box-sizing:border-box;width:${CARD_W}px;border-radius:20px;overflow:hidden;border:1px solid #1e293b;background:#020617;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">
                    <div style="box-sizing:border-box;width:100%;display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.12);">
                        <div style="display:flex;align-items:center;gap:7px;overflow:hidden;max-width:240px;">
                            <div style="width:26px;height:26px;border-radius:7px;background:rgba(255,255,255,0.12);flex-shrink:0;"></div>
                            <div style="overflow:hidden;">
                                <div style="font-size:9px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:190px;">BCTA MEMBER</div>
                                <div style="font-size:9px;font-weight:600;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:190px;">${t("memberDetail.digitalIdentityPass")}</div>
                            </div>
                        </div>
                        <div style="font-size:9px;font-weight:700;color:#34d399;border:1px solid rgba(255,255,255,0.12);border-radius:999px;padding:3px 8px;background:rgba(255,255,255,0.1);white-space:nowrap;flex-shrink:0;">${t("memberDetail.verified")}</div>
                    </div>

                    <div style="box-sizing:border-box;width:100%;padding:14px;">
                        <div style="display:flex;gap:12px;align-items:flex-start;width:100%;box-sizing:border-box;">
                            <div style="width:76px;height:76px;min-width:76px;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,0.15);background:#1e1b4b;color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:700;text-transform:uppercase;">
                                ${photoUrl ? `<img src="${photoUrl}" crossorigin="anonymous" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;"/>` : escapeHtml((member.name?.[0] || "M").toUpperCase())}
                            </div>
                            <div style="flex:1;min-width:0;max-width:${CARD_W - 76 - 12 - 28}px;box-sizing:border-box;overflow:hidden;">
                                <div style="font-size:16px;font-weight:800;color:#ffffff;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;">${fullNameSafe}</div>
                                <div style="margin-top:5px;font-size:9px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#a5b4fc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;">${memberIdSafe}</div>
                                <div style="margin-top:7px;display:flex;gap:5px;flex-wrap:wrap;">
                                    <span style="font-size:8px;font-weight:600;color:#e2e8f0;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.1);border-radius:999px;padding:2px 7px;text-transform:capitalize;white-space:nowrap;">${statusSafe}</span>
                                    <span style="font-size:8px;font-weight:600;color:#e2e8f0;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.1);border-radius:999px;padding:2px 7px;white-space:nowrap;">${yearSafe}</span>
                                </div>
                            </div>
                        </div>

                        <div style="display:flex;justify-content:center;margin-top:14px;">
                            <div style="border-radius:14px;border:1px solid rgba(255,255,255,0.2);background:#ffffff;padding:12px;display:inline-block;">
                                ${qrSvg || `<div style='width:120px;height:120px;display:flex;align-items:center;justify-content:center;color:#0f172a;font-size:12px;'>QR</div>`}
                            </div>
                        </div>

                        <div style="margin-top:12px;text-align:center;font-size:7px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.4);">${t("memberDetail.securedThrough")}</div>
                        <div style="margin-top:3px;text-align:center;font-size:7px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.4);">${t("memberDetail.validForYear", { year: new Date().getFullYear() })}</div>
                    </div>
                    <div style="height:5px;background:linear-gradient(90deg,#1e1b4b,#4f46e5,#1e1b4b);"></div>
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
                                img { width: 380px; max-width: 100%; height: auto; display: block; }
                                @media print {
                                    @page { size: A4 portrait; margin: 10mm; }
                                    body { padding: 0; }
                                    img { width: 380px; }
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

    // ─── FIXED handleDownloadID ────────────────────────────────────────────────
    const handleDownloadID = async () => {
        if (!idCardRef.current || !member) return;

        try {
            setIsDownloadingID(true);

            const qrSvg = idCardRef.current.querySelector("svg")?.outerHTML || "";

            const fullNameSafe = escapeHtml(`${member.name || ""} ${member.surname || ""}`.trim() || "Member");
            const memberIdSafe = escapeHtml(member.memberId || "MEMBER ID PENDING");
            const statusSafe = escapeHtml(member.status || "unknown");
            const yearSafe = escapeHtml(String(memberSince));
            const photoUrl = member.photoURL || "";
            const logoUrl = assets.herologo;

            const exportCard = document.createElement("div");
            exportCard.style.cssText = `
                position: fixed;
                left: -9999px;
                top: 0;
                width: 340px;
            `;

            exportCard.innerHTML = `
            <div style="
                width: 340px;
                border-radius: 20px;
                overflow: hidden;
                border: 2px solid #1e293b;
                background: #020617;
                color: #ffffff;
                font-family: Arial, Helvetica, sans-serif;
                box-sizing: border-box;
            ">
                <!-- HEADER -->
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px;
                    border-bottom: 1px solid rgba(255,255,255,0.12);
                ">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="
                            width:44px;height:44px;
                            border-radius:14px;
                            background:#fff;
                            display:flex;
                            align-items:center;
                            justify-content:center;
                            overflow:hidden;
                        ">
                            <img src="${logoUrl}" crossorigin="anonymous"
                            style="width:100%;height:100%;object-fit:contain;padding:6px;" />
                        </div>

                        <div>
                            <div style="
                                font-size:12px;
                                font-weight:800;
                                letter-spacing:0.15em;
                                text-transform:uppercase;
                                color:#ffffff;
                            ">
                                BCTA MEMBER
                            </div>
                            <div style="
                                font-size:11px;
                                font-weight:600;
                                color:#cbd5f5;
                            ">
                                Digital Identity Pass
                            </div>
                        </div>
                    </div>

                    <div style="
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        text-align:center;
                        font-size:10px;
                        font-weight:700;
                        color:#34d399;
                        padding:6px 12px;
                        border-radius:999px;
                        background:rgba(255,255,255,0.1);
                        line-height:1;
                    ">
                        Verified
                    </div>
                </div>

                <!-- BODY -->
                <div style="padding:18px;">
                    
                    <!-- PROFILE -->
                    <div style="display:flex; gap:12px; margin-bottom:16px;">
                        
                        <!-- AVATAR -->
                        <div style="
                            width:75px;height:75px;
                            border-radius:16px;
                            background:#1e1b4b;
                            display:flex;
                            align-items:center;
                            justify-content:center;
                            color:#fff;
                            font-size:32px;
                            font-weight:700;
                            text-transform:uppercase;
                        ">
                            ${
                                photoUrl
                                ? `<img src="${photoUrl}" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;" />`
                                : `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;line-height:1;font-size:32px;position:relative;top:1px;">${escapeHtml((member.name?.[0] || "M").toUpperCase())}</span>`
                            }
                        </div>

                        <!-- TEXT -->
                        <div style="flex:1;">
                            <div style="
                                font-size:17px;
                                font-weight:800;
                                line-height:1.3;
                                word-break:break-word;
                            ">
                                ${fullNameSafe}
                            </div>

                            <div style="
                                font-size:11px;
                                font-weight:800;
                                color:#a5b4fc;
                                margin-top:4px;
                                margin-bottom:8px;
                            ">
                                ${memberIdSafe}
                            </div>

                            <!-- STATUS ALIGNED WITH NAME -->
                            <div style="
                                display:flex;
                                justify-content:flex-start;
                                gap:6px;
                                margin-top:6px;
                            ">
                                <span style="
                                    display:flex;
                                    align-items:center;
                                    justify-content:center;
                                    text-align:center;
                                    font-size:10px;
                                    font-weight:600;
                                    padding:4px 12px;
                                    border-radius:999px;
                                    border:1px solid rgba(255,255,255,0.15);
                                    background:rgba(255,255,255,0.08);
                                    min-height:24px;
                                    line-height:1;
                                ">
                                    ${statusSafe}
                                </span>

                                <span style="
                                    display:flex;
                                    align-items:center;
                                    justify-content:center;
                                    text-align:center;
                                    font-size:10px;
                                    font-weight:600;
                                    padding:4px 12px;
                                    border-radius:999px;
                                    border:1px solid rgba(255,255,255,0.15);
                                    background:rgba(255,255,255,0.08);
                                    min-height:24px;
                                    line-height:1;
                                ">
                                    ${yearSafe}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- QR -->
                    <div style="display:flex; justify-content:center; margin-bottom:14px;">
                        <div style="
                            background:#fff;
                            padding:14px;
                            border-radius:16px;
                        ">
                            ${qrSvg}
                        </div>
                    </div>

                    <!-- FOOTER -->
                    <div style="text-align:center;">
                        <div style="
                            font-size:9px;
                            color:rgba(255,255,255,0.5);
                            margin-bottom:4px;
                        ">
                            SECURED THROUGH BCTA DIGITAL IDENTITY
                        </div>
                        <div style="
                            font-size:9px;
                            color:rgba(255,255,255,0.5);
                        ">
                            VALID FOR ${new Date().getFullYear()} FISCAL YEAR
                        </div>
                    </div>
                </div>

                <!-- BAR -->
                <div style="
                    height:6px;
                    background:linear-gradient(90deg,#1e1b4b,#4f46e5,#1e1b4b);
                "></div>
            </div>
            `;

            document.body.appendChild(exportCard);

            await new Promise(r => setTimeout(r, 300));

            const { default: html2canvas } = await import("html2canvas");

            const canvas = await html2canvas(exportCard.firstElementChild as HTMLElement, {
                scale: 3,
                useCORS: true,
                backgroundColor: "#020617",
            });

            document.body.removeChild(exportCard);

            const { default: jsPDF } = await import("jspdf");

            const pdf = new jsPDF({
                unit: "px",
                format: [canvas.width + 40, canvas.height + 40],
            });

            pdf.addImage(canvas.toDataURL("image/png"), "PNG", 20, 20, canvas.width, canvas.height);

            const safeName = `${member?.name || "member"}-${member?.surname || "id"}`
                .replace(/\s+/g, "-")
                .toLowerCase();
            pdf.save(`${safeName}-digital-id.pdf`);

            toast.success(t("memberDetail.idCardDownloaded"));
        } catch (e) {
            console.error(e);
            toast.error(t("memberDetail.toastDownloadFailed") || "Download failed");
        } finally {
            setIsDownloadingID(false);
        }
    };
    // ─── END FIXED handleDownloadID ───────────────────────────────────────────

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
    const paymentStatusLabel = t(`payments.filter${derivedPaymentStatus.charAt(0).toUpperCase() + derivedPaymentStatus.slice(1)}`);
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

                            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold">
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

                            <div className="hidden sm:flex flex-wrap items-center gap-2 text-xs text-white/70">
                                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold ${memberIdVerified ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-100" : "border-amber-300/40 bg-amber-400/10 text-amber-100"}`}>
                                    {memberIdVerified ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                                    {memberIdVerified ? t("memberDetail.verified") : t("memberDetail.needsCheck")}
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 font-semibold text-white/80">
                                    {t("memberDetail.joinedOn")} {memberSince}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-2 grid-cols-3 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
                        <div className="rounded-2xl border border-white/15 bg-white/10 p-2.5 backdrop-blur sm:p-4">
                            <p className="text-[9px] uppercase tracking-[0.18em] text-white/60 sm:text-xs">{t("memberDetail.attendanceInfo")}</p>
                            <p className="mt-1 text-xl font-bold sm:text-3xl">{attendance.length}</p>
                            <p className="mt-0.5 text-[9px] text-white/65 sm:text-xs">{t("memberDetail.attendedCount")}</p>
                        </div>
                        <div className="rounded-2xl border border-white/15 bg-white/10 p-2.5 backdrop-blur sm:p-4">
                            <p className="text-[9px] uppercase tracking-[0.18em] text-white/60 sm:text-xs">{t("memberList.payment")}</p>
                            <p className={`mt-1 text-lg font-bold capitalize sm:text-2xl ${derivedPaymentStatus === "paid" ? "text-emerald-300" : "text-amber-300"}`}>
                                {paymentStatusLabel}
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
                                { label: t("memberList.meetings"), value: member.email || "-", icon: Mail },
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
                                <p className="break-words text-[10px] font-semibold uppercase tracking-[0.18em] leading-tight text-slate-500">{t("memberDetail.memberIdCheck")}</p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                    <p className="font-mono text-xs font-semibold text-slate-900 break-all">{hasMemberId ? memberId : t("common.pending")}</p>
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${memberIdVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                        {memberIdVerified ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                                        {t(`memberDetail.${memberIdVerified ? "verified" : "needsCheck"}`)}
                                    </span>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                <div className={`rounded-xl border p-3 ${statusTone}`}>
                                    <p className="break-words text-[10px] font-semibold uppercase tracking-[0.18em] leading-tight">{t("memberDetail.accountStatus")}</p>
                                    <p className="mt-1 break-words text-base font-bold capitalize">{member.status || "unknown"}</p>
                                </div>
                                <div className={`rounded-xl border p-3 ${paymentTone}`}>
                                    <p className="break-words text-[10px] font-semibold uppercase tracking-[0.18em] leading-tight">{t("memberDetail.paymentStatusLabel")}</p>
                                    <p className="mt-1 break-words text-base font-bold capitalize">{paymentStatusLabel}</p>
                                </div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                                <p className="break-words text-[10px] font-semibold uppercase tracking-[0.18em] leading-tight text-slate-500">{t("memberDetail.joinedYear")}</p>
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

            {showDeleteConfirm && deleteButtonPosition && (
                <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-lg animate-fade-in" onClick={() => { setShowDeleteConfirm(false); setDeleteButtonPosition(null); }}>
                    <div
                        className="fixed bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-scale-up mx-4"
                        style={{
                            top: `${deleteButtonPosition.top}px`,
                            left: '50%',
                            transform: 'translate(-50%, -50%)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100">
                            <AlertTriangle className="text-red-600" size={32} />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 text-center mb-3">
                            {t("memberDetail.deleteConfirm")}
                        </h2>
                        <p className="text-sm text-slate-600 text-center mb-6">
                            {t("memberDetail.deleteWarning") || "This action cannot be undone. All member data will be permanently removed."}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowDeleteConfirm(false); setDeleteButtonPosition(null); }}
                                className="flex-1 px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                            >
                                {t("common.cancel") || "Cancel"}
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                            >
                                {t("common.delete") || "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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

                            <div className="mt-4 flex gap-3 pb-2">
                                <button
                                    onClick={handleDownloadID}
                                    disabled={isDownloadingID}
                                    className="flex-1 h-11 sm:h-12 px-4 bg-black text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-lg inline-flex items-center justify-center gap-2 hover:bg-slate-900 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                    <Download size={16} className="shrink-0" />
                                    <span>{isDownloadingID ? t("Downloading") || "Downloading..." : t("Download") || "Download"}</span>
                                </button>
                                <button 
                                    onClick={() => setShowID(false)} 
                                    className="flex-1 h-11 sm:h-12 px-4 bg-white text-slate-700 rounded-xl font-bold text-xs sm:text-sm hover:bg-slate-50 transition-all shadow-lg border border-slate-200 inline-flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <X size={16} className="shrink-0" />
                                    <span>{t("Close") || "Close"}</span>
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