export default function NotFound() {
  return (
    <main className="loading-screen" style={{ minHeight: "70vh", padding: 24 }}>
      <strong style={{ fontSize: 28 }}>Page not found</strong>
      <p style={{ color: "var(--muted)" }}>This ZXH OFFICIAL page does not exist.</p>
      <a className="primary-btn" href="/">Back to Home</a>
    </main>
  );
}
