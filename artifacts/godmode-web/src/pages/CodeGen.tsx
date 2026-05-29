import React, { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import Colors from "@/lib/colors";
import { SacredGeometry } from "@/components/SacredGeometry";

const LANGUAGES = [
  { id: "typescript", label: "TypeScript" },
  { id: "javascript", label: "JavaScript" },
  { id: "python", label: "Python" },
  { id: "rust", label: "Rust" },
  { id: "go", label: "Go" },
  { id: "java", label: "Java" },
  { id: "swift", label: "Swift" },
  { id: "kotlin", label: "Kotlin" },
  { id: "sql", label: "SQL" },
  { id: "bash", label: "Bash" },
  { id: "css", label: "CSS" },
  { id: "html", label: "HTML" },
];

const EXAMPLE_PROMPTS = [
  "A debounce function with TypeScript generics",
  "Binary search tree with insert, delete, and in-order traversal",
  "Rate limiter middleware for Express with Redis",
  "Async retry utility with exponential backoff",
  "Simple REST API client with request queuing",
];

export default function CodeGen() {
  const [, navigate] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("typescript");
  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const extractCode = (raw: string) => {
    const match = raw.match(/```[\w]*\n?([\s\S]*?)```/);
    return match ? match[1].trimEnd() : raw;
  };

  const generate = useCallback(async () => {
    const text = prompt.trim();
    if (!text || streaming) return;

    setStreaming(true);
    setOutput("");
    setCopied(false);
    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/codegen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, language }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let full = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") { reader.cancel(); break; }
            try {
              const parsed = JSON.parse(data) as { content?: string; error?: string };
              if (parsed.content) {
                full += parsed.content;
                setOutput(full);
                outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight });
              }
            } catch { /* ignore */ }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setOutput("// Error generating code. Please try again.");
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [prompt, language, streaming]);

  const handleStop = () => { abortRef.current?.abort(); };

  const handleCopy = async () => {
    const code = extractCode(output);
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      generate();
    }
  };

  const displayCode = output ? extractCode(output) : "";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: Colors.bg, position: "relative", overflow: "hidden" }}>
      {/* Background */}
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", opacity: 0.1, pointerEvents: "none", zIndex: 0 }}>
        <SacredGeometry size={500} accentColor="#00D4FF" goldColor={Colors.accentGold} opacity={1} />
      </div>

      <div style={{ position: "relative", zIndex: 1, height: "100vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: `1px solid ${Colors.border}`, backgroundColor: "rgba(5,5,8,0.92)", backdropFilter: "blur(12px)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: Colors.textSecondary, cursor: "pointer", fontSize: 20, padding: "4px 8px", fontFamily: "inherit" }}>←</button>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: Colors.accent, letterSpacing: 3, textTransform: "uppercase" }}>AI</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: Colors.text, letterSpacing: -0.5, lineHeight: 1 }}>Code Generator</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: Colors.textMuted, fontStyle: "italic" }}>⌘+Enter to generate</span>
          </div>
        </div>

        {/* Body: prompt left / output right */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1.4fr", overflow: "hidden" }}>
          {/* Left panel — input */}
          <div style={{ display: "flex", flexDirection: "column", borderRight: `1px solid ${Colors.border}`, overflow: "hidden" }}>
            {/* Language selector */}
            <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${Colors.border}`, flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: Colors.textMuted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Language</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => setLanguage(lang.id)}
                    style={{ padding: "5px 12px", borderRadius: 16, border: `1px solid ${language === lang.id ? Colors.accent : Colors.border}`, backgroundColor: language === lang.id ? "rgba(0,212,255,0.1)" : "transparent", color: language === lang.id ? Colors.accent : Colors.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s" }}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 20, overflow: "hidden" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: Colors.textMuted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Prompt</div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={"Describe what you want to build...\n\nExamples:\n• " + EXAMPLE_PROMPTS.join("\n• ")}
                disabled={streaming}
                style={{ flex: 1, background: Colors.bgInput, border: `1px solid ${Colors.borderBright}`, borderRadius: 12, padding: "14px 16px", color: Colors.text, fontSize: 14, fontFamily: "ui-monospace, 'JetBrains Mono', monospace", resize: "none", outline: "none", lineHeight: 1.6, caretColor: Colors.accent }}
              />
              <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                <button
                  onClick={streaming ? handleStop : generate}
                  disabled={!streaming && !prompt.trim()}
                  style={{ flex: 1, padding: "13px 20px", borderRadius: 12, border: "none", backgroundColor: streaming ? "#ff505022" : (prompt.trim() ? Colors.accent : Colors.border), color: streaming ? "#ff5050" : (prompt.trim() ? Colors.bg : Colors.textMuted), fontSize: 14, fontWeight: 700, cursor: (streaming || prompt.trim()) ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "all 0.15s", borderWidth: streaming ? 1 : 0, borderStyle: streaming ? "solid" : "none", borderColor: streaming ? "#ff505066" : "transparent" }}
                >
                  {streaming ? "■ Stop" : "Generate →"}
                </button>
              </div>
            </div>

            {/* Example prompts */}
            <div style={{ padding: "0 20px 20px", flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: Colors.textMuted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Examples</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {EXAMPLE_PROMPTS.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setPrompt(ex)}
                    style={{ textAlign: "left", background: "none", border: `1px solid ${Colors.border}`, borderRadius: 8, padding: "8px 12px", color: Colors.textSecondary, fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s", lineHeight: 1.4 }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = Colors.accent; (e.currentTarget as HTMLButtonElement).style.color = Colors.text; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = Colors.border; (e.currentTarget as HTMLButtonElement).style.color = Colors.textSecondary; }}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel — output */}
          <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", backgroundColor: "#0a0a0f" }}>
            {/* Output header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: `1px solid ${Colors.border}`, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#ff5f57" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#ffbd2e" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#28c840" }} />
                </div>
                <span style={{ fontSize: 12, color: Colors.textMuted, fontFamily: "ui-monospace, monospace" }}>
                  {streaming ? `generating.${language}` : (displayCode ? `output.${language}` : `//  godmode coder`)}
                </span>
              </div>
              {displayCode && (
                <button
                  onClick={handleCopy}
                  style={{ background: "none", border: `1px solid ${Colors.border}`, color: copied ? "#00FFCC" : Colors.textMuted, fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
                >
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              )}
            </div>

            {/* Code output */}
            <div ref={outputRef} style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              {!output && !streaming ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 14, opacity: 0.5 }}>
                  <span style={{ fontSize: 40 }}>&#60;/&#62;</span>
                  <div style={{ fontSize: 15, fontWeight: 600, color: Colors.textSecondary }}>Output appears here</div>
                  <div style={{ fontSize: 13, color: Colors.textMuted, textAlign: "center", maxWidth: 280, lineHeight: 1.5 }}>
                    Describe what you want to build and hit Generate
                  </div>
                </div>
              ) : (
                <pre style={{ margin: 0, fontFamily: "ui-monospace, 'JetBrains Mono', 'Fira Code', monospace", fontSize: 13, lineHeight: 1.65, color: "#e2e8f0", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {displayCode}
                  {streaming && (
                    <span style={{ display: "inline-block", width: 2, height: 14, backgroundColor: Colors.accent, marginLeft: 2, verticalAlign: "text-bottom", animation: "sgPulse 0.8s ease-in-out infinite" }} />
                  )}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
