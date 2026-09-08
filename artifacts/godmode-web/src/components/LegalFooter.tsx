import { useLocation } from "wouter";
import Colors from "@/lib/colors";

export default function LegalFooter() {
  const [, navigate] = useLocation();

  return (
    <footer
      style={{
        width: "100%",
        maxWidth: 920,
        margin: "auto auto 0",
        padding: "28px 24px 30px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        borderTop: `1px solid ${Colors.border}`,
        color: Colors.textMuted,
        fontSize: 11,
        boxSizing: "border-box",
      }}
    >
      <span>© 2026 GODMODE</span>
      <button
        type="button"
        onClick={() => navigate("/privacy")}
        style={{
          border: 0,
          padding: 0,
          background: "none",
          color: Colors.textSecondary,
          cursor: "pointer",
          font: "inherit",
        }}
      >
        Privacy Policy
      </button>
    </footer>
  );
}