import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ShieldAlert, ShieldCheck } from "lucide-react";

interface SecurityWarningPopupProps {
  /** Unique key used for sessionStorage — change per page so each page shows its own popup */
  storageKey: string;
}

const SecurityWarningPopup: React.FC<SecurityWarningPopupProps> = ({ storageKey }) => {
  const [visible, setVisible] = useState(false);

  // Show popup on every mount (every navigation to this page).
  // Reset sessionStorage key on mount so the popup re-appears on every navigation.
  useEffect(() => {
    sessionStorage.removeItem(storageKey);
    setVisible(true);
  }, [storageKey]);

  // Lock body scroll while popup is open
  useEffect(() => {
    if (!visible) return;
    const scrollY = window.scrollY;
    const prev = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
    };
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    return () => {
      Object.assign(document.body.style, prev);
      window.scrollTo(0, scrollY);
    };
  }, [visible]);

  const handleAccept = () => {
    sessionStorage.setItem(storageKey, "acknowledged");
    setVisible(false);
  };

  if (!visible) return null;

  return createPortal(
    <div
      id="security-warning-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="security-warning-title"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{
        background: "rgba(15, 23, 42, 0.82)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        animation: "secWarnFadeIn 0.25s ease-out",
      }}
    >
      {/* Popup Card */}
      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(145deg, #0f172a 0%, #1e1b4b 60%, #18181b 100%)",
          border: "1px solid rgba(251,191,36,0.28)",
          boxShadow:
            "0 0 0 1px rgba(251,191,36,0.12), 0 32px 64px -12px rgba(0,0,0,0.7), 0 0 80px -20px rgba(251,191,36,0.15)",
          animation: "secWarnSlideUp 0.3s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Amber glow blob */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "-60px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "260px",
            height: "180px",
            background: "radial-gradient(ellipse, rgba(251,191,36,0.18) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Header */}
        <div
          className="relative px-5 pt-6 pb-4 flex flex-col items-center text-center"
          style={{ borderBottom: "1px solid rgba(251,191,36,0.15)" }}
        >
          {/* Icon badge */}
          <div
            className="mb-3 flex items-center justify-center rounded-2xl"
            style={{
              width: 52,
              height: 52,
              background: "linear-gradient(135deg, rgba(251,191,36,0.18) 0%, rgba(245,158,11,0.08) 100%)",
              border: "1.5px solid rgba(251,191,36,0.35)",
              boxShadow: "0 0 20px rgba(251,191,36,0.18)",
            }}
          >
            <ShieldAlert
              size={26}
              strokeWidth={1.8}
              style={{ color: "#fbbf24" }}
            />
          </div>

          <h2
            id="security-warning-title"
            className="text-lg sm:text-xl font-black tracking-tight"
            style={{ color: "#fbbf24", letterSpacing: "-0.02em" }}
          >
            ⚠️ Security Warning
          </h2>
          <p
            className="mt-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest"
            style={{ color: "rgba(251,191,36,0.65)" }}
          >
            Your Responsibility
          </p>
        </div>

        {/* Body */}
        <div className="px-5 py-3.5 space-y-3">
          <p
            className="text-xs sm:text-sm leading-relaxed font-medium"
            style={{ color: "rgba(226,232,240,0.9)" }}
          >
            Customer information and billing data are{" "}
            <span className="font-bold" style={{ color: "#fbbf24" }}>
              confidential
            </span>
            . You are responsible for keeping all customer data safe and secure.
          </p>

          {/* Rules list */}
          <ul className="space-y-2">
            {[
              "Do not share your login credentials or passwords with friends or any unauthorized person.",
              "Do not allow others to access your account.",
              "Keep customer information, billing details, and other business data confidential.",
              "Any misuse, data loss, unauthorized access, or other issues caused by sharing your credentials or negligence will be your responsibility.",
            ].map((rule, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 rounded-xl px-3 py-2 text-xs sm:text-sm"
                style={{
                  background: "rgba(251,191,36,0.06)",
                  border: "1px solid rgba(251,191,36,0.12)",
                  color: "rgba(203,213,225,0.9)",
                  lineHeight: "1.55",
                }}
              >
                <span
                  className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                  style={{
                    background: "rgba(251,191,36,0.15)",
                    color: "#fbbf24",
                    border: "1px solid rgba(251,191,36,0.3)",
                    minWidth: "1.25rem",
                  }}
                >
                  {i + 1}
                </span>
                {rule}
              </li>
            ))}
          </ul>

          {/* Footer note */}
          <div
            className="rounded-xl px-4 py-3 text-center"
            style={{
              background: "rgba(251,191,36,0.08)",
              border: "1px solid rgba(251,191,36,0.2)",
            }}
          >
            <p
              className="text-[11px] sm:text-xs font-bold"
              style={{ color: "#fbbf24" }}
            >
              Please ensure that your credentials and customer data remain secure.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div
          className="px-5 pb-5 flex justify-center"
          style={{ borderTop: "1px solid rgba(251,191,36,0.1)", paddingTop: "1.25rem" }}
        >
          <button
            id="security-warning-accept-btn"
            onClick={handleAccept}
            className="flex items-center gap-2 w-full sm:w-auto justify-center px-6 py-3 rounded-2xl font-black text-xs sm:text-sm transition-all active:scale-95 hover:-translate-y-px"
            style={{
              background: "linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)",
              color: "#0f172a",
              boxShadow: "0 8px 24px rgba(251,191,36,0.35), 0 2px 8px rgba(0,0,0,0.3)",
              letterSpacing: "-0.01em",
            }}
          >
            <ShieldCheck size={18} strokeWidth={2.5} />
            I Understand &amp; Accept Responsibility
          </button>
        </div>
      </div>

      {/* Keyframe styles injected once */}
      <style>{`
        @keyframes secWarnFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes secWarnSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default SecurityWarningPopup;
