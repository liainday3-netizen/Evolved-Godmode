import React, { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import Colors from "@/lib/colors";
import { SacredGeometry } from "@/components/SacredGeometry";

const SHIMMER_CSS = `
@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
@keyframes studioFadeIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
`;

const STYLES = [
  { id: "token",    label: "Crypto Token",   icon: "◈", color: Colors.accentGold,    desc: "Coin art, emblem, mint-quality" },
  { id: "brand",    label: "Brand Logo",      icon: "◉", color: Colors.accent,        desc: "Clean, minimal, professional" },
  { id: "neon",     label: "Neon Art",        icon: "⚡", color: "#00FFCC",            desc: "Cyberpunk, electric glow" },
  { id: "cinematic",label: "Cinematic",       icon: "▣", color: "#C084FC",            desc: "Dramatic, epic, poster-quality" },
  { id: "sacred",   label: "Sacred Geometry", icon: "✦", color: Colors.accentGold,    desc: "Mandala, mystical, cosmic" },
  { id: "abstract", label: "Abstract",        icon: "◆", color: "#FF6B6B",            desc: "Generative, bold, ArtStation" },
  { id: "icon",     label: "App Icon",        icon: "⊞", color: Colors.accent,        desc: "Flat design, UI asset" },
  { id: "portrait", label: "Portrait",        icon: "◫", color: "#A0A0C0",            desc: "Photorealistic, cinematic" },
];

const SIZES = [
  { id: "1024x1024",  label: "Square",    sub: "1:1",   icon: "▣" },
  { id: "1792x1024",  label: "Wide",      sub: "16:9",  icon: "▬" },
  { id: "1024x1792",  label: "Tall",      sub: "9:16",  icon: "▮" },
];

const PROMPT_STARTERS: Record<string, string[]> = {
  token:    ["GODMODE coin with lightning bolt and dark cosmic background", "Dragon-themed DeFi token, gold and emerald", "Quantum AI token, neural network globe"],
  brand:    ["GODMODE evolved AI platform, dark minimal", "Tech startup logo, abstract G monogram, electric blue", "Crypto exchange brand mark, bold and trustworthy"],
  neon:     ["Neural city skyline with neon AI nodes", "Electric wolf howling at digital moon", "Cyberpunk samurai with holographic armor"],
  cinematic:["Epic battle between human and AI, cinematic light", "Last astronaut floating above glowing Earth", "Dark futuristic city with giant AI monolith"],
  sacred:   ["Golden ratio mandala with cosmic eye at center", "Sacred geometry portal opening to another dimension", "Flower of life with quantum energy patterns"],
  abstract: ["Swirling dark matter and electric plasma", "Shattered glass revealing infinite neural space", "Geometric storm in deep indigo and gold"],
  icon:     ["AI brain circuit, white on deep black", "Lightning bolt G logo, neon on dark", "Quantum lock symbol, blue gradient"],
  portrait: ["Futuristic AI entity with glowing eyes, cinematic", "Digital goddess with holographic crown", "Cyberpunk warrior, rain-soaked neon streets"],
};

interface Generation {
  id: string;
  prompt: string;
  style: string;
  size: string;
  b64: string;
  enhancedPrompt: string;
}

export default function ImageStudio() {
  const [, navigate] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("token");
  const [size, setSize] = useState("1024x1024");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [gallery, setGallery] = useState<Generation[]>([]);
  const [selected, setSelected] = useState<Generation | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Inject shimmer CSS once
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = SHIMMER_CSS;
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, []);

  const selectedStyle = STYLES.find(s => s.id === style) ?? STYLES[0];
  const starters = PROMPT_STARTERS[style] ?? PROMPT_STARTERS.token;

  const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

  const handleGenerate = useCallback(async () => {
    const p = prompt.trim();
    if (!p || generating) return;
    setGenerating(true);
    setSelected(null);
    setError("");
    try {
      const userId = (await import("@/lib/user")).getUserId();
      const res = await fetch(`${base}/api/studio/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p, style, size, userId }),
      });
      const data = await res.json() as { b64_json?: string; url?: string; enhancedPrompt?: string; error?: string; limitReached?: boolean };
      if (res.status === 402 || data.limitReached) {
        setError("Free limit reached — 2 images per day. Upgrade to Pro for unlimited.");
        return;
      }
      if (!res.ok || data.error) { setError(data.error ?? "Generation failed"); return; }
      if (!data.b64_json) { setError("No image returned — try a different prompt."); return; }
      const gen: Generation = {
        id: `gen_${Date.now()}`,
        prompt: p,
        style,
        size,
        b64: data.b64_json,
        enhancedPrompt: data.enhancedPrompt ?? p,
      };
      setGallery(prev => [gen, ...prev].slice(0, 12));
      setSelected(gen);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setGenerating(false);
    }
  }, [prompt, style, size, generating]);

  const handleDownload = useCallback((gen: Generation) => {
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${gen.b64}`;
    link.download = `godmode-studio-${gen.id}.png`;
    link.click();
  }, []);

  const sizeObj = SIZES.find(s => s.id === size) ?? SIZES[0];
  const imgStyle: React.CSSProperties =
    size === "1792x1024" ? { width: "100%", aspectRatio: "16/9" }
    : size === "1024x1792" ? { width: "min(320px, 100%)", aspectRatio: "9/16", margin: "0 auto" }
    : { width: "min(480px, 100%)", aspectRatio: "1/1", margin: "0 auto" };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: Colors.bg, position: "relative", overflow: "hidden" }}>
      {/* Background */}
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", opacity: 0.08, pointerEvents: "none", zIndex: 0 }}>
        <SacredGeometry size={600} accentColor={selectedStyle.color} goldColor={Colors.accentGold} opacity={1} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 860, margin: "0 auto", padding: "0 16px 80px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 0 0" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: Colors.textSecondary, cursor: "pointer", fontSize: 20, padding: "6px 10px", fontFamily: "inherit" }}>←</button>
            <div style={{ marginLeft: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: selectedStyle.color, letterSpacing: 3, textTransform: "uppercase" }}>Image Studio</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: Colors.text, letterSpacing: -0.5 }}>Visual Generator</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: Colors.textMuted }}>gpt-image-1 · {sizeObj.label} {sizeObj.sub}</div>
        </div>

        {/* Style Selector */}
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: Colors.textSecondary, letterSpacing: 2, marginBottom: 10, textTransform: "uppercase" }}>Style</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {STYLES.map(s => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 20,
                  border: `1px solid ${style === s.id ? s.color : Colors.border}`,
                  background: style === s.id ? `rgba(${hexToRgb(s.color)}, 0.12)` : "transparent",
                  color: style === s.id ? s.color : Colors.textSecondary,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: style === s.id ? 700 : 400,
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: Colors.textMuted }}>{selectedStyle.desc}</div>
        </div>

        {/* Size Selector */}
        <div style={{ marginTop: 20, display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: Colors.textSecondary, letterSpacing: 2, textTransform: "uppercase", marginRight: 4 }}>Size</span>
          {SIZES.map(s => (
            <button
              key={s.id}
              onClick={() => setSize(s.id)}
              style={{
                padding: "6px 12px",
                borderRadius: 16,
                border: `1px solid ${size === s.id ? selectedStyle.color : Colors.border}`,
                background: size === s.id ? `rgba(${hexToRgb(selectedStyle.color)}, 0.1)` : "transparent",
                color: size === s.id ? selectedStyle.color : Colors.textSecondary,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: size === s.id ? 700 : 400,
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {/* Prompt Input */}
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: Colors.textSecondary, letterSpacing: 2, marginBottom: 10, textTransform: "uppercase" }}>Prompt</div>
          <div style={{ position: "relative" }}>
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void handleGenerate(); }}}
              placeholder={`Describe your ${selectedStyle.label.toLowerCase()}…`}
              rows={3}
              style={{
                width: "100%",
                background: Colors.bgInput,
                border: `1px solid ${prompt.trim() ? selectedStyle.color + "60" : Colors.border}`,
                borderRadius: 12,
                color: Colors.text,
                fontSize: 14,
                padding: "14px 140px 14px 16px",
                fontFamily: "inherit",
                resize: "none",
                outline: "none",
                transition: "border 0.15s",
                boxSizing: "border-box",
              }}
            />
            <button
              onClick={() => void handleGenerate()}
              disabled={!prompt.trim() || generating}
              style={{
                position: "absolute",
                right: 10,
                bottom: 10,
                padding: "8px 18px",
                borderRadius: 10,
                border: "none",
                background: generating
                  ? Colors.bgElevated
                  : `linear-gradient(135deg, ${selectedStyle.color}, ${Colors.accentGold})`,
                color: generating ? Colors.textMuted : "#000",
                fontWeight: 800,
                fontSize: 12,
                cursor: generating || !prompt.trim() ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                letterSpacing: 0.5,
                transition: "all 0.2s",
                opacity: !prompt.trim() ? 0.5 : 1,
              }}
            >
              {generating ? "Creating…" : "Generate ✦"}
            </button>
          </div>
          <div style={{ fontSize: 11, color: Colors.textMuted, marginTop: 6 }}>⌘+Enter to generate · Auto-enhanced with style keywords</div>
        </div>

        {/* Prompt Starters */}
        <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {starters.map((s, i) => (
            <button
              key={i}
              onClick={() => { setPrompt(s); textareaRef.current?.focus(); }}
              style={{
                background: "transparent",
                border: `1px solid ${Colors.border}`,
                color: Colors.textSecondary,
                cursor: "pointer",
                fontSize: 11,
                padding: "5px 10px",
                borderRadius: 12,
                fontFamily: "inherit",
                textAlign: "left",
                transition: "all 0.15s",
                maxWidth: 260,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = selectedStyle.color; (e.currentTarget as HTMLButtonElement).style.color = selectedStyle.color; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = Colors.border; (e.currentTarget as HTMLButtonElement).style.color = Colors.textSecondary; }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 10, background: "rgba(255,68,102,0.08)", border: "1px solid rgba(255,68,102,0.3)", color: Colors.error, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Loading shimmer */}
        {generating && (
          <div style={{ marginTop: 28, borderRadius: 16, overflow: "hidden", background: Colors.bgCard, border: `1px solid ${Colors.border}`, ...imgStyle }}>
            <div style={{
              width: "100%",
              height: "100%",
              minHeight: 320,
              background: `linear-gradient(90deg, ${Colors.bgCard} 25%, ${Colors.bgElevated} 50%, ${Colors.bgCard} 75%)`,
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s linear infinite",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 12,
            }}>
              <div style={{ fontSize: 32, opacity: 0.4 }}>✦</div>
              <div style={{ fontSize: 13, color: Colors.textMuted }}>Generating {selectedStyle.label}…</div>
            </div>
          </div>
        )}

        {/* Selected image viewer */}
        {!generating && selected && (
          <div style={{ marginTop: 28, animation: "studioFadeIn 0.3s ease" }}>
            <div style={{ ...imgStyle, borderRadius: 16, overflow: "hidden", border: `1px solid ${selectedStyle.color}40`, boxShadow: `0 0 40px ${selectedStyle.color}20` }}>
              <img
                src={`data:image/png;base64,${selected.b64}`}
                alt={selected.prompt}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>

            {/* Actions */}
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={() => handleDownload(selected)}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: `1px solid ${selectedStyle.color}`,
                  background: `rgba(${hexToRgb(selectedStyle.color)}, 0.1)`,
                  color: selectedStyle.color,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                ↓ Download PNG
              </button>
              <button
                onClick={() => {
                  setPrompt(selected.prompt);
                  setStyle(selected.style);
                  setSize(selected.size);
                }}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: `1px solid ${Colors.border}`,
                  background: "transparent",
                  color: Colors.textSecondary,
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                ↺ Remix
              </button>
              <button
                onClick={() => setSelected(null)}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: `1px solid ${Colors.border}`,
                  background: "transparent",
                  color: Colors.textMuted,
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "inherit",
                }}
              >
                ✕ Clear
              </button>
            </div>

            {/* Enhanced prompt reveal */}
            <details style={{ marginTop: 10 }}>
              <summary style={{ fontSize: 11, color: Colors.textMuted, cursor: "pointer", userSelect: "none" }}>View enhanced prompt</summary>
              <div style={{ marginTop: 6, padding: "10px 12px", background: Colors.bgCard, borderRadius: 8, fontSize: 11, color: Colors.textSecondary, lineHeight: 1.6 }}>
                {selected.enhancedPrompt}
              </div>
            </details>
          </div>
        )}

        {/* Gallery */}
        {gallery.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: Colors.textSecondary, letterSpacing: 2, marginBottom: 14, textTransform: "uppercase" }}>Recent Generations</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
              {gallery.map(gen => {
                const gs = STYLES.find(s => s.id === gen.style) ?? STYLES[0];
                return (
                  <button
                    key={gen.id}
                    onClick={() => setSelected(gen)}
                    style={{
                      padding: 0,
                      border: `1px solid ${selected?.id === gen.id ? gs.color : Colors.border}`,
                      borderRadius: 10,
                      overflow: "hidden",
                      cursor: "pointer",
                      background: "none",
                      transition: "all 0.15s",
                      boxShadow: selected?.id === gen.id ? `0 0 16px ${gs.color}30` : "none",
                    }}
                  >
                    <div style={{ position: "relative", aspectRatio: "1/1" }}>
                      <img
                        src={`data:image/png;base64,${gen.b64}`}
                        alt={gen.prompt}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                      <div style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: "6px 8px",
                        background: "linear-gradient(transparent, rgba(5,5,8,0.9))",
                        fontSize: 10,
                        color: Colors.textSecondary,
                        textAlign: "left",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {gs.icon} {gen.prompt.slice(0, 30)}{gen.prompt.length > 30 ? "…" : ""}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}
