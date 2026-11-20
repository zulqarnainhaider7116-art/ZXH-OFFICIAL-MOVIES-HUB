"use client";

import dynamic from "next/dynamic";

const MoviboxExperience = dynamic(() => import("../src/MoviboxExperience.jsx"), {
  ssr: false,
  loading: () => (
    <div className="loading-screen" role="status" aria-live="polite">
      <span className="spin">◌</span>
      <span>Loading ZXH OFFICIAL MOVIES…</span>
    </div>
  ),
});

export default function ClientShell() {
  return <MoviboxExperience />;
}
