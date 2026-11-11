import { useLocation } from "wouter";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <main
      className="min-h-screen w-full flex items-center justify-center px-6"
      style={{ background: "#050508", color: "#F0F0FF" }}
    >
      <section
        className="w-full max-w-md rounded-2xl p-7 text-center"
        style={{
          background: "#101018",
          border: "1px solid #29293A",
          boxShadow: "0 24px 80px rgba(0,0,0,.35)",
        }}
      >
        <div
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: "rgba(0,212,255,.1)", color: "#00D4FF" }}
        >
          <AlertCircle className="h-7 w-7" aria-hidden="true" />
        </div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[.25em]" style={{ color: "#00D4FF" }}>
          Evolved AI
        </p>
        <h1 className="mb-3 text-2xl font-bold">This path is off the map</h1>
        <p className="mb-7 text-sm leading-6" style={{ color: "#A4A4B8" }}>
          The page may have moved, or the address may be incorrect. Your workspace is still here.
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold"
          style={{ background: "#00D4FF", color: "#050508" }}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to GODMODE
        </button>
      </section>
    </main>
  );
}
