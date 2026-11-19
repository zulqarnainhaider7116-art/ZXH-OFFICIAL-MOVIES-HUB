"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("ZXH application error:", error); }, [error]);
  return (
    <main className="loading-screen" style={{ minHeight: "70vh", padding: 24 }}>
      <strong style={{ fontSize: 24 }}>Something went wrong</strong>
      <p style={{ color: "var(--muted)", maxWidth: 420, textAlign: "center" }}>The page could not be loaded. Your saved list and browsing history remain in this browser.</p>
      <button className="primary-btn" onClick={() => reset()}>Try again</button>
    </main>
  );
}
