import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import Colors, { type GodMode } from "@/lib/colors";
import {
  loadConversations,
  migrateLocalStorageIfNeeded,
  createConversation,
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

function AmbientParticles({ accentColor }: { accentColor: string }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        id: i,
        left: `${(i * 17 + i * i * 3 + 5) % 95}%`,
        top: `${(i * 23 + i * 7 + 3) % 90}%`,
        size: i % 4 === 0 ? 2.5 : 1.5,
        isGold: i % 5 === 0,
        delay: `${(i * 0.37) % 4}s`,
        duration: `${2.5 + (i % 4) * 0.8}s`,
      })),
    []
  );

  return (
    <>
      <style>{`
        @keyframes twinkle { 0%,100%{opacity:0.06} 50%{opacity:0.4} }
        @keyframes floatUp { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            backgroundColor: p.isGold ? Colors.accentGold : accentColor,
            pointerEvents: "none",
            animation: `twinkle ${p.duration} ease-in-out infinite, floatUp ${parseFloat(p.duration) * 1.8}s ease-in-out infinite`,
            animationDelay: p.delay,
          }}
        />
      ))}
    </>
  );
}

function NavBtn({
  label,
  color,
  onClick,
}: {
  label: string;
  color: string;
  onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? `${color}12` : "none",
        border: `1px solid ${hov ? color : Colors.border}`,
        color: hov ? color : Colors.textSecondary,
        cursor: "pointer",
        fontSize: 11,
        fontWeight: 600,
        padding: "6px 12px",
        borderRadius: 16,
        fontFamily: "inherit",
        letterSpacing: 0.5,
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

export default function Home() {
  const [, navigate] = useLocation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedMode, setSelectedMode] = useState<GodMode>("genius");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [hoveredMode, setHoveredMode] = useState<GodMode | null>(null);
  const [hoveredConv, setHoveredConv] = useState<string | null>(null);

  const modeColors = Colors.modes[selectedMode];

  useEffect(() => {
    setLoading(true);
    void migrateLocalStorageIfNeeded()
      .catch(() => {})
      .then(() => loadConversations())
      .then((convs) => setConversations(convs))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = useCallback(async () => {
    if (creating) return;
    setCreating(true);
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
    try {
      await createConversation(newConv);
    } catch {}
    navigate(`/chat/${id}?mode=${selectedMode}`);
  }, [selectedMode, navigate, creating]);

  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Remove this conversation?")) return;
    setConversations((prev) => prev.filter((c) => c.id !== id));
    try {
      await deleteConversation(id);
    } catch {}
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
      {/* Ambient particles */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <AmbientParticles accentColor={modeColors.color} />
      </div>

      {/* Sacred Geometry */}
      <div
        style={{
          position: "fixed",
          top: -30,
          left: "50%",
          transform: "translateX(-50%)",
          opacity: 0.42,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <SacredGeometry
          size={360}
          accentColor={modeColors.color}
          goldColor={Colors.accentGold}
          opacity={1}
        />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          flex: 1,
        }}
      >
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
                fontWeight: 800,
                color: Colors.text,
                letterSpacing: -1,
                lineHeight: 1,
              }}
            >
              GODMODE
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <NavBtn
              label="</> Code"
              color={Colors.accentElectric}
              onClick={() => navigate("/codegen")}
            />
            <NavBtn
              label="◉ Hub"
              color="#C084FC"
              onClick={() => navigate("/community")}
            />
            <NavBtn
              label="⊕ Bot"
              color={Colors.accentGold}
              onClick={() => navigate("/trading")}
            />
            <button
              onClick={() => navigate("/pricing")}
              style={{
                background: "rgba(0,212,255,0.1)",
                border: `1px solid ${Colors.accent}`,
                color: Colors.accent,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                padding: "6px 14px",
                borderRadius: 16,
                fontFamily: "inherit",
                letterSpacing: 0.5,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(0,212,255,0.18)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(0,212,255,0.1)";
              }}
            >
              Pro ✦
            </button>
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
              const isHov = hoveredMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  onMouseEnter={() => setHoveredMode(mode.id)}
                  onMouseLeave={() => setHoveredMode(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    borderRadius: 22,
                    backgroundColor: isSelected
                      ? mc.bg
                      : isHov
                        ? `${mc.bg}88`
                        : Colors.bgCard,
                    border: `1px solid ${isSelected ? mc.color : isHov ? `${mc.color}55` : Colors.border}`,
                    color: isSelected
                      ? mc.color
                      : isHov
                        ? `${mc.color}bb`
                        : Colors.textMuted,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                    fontFamily: "inherit",
                    boxShadow: isSelected ? `0 0 18px ${mc.color}20` : "none",
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
            onClick={() => {
              void handleCreate();
            }}
            disabled={creating}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "16px 24px",
              borderRadius: 14,
              background: `linear-gradient(135deg, ${modeColors.color} 0%, ${modeColors.color}cc 100%)`,
              border: "none",
              color: Colors.bg,
              fontSize: 15,
              fontWeight: 700,
              cursor: creating ? "not-allowed" : "pointer",
              letterSpacing: 0.3,
              transition: "opacity 0.15s, transform 0.1s, box-shadow 0.15s",
              fontFamily: "inherit",
              boxShadow: `0 4px 24px ${modeColors.color}30`,
              opacity: creating ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!creating) {
                (e.currentTarget as HTMLButtonElement).style.opacity = "0.88";
                (
                  e.currentTarget as HTMLButtonElement
                ).style.boxShadow = `0 6px 32px ${modeColors.color}50`;
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "1";
              (
                e.currentTarget as HTMLButtonElement
              ).style.boxShadow = `0 4px 24px ${modeColors.color}30`;
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform =
                "scale(0.98)";
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform =
                "scale(1)";
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
            {creating ? "Starting..." : "New Session"}
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

          {loading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "40px 24px",
                opacity: 0.4,
              }}
            >
              <span style={{ fontSize: 13, color: Colors.textMuted }}>
                Loading...
              </span>
            </div>
          ) : conversations.length === 0 ? (
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
              <span style={{ fontSize: 48, opacity: 0.22 }}>
                {MODES.find((m) => m.id === selectedMode)?.icon}
              </span>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: Colors.textSecondary,
                }}
              >
                No sessions yet
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: Colors.textMuted,
                  textAlign: "center",
                  maxWidth: 260,
                  lineHeight: 1.6,
                }}
              >
                Choose a mode and start your first session
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
                const mc =
                  Colors.modes[conv.mode as GodMode] ?? Colors.modes.genius;
                const isHov = hoveredConv === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() =>
                      navigate(`/chat/${conv.id}?mode=${conv.mode}`)
                    }
                    onMouseEnter={() => setHoveredConv(conv.id)}
                    onMouseLeave={() => setHoveredConv(null)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      backgroundColor: isHov ? Colors.bgElevated : Colors.bgCard,
                      borderRadius: 14,
                      border: `1px solid ${isHov ? mc.color + "44" : Colors.border}`,
                      padding: 16,
                      gap: 12,
                      cursor: "pointer",
                      transition: "all 0.18s ease",
                      boxShadow: isHov ? `0 2px 18px ${mc.color}0e` : "none",
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: mc.color,
                        flexShrink: 0,
                        boxShadow: isHov ? `0 0 8px ${mc.color}` : "none",
                        transition: "box-shadow 0.18s",
                      }}
                    />
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
                            padding: "2px 7px",
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
                          {conv.messageCount === 1 ? "msg" : "msgs"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        void handleDelete(conv.id, e);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: Colors.textMuted,
                        cursor: "pointer",
                        padding: "4px 8px",
                        borderRadius: 6,
                        fontSize: 18,
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
