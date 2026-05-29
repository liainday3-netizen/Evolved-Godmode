import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useParams } from "wouter";
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
  const userId = getUserId();

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!id) return;
    const existing = loadConversation(id);
    if (existing) {
      setConv(existing);
      setMessages(existing.messages || []);
      setMode(existing.mode);
    }
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const modeColors = Colors.modes[mode];

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);
    setStreamingContent("");

    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ messages: newMessages, mode }),
        signal: abortRef.current.signal,
      });

      if (response.status === 402) {
        setLimitReached(true);
        setMessages(messages); // revert
        setStreaming(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullContent = "";
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
            if (data === "[DONE]") {
              reader.cancel();
              break;
            }
            try {
              const parsed = JSON.parse(data) as { content?: string; error?: string };
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.content) {
                fullContent += parsed.content;
                setStreamingContent(fullContent);
              }
            } catch (parseErr) {
              // ignore non-JSON lines
            }
          }
        }
      }

      const assistantMsg: Message = { role: "assistant", content: fullContent };
      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      setStreamingContent("");

      // Persist
      const updatedConv: Conversation = {
        id: id!,
        title: conv?.title ?? "Session",
        lastMessage: text,
        mode,
        timestamp: Date.now(),
        messageCount: finalMessages.length,
        messages: finalMessages,
      };
      setConv(updatedConv);
      upsertConversation(updatedConv);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        // user cancelled — ignore
      } else {
        const errMsg: Message = {
          role: "assistant",
          content: "An error occurred. Please try again.",
        };
        setMessages((prev) => [...prev, errMsg]);
      }
      setStreamingContent("");
    } finally {
      setStreaming(false);
      abortRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, messages, mode, streaming, id, conv]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
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
        body: JSON.stringify({
          userId,
          mode,
          prompt: lastUserMsg.content,
          response: lastAiMsg.content,
        }),
      });
      setShareState("shared");
      setTimeout(() => setShareState("idle"), 3000);
    } catch {
      setShareState("idle");
    }
  }, [messages, mode, userId]);

  const modeMeta = MODES_META[mode];

  return (
    <div
      style={{
        height: "100vh",
        backgroundColor: Colors.bg,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Sacred Geometry background */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          opacity: 0.18,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <SacredGeometry
          size={400}
          accentColor={modeColors.color}
          goldColor={Colors.accentGold}
          opacity={1}
        />
      </div>

      {/* Header */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 20px 16px",
          borderBottom: `1px solid ${Colors.border}`,
          backgroundColor: "rgba(5,5,8,0.9)",
          backdropFilter: "blur(12px)",
        }}
      >
        <button
          onClick={() => navigate("/")}
          style={{
            background: "none",
            border: "none",
            color: Colors.textSecondary,
            cursor: "pointer",
            padding: "6px 10px",
            borderRadius: 8,
            fontSize: 20,
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "inherit",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = Colors.text;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              Colors.textSecondary;
          }}
        >
          ←
        </button>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: Colors.text,
              letterSpacing: 0.5,
            }}
          >
            GODMODE
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 10px",
              borderRadius: 12,
              backgroundColor: modeColors.bg,
              border: `1px solid ${modeColors.color}33`,
              marginTop: 4,
            }}
          >
            <span style={{ fontSize: 11 }}>{modeMeta.icon}</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: modeColors.color,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              {modeMeta.label}
            </span>
          </div>
        </div>
        <div style={{ width: 48 }} />
      </div>

      {/* Messages */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          overflowY: "auto",
          padding: "20px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {messages.length === 0 && !streaming && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 12,
              opacity: 0.6,
            }}
          >
            <span style={{ fontSize: 40 }}>{modeMeta.icon}</span>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: Colors.textSecondary,
              }}
            >
              {modeMeta.label} Mode
            </div>
            <div
              style={{
                fontSize: 13,
                color: Colors.textMuted,
                textAlign: "center",
                maxWidth: 280,
                lineHeight: 1.5,
              }}
            >
              Ask anything. GODMODE is ready.
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} modeColor={modeColors.color} />
        ))}

        {streaming && streamingContent && (
          <MessageBubble
            message={{ role: "assistant", content: streamingContent }}
            modeColor={modeColors.color}
            isStreaming
          />
        )}

        {streaming && !streamingContent && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div
              style={{
                backgroundColor: Colors.aiBubble,
                border: `1px solid ${Colors.aiBubbleBorder}`,
                borderRadius: "4px 14px 14px 14px",
                padding: "12px 16px",
                display: "flex",
                gap: 6,
                alignItems: "center",
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: modeColors.color,
                    opacity: 0.6,
                    animation: `sgPulse 1.2s ease-in-out infinite`,
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
              <style>{`
                @keyframes typingDot {
                  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
                  40% { opacity: 1; transform: scale(1); }
                }
              `}</style>
              {[0, 1, 2].map((i) => (
                <div
                  key={`td${i}`}
                  style={{
                    position: "absolute",
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: modeColors.color,
                    animation: `typingDot 1.2s ease-in-out infinite`,
                    animationDelay: `${i * 0.2}s`,
                    display: "none",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Upgrade modal overlay */}
      {limitReached && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ backgroundColor: Colors.bgCard, border: `1px solid ${Colors.accent}`, borderRadius: 20, padding: 32, maxWidth: 360, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚡</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: Colors.text, marginBottom: 8 }}>Daily Limit Reached</div>
            <div style={{ fontSize: 14, color: Colors.textSecondary, lineHeight: 1.6, marginBottom: 24 }}>
              You've used all 10 free messages today. Upgrade to Pro for unlimited AI access across all modes.
            </div>
            <button
              onClick={() => navigate("/pricing")}
              style={{ width: "100%", padding: "14px 20px", borderRadius: 12, border: "none", backgroundColor: Colors.accent, color: Colors.bg, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 10 }}
            >
              Upgrade to Pro →
            </button>
            <button
              onClick={() => setLimitReached(false)}
              style={{ width: "100%", padding: "10px 20px", borderRadius: 12, border: `1px solid ${Colors.border}`, backgroundColor: "transparent", color: Colors.textSecondary, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* Input Bar */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "12px 16px 20px",
          backgroundColor: "rgba(5,5,8,0.95)",
          backdropFilter: "blur(12px)",
          borderTop: `1px solid ${Colors.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 10,
            backgroundColor: Colors.bgInput,
            border: `1px solid ${Colors.borderBright}`,
            borderRadius: 16,
            padding: "10px 14px",
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Message GODMODE..."
            disabled={streaming}
            rows={1}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: Colors.text,
              fontSize: 15,
              fontFamily: "inherit",
              resize: "none",
              lineHeight: 1.5,
              minHeight: 24,
              maxHeight: 140,
              caretColor: modeColors.color,
              opacity: streaming ? 0.6 : 1,
              overflow: "hidden",
            }}
          />
          {streaming ? (
            <button
              onClick={handleStop}
              style={{ flexShrink: 0, width: 36, height: 36, borderRadius: "50%", backgroundColor: Colors.error + "22", border: `1px solid ${Colors.error}66`, color: Colors.error, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontFamily: "inherit" }}
              title="Stop generating"
            >
              ■
            </button>
          ) : (
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              style={{ flexShrink: 0, width: 36, height: 36, borderRadius: "50%", backgroundColor: input.trim() ? modeColors.color : Colors.border, border: "none", color: input.trim() ? Colors.bg : Colors.textMuted, cursor: input.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontFamily: "inherit", transition: "background-color 0.15s, color 0.15s" }}
              title="Send"
            >
              ↑
            </button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
          <span style={{ fontSize: 10, color: Colors.textMuted }}>Enter to send · Shift+Enter for new line</span>
          {messages.some((m) => m.role === "assistant") && !streaming && (
            <button
              onClick={handleShare}
              disabled={shareState === "sharing"}
              style={{ background: "none", border: `1px solid ${shareState === "shared" ? "#00FFCC" : Colors.border}`, color: shareState === "shared" ? "#00FFCC" : Colors.textMuted, fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 16, cursor: shareState === "sharing" ? "wait" : "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
            >
              {shareState === "shared" ? "✓ Shared!" : shareState === "sharing" ? "Sharing..." : "↗ Share"}
            </button>
          )}
        </div>
      </div>
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

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
      }}
    >
      <div
        style={{
          maxWidth: "82%",
          padding: "12px 16px",
          borderRadius: isUser ? "14px 14px 4px 14px" : "4px 14px 14px 14px",
          backgroundColor: isUser ? Colors.userBubble : Colors.aiBubble,
          border: `1px solid ${isUser ? Colors.userBubbleBorder : Colors.aiBubbleBorder}`,
          color: Colors.text,
          fontSize: 14,
          lineHeight: 1.65,
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
          position: "relative",
        }}
      >
        {message.content}
        {isStreaming && (
          <span
            style={{
              display: "inline-block",
              width: 2,
              height: 14,
              backgroundColor: modeColor,
              marginLeft: 2,
              verticalAlign: "text-bottom",
              animation: "sgPulse 0.8s ease-in-out infinite",
            }}
          />
        )}
      </div>
    </div>
  );
}
