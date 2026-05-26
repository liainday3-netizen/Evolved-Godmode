import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import Colors, { type GodMode } from "@/lib/colors";
import {
  loadConversations,
  saveConversations,
  deleteConversation,
  timeAgo,
  type Conversation,
} from "@/lib/storage";
import { SacredGeometry } from "@/components/SacredGeometry";

const MODES: { id: GodMode; label: string; desc: string; icon: string }[] = [
  { id: "genius", label: "Genius", desc: "All-knowing intellect", icon: "⚡" },
  { id: "coder", label: "Coder", desc: "Elite engineer", icon: "</>" },
  { id: "strategist", label: "Strategist", desc: "Supreme tactician", icon: "◈" },
  { id: "oracle", label: "Oracle", desc: "Visionary wisdom", icon: "◉" },
];

export default function Home() {
  const [, navigate] = useLocation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedMode, setSelectedMode] = useState<GodMode>("genius");

  useEffect(() => {
    setConversations(loadConversations());
  }, []);

  const modeColors = Colors.modes[selectedMode];

  const createConversation = useCallback(() => {
    const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const modeLabel = MODES.find((m) => m.id === selectedMode)?.label ?? "Genius";
    const newConv: Conversation = {
      id,
      title: `${modeLabel} Session`,
      lastMessage: "",
      mode: selectedMode,
      timestamp: Date.now(),
      messageCount: 0,
      messages: [],
    };
    const all = loadConversations();
    const updated = [newConv, ...all];
    saveConversations(updated);
    setConversations(updated);
    navigate(`/chat/${id}?mode=${selectedMode}`);
  }, [selectedMode, navigate]);

  const handleDelete = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Remove this conversation from history?")) return;
    deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: Colors.bg,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Sacred Geometry Background */}
      <div
        style={{
          position: "fixed",
          top: -20,
          left: "50%",
          transform: "translateX(-50%)",
          opacity: 0.5,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <SacredGeometry
          size={340}
          accentColor={modeColors.color}
          goldColor={Colors.accentGold}
          opacity={1}
        />
      </div>

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1 }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "32px 24px 20px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: Colors.accent,
                letterSpacing: 3,
                marginBottom: 4,
                textTransform: "uppercase",
              }}
            >
              Evolved AI
            </div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: Colors.text,
                letterSpacing: -1,
                lineHeight: 1,
              }}
            >
              GODMODE
            </div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              backgroundColor: "rgba(0,212,255,0.1)",
              border: "1px solid rgba(0,212,255,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "pulse-dot 2.5s ease-in-out infinite",
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: Colors.accent,
              }}
            />
          </div>
        </div>

        {/* Mode Selector */}
        <div style={{ padding: "0 24px 20px" }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: Colors.textMuted,
              letterSpacing: 2,
              marginBottom: 10,
              textTransform: "uppercase",
            }}
          >
            Select Mode
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {MODES.map((mode) => {
              const mc = Colors.modes[mode.id];
              const isSelected = selectedMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 14px",
                    borderRadius: 20,
                    backgroundColor: isSelected ? mc.bg : Colors.bgCard,
                    border: `1px solid ${isSelected ? mc.color : Colors.border}`,
                    color: isSelected ? mc.color : Colors.textMuted,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    fontFamily: "inherit",
                  }}
                >
                  <span style={{ fontSize: 11 }}>{mode.icon}</span>
                  {mode.label}
                </button>
              );
            })}
          </div>
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: Colors.textSecondary,
              minHeight: 18,
            }}
          >
            {MODES.find((m) => m.id === selectedMode)?.desc}
          </div>
        </div>

        {/* New Session Button */}
        <div style={{ padding: "0 24px 24px" }}>
          <button
            onClick={createConversation}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "16px 24px",
              borderRadius: 14,
              backgroundColor: Colors.accent,
              border: "none",
              color: Colors.bg,
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: 0.3,
              transition: "opacity 0.15s, transform 0.1s",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "0.88";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "1";
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.98)";
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
            New Session
          </button>
        </div>

        {/* Sessions List */}
        <div style={{ flex: 1, overflow: "auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 24px 8px",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: Colors.textMuted,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              Sessions
            </span>
            {conversations.length > 0 && (
              <span style={{ fontSize: 12, color: Colors.textMuted }}>
                {conversations.length}
              </span>
            )}
          </div>

          {conversations.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "60px 24px",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 48, opacity: 0.3 }}>⚡</span>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: Colors.textSecondary,
                }}
              >
                No sessions yet
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: Colors.textMuted,
                  textAlign: "center",
                  maxWidth: 260,
                  lineHeight: 1.5,
                }}
              >
                Choose a mode and start a new session
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: "0 16px 32px",
              }}
            >
              {conversations.map((conv) => {
                const mc = Colors.modes[conv.mode];
                return (
                  <div
                    key={conv.id}
                    onClick={() =>
                      navigate(`/chat/${conv.id}?mode=${conv.mode}`)
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      backgroundColor: Colors.bgCard,
                      borderRadius: 14,
                      border: `1px solid ${Colors.border}`,
                      padding: 16,
                      gap: 12,
                      cursor: "pointer",
                      transition: "border-color 0.15s, background-color 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor =
                        Colors.borderBright;
                      (e.currentTarget as HTMLDivElement).style.backgroundColor =
                        Colors.bgElevated;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor =
                        Colors.border;
                      (e.currentTarget as HTMLDivElement).style.backgroundColor =
                        Colors.bgCard;
                    }}
                  >
                    {/* Mode dot */}
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: mc.color,
                        flexShrink: 0,
                      }}
                    />

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: Colors.text,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flex: 1,
                            marginRight: 8,
                          }}
                        >
                          {conv.title}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: Colors.textMuted,
                            flexShrink: 0,
                          }}
                        >
                          {timeAgo(conv.timestamp)}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: Colors.textSecondary,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          marginBottom: 6,
                        }}
                      >
                        {conv.lastMessage || "New conversation"}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "2px 6px",
                            borderRadius: 6,
                            backgroundColor: mc.bg,
                            fontSize: 9,
                            fontWeight: 700,
                            color: mc.color,
                            letterSpacing: 1,
                            textTransform: "uppercase",
                          }}
                        >
                          {conv.mode}
                        </span>
                        <span style={{ fontSize: 11, color: Colors.textMuted }}>
                          {conv.messageCount}{" "}
                          {conv.messageCount === 1 ? "message" : "messages"}
                        </span>
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDelete(conv.id, e)}
                      style={{
                        background: "none",
                        border: "none",
                        color: Colors.textMuted,
                        cursor: "pointer",
                        padding: "4px 8px",
                        borderRadius: 6,
                        fontSize: 16,
                        flexShrink: 0,
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color =
                          Colors.error;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color =
                          Colors.textMuted;
                      }}
                      title="Delete conversation"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
