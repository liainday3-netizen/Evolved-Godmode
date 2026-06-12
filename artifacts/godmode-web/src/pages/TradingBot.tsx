import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import Colors from "@/lib/colors";

interface BotTemplate {
  id: string;
  name: string;
  icon: string;
  tagline: string;
  description: string;
  risk: "low" | "medium" | "high";
  riskColor: string;
  exchanges: string[];
  category: string;
  params: {
    key: string;
    label: string;
    type: "text" | "number" | "select";
    default: string;
    options?: string[];
    description: string;
  }[];
}

const RISK_COLORS = { low: "#00FF88", medium: "#C8A84B", high: "#FF4466" };
const RISK_BG = { low: "rgba(0,255,136,0.08)", medium: "rgba(200,168,75,0.08)", high: "rgba(255,68,102,0.08)" };

export default function TradingBot() {
  const [, navigate] = useLocation();
  const [templates, setTemplates] = useState<BotTemplate[]>([]);
  const [selected, setSelected] = useState<BotTemplate | null>(null);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [language, setLanguage] = useState<"python" | "javascript">("python");
  const [generatedCode, setGeneratedCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const codeEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/trading/templates")
      .then((r) => r.json())
      .then((d: { templates: BotTemplate[] }) => setTemplates(d.templates))
      .catch(() => {});
  }, []);

  useEffect(() => {
    codeEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [generatedCode]);

  const selectTemplate = (t: BotTemplate) => {
    setSelected(t);
    setGeneratedCode("");
    setError("");
    const defaults: Record<string, string> = {};
    t.params.forEach((p) => { defaults[p.key] = p.default; });
    setConfig(defaults);
  };

  const generate = useCallback(async () => {
    if (!selected || isGenerating) return;
    setGeneratedCode("");
    setError("");
    setIsGenerating(true);
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/trading/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selected.id, config, language }),
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error("Generation failed");
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") { reader.cancel(); break; }
          try {
            const p = JSON.parse(data) as { content?: string; error?: string };
            if (p.content) { full += p.content; setGeneratedCode(full); }
          } catch {}
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("Generation failed. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  }, [selected, config, language, isGenerating]);

  const handleCopy = () => {
    const code = extractCode(generatedCode);
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  function extractCode(raw: string): string {
    const match = raw.match(/```(?:\w+)?\n([\s\S]*?)```/);
    return match ? match[1] : raw;
  }

  const riskColor = selected ? RISK_COLORS[selected.risk] : Colors.accent;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: Colors.bg, color: Colors.text, fontFamily: "inherit" }}>
      {/* Ambient background */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        {[...Array(18)].map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${5 + (i * 17 + i * i * 3) % 90}%`,
            top: `${3 + (i * 23 + i * 7) % 90}%`,
            width: i % 3 === 0 ? 2 : 1,
            height: i % 3 === 0 ? 2 : 1,
            borderRadius: "50%",
            backgroundColor: i % 4 === 0 ? "#C8A84B" : Colors.accent,
            opacity: 0.25,
            animation: `twinkle ${2.5 + (i % 3)}s ease-in-out infinite`,
            animationDelay: `${(i * 0.4) % 3}s`,
          }} />
        ))}
      </div>
      <style>{`
        @keyframes twinkle { 0%,100%{opacity:0.1} 50%{opacity:0.5} }
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "0 16px 40px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "28px 0 24px" }}>
          <button
            onClick={() => navigate("/")}
            style={{ background: "none", border: `1px solid ${Colors.border}`, color: Colors.textSecondary, cursor: "pointer", borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, fontFamily: "inherit" }}
          >←</button>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: Colors.accentGold, letterSpacing: 3, textTransform: "uppercase", marginBottom: 3 }}>GODMODE</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: Colors.text, letterSpacing: -0.5 }}>Trading Bot Lab</div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 12, color: Colors.textMuted, textAlign: "right", lineHeight: 1.5 }}>
            <div>6 templates</div>
            <div>AI-generated code</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {/* Template Grid */}
          <div style={{ flex: "1 1 340px", minWidth: 280 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: Colors.textMuted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Choose a Strategy</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {templates.map((t) => {
                const rc = RISK_COLORS[t.risk];
                const isActive = selected?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => selectTemplate(t)}
                    style={{
                      background: isActive ? `rgba(${rc === "#00FF88" ? "0,255,136" : rc === "#C8A84B" ? "200,168,75" : "255,68,102"},0.06)` : Colors.bgCard,
                      border: `1px solid ${isActive ? rc : Colors.border}`,
                      borderRadius: 14,
                      padding: "14px 16px",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                    }}
                    onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.borderColor = Colors.borderBright; }}
                    onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.borderColor = Colors.border; }}
                  >
                    <div style={{ fontSize: 28, lineHeight: 1, width: 36, textAlign: "center", flexShrink: 0 }}>{t.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: isActive ? rc : Colors.text }}>{t.name}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: rc, background: RISK_BG[t.risk], border: `1px solid ${rc}33`, borderRadius: 6, padding: "1px 6px", letterSpacing: 1, textTransform: "uppercase", flexShrink: 0 }}>{t.risk}</span>
                      </div>
                      <div style={{ fontSize: 12, color: Colors.textSecondary, lineHeight: 1.4 }}>{t.tagline}</div>
                      <div style={{ marginTop: 5, fontSize: 10, color: Colors.textMuted }}>{t.category} · {t.exchanges.slice(0, 2).join(", ")}{t.exchanges.length > 2 ? ` +${t.exchanges.length - 2}` : ""}</div>
                    </div>
                    {isActive && <div style={{ color: rc, fontSize: 18, flexShrink: 0 }}>→</div>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Workspace */}
          <div style={{ flex: "2 1 480px", minWidth: 300 }}>
            {!selected ? (
              <div style={{ height: "100%", minHeight: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, opacity: 0.5, padding: 40 }}>
                <div style={{ fontSize: 48 }}>⊕</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: Colors.textSecondary }}>Select a strategy</div>
                <div style={{ fontSize: 13, color: Colors.textMuted, textAlign: "center", maxWidth: 260, lineHeight: 1.6 }}>Choose a bot template from the left to configure and generate production-ready trading code</div>
              </div>
            ) : (
              <div style={{ animation: "fadeUp 0.2s ease-out" }}>
                {/* Template Info */}
                <div style={{ background: Colors.bgCard, border: `1px solid ${riskColor}22`, borderRadius: 14, padding: 20, marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <span style={{ fontSize: 32 }}>{selected.icon}</span>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: Colors.text }}>{selected.name}</div>
                      <div style={{ fontSize: 11, color: Colors.textMuted, marginTop: 2 }}>{selected.category}</div>
                    </div>
                    <div style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: riskColor, background: RISK_BG[selected.risk], border: `1px solid ${riskColor}33`, borderRadius: 8, padding: "4px 10px", letterSpacing: 1, textTransform: "uppercase" }}>{selected.risk} risk</div>
                  </div>
                  <div style={{ fontSize: 13, color: Colors.textSecondary, lineHeight: 1.65 }}>{selected.description}</div>
                  <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {selected.exchanges.map((ex) => (
                      <span key={ex} style={{ fontSize: 10, color: Colors.textMuted, background: Colors.bgElevated, border: `1px solid ${Colors.border}`, borderRadius: 6, padding: "2px 8px" }}>{ex}</span>
                    ))}
                  </div>
                </div>

                {/* Config Form */}
                <div style={{ background: Colors.bgCard, border: `1px solid ${Colors.border}`, borderRadius: 14, padding: 20, marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: Colors.textMuted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Configure</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {selected.params.map((param) => (
                      <div key={param.key}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                          <label style={{ fontSize: 12, fontWeight: 600, color: Colors.text }}>{param.label}</label>
                          <span style={{ fontSize: 11, color: Colors.textMuted }}>{param.description}</span>
                        </div>
                        {param.type === "select" ? (
                          <select
                            value={config[param.key] ?? param.default}
                            onChange={(e) => setConfig((c) => ({ ...c, [param.key]: e.target.value }))}
                            style={{ width: "100%", background: Colors.bgElevated, border: `1px solid ${Colors.border}`, borderRadius: 8, padding: "8px 12px", color: Colors.text, fontSize: 13, fontFamily: "inherit", outline: "none", cursor: "pointer" }}
                          >
                            {param.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : (
                          <input
                            type={param.type}
                            value={config[param.key] ?? param.default}
                            onChange={(e) => setConfig((c) => ({ ...c, [param.key]: e.target.value }))}
                            style={{ width: "100%", background: Colors.bgElevated, border: `1px solid ${Colors.border}`, borderRadius: 8, padding: "8px 12px", color: Colors.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                            onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = riskColor; }}
                            onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = Colors.border; }}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Language + Generate */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18 }}>
                    <div style={{ display: "flex", background: Colors.bgElevated, border: `1px solid ${Colors.border}`, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
                      {(["python", "javascript"] as const).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setLanguage(lang)}
                          style={{ padding: "7px 14px", border: "none", background: language === lang ? riskColor : "transparent", color: language === lang ? Colors.bg : Colors.textSecondary, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", letterSpacing: 0.5 }}
                        >
                          {lang === "python" ? "🐍 Python" : "🟨 JS"}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={generate}
                      disabled={isGenerating}
                      style={{ flex: 1, padding: "10px 20px", borderRadius: 10, border: "none", background: isGenerating ? Colors.border : riskColor, color: isGenerating ? Colors.textMuted : Colors.bg, fontSize: 13, fontWeight: 700, cursor: isGenerating ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.15s", letterSpacing: 0.3 }}
                    >
                      {isGenerating ? "⚙ Generating..." : "⊕ Generate Bot Code"}
                    </button>
                    {isGenerating && (
                      <button
                        onClick={() => { abortRef.current?.abort(); setIsGenerating(false); }}
                        style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${Colors.error}66`, background: "transparent", color: Colors.error, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
                      >■</button>
                    )}
                  </div>
                  {error && <div style={{ marginTop: 10, fontSize: 12, color: Colors.error }}>{error}</div>}
                </div>

                {/* Generated Code */}
                {generatedCode && (
                  <div style={{ background: Colors.bgCard, border: `1px solid ${Colors.border}`, borderRadius: 14, overflow: "hidden", animation: "fadeUp 0.2s ease-out" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: `1px solid ${Colors.border}`, background: Colors.bgElevated }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: isGenerating ? "#C8A84B" : "#00FF88", boxShadow: isGenerating ? "0 0 6px #C8A84B" : "0 0 6px #00FF88" }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: Colors.textSecondary }}>{selected.name} · {language === "python" ? "Python" : "JavaScript"}</span>
                      </div>
                      <button
                        onClick={handleCopy}
                        style={{ background: "none", border: `1px solid ${copied ? "#00FF88" : Colors.border}`, color: copied ? "#00FF88" : Colors.textMuted, fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
                      >
                        {copied ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                    <div style={{ maxHeight: 520, overflowY: "auto" }}>
                      <SyntaxHighlighter
                        language={language === "python" ? "python" : "javascript"}
                        style={vscDarkPlus}
                        customStyle={{ margin: 0, borderRadius: 0, fontSize: 13, lineHeight: 1.6, background: "#0A0A10" }}
                        showLineNumbers
                        lineNumberStyle={{ color: Colors.textMuted, fontSize: 11 }}
                      >
                        {extractCode(generatedCode)}
                      </SyntaxHighlighter>
                    </div>
                    <div ref={codeEndRef} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
