import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Colors from "@/lib/colors";
import { getUserId } from "@/lib/user";
import { SacredGeometry } from "@/components/SacredGeometry";

interface Price {
  id: string;
  unit_amount: number;
  currency: string;
  recurring: { interval: string } | null;
}

interface Product {
  id: string;
  name: string;
  description: string;
  prices: Price[];
}

const FREE_FEATURES = [
  "10 messages per day",
  "All 4 AI modes",
  "Conversation history",
  "Community browsing",
];

const PRO_FEATURES = [
  "Unlimited messages",
  "All 4 AI modes",
  "AI Code Generator",
  "Share to Community",
  "Priority AI access",
  "Conversation history",
];

export default function Pricing() {
  const [, navigate] = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [selectedInterval, setSelectedInterval] = useState<"month" | "year">("month");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPro, setIsPro] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const canceled = params.get("canceled") === "1";

  useEffect(() => {
    const userId = getUserId();
    fetch(`/api/stripe/subscription/${userId}`)
      .then(r => r.json())
      .then((d: { active?: boolean }) => { if (d.active) setIsPro(true); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/stripe/products")
      .then((r) => r.json())
      .then((d) => { setProducts(d.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const proProduct = products.find((p) =>
    p.name?.toLowerCase().includes("pro") || p.name?.toLowerCase().includes("godmode")
  );

  const selectedPrice = proProduct?.prices.find(
    (p) => p.recurring?.interval === selectedInterval
  );

  const handlePortal = async () => {
    setPortalLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: getUserId() }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) { window.location.href = data.url; }
      else { setError(data.error ?? "Could not open billing portal."); }
    } catch {
      setError("Could not open billing portal.");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedPrice) return;
    setCheckoutLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: selectedPrice.id, userId: getUserId(), email }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Checkout failed. Please try again.");
      }
    } catch {
      setError("Checkout failed. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(0)}`;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: Colors.bg, position: "relative", overflow: "hidden" }}>
      {/* Background */}
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", opacity: 0.12, pointerEvents: "none", zIndex: 0 }}>
        <SacredGeometry size={500} accentColor={Colors.accent} goldColor={Colors.accentGold} opacity={1} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto", padding: "0 20px 60px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", padding: "24px 0 0" }}>
          <button
            onClick={() => navigate("/")}
            style={{ background: "none", border: "none", color: Colors.textSecondary, cursor: "pointer", fontSize: 20, padding: "6px 10px", fontFamily: "inherit" }}
          >
            ←
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: Colors.text, marginLeft: 8 }}>GODMODE</span>
        </div>

        {/* Pro active banner */}
        {isPro && (
          <div style={{ margin: "20px 0", padding: "14px 18px", borderRadius: 12, backgroundColor: "rgba(200,168,75,0.08)", border: "1px solid rgba(200,168,75,0.4)", color: Colors.accentGold, fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span>✦ You're on GODMODE Pro — unlimited AI power active.</span>
            <button
              onClick={() => { void handlePortal(); }}
              disabled={portalLoading}
              style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${Colors.accentGold}`, background: "rgba(200,168,75,0.12)", color: Colors.accentGold, cursor: portalLoading ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit", whiteSpace: "nowrap", opacity: portalLoading ? 0.6 : 1 }}
            >
              {portalLoading ? "Opening…" : "Manage Plan"}
            </button>
          </div>
        )}
        {canceled && (
          <div style={{ margin: "20px 0", padding: "14px 18px", borderRadius: 12, backgroundColor: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.3)", color: "#ff5050", fontSize: 14 }}>
            Checkout was canceled. You're still on the free plan.
          </div>
        )}

        {/* Title */}
        <div style={{ textAlign: "center", padding: "40px 0 32px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: Colors.accent, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>
            Pricing
          </div>
          <div style={{ fontSize: 38, fontWeight: 800, color: Colors.text, letterSpacing: -1, lineHeight: 1.1, marginBottom: 12 }}>
            Unlock Full Power
          </div>
          <div style={{ fontSize: 15, color: Colors.textSecondary, lineHeight: 1.6 }}>
            Free forever. Upgrade when you need unlimited.
          </div>
        </div>

        {/* Interval toggle */}
        {proProduct && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
            <div style={{ display: "flex", backgroundColor: Colors.bgCard, border: `1px solid ${Colors.border}`, borderRadius: 24, padding: 4, gap: 4 }}>
              {(["month", "year"] as const).map((interval) => (
                <button
                  key={interval}
                  onClick={() => setSelectedInterval(interval)}
                  style={{
                    padding: "8px 20px", borderRadius: 20, border: "none", cursor: "pointer", fontFamily: "inherit",
                    fontSize: 13, fontWeight: 600,
                    backgroundColor: selectedInterval === interval ? Colors.accent : "transparent",
                    color: selectedInterval === interval ? Colors.bg : Colors.textSecondary,
                    transition: "all 0.15s",
                  }}
                >
                  {interval === "month" ? "Monthly" : "Yearly"}
                  {interval === "year" && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: selectedInterval === "year" ? Colors.bg : "#00FFCC" }}>-31%</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Plan Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {/* Free Card */}
          <div style={{ backgroundColor: Colors.bgCard, border: `1px solid ${Colors.border}`, borderRadius: 20, padding: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: Colors.textMuted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Free</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 20 }}>
              <span style={{ fontSize: 42, fontWeight: 800, color: Colors.text }}>$0</span>
              <span style={{ fontSize: 14, color: Colors.textMuted }}>/month</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {FREE_FEATURES.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 14, color: Colors.textMuted }}>○</span>
                  <span style={{ fontSize: 14, color: Colors.textSecondary }}>{f}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate("/")}
              style={{ width: "100%", padding: "13px 20px", borderRadius: 12, border: `1px solid ${Colors.border}`, backgroundColor: "transparent", color: Colors.textSecondary, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >
              Current Plan
            </button>
          </div>

          {/* Pro Card */}
          <div style={{ backgroundColor: "rgba(0,212,255,0.04)", border: `1px solid ${Colors.accent}`, borderRadius: 20, padding: 28, position: "relative" }}>
            <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", backgroundColor: Colors.accent, color: Colors.bg, fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", padding: "4px 14px", borderRadius: 20 }}>
              Most Popular
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: Colors.accent, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Pro</div>
            {loading ? (
              <div style={{ fontSize: 42, fontWeight: 800, color: Colors.text, marginBottom: 20 }}>...</div>
            ) : selectedPrice ? (
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 20 }}>
                <span style={{ fontSize: 42, fontWeight: 800, color: Colors.text }}>{formatPrice(selectedPrice.unit_amount)}</span>
                <span style={{ fontSize: 14, color: Colors.textMuted }}>/{selectedInterval}</span>
              </div>
            ) : (
              <div style={{ fontSize: 32, fontWeight: 800, color: Colors.text, marginBottom: 20 }}>$12<span style={{ fontSize: 14, color: Colors.textMuted }}>/month</span></div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {PRO_FEATURES.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 14, color: Colors.accent }}>✓</span>
                  <span style={{ fontSize: 14, color: Colors.text }}>{f}</span>
                </div>
              ))}
            </div>
            {error && (
              <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 8, backgroundColor: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)", color: "#ff5050", fontSize: 13 }}>
                {error}
              </div>
            )}
            <input
              type="email"
              placeholder="your@email.com (for receipt)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${Colors.borderBright}`, backgroundColor: Colors.bgInput, color: Colors.text, fontSize: 14, fontFamily: "inherit", marginBottom: 10, boxSizing: "border-box", outline: "none" }}
            />
            <button
              onClick={() => { void handleCheckout(); }}
              disabled={checkoutLoading || !selectedPrice}
              style={{ width: "100%", padding: "14px 20px", borderRadius: 12, border: "none", backgroundColor: Colors.accent, color: Colors.bg, fontSize: 15, fontWeight: 700, cursor: (checkoutLoading || !selectedPrice) ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: (checkoutLoading || !selectedPrice) ? 0.6 : 1, transition: "opacity 0.15s" }}
            >
              {checkoutLoading ? "Redirecting..." : "Upgrade to Pro →"}
            </button>
            <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: Colors.textMuted }}>
              Powered by Stripe · Cancel anytime
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
