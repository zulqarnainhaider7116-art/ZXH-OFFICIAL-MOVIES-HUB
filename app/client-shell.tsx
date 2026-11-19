"use client";

import dynamic from "next/dynamic";

const ExistingMovieHub = dynamic(() => import("../src/main.jsx"), {
  ssr: false,
  loading: () => (
    <div className="loading-screen" role="status" aria-live="polite">
      <span className="spin">◌</span>
      <span>Loading ZXH OFFICIAL…</span>
    </div>
  ),
});

export default function ClientShell() {
  return <ExistingMovieHub />;
}
