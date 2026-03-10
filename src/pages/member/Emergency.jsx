import React, { useState, useEffect } from "react";
import { Phone, MapPin, Siren, Heart, ShieldCheck } from "lucide-react";

const EMERGENCY_CONTACTS = [
    { label: "Police", number: "100", color: "bg-blue-600", icon: ShieldCheck, emoji: "🚓" },
    { label: "Ambulance", number: "108", color: "bg-red-500", icon: Heart, emoji: "🚑" },
    { label: "Fire", number: "101", color: "bg-orange-500", icon: Siren, emoji: "🚒" },
    { label: "Women Helpline", number: "1091", color: "bg-pink-500", icon: Phone, emoji: "👩" },
    { label: "Disaster", number: "1078", color: "bg-amber-600", icon: Siren, emoji: "⚠️" },
];

const HOSPITAL_DATA = [
    { name: "Government Hospital Bhimavaram", type: "Government", phone: "08816-223456", distance: "0.5 km" },
    { name: "Sri Ramana Hospital", type: "Private", phone: "08816-234567", distance: "1.2 km" },
    { name: "Care Hospital", type: "Multi-Specialty", phone: "08816-245678", distance: "2.0 km" },
    { name: "Bhimavaram Hospital & Research Center", type: "Private", phone: "08816-256789", distance: "2.8 km" },
];

const Emergency = () => {
    const [location, setLocation] = useState(null);
    const [locationError, setLocationError] = useState(null);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => setLocationError("Location access denied")
            );
        }
    }, []);

    const openMaps = (query) => {
        const base = location
            ? `https://www.google.com/maps/search/${query}/@${location.lat},${location.lng},14z`
            : `https://www.google.com/maps/search/${query}+Bhimavaram`;
        window.open(base, "_blank");
    };

    return (
        <div className="space-y-5 animate-fade-in">
            <div>
                <h1 className="page-title mb-0">Emergency Services</h1>
                <p className="text-slate-500 text-sm">Quick access to emergency contacts and nearby help</p>
            </div>

            {/* Location banner */}
            {location ? (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <MapPin size={16} className="text-emerald-600" />
                    <p className="text-sm text-emerald-700 font-medium">
                        Location detected: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                    </p>
                </div>
            ) : locationError ? (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <p className="text-xs text-amber-700">{locationError} — showing Bhimavaram area results</p>
                </div>
            ) : (
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                    <p className="text-xs text-blue-700">Detecting your location...</p>
                </div>
            )}

            {/* Emergency Quick Dial */}
            <div className="card">
                <h2 className="text-sm font-semibold text-slate-700 mb-3">🆘 Emergency Quick Dial</h2>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {EMERGENCY_CONTACTS.map(c => (
                        <a key={c.label} href={`tel:${c.number}`}
                            className={`${c.color} rounded-2xl p-3 text-white text-center hover:opacity-90 active:scale-95 transition-all`}>
                            <div className="text-2xl mb-1">{c.emoji}</div>
                            <p className="font-bold text-sm">{c.number}</p>
                            <p className="text-xs opacity-80 mt-0.5">{c.label}</p>
                        </a>
                    ))}
                </div>
            </div>

            {/* Nearby Hospitals */}
            <div className="card">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-slate-700">🏥 Nearby Hospitals</h2>
                    <button onClick={() => openMaps("hospitals+near+me")}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                        Open in Maps <MapPin size={11} />
                    </button>
                </div>
                <div className="space-y-2">
                    {HOSPITAL_DATA.map(h => (
                        <div key={h.name} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-blue-50 transition-colors">
                            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-lg flex-shrink-0">🏥</div>
                            <div className="flex-1">
                                <p className="font-medium text-slate-800 text-sm">{h.name}</p>
                                <p className="text-xs text-slate-500">{h.type} • {h.distance}</p>
                            </div>
                            <a href={`tel:${h.phone}`} className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors">
                                <Phone size={16} />
                            </a>
                        </div>
                    ))}
                </div>
            </div>

            {/* Google Maps Nearby Buttons */}
            <div className="card">
                <h2 className="text-sm font-semibold text-slate-700 mb-3">🗺️ Find Nearby on Google Maps</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                        { label: "Hospitals", query: "hospitals", emoji: "🏥" },
                        { label: "Ambulance", query: "ambulance+service", emoji: "🚑" },
                        { label: "Police Station", query: "police+station", emoji: "🚓" },
                        { label: "Pharmacy", query: "pharmacy+medical+store", emoji: "💊" },
                        { label: "Blood Bank", query: "blood+bank", emoji: "🩸" },
                        { label: "Fire Station", query: "fire+station", emoji: "🚒" },
                    ].map(item => (
                        <button key={item.label}
                            onClick={() => openMaps(item.query)}
                            className="flex items-center gap-2 p-3 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-xl text-left transition-all text-sm font-medium text-slate-700">
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
