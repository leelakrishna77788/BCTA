import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Phone, MapPin, Siren, Heart, ShieldCheck } from "lucide-react";

interface LocationData {
    lat: number;
    lng: number;
}

const Emergency: React.FC = () => {
    const { t } = useTranslation();
    const [location, setLocation] = useState<LocationData | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);

    const EMERGENCY_CONTACTS = [
        { label: t("emergency.police"), number: "100", gradient: "linear-gradient(135deg, #1e1b4b, #4338ca)", icon: ShieldCheck, emoji: "🚓" },
        { label: t("emergency.ambulance"), number: "108", gradient: "linear-gradient(135deg, #dc2626, #ef4444)", icon: Heart, emoji: "🚑" },
        { label: t("emergency.fire"), number: "101", gradient: "linear-gradient(135deg, #ea580c, #f97316)", icon: Siren, emoji: "🚒" },
        { label: t("emergency.womenHelpline"), number: "1091", gradient: "linear-gradient(135deg, #db2777, #f472b6)", icon: Phone, emoji: "👩" },
        { label: t("emergency.disaster"), number: "1078", gradient: "linear-gradient(135deg, #d97706, #fbbf24)", icon: Siren, emoji: "⚠️" },
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

            {/* Emergency Quick Dial */}
            <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-100"
              style={{ boxShadow: "var(--shadow-sm)" }}
            >
                <h2 className="text-sm font-bold text-slate-800 mb-4">{t("emergency.quickDial")}</h2>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {EMERGENCY_CONTACTS.map(c => (
                        <a key={c.label} href={`tel:${c.number}`}
                            className="rounded-2xl p-3 text-white text-center active:scale-95 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                            style={{ background: c.gradient }}
                        >
                            <div className="text-2xl mb-1">{c.emoji}</div>
                            <p className="font-bold text-sm">{c.number}</p>
                            <p className="text-xs opacity-80 mt-0.5">{c.label}</p>
                        </a>
                    ))}
                </div>
            </div>

            {/* Nearby Hospitals */}
            <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-100"
              style={{ boxShadow: "var(--shadow-sm)" }}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-slate-800">{t("emergency.nearbyHospitals")}</h2>
                    <button onClick={() => openMaps("hospitals+near+me")}
                        className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5 font-semibold">
                        {t("emergency.openInMaps")} <MapPin size={11} />
                    </button>
                </div>
                <div className="space-y-2 stagger-children">
                    {HOSPITAL_DATA.map(h => (
                        <div key={h.name} className="flex items-center gap-3 p-3 bg-slate-50/80 rounded-xl hover:bg-indigo-50/50 transition-all duration-200 border border-transparent hover:border-indigo-100 group">
                            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">🏥</div>
                            <div className="flex-1">
                                <p className="font-semibold text-slate-800 text-sm">{h.name}</p>
                                <p className="text-xs text-slate-500 font-medium">{h.type} • {h.distance}</p>
                            </div>
                            <a href={`tel:${h.phone}`} className="p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-all duration-200 hover:shadow-sm">
                                <Phone size={16} />
                            </a>
                        </div>
                    ))}
                </div>
            </div>

            {/* Google Maps Nearby Buttons */}
            <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-100"
              style={{ boxShadow: "var(--shadow-sm)" }}
            >
                <h2 className="text-sm font-bold text-slate-800 mb-4">{t("emergency.findNearby")}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 stagger-children">
                    {[
                        { label: t("emergency.hospitals"), query: "hospitals", emoji: "🏥" },
                        { label: t("emergency.ambulance"), query: "ambulance+service", emoji: "🚑" },
                        { label: t("emergency.policeStation"), query: "police+station", emoji: "🚓" },
                        { label: t("emergency.pharmacy"), query: "pharmacy+medical+store", emoji: "💊" },
                        { label: t("emergency.bloodBank"), query: "blood+bank", emoji: "🩸" },
                        { label: t("emergency.fireStation"), query: "fire+station", emoji: "🚒" },
                    ].map(item => (
                        <button key={item.label}
                            onClick={() => openMaps(item.query)}
                            className="flex items-center gap-2 p-3 bg-slate-50/80 hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-100 rounded-xl text-left transition-all duration-200 text-sm font-semibold text-slate-700 hover:text-indigo-700 hover:-translate-y-0.5">
                            <span className="text-xl">{item.emoji}</span>
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Emergency;
