import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Phone, MapPin, Siren, Heart, ShieldCheck, Building2, Pill } from "lucide-react";

interface LocationData {
    lat: number;
    lng: number;
}

const Emergency: React.FC = () => {
    const { t } = useTranslation();
    const [location, setLocation] = useState<LocationData | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);

    const EMERGENCY_CONTACTS = [
        { label: t("emergency.police"), number: "100", gradient: "linear-gradient(135deg, #1e1b4b, #4338ca)", icon: ShieldCheck },
        { label: t("emergency.ambulance"), number: "108", gradient: "linear-gradient(135deg, #dc2626, #ef4444)", icon: Heart },
        { label: t("emergency.fire"), number: "101", gradient: "linear-gradient(135deg, #ea580c, #f97316)", icon: Siren },
        { label: t("emergency.womenHelpline"), number: "1091", gradient: "linear-gradient(135deg, #db2777, #f472b6)", icon: Phone },
        { label: t("emergency.disaster"), number: "1078", gradient: "linear-gradient(135deg, #d97706, #fbbf24)", icon: Siren },
    ];

    const NEARBY_ITEMS = [
        { label: t("emergency.hospitals"), query: "hospitals+near+me", gradient: "linear-gradient(135deg, #0f766e, #14b8a6)", icon: Building2 },
        { label: t("emergency.pharmacy"), query: "pharmacy+medical+store", gradient: "linear-gradient(135deg, #7c3aed, #a78bfa)", icon: Pill },
    ];

    const HOSPITAL_DATA = [
        { name: "Government Hospital Bhimavaram", type: "Government", phone: "08816-223456", distance: "0.5 km" },
        { name: "Sri Ramana Hospital", type: "Private", phone: "08816-234567", distance: "1.2 km" },
        { name: "Care Hospital", type: "Multi-Specialty", phone: "08816-245678", distance: "2.0 km" },
        { name: "Bhimavaram Hospital & Research Center", type: "Private", phone: "08816-256789", distance: "2.8 km" },
    ];

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => setLocationError("Location access denied")
            );
        }
    }, []);

    const openMaps = (query: string) => {
        const base = location
            ? `https://www.google.com/maps/search/${query}/@${location.lat},${location.lng},14z`
            : `https://www.google.com/maps/search/${query}+Bhimavaram`;
        window.open(base, "_blank");
    };

    return (
        <div className="space-y-5 animate-fade-in">
            <div>
                <h1 className="page-title mb-0">{t("emergency.title")}</h1>
                <p className="text-slate-500 text-sm font-medium">{t("emergency.subtitle")}</p>
            </div>

            {/* Location banner */}
            {location ? (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200/60">
                    <MapPin size={16} className="text-emerald-600" />
                    <p className="text-sm text-emerald-700 font-medium">
                        {t("emergency.locationDetected")}: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                    </p>
                </div>
            ) : locationError ? (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60">
                    <p className="text-xs text-amber-700 font-medium">{locationError} — {t("emergency.showingBhimavaram")}</p>
                </div>
            ) : (
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200/60">
                    <p className="text-xs text-indigo-700 font-medium">{t("emergency.detectingLocation")}</p>
                </div>
            )}

            {/* Emergency Quick Dial + Find Nearby — Single Merged Dock */}
            <div
                className="bg-white rounded-xl p-5 sm:p-6 border border-slate-100"
                style={{ boxShadow: "var(--shadow-sm)" }}
            >
                <h2 className="text-sm font-bold text-slate-800 mb-5">{t("emergency.quickDial")}</h2>
                {/* Desktop: single row with divider */}
                <div className="hidden sm:flex justify-center flex-wrap gap-6">
                    {EMERGENCY_CONTACTS.map((c) => (
                        <a key={c.label} href={`tel:${c.number}`} className="flex flex-col items-center gap-2 group" style={{ textDecoration: "none" }}>
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-150 active:scale-95 group-hover:-translate-y-1" style={{ background: c.gradient }}>
                                <c.icon size={28} color="white" strokeWidth={1.8} />
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                                <span className="text-xs font-semibold text-slate-700 text-center leading-tight">{c.label}</span>
                                <span className="text-xs font-medium text-slate-400">{c.number}</span>
                            </div>
                        </a>
                    ))}
                    <div className="w-px bg-slate-200 self-stretch mx-1" />
                    {NEARBY_ITEMS.map((item) => (
                        <button key={item.label} onClick={() => openMaps(item.query)} className="flex flex-col items-center gap-2 group bg-transparent border-0 p-0 cursor-pointer">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-150 active:scale-95 group-hover:-translate-y-1" style={{ background: item.gradient }}>
                                <item.icon size={28} color="white" strokeWidth={1.8} />
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                                <span className="text-xs font-semibold text-slate-700 text-center leading-tight">{item.label}</span>
                                <span className="text-xs font-medium text-slate-400">Maps ↗</span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Mobile: row 1 = 4 contacts, row 2 = 1 contact + 2 nearby (centered) */}
                <div className="sm:hidden flex flex-col gap-5">
                    <div className="flex justify-center gap-5">
                        {EMERGENCY_CONTACTS.slice(0, 4).map((c) => (
                            <a key={c.label} href={`tel:${c.number}`} className="flex flex-col items-center gap-2" style={{ textDecoration: "none" }}>
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center active:scale-95 transition-transform duration-150" style={{ background: c.gradient }}>
                                    <c.icon size={24} color="white" strokeWidth={1.8} />
                                </div>
                                <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-xs font-semibold text-slate-700 text-center leading-tight">{c.label}</span>
                                    <span className="text-xs font-medium text-slate-400">{c.number}</span>
                                </div>
                            </a>
                        ))}
                    </div>
                    <div className="flex justify-center gap-5">
                        {EMERGENCY_CONTACTS.slice(4).map((c) => (
                            <a key={c.label} href={`tel:${c.number}`} className="flex flex-col items-center gap-2" style={{ textDecoration: "none" }}>
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center active:scale-95 transition-transform duration-150" style={{ background: c.gradient }}>
                                    <c.icon size={24} color="white" strokeWidth={1.8} />
                                </div>
                                <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-xs font-semibold text-slate-700 text-center leading-tight">{c.label}</span>
                                    <span className="text-xs font-medium text-slate-400">{c.number}</span>
                                </div>
                            </a>
                        ))}
                        {NEARBY_ITEMS.map((item) => (
                            <button key={item.label} onClick={() => openMaps(item.query)} className="flex flex-col items-center gap-2 bg-transparent border-0 p-0 cursor-pointer">
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center active:scale-95 transition-transform duration-150" style={{ background: item.gradient }}>
                                    <item.icon size={24} color="white" strokeWidth={1.8} />
                                </div>
                                <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-xs font-semibold text-slate-700 text-center leading-tight">{item.label}</span>
                                    <span className="text-xs font-medium text-slate-400">Maps ↗</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Nearby Hospitals */}
            <div
                className="bg-white rounded-xl p-5 sm:p-6 border border-slate-100"
                style={{ boxShadow: "var(--shadow-sm)" }}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-slate-800">
                        {t("emergency.nearbyHospitals")}
                    </h2>
                    <button
                        onClick={() => openMaps("hospitals+near+me")}
                        className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5 font-semibold"
                    >
                        {t("emergency.openInMaps")} <MapPin size={11} />
                    </button>
                </div>

                <div className="space-y-2">
                    {HOSPITAL_DATA.map((h) => (
                        <div key={h.name} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-lg">
                                🏥
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-sm text-slate-800">{h.name}</p>
                                <p className="text-xs text-slate-500">{h.type} • {h.distance}</p>
                            </div>
                            <a
                                href={`tel:${h.phone}`}
                                className="p-2 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
                            >
                                <Phone size={16} className="text-indigo-600" />
                            </a>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};

export default Emergency;