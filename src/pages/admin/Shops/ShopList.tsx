import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { assets } from "../../../assets/assets";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../firebase/firebaseConfig";
import { QRCodeSVG } from "qrcode.react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, Store, Download, Pencil, Trash2, X, Check, MapPin, Phone, User, Sparkles, AlertTriangle } from "lucide-react";

interface Shop {
  id: string;
  shopName: string;
  ownerName: string;
  address?: string;
  phone?: string;
  createdAt?: any;
}

const ShopList: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [shops, setShops] = useState<Shop[]>([]);
  const [, forceUpdate] = useState({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Shop>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState<boolean>(false);

  useEffect(() => {
    forceUpdate({});
  }, [i18n.language]);

  // Block scroll when any modal is open
  useEffect(() => {
    if (editingId || deletingId || deletingAll) {
      const preventDefault = (e: Event) => e.preventDefault();

      // Block mouse wheel
      window.addEventListener("wheel", preventDefault, { passive: false });
      // Block touch scroll (mobile)
      window.addEventListener("touchmove", preventDefault, { passive: false });
      // Block keyboard scroll (arrow keys, space, page up/down)
      const blockKeys = (e: KeyboardEvent) => {
        const keys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Space", " "];
        if (keys.includes(e.key)) e.preventDefault();
      };
      window.addEventListener("keydown", blockKeys);

      // Also lock body/html as fallback
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";

      return () => {
        window.removeEventListener("wheel", preventDefault);
        window.removeEventListener("touchmove", preventDefault);
        window.removeEventListener("keydown", blockKeys);
        document.body.style.overflow = "";
        document.documentElement.style.overflow = "";
      };
    }
  }, [editingId, deletingId, deletingAll]);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "shops"), orderBy("createdAt", "desc")),
      (snap) =>
        setShops(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Shop))
    );
    return unsub;
  }, []);

  // ── Edit ────────────────────────────────────────────────
  const startEdit = (shop: Shop) => {
    setEditingId(shop.id);
    setEditForm({
      shopName: shop.shopName,
      ownerName: shop.ownerName,
      address: shop.address ?? "",
      phone: shop.phone ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (shopId: string) => {
    if (!editForm.shopName?.trim() || !editForm.ownerName?.trim()) {
      toast.error("Shop name and owner name are required.");
      return;
    }
    try {
      await updateDoc(doc(db, "shops", shopId), {
        shopName: editForm.shopName.trim(),
        ownerName: editForm.ownerName.trim(),
        address: editForm.address?.trim() ?? "",
        phone: editForm.phone?.trim() ?? "",
      });
      toast.success("Shop updated successfully!");
      setEditingId(null);
      setEditForm({});
    } catch (err) {
      toast.error("Failed to update shop.");
    }
  };

  // ── Delete ───────────────────────────────────────────────
  const confirmDelete = (shopId: string) => {
    setDeletingId(shopId);
  };

  const cancelDelete = () => {
    setDeletingId(null);
  };

  const handleDelete = async (shopId: string) => {
    try {
      await deleteDoc(doc(db, "shops", shopId));
      toast.success(t("shopList.toasts.deleteSuccess"));
      setDeletingId(null);
    } catch (err) {
      toast.error(t("shopList.toasts.deleteFailed"));
    }
  };

  const confirmDeleteAll = () => {
    if (shops.length === 0) {
      toast.error(t("shopList.toasts.noShopsToDelete"));
      return;
    }
    setDeletingAll(true);
  };

  const cancelDeleteAll = () => {
    setDeletingAll(false);
  };

  const handleDeleteAll = async () => {
    try {
      const deletePromises = shops.map((shop) => deleteDoc(doc(db, "shops", shop.id)));
      await Promise.all(deletePromises);
      toast.success(t("shopList.toasts.deleteAllSuccess", { count: shops.length }));
      setDeletingAll(false);
    } catch (err) {
      toast.error(t("shopList.toasts.deleteAllFailed"));
    }
  };

  // ── Download QR ─────────────────────────────────────────
  const downloadShopQR = (shop: Shop) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = 420;
    canvas.height = 480;

    if (!ctx) return;

    const radius = 25;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(canvas.width - radius, 0);
    ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
    ctx.lineTo(canvas.width, canvas.height - radius);
    ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height);
    ctx.lineTo(radius, canvas.height);
    ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fillStyle = "#020f2c";
    ctx.fill();

    const wrapText = (text: string, maxWidth: number, font: string): string[] => {
      ctx.font = font;
      const words = text.split(" ");
      const lines: string[] = [];
      let current = "";
      for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && current) {
          lines.push(current);
          current = word;
        } else {
          current = test;
        }
      }
      if (current) lines.push(current);
      return lines;
    };

    const fitFontSize = (text: string, maxWidth: number, maxSize: number, minSize: number): number => {
      for (let size = maxSize; size >= minSize; size -= 1) {
        ctx.font = `bold ${size}px Arial`;
        if (ctx.measureText(text).width <= maxWidth) return size;
      }
      return minSize;
    };

    const logo = new Image();
    logo.src = assets.herologo;

    logo.onload = () => {
      const maxTextWidth = canvas.width - 60;

      ctx.drawImage(logo, 24, 20, 48, 48);

      const nameFontSize = fitFontSize(shop.shopName, maxTextWidth, 20, 12);
      const nameFont = `bold ${nameFontSize}px Arial`;
      const nameLines = wrapText(shop.shopName, maxTextWidth, nameFont);

      ctx.fillStyle = "#5d7dc9";
      ctx.font = nameFont;
      ctx.textAlign = "center";

      const lineHeight = nameFontSize + 6;
      const nameY = 85;

      nameLines.forEach((line, i) => {
        ctx.fillText(line, canvas.width / 2, nameY + i * lineHeight);
      });

      const ownerY = nameY + nameLines.length * lineHeight + 6;
      ctx.font = "13px Arial";
      ctx.fillStyle = "#94a3b8";
      ctx.textAlign = "center";
      ctx.fillText(`${t("shopList.card.owner")}: ${shop.ownerName}`, canvas.width / 2, ownerY);

      const svg = document.getElementById(`shop-qr-${shop.id}`);
      if (!svg) return;

      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svg);
      const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        const qrSize = 220;
        const qrX = (canvas.width - qrSize) / 2;
        const qrY = ownerY + 20;
        const r = 15;

        ctx.beginPath();
        ctx.moveTo(qrX - 10 + r, qrY);
        ctx.lineTo(qrX + qrSize + 10 - r, qrY);
        ctx.quadraticCurveTo(qrX + qrSize + 10, qrY, qrX + qrSize + 10, qrY + r);
        ctx.lineTo(qrX + qrSize + 10, qrY + qrSize + 20 - r);
        ctx.quadraticCurveTo(qrX + qrSize + 10, qrY + qrSize + 20, qrX + qrSize + 10 - r, qrY + qrSize + 20);
        ctx.lineTo(qrX - 10 + r, qrY + qrSize + 20);
        ctx.quadraticCurveTo(qrX - 10, qrY + qrSize + 20, qrX - 10, qrY + qrSize + 20 - r);
        ctx.lineTo(qrX - 10, qrY + r);
        ctx.quadraticCurveTo(qrX - 10, qrY, qrX - 10 + r, qrY);
        ctx.closePath();
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        ctx.drawImage(img, qrX, qrY + 10, qrSize, qrSize);

        const link = document.createElement("a");
        link.download = `${shop.shopName}-QR.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();

        URL.revokeObjectURL(url);
      };

      img.src = url;
    };
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-2">
        <div className="relative">
          <div className="absolute -left-4 top-0 w-1 bg-indigo-600 h-full rounded-full opacity-0 md:opacity-100" />
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-2">
            {t("shopList.title").split("&")[0]} &{" "}
            <span className="text-indigo-600">
              {t("shopList.title").split("&")[1] || "?"}
            </span>
          </h1>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-slate-500 font-semibold text-sm tracking-tight">
              {t("shopList.activePoints", { count: shops.length })}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          {shops.length > 0 && (
            <button
              onClick={confirmDeleteAll}
              className="h-12 px-6 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg bg-red-600 text-white shadow-red-200 hover:bg-red-700 hover:shadow-xl hover:-translate-y-0.5"
            >
              <Trash2 size={20} />
              <span>{t("shopList.deleteAll")}</span>
            </button>
          )}
          <button
            onClick={() => navigate("/admin/shops/add")}
            className="h-12 px-6 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5"
          >
            <Plus />
            <span>{t("shopList.registerNew")}</span>
          </button>
        </div>
      </div>

      {/* Shop Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {shops.map((shop) => (
          <div
            key={shop.id}
            id={`shop-card-${shop.id}`}
            className="glass-card rounded-3xl border border-white/40 p-6 premium-shadow hover:bg-white/90 transition-all duration-500 group"
          >
            {/* ── Card Header ── */}
            <div className="flex items-start justify-between mb-4 gap-3">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500 flex-shrink-0">
                  <Store size={26} className="text-indigo-600" />
                </div>

                {/* ── View mode ── */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-slate-900 tracking-tight text-base leading-tight break-words">
                    {shop.shopName}
                  </h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5 break-words">
                    {shop.ownerName}
                  </p>
                  {shop.phone && (
                    <p className="text-xs text-slate-500 mt-1 break-all">{shop.phone}</p>
                  )}
                  {shop.address && (
                    <p className="text-xs text-slate-500 mt-1 break-words whitespace-normal leading-relaxed max-w-full overflow-hidden">
                      {shop.address}
                    </p>
                  )}
                </div>
              </div>

              {/* ── Action buttons ── */}
              {editingId !== shop.id && (
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(shop)}
                    className="w-9 h-9 rounded-xl bg-indigo-100 border border-indigo-200 text-indigo-600 hover:bg-indigo-200 flex items-center justify-center transition-all shadow-sm"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => confirmDelete(shop.id)}
                    className="w-9 h-9 rounded-xl bg-red-100 border border-red-200 text-red-600 hover:bg-red-200 flex items-center justify-center transition-all shadow-sm"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>



            {/* ── QR Code ── */}
            <div className="flex justify-center p-8 bg-white border border-slate-100 rounded-3xl mb-6 shadow-inner relative group/qr overflow-hidden">
              <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover/qr:opacity-100 transition-opacity" />
              <QRCodeSVG
                id={`shop-qr-${shop.id}`}
                value={JSON.stringify({
                  type: "shop",
                  shopId: shop.id,
                  shopName: shop.shopName,
                })}
                size={150}
                level="H"
                includeMargin={false}
                fgColor="#0f172a"
                className="relative z-10 drop-shadow-sm"
              />
            </div>

            {/* ── Verified badge ── */}
            <div className="flex items-center gap-2 justify-center mb-6 py-2 px-4 rounded-xl bg-slate-50/50 border border-slate-100">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                {t("shopList.card.verified")}
              </p>
            </div>

            {/* ── Download button ── */}
            <div className="flex gap-3">
              <button
                onClick={() => downloadShopQR(shop)}
                className="flex-1 h-11 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm font-bold text-xs"
              >
                <Download size={18} /> {t("shopList.card.downloadQR")}
              </button>
            </div>
          </div>
        ))}

        {/* ── Empty state ── */}
        {shops.length === 0 && (
          <div className="glass-card rounded-3xl border border-white/40 p-6 premium-shadow hover:bg-white/90 transition-all duration-500 group">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200 border border-slate-100">
              <Store size={40} />
            </div>
            <p className="text-xl font-black text-slate-900 mb-2">
              {t("shopList.empty.title")}
            </p>
            <p className="text-slate-400 font-medium uppercase tracking-[0.2em] text-xs">
              {t("shopList.empty.subtitle")}
            </p>
          </div>
        )}
      </div>

      {/* ── Edit Shop Modal ── */}
      {editingId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 backdrop-blur-md animate-fade-in overflow-y-auto"
          onClick={cancelEdit}
        >
          <div 
            className="w-full max-w-lg bg-white rounded-3xl premium-shadow border border-slate-200 overflow-hidden relative my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-50 to-transparent rounded-full blur-3xl opacity-50 pointer-events-none" />
            <div className="p-6 sm:p-8 relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                    <Pencil size={24} className="text-indigo-600" />
                    {t("shopList.editShop")}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">{t("shopList.editShopDesc")}</p>
                </div>
                <button
                  onClick={cancelEdit}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-700 uppercase tracking-widest">
                    <Store size={12} className="text-indigo-600" /> {t("shopList.shopNameLabel")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={editForm.shopName ?? ""}
                    onChange={(e) => setEditForm((p) => ({ ...p, shopName: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-semibold text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-700 uppercase tracking-widest">
                    <User size={12} className="text-indigo-600" /> {t("shopList.ownerNameLabel")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={editForm.ownerName ?? ""}
                    onChange={(e) => setEditForm((p) => ({ ...p, ownerName: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-semibold text-slate-800"
                  />
                </div>

                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-700 uppercase tracking-widest">
                      <Phone size={12} className="text-indigo-600" /> {t("shopList.phoneLabel")}
                    </label>
                    <input
                      type="tel"
                      value={editForm.phone ?? ""}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setEditForm((p) => ({ ...p, phone: value }));
                      }}
                      maxLength={10}
                      className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-semibold text-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-700 uppercase tracking-widest">
                      <MapPin size={12} className="text-indigo-600" /> {t("shopList.addressLabel")}
                    </label>
                    <textarea
                      value={editForm.address ?? ""}
                      onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-semibold text-slate-800 resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={cancelEdit}
                    className="flex-1 h-11 rounded-xl bg-white border-2 border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    {t("shopList.cancelRegistration").replace("నమోదు ", "")}
                  </button>
                  <button
                    onClick={() => editingId && saveEdit(editingId)}
                    className="flex-1 h-11 rounded-xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200"
                  >
                    {t("shopList.saveChanges")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deletingId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 backdrop-blur-lg animate-fade-in"
          onClick={cancelDelete}
        >
          <div 
            className="w-full max-w-sm bg-white rounded-3xl premium-shadow border border-slate-200 p-6 sm:p-8 text-center relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">{t("shopList.deleteShop")}</h2>
            <p className="text-sm text-slate-500 mb-6">
              {t("shopList.deleteShopConfirm")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                className="flex-1 h-11 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-md shadow-red-200"
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete All Confirmation Modal ── */}
      {deletingAll && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 backdrop-blur-lg animate-fade-in"
          onClick={cancelDeleteAll}
        >
          <div 
            className="w-full max-w-md bg-white rounded-3xl premium-shadow border border-red-200 p-6 sm:p-8 text-center relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">{t("shopList.deleteAllShops")}</h2>
            <p className="text-sm text-slate-600 mb-2 font-semibold">
              {t("shopList.deleteAllConfirm", { count: shops.length })}
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={cancelDeleteAll}
                className="flex-1 h-11 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleDeleteAll}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-md shadow-red-200"
              >
                {t("shopList.deleteAll")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopList;