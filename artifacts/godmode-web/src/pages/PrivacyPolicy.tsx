import { useLocation } from "wouter";
import Colors from "@/lib/colors";
import LegalFooter from "@/components/LegalFooter";

const sections = [
  {
    title: "1. Information we collect",
    paragraphs: [
      "When you use GODMODE, we may collect information you provide directly, including your account identifier, prompts, messages, uploaded or generated images, and feedback.",
      "We also receive technical and usage information needed to operate and secure the service, such as device and browser details, approximate activity times, diagnostic logs, feature usage, and rate-limit information.",
      "When you subscribe, payment details are handled by Stripe. GODMODE receives the billing identifiers, subscription status, and transaction metadata needed to provide your plan; we do not receive or store your full card number.",
    ],
  },
  {
    title: "2. How we use information",
    paragraphs: [
      "We use information to provide GODMODE features, generate responses and images, save your conversations, process subscriptions, enforce usage limits, prevent abuse, troubleshoot failures, improve reliability, and communicate about your account or the service.",
      "We may use de-identified or aggregated information to understand feature performance and improve the product. We do not use your private conversations to advertise to you.",
    ],
  },
  {
    title: "3. AI and service providers",
    paragraphs: [
      "Your prompts, uploaded content, and related context may be sent to the AI and infrastructure providers required to deliver the feature you request. These providers process data on our behalf under their applicable terms and security practices.",
      "Stripe processes payment and subscription activity. We may also use hosting, database, analytics, security, and customer-support providers. We share only the information reasonably needed for those providers to perform their services.",
    ],
  },
  {
    title: "4. When we share information",
    paragraphs: [
      "We do not sell your personal information. We may share information with service providers, when you choose to publish content to a community feature, to comply with law or legal process, to protect users and the service, or as part of a merger, acquisition, financing, or other business transfer.",
    ],
  },
  {
    title: "5. Retention and deletion",
    paragraphs: [
      "We retain information for as long as needed to provide the service, maintain business and security records, resolve disputes, enforce agreements, and meet legal obligations. Retention periods vary by data type and purpose.",
      "You may request deletion of your account information and saved content through the support channel made available in the GODMODE app or website. Some information may be retained where required by law or reasonably necessary for security, fraud prevention, billing records, or dispute resolution.",
    ],
  },
  {
    title: "6. Your choices and rights",
    paragraphs: [
      "Depending on where you live, you may have rights to access, correct, export, restrict, object to, or delete certain personal information. You may also withdraw consent where processing is based on consent. We will verify requests as needed to protect your account and respond as required by applicable law.",
    ],
  },
  {
    title: "7. Security",
    paragraphs: [
      "We use reasonable technical and organizational safeguards designed to protect information against unauthorized access, loss, misuse, or alteration. No online service can guarantee absolute security, so please avoid submitting secrets, payment card numbers, or other highly sensitive information in prompts.",
    ],
  },
  {
    title: "8. Children",
    paragraphs: [
      "GODMODE is not directed to children under 13, or the higher minimum age required in your location. We do not knowingly collect personal information from children. If you believe a child has provided information, please contact us through the support channel available in the service.",
    ],
  },
  {
    title: "9. International use",
    paragraphs: [
      "GODMODE and its service providers may process information in countries other than the one where you live. Where required, we use appropriate safeguards for cross-border transfers.",
    ],
  },
  {
    title: "10. Changes to this policy",
    paragraphs: [
      "We may update this policy as GODMODE changes. We will post the updated version here and revise the effective date. Your continued use of the service after an update means the updated policy applies to future use.",
    ],
  },
];

export default function PrivacyPolicy() {
  const [, navigate] = useLocation();

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: Colors.bg,
        color: Colors.text,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          width: "100%",
          maxWidth: 920,
          margin: "0 auto",
          padding: "28px 24px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxSizing: "border-box",
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/")}
          aria-label="Back to GODMODE"
          style={{
            border: 0,
            background: "none",
            color: Colors.textSecondary,
            cursor: "pointer",
            fontSize: 22,
            padding: "4px 8px",
            fontFamily: "inherit",
          }}
        >
          ←
        </button>
        <span
          style={{
            color: Colors.accent,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 2,
          }}
        >
          GODMODE
        </span>
      </header>

      <main
        style={{
          width: "100%",
          maxWidth: 760,
          margin: "0 auto",
          padding: "34px 24px 56px",
          boxSizing: "border-box",
          flex: 1,
        }}
      >
        <div
          style={{
            color: Colors.accent,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 3,
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          Legal
        </div>
        <h1
          style={{
            margin: 0,
            color: Colors.text,
            fontSize: "clamp(32px, 6vw, 52px)",
            lineHeight: 1.05,
            letterSpacing: -1.5,
          }}
        >
          Privacy Policy
        </h1>
        <p
          style={{
            margin: "16px 0 0",
            color: Colors.textSecondary,
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          Effective September 8, 2026
        </p>

        <div
          style={{
            marginTop: 40,
            padding: "18px 20px",
            border: `1px solid ${Colors.accentDim}`,
            borderRadius: 14,
            backgroundColor: "rgba(0,212,255,0.04)",
            color: Colors.textSecondary,
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          This policy explains how GODMODE handles information when you use
          our AI chat, code, community, trading, and image-generation features.
        </div>

        <div style={{ marginTop: 42 }}>
          {sections.map((section) => (
            <section key={section.title} style={{ marginBottom: 34 }}>
              <h2
                style={{
                  margin: "0 0 12px",
                  color: Colors.text,
                  fontSize: 18,
                  lineHeight: 1.35,
                }}
              >
                {section.title}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  style={{
                    margin: "0 0 12px",
                    color: Colors.textSecondary,
                    fontSize: 14,
                    lineHeight: 1.8,
                  }}
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}