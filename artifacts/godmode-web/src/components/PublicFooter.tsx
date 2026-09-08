import React from "react";

export default function PublicFooter() {
  const basePath = import.meta.env.BASE_URL ?? "/";
  const privacyHref = `${basePath.replace(/\/?$/, "/")}privacy`;

  return (
    <footer
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: "8px 18px",
        padding: "24px 24px 28px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        color: "#404060",
        fontSize: 11,
        lineHeight: 1.5,
        textAlign: "center",
      }}
    >
      <span>© {new Date().getFullYear()} GODMODE</span>
      <span aria-hidden="true">·</span>
      <a
        href={privacyHref}
        style={{
          color: "#7070A0",
          textDecoration: "none",
          transition: "color 0.15s",
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.color = "#00D4FF";
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.color = "#7070A0";
        }}
      >
        Privacy Policy
      </a>
    </footer>
  );
}