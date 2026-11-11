import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import Colors, { type GodMode } from "@/lib/colors";
import {
  loadConversation,
  upsertConversation,
  type Conversation,
  type Message,
} from "@/lib/storage";
import { SacredGeometry } from "@/components/SacredGeometry";
import { getUserId } from "@/lib/user";

const MODES_META: Record<GodMode, { label: string; icon: string }> = {
  genius: { label: "Genius", icon: "⚡" },
  coder: { label: "Coder", icon: "</>" },
  strategist: { label: "Strategist", icon: "◈" },
  oracle: { label: "Oracle", icon: "◉" },
};

function useQuery() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function CodeBlock({ language, value, accentColor }: { language: string; value: string; accentColor: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div style={{ margin: "10px 0", borderRadius: 10, overflow: "hidden", border: `1px solid ${Colors.border}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px", background: Colors.bgElevated, borderBottom: `1px solid ${Colors.border}` }}>
        <span style={{ fontSize: 11, color: Colors.textMuted, fontFamily: "monospace", letterSpacing: 0.5 }}>{language || "code"}</span>
        <button
          onClick={handleCopy}
          style={{ background: "none", border: "none", color: copied ? "#00FF88" : Colors.textSecondary, fontSize: 11, fontWeight: 600, cursor: "pointer", padding: "2px 8px", borderRadius: 6, fontFamily: "inherit", transition: "color 0.15s" }}
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={vscDarkPlus}
        customStyle={{ margin: 0, borderRadius: 0, fontSize: 13, lineHeight: 1.6, background: "#070710", padding: "14px 16px" }}
        wrapLongLines
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}

function MessageBubble({
  message,
  modeColor,
  isStreaming = false,
}: {
  message: Message;
  modeColor: string;
  isStreaming?: boolean;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ maxWidth: "82%", padding: "11px 16px", borderRadius: "14px 14px 4px 14px", backgroundColor: Colors.userBubble, border: `1px solid ${Colors.userBubbleBorder}`, color: Colors.text, fontSize: 14, lineHeight: 1.65, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "flex-start" }}>
      <div style={{ maxWidth: "88%", padding: "14px 16px", borderRadius: "4px 14px 14px 14px", backgroundColor: Colors.aiBubble, border: `1px solid ${Colors.aiBubbleBorder}`, color: Colors.text, fontSize: 14, lineHeight: 1.7, wordBreak: "break-word", position: "relative" }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ children, className }) {
              const match = /language-(\w+)/.exec(className || "");
              const lang = match?.[1] ?? "";
              const value = String(children).replace(/\n$/, "");
              if (value.includes("\n") || lang) {
                return <CodeBlock language={lang || "text"} value={value} accentColor={modeColor} />;
              }
              return (
                <code style={{ background: Colors.bgElevated, padding: "2px 6px", borderRadius: 5, fontSize: 13, fontFamily: "monospace", color: modeColor, border: `1px solid ${Colors.border}` }}>
                  {children}
                </code>
              );
            },
            p({ children }) { return <p style={{ margin: "0 0 10px", lineHeight: 1.7 }}>{children}</p>; },
            ul({ children }) { return <ul style={{ paddingLeft: 22, margin: "4px 0 10px" }}>{children}</ul>; },
            ol({ children }) { return <ol style={{ paddingLeft: 22, margin: "4px 0 10px" }}>{children}</ol>; },
            li({ children }) { return <li style={{ marginBottom: 5, lineHeight: 1.6 }}>{children}</li>; },
            h1({ children }) { return <h1 style={{ fontSize: 20, fontWeight: 800, color: Colors.text, margin: "12px 0 6px", lineHeight: 1.3 }}>{children}</h1>; },
            h2({ children }) { return <h2 style={{ fontSize: 17, fontWeight: 700, color: Colors.text, margin: "10px 0 5px", lineHeight: 1.3 }}>{children}</h2>; },
            h3({ children }) { return <h3 style={{ fontSize: 15, fontWeight: 700, color: modeColor, margin: "8px 0 4px" }}>{children}</h3>; },
            strong({ children }) { return <strong style={{ color: Colors.text, fontWeight: 700 }}>{children}</strong>; },
            em({ children }) { return <em style={{ color: Colors.textSecondary, fontStyle: "italic" }}>{children}</em>; },
            blockquote({ children }) { return <blockquote style={{ borderLeft: `3px solid ${modeColor}`, paddingLeft: 14, margin: "8px 0", opacity: 0.85, color: Colors.textSecondary }}>{children}</blockquote>; },
            a({ href, children }) { return <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: modeColor, textDecoration: "underline", textDecorationColor: `${modeColor}66` }}>{children}</a>; },
            table({ children }) { return <div style={{ overflowX: "auto", margin: "8px 0" }}><table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>{children}</table></div>; },
            thead({ children }) { return <thead>{children}</thead>; },
            th({ children }) { return <th style={{ border: `1px solid ${Colors.border}`, padding: "7px 12px", textAlign: "left", background: Colors.bgElevated, color: Colors.text, fontWeight: 700 }}>{children}</th>; },
            td({ children }) { return <td style={{ border: `1px solid ${Colors.border}`, padding: "7px 12px", color: Colors.textSecondary }}>{children}</td>; },
            hr() { return <hr style={{ border: "none", borderTop: `1px solid ${Colors.border}`, margin: "12px 0" }} />; },
            img({ src, alt }) {
              return (
                <div style={{ margin: "8px 0", borderRadius: 12, overflow: "hidden", border: `1px solid ${Colors.border}`, maxWidth: 420, display: "inline-block", width: "100%" }}>
                  <img src={src ?? ""} alt={alt ?? ""} style={{ display: "block", width: "100%", height: "auto" }} loading="lazy" />
                  {alt && <div style={{ padding: "7px 12px", background: Colors.bgElevated, fontSize: 11, color: Colors.textMuted, lineHeight: 1.4 }}>🎨 {alt}</div>}
                </div>
              );
            },
          }}
        >
          {message.content}
        </ReactMarkdown>
        {isStreaming && (
          <span style={{ display: "inline-block", width: 2, height: 14, backgroundColor: modeColor, marginLeft: 2, verticalAlign: "text-bottom", animation: "blink 0.8s ease-in-out infinite" }} />
        )}
      </div>
    </div>
  );
}

export default function Chat() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const query = useQuery();
  const modeParam = (query.get("mode") as GodMode) || "genius";
  const [, navigate] = useLocation();

  const [conv, setConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<GodMode>(modeParam);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [limitReached, setLimitReached] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "sharing" | "shared">("idle");
  const [isListening, setIsListening] = useState(false);
  const [hasVoice, setHasVoice] = useState(false);
  const [retryMsg, setRetryMsg] = useState<Message[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isImageGenerating, setIsImageGenerating] = useState(false);
  const userId = getUserId();

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const hasSR = !!(
      (typeof window !== "undefined") &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    );
    setHasVoice(hasSR);
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoadError(false);
    void loadConversation(id)
      .then((existing) => {
        if (existing) {
          setConv(existing);
          setMessages(existing.messages || []);
          setMode((existing.mode as GodMode) || modeParam);
        }
      })
      .catch(() => setLoadError(true));
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const modeColors = Colors.modes[mode];

  const sendMessage = useCallback(async (overrideMessages?: Message[]) => {
    const text = input.trim();
    if (!text || streaming) return;

    // /imagine command → inline image generation
    const imagineMatch = text.match(/^\/imagine\s+(.+)/i);
    if (imagineMatch) {
      const prompt = imagineMatch[1].trim();
      const imgBase = overrideMessages ?? messages;
      const userMsg: Message = { role: "user", content: `🎨 ${prompt}` };
      const withUser = [...imgBase, userMsg];
      setMessages(withUser);
      setInput("");
      setStreaming(true);
      setIsImageGenerating(true);
      try {
        const res = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, size: "1024x1024" }),
        });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json() as { url?: string; b64_json?: string };
        const imgSrc = data.url ?? (data.b64_json ? `data:image/png;base64,${data.b64_json}` : null);
        if (!imgSrc) throw new Error("No image data");
        const aiMsg: Message = { role: "assistant", content: `![${prompt}](${imgSrc})` };
        const finalImgMessages = [...withUser, aiMsg];
        setMessages(finalImgMessages);
        const imgConv: Conversation = {
          id: id!,
          title: conv?.title ?? `${MODES_META[mode].label} Session`,
          lastMessage: `🎨 ${prompt}`,
          mode,
          timestamp: Date.now(),
          messageCount: finalImgMessages.length,
          messages: finalImgMessages,
        };
        setConv(imgConv);
        void upsertConversation(imgConv);
      } catch {
        setMessages((prev) => [...prev, { role: "assistant", content: "⚠ Image generation failed. Try a more descriptive prompt." }]);
      } finally {
        setStreaming(false);
        setIsImageGenerating(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      return;
    }

    const base = overrideMessages ?? messages;
    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...base, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);
    setStreamingContent("");
    setRetryMsg(null);

    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, mode }),
        signal: abortRef.current.signal,
      });

      if (response.status === 402) {
        setLimitReached(true);
        setMessages(base);
        setStreaming(false);
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";
      let streamDone = false;

      const consumeEvent = (line: string) => {
        if (!line.startsWith("data: ")) return;
        const data = line.slice(6).trim();
        if (data === "[DONE]") {
          streamDone = true;
          return;
        }
        try {
          const parsed = JSON.parse(data) as { content?: string; error?: string };
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.content) {
            fullContent += parsed.content;
            setStreamingContent(fullContent);
          }
        } catch (error) {
          if (error instanceof Error && error.message !== "Unexpected end of JSON input") {
            throw error;
          }
        }
      };

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          consumeEvent(line);
          if (streamDone) break;
        }
      }

      buffer += decoder.decode();
      if (buffer.trim()) consumeEvent(buffer.trim());
      if (!fullContent.trim()) {
        throw new Error("The AI response was empty. Please try again.");
      }

      const assistantMsg: Message = { role: "assistant", content: fullContent };
      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      setStreamingContent("");

      const updatedConv: Conversation = {
        id: id!,
        title: conv?.title ?? `${MODES_META[mode].label} Session`,
        lastMessage: text,
        mode,
        timestamp: Date.now(),
        messageCount: finalMessages.length,
        messages: finalMessages,
      };
      setConv(updatedConv);
      void upsertConversation(updatedConv);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        // user stopped
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "⚠ Connection error. Click retry to try again." } as Message]);
        setRetryMsg(base);
      }
      setStreamingContent("");
    } finally {
      setStreaming(false);
      abortRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, messages, mode, streaming, id, conv, userId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); }
  };

  const handleStop = () => { abortRef.current?.abort(); };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results as any[])
        .map((r: any) => r[0].transcript)
        .join("");
      setInput(transcript);
      const ta = inputRef.current;
      if (ta) { ta.style.height = "auto"; ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`; }
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const handleShare = useCallback(async () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    const lastAiMsg = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastUserMsg || !lastAiMsg) return;
    setShareState("sharing");
    try {
      await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, mode, prompt: lastUserMsg.content, response: lastAiMsg.content }),
      });
      setShareState("shared");
      setTimeout(() => setShareState("idle"), 3000);
    } catch { setShareState("idle"); }
  }, [messages, mode, userId]);

  const modeMeta = MODES_META[mode];

  return (
    <div style={{ height: "100vh", backgroundColor: Colors.bg, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes voicePulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.15);opacity:0.8} }
        @keyframes imgShimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
      `}</style>

      {/* Sacred Geometry background */}
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", opacity: 0.15, pointerEvents: "none", zIndex: 0 }}>
        <SacredGeometry size={400} accentColor={modeColors.color} goldColor={Colors.accentGold} opacity={1} />
      </div>

      {/* Header */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${Colors.border}`, backgroundColor: "rgba(5,5,8,0.92)", backdropFilter: "blur(16px)" }}>
        <button
          onClick={() => navigate("/")}
          style={{ background: "none", border: "none", color: Colors.textSecondary, cursor: "pointer", padding: "6px 10px", borderRadius: 8, fontSize: 20, fontFamily: "inherit", transition: "color 0.15s" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = Colors.text; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = Colors.textSecondary; }}
        >←</button>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: Colors.text, letterSpacing: 0.5 }}>GODMODE</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 12, backgroundColor: modeColors.bg, border: `1px solid ${modeColors.color}33`, marginTop: 3 }}>
            <span style={{ fontSize: 11 }}>{modeMeta.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: modeColors.color, letterSpacing: 1.5, textTransform: "uppercase" }}>{modeMeta.label}</span>
          </div>
        </div>

        <div style={{ width: 48 }} />
      </div>

      {/* Messages */}
      <div style={{ position: "relative", zIndex: 1, flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        {loadError && (
          <div style={{ textAlign: "center", padding: "12px 16px", borderRadius: 10, background: "rgba(255,68,102,0.08)", border: `1px solid ${Colors.error}33`, fontSize: 13, color: Colors.error, marginBottom: 8 }}>
            Could not load conversation history. New messages will still work.
          </div>
        )}

        {messages.length === 0 && !streaming && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 14, opacity: 0.6 }}>
            <span style={{ fontSize: 44 }}>{modeMeta.icon}</span>
            <div style={{ fontSize: 17, fontWeight: 700, color: Colors.textSecondary }}>{modeMeta.label} Mode</div>
            <div style={{ fontSize: 13, color: Colors.textMuted, textAlign: "center", maxWidth: 300, lineHeight: 1.7 }}>
              Ask anything, or type <span style={{ color: modeColors.color, fontWeight: 600 }}>/imagine</span> to generate an image from a vibe
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", maxWidth: 320 }}>
              {["a neon Tokyo alley at 3am", "cosmic void energy", "cyberpunk neural forest"].map((hint) => (
                <button
                  key={hint}
                  onClick={() => { setInput(`/imagine ${hint}`); inputRef.current?.focus(); }}
                  style={{ background: `${modeColors.color}10`, border: `1px solid ${modeColors.color}33`, color: modeColors.color, fontSize: 11, padding: "4px 10px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
                >
                  🎨 {hint}
                </button>
              ))}
            </div>
            {hasVoice && <div style={{ fontSize: 12, color: Colors.textMuted }}>🎤 Voice input available</div>}
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} modeColor={modeColors.color} />
        ))}

        {streaming && streamingContent && (
          <MessageBubble message={{ role: "assistant", content: streamingContent }} modeColor={modeColors.color} isStreaming />
        )}

        {streaming && !streamingContent && !isImageGenerating && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ backgroundColor: Colors.aiBubble, border: `1px solid ${Colors.aiBubbleBorder}`, borderRadius: "4px 14px 14px 14px", padding: "14px 18px", display: "flex", gap: 6, alignItems: "center" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: modeColors.color, opacity: 0.6, animation: `voicePulse 1.2s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        )}

        {isImageGenerating && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ width: 300, height: 200, borderRadius: 14, overflow: "hidden", border: `1px solid ${modeColors.color}30`, background: `linear-gradient(90deg, #080810 0%, #12121E 40%, #1A1A2E 50%, #12121E 60%, #080810 100%)`, backgroundSize: "300% 100%", animation: "imgShimmer 2s ease-in-out infinite", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <div style={{ fontSize: 32 }}>🎨</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: modeColors.color, animation: "blink 1.4s ease-in-out infinite", letterSpacing: 1 }}>GENERATING IMAGE</div>
              <div style={{ fontSize: 10, color: Colors.textMuted }}>~15–30 seconds</div>
            </div>
          </div>
        )}

        {retryMsg && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              onClick={() => { void sendMessage(retryMsg); }}
              style={{ background: "rgba(255,68,102,0.1)", border: `1px solid ${Colors.error}44`, color: Colors.error, borderRadius: 10, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >↻ Retry</button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Upgrade modal */}
      {limitReached && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, backdropFilter: "blur(8px)" }}>
          <div style={{ backgroundColor: Colors.bgCard, border: `1px solid ${Colors.accent}`, borderRadius: 20, padding: 32, maxWidth: 360, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚡</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: Colors.text, marginBottom: 8 }}>Daily Limit Reached</div>
            <div style={{ fontSize: 14, color: Colors.textSecondary, lineHeight: 1.7, marginBottom: 24 }}>You've used all 10 free messages today. Upgrade to Pro for unlimited access across all modes.</div>
            <button onClick={() => navigate("/pricing")} style={{ width: "100%", padding: "14px 20px", borderRadius: 12, border: "none", backgroundColor: Colors.accent, color: Colors.bg, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 10 }}>
              Upgrade to Pro →
            </button>
            <button onClick={() => setLimitReached(false)} style={{ width: "100%", padding: "10px 20px", borderRadius: 12, border: `1px solid ${Colors.border}`, backgroundColor: "transparent", color: Colors.textSecondary, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* Input Bar */}
      <div style={{ position: "relative", zIndex: 2, padding: "10px 14px 18px", backgroundColor: "rgba(5,5,8,0.96)", backdropFilter: "blur(16px)", borderTop: `1px solid ${Colors.border}` }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, backgroundColor: Colors.bgInput, border: `1px solid ${Colors.borderBright}`, borderRadius: 18, padding: "8px 10px 8px 14px" }}>
          {/* Image gen button */}
          <button
            onClick={() => { setInput((v) => v.startsWith("/imagine ") ? v : "/imagine "); setTimeout(() => inputRef.current?.focus(), 0); }}
            title="Generate image from vibe (/imagine)"
            disabled={streaming}
            style={{ flexShrink: 0, width: 32, height: 32, borderRadius: "50%", background: "none", border: `1px solid ${Colors.border}`, color: Colors.textMuted, cursor: streaming ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontFamily: "inherit", transition: "all 0.15s" }}
            onMouseEnter={(e) => { if (!streaming) { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = Colors.accentGold; b.style.color = Colors.accentGold; } }}
            onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = Colors.border; b.style.color = Colors.textMuted; }}
          >🎨</button>
          {/* Voice button */}
          {hasVoice && (
            <button
              onClick={handleVoiceToggle}
              title={isListening ? "Stop listening" : "Voice input"}
              style={{ flexShrink: 0, width: 32, height: 32, borderRadius: "50%", background: isListening ? `${modeColors.color}22` : "none", border: `1px solid ${isListening ? modeColors.color : Colors.border}`, color: isListening ? modeColors.color : Colors.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontFamily: "inherit", transition: "all 0.15s", animation: isListening ? "voicePulse 1s ease-in-out infinite" : "none" }}
            >
              🎤
            </button>
          )}
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening..." : "Message GODMODE..."}
            disabled={streaming}
            rows={1}
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: Colors.text, fontSize: 15, fontFamily: "inherit", resize: "none", lineHeight: 1.5, minHeight: 24, maxHeight: 140, caretColor: modeColors.color, opacity: streaming ? 0.6 : 1, overflow: "hidden" }}
          />
          {streaming ? (
            <button onClick={handleStop} style={{ flexShrink: 0, width: 36, height: 36, borderRadius: "50%", backgroundColor: `${Colors.error}22`, border: `1px solid ${Colors.error}66`, color: Colors.error, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontFamily: "inherit" }}>■</button>
          ) : (
            <button
              onClick={() => { void sendMessage(); }}
              disabled={!input.trim()}
              style={{ flexShrink: 0, width: 36, height: 36, borderRadius: "50%", backgroundColor: input.trim() ? modeColors.color : Colors.border, border: "none", color: input.trim() ? Colors.bg : Colors.textMuted, cursor: input.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontFamily: "inherit", transition: "background-color 0.15s, color 0.15s" }}
            >↑</button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 7 }}>
          <span style={{ fontSize: 10, color: Colors.textMuted }}>🎨 /imagine [vibe] · Enter to send{hasVoice ? " · 🎤 voice" : ""}</span>
          {messages.some((m) => m.role === "assistant") && !streaming && (
            <button
              onClick={() => { void handleShare(); }}
              disabled={shareState === "sharing"}
              style={{ background: "none", border: `1px solid ${shareState === "shared" ? "#00FFCC" : Colors.border}`, color: shareState === "shared" ? "#00FFCC" : Colors.textMuted, fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 14, cursor: shareState === "sharing" ? "wait" : "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
            >
              {shareState === "shared" ? "✓ Shared!" : shareState === "sharing" ? "Sharing..." : "↗ Share"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
