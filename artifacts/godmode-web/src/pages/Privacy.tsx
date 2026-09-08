import React, { useEffect } from "react";
import { useLocation } from "wouter";
import Colors from "@/lib/colors";
import PublicFooter from "@/components/PublicFooter";

const POLICY_DESCRIPTION =
  "Learn how GODMODE handles account information, AI requests, image generation, subscriptions, payments, and support.";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: 34 }}>
      <h2
        style={{
          margin: 0,
          color: Colors.text,
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: -0.2,
        }}
      >
        {title}
      </h2>
      <div
        style={{
          marginTop: 10,
          color: Colors.textSecondary,
          fontSize: 14,
          lineHeight: 1.75,
        }}
      >
        {children}
      </div>
    </section>
  );
}

export default function Privacy() {
  const [, navigate] = useLocation();

  useEffect(() => {
    document.title = "Privacy Policy — GODMODE";
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute("content", POLICY_DESCRIPTION);
    const ogDescription = document.querySelector('meta[property="og:description"]');
    ogDescription?.setAttribute("content", POLICY_DESCRIPTION);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    ogTitle?.setAttribute("content", "Privacy Policy — GODMODE");
  }, []);

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
      <main
        style={{
          width: "100%",
          maxWidth: 820,
          margin: "0 auto",
          padding: "24px 24px 56px",
          flex: 1,
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            paddingBottom: 34,
            borderBottom: `1px solid ${Colors.border}`,
          }}
        >
          <button
            type="button"
            onClick={() => navigate("/")}
            aria-label="Back to GODMODE"
            style={{
              border: `1px solid ${Colors.border}`,
              borderRadius: 10,
              background: "transparent",
              color: Colors.textSecondary,
              cursor: "pointer",
              fontSize: 20,
              lineHeight: 1,
              padding: "7px 11px",
              fontFamily: "inherit",
            }}
          >
            ←
          </button>
          <div>
            <div
              style={{
                color: Colors.accent,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 2.5,
                textTransform: "uppercase",
              }}
            >
              GODMODE
            </div>
            <div
              style={{
                color: Colors.text,
                fontSize: 13,
                fontWeight: 600,
                marginTop: 4,
              }}
            >
              Privacy & transparency
            </div>
          </div>
        </header>

        <article>
          <div style={{ paddingTop: 42 }}>
            <div
              style={{
                color: Colors.accentGold,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 2.5,
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Privacy Policy
            </div>
            <h1
              style={{
                margin: 0,
                color: Colors.text,
                fontSize: "clamp(32px, 6vw, 48px)",
                fontWeight: 800,
                letterSpacing: -1.5,
                lineHeight: 1.08,
              }}
            >
              Your data, clearly explained.
            </h1>
            <p
              style={{
                margin: "16px 0 0",
                color: Colors.textSecondary,
                fontSize: 15,
                lineHeight: 1.7,
              }}
            >
              Last updated: September 8, 2026
            </p>
          </div>

          <Section title="1. Scope">
            <p>
              This Privacy Policy explains how GODMODE (“GODMODE,” “we,” “us,”
              or “our”) collects, uses, shares, and protects information when
              you use the GODMODE website, chat, Image Studio, code generation,
              and related services (collectively, the “Services”).
            </p>
          </Section>

          <Section title="2. Information we collect">
            <p>
              <strong style={{ color: Colors.text }}>Account and device data.</strong>{" "}
              We may receive an account or device identifier used to keep your
              sessions, conversation history, usage limits, and subscription
              status associated with you. If you purchase a subscription, we
              also collect the email address you provide for checkout and
              receipts.
            </p>
            <p style={{ marginTop: 12 }}>
              <strong style={{ color: Colors.text }}>AI requests and conversations.</strong>{" "}
              We collect the prompts, messages, mode selections, generated
              responses, and conversation metadata you submit or save so we can
              provide the Services, maintain conversation history, enforce
              usage limits, and improve reliability.
            </p>
            <p style={{ marginTop: 12 }}>
              <strong style={{ color: Colors.text }}>Image generation.</strong>{" "}
              When you use Image Studio, we collect your image prompt and the
              resulting image or generation metadata needed to return, display,
              and download the result.
            </p>
            <p style={{ marginTop: 12 }}>
              <strong style={{ color: Colors.text }}>Technical information.</strong>{" "}
              We may receive basic request, browser, device, and diagnostic
              information such as timestamps, network information, and error
              logs to secure and operate the Services.
            </p>
          </Section>

          <Section title="3. How we use information">
            <p>We use information to:</p>
            <ul style={{ margin: "10px 0 0", paddingLeft: 22 }}>
              <li>provide, personalize, and maintain GODMODE features;</li>
              <li>process subscriptions, payments, receipts, and account support;</li>
              <li>send your requests to the appropriate AI or image-generation service;</li>
              <li>prevent abuse, enforce usage limits, and protect the Services;</li>
              <li>diagnose errors and improve performance; and</li>
              <li>meet legal, accounting, and security obligations.</li>
            </ul>
            <p style={{ marginTop: 12 }}>
              We do not sell your personal information. We do not use your
              private prompts or conversations to advertise to you.
            </p>
          </Section>

          <Section title="4. AI requests and image generation">
            <p>
              To provide an answer or image, your request and the information
              needed to fulfill it may be processed by our service providers,
              including AI infrastructure providers. Requests may be retained
              in our systems as part of your conversation or generation history.
              Do not submit confidential information, passwords, payment card
              numbers, or other information you would not want processed by
              these providers.
            </p>
            <p style={{ marginTop: 12 }}>
              AI-generated text, code, and images can be inaccurate or
              incomplete. You are responsible for reviewing generated content
              before relying on or sharing it.
            </p>
          </Section>

          <Section title="5. Payments and subscriptions">
            <p>
              Payments and subscription management are handled by Stripe. We
              receive payment-related account information such as your Stripe
              customer identifier, subscription status, plan, and the email
              address you provide. Stripe processes your payment card details
              directly; GODMODE does not store full payment card numbers.
              Stripe’s handling of information is governed by its own privacy
              policy and terms.
            </p>
          </Section>

          <Section title="6. When we share information">
            <p>
              We share information only as needed to operate the Services. This
              includes service providers that host our application, process AI
              or image requests, process payments, store data, provide security,
              or help us diagnose technical issues. These providers may process
              information on our behalf and are expected to protect it.
            </p>
            <p style={{ marginTop: 12 }}>
              We may also disclose information when required by law, to respond
              to valid legal process, or to protect the rights, safety, and
              security of our users, GODMODE, or others. We may transfer
              information as part of a merger, acquisition, financing, or sale
              of assets, subject to applicable law.
            </p>
          </Section>

          <Section title="7. Retention and deletion">
            <p>
              We retain account identifiers, conversation and generation
              history, and subscription records for as long as reasonably
              necessary to provide the Services, maintain business and
              financial records, resolve disputes, prevent abuse, and satisfy
              legal obligations. You can delete conversations from the
              Services where that feature is available. To request deletion of
              information associated with your account or device identifier,
              contact us at{" "}
              <a
                href="mailto:support@godmode.ai"
                style={{ color: Colors.accent, textDecoration: "underline" }}
              >
                support@godmode.ai
              </a>
              . Some information may remain in backups or records where
              retention is required by law or reasonably necessary for
              security and fraud prevention.
            </p>
          </Section>

          <Section title="8. Security">
            <p>
              We use reasonable administrative, technical, and organizational
              safeguards designed to protect information. No online service is
              completely secure, so please use care when choosing what to
              include in a prompt and contact us promptly if you believe your
              account or information has been compromised.
            </p>
          </Section>

          <Section title="9. Your choices and rights">
            <p>
              Depending on where you live, you may have rights to access,
              correct, delete, or restrict the processing of your personal
              information, or to object to certain processing. Contact us at{" "}
              <a
                href="mailto:support@godmode.ai"
                style={{ color: Colors.accent, textDecoration: "underline" }}
              >
                support@godmode.ai
              </a>{" "}
              to make a request. We may need to verify your request before
              completing it.
            </p>
          </Section>

          <Section title="10. Children">
            <p>
              The Services are not directed to children under 13, and we do not
              knowingly collect personal information from children under 13. If
              you believe a child has provided information to us, please
              contact us so we can take appropriate action.
            </p>
          </Section>

          <Section title="11. Changes to this policy">
            <p>
              We may update this policy as the Services or legal requirements
              change. We will post the updated policy on this page and revise
              the “Last updated” date. Your continued use of the Services after
              an update means the updated policy applies to your use.
            </p>
          </Section>

          <Section title="12. Contact us">
            <p>
              Questions, privacy requests, and support inquiries can be sent to{" "}
              <a
                href="mailto:support@godmode.ai"
                style={{ color: Colors.accent, textDecoration: "underline" }}
              >
                support@godmode.ai
              </a>
              .
            </p>
          </Section>
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}