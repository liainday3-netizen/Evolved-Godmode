const CYAN = "#00D4FF";
const GOLD = "#C8A84B";
const ELECTRIC = "#00FFCC";

export const Colors = {
  bg: "#050508",
  bgCard: "#0C0C12",
  bgElevated: "#12121A",
  bgInput: "#16161F",
  border: "#1E1E2E",
  borderBright: "#2A2A40",
  accent: CYAN,
  accentGold: GOLD,
  accentElectric: ELECTRIC,
  accentDim: "rgba(0, 212, 255, 0.15)",
  accentGoldDim: "rgba(200, 168, 75, 0.15)",
  text: "#F0F0FF",
  textSecondary: "#7070A0",
  textMuted: "#404060",
  userBubble: "#001A2E",
  userBubbleBorder: "rgba(0, 212, 255, 0.3)",
  aiBubble: "#0C0C14",
  aiBubbleBorder: "#1E1E2E",
  success: "#00FF88",
  error: "#FF4466",
  modes: {
    genius: { color: CYAN, bg: "rgba(0,212,255,0.1)" },
    coder: { color: ELECTRIC, bg: "rgba(0,255,204,0.1)" },
    strategist: { color: GOLD, bg: "rgba(200,168,75,0.1)" },
    oracle: { color: "#C084FC", bg: "rgba(192,132,252,0.1)" },
  },
} as const;

export type GodMode = "genius" | "coder" | "strategist" | "oracle";

export default Colors;
