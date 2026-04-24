import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { assets } from "../../../assets/assets";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../../firebase/firebaseConfig";
import { QRCodeSVG } from "qrcode.react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, Store, QrCode, Download } from "lucide-react";
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

  // Force re-render when language changes
  useEffect(() => {
    forceUpdate({});
  }, [i18n.language]);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "shops"), orderBy("createdAt", "desc")),
      (snap) =>
        setShops(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Shop)),
    );
    return unsub;
  }, []);

  const downloadShopQR = (shop: Shop) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = 350;
    canvas.height = 400;

    if (!ctx) return;

    const radius = 25;

    // ✅ Make outside transparent first
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ✅ Draw rounded background ONLY
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(canvas.width - radius, 0);
    ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
    ctx.lineTo(canvas.width, canvas.height - radius);
    ctx.quadraticCurveTo(
      canvas.width,
      canvas.height,
      canvas.width - radius,
      canvas.height,
    );
    ctx.lineTo(radius, canvas.height);
    ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();

    // ✅ Fill only inside (outside stays transparent)
    ctx.fillStyle = "#020f2c";
    ctx.fill();

    // 🏢 LOGO
    const logo = new Image();
    logo.src = assets.herologo;

    logo.onload = () => {
      ctx.drawImage(logo, 30, 30, 50, 50);

      // 📝 Shop Name
      ctx.fillStyle = "#5d7dc9";
      ctx.font = "bold 18px Arial";
      ctx.textAlign = "center";
      ctx.fillText(shop.shopName, canvas.width / 2, 70);

      // 📝 Owner Name
      ctx.font = "14px Arial";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(`${t("shopList.card.owner")}: ${shop.ownerName}`, canvas.width / 2, 95);

      // 👉 Get QR
      const svg = document.getElementById(`shop-qr-${shop.id}`);
      if (!svg) return;

      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svg);

      const img = new Image();
      const blob = new Blob([svgStr], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        const qrSize = 200;
        const qrX = (canvas.width - qrSize) / 2;
        const qrY = 130;

        const r = 15;

        // ⚪ Rounded white QR background
        ctx.beginPath();
        ctx.moveTo(qrX - 10 + r, qrY);
        ctx.lineTo(qrX + qrSize + 10 - r, qrY);
        ctx.quadraticCurveTo(
          qrX + qrSize + 10,
          qrY,
          qrX + qrSize + 10,
          qrY + r,
        );
        ctx.lineTo(qrX + qrSize + 10, qrY + qrSize + 20 - r);
        ctx.quadraticCurveTo(
          qrX + qrSize + 10,
          qrY + qrSize + 20,
          qrX + qrSize + 10 - r,
          qrY + qrSize + 20,
        );
        ctx.lineTo(qrX - 10 + r, qrY + qrSize + 20);
        ctx.quadraticCurveTo(
          qrX - 10,
          qrY + qrSize + 20,
          qrX - 10,
          qrY + qrSize + 20 - r,
        );
        ctx.lineTo(qrX - 10, qrY + r);
        ctx.quadraticCurveTo(qrX - 10, qrY, qrX - 10 + r, qrY);
        ctx.closePath();

        ctx.fillStyle = "#ffffff";
        ctx.fill();

        // QR
        ctx.drawImage(img, qrX, qrY + 10, qrSize, qrSize);

        // Download
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-2">
        <div className="relative">
          <div className="absolute -left-4 top-0 w-1 bg-indigo-600 h-full rounded-full opacity-0 md:opacity-100" />
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-2">
            {t("shopList.title").split("&")[0]} & <span className="text-indigo-600">{t("shopList.title").split("&")[1] || "?"}</span>
          </h1>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-slate-500 font-semibold text-sm tracking-tight">
              {t("shopList.activePoints", { count: shops.length })}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/admin/shops/add")}
          className="h-12 px-6 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5"
        >
          <Plus />
          <span>{t("shopList.registerNew")}</span>
        </button>
      </div>

      {/* Shop Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {shops.map((shop) => (
          <div
            key={shop.id}
            id={`shop-card-${shop.id}`} // 👈 ADD THIS LINE
            className="glass-card rounded-3xl border border-white/40 p-6 premium-shadow hover:bg-white/90 transition-all duration-500 group"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <Store size={26} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 tracking-tight text-base leading-tight">
                    {shop.shopName}
                  </h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">
                    {shop.ownerName}
                  </p>
                </div>
              </div>
              <span className="bg-indigo-50 text-indigo-700 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border border-indigo-100/50">
                {t("shopList.card.identifier")}
              </span>
            </div>

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

            <div className="flex items-center gap-2 justify-center mb-6 py-2 px-4 rounded-xl bg-slate-50/50 border border-slate-100">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                {t("shopList.card.verified")}
              </p>
            </div>

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
    </div>
  );
};

export default ShopList;
