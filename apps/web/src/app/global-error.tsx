"use client";

/**
 * Root error boundary — replaces the whole document, so globals.css and
 * the intl provider are unavailable here. Inline styles + bilingual copy.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="uz">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fafafa",
          color: "#18181b",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <div>
          <p style={{ fontSize: 44, margin: 0 }}>😕</p>
          <h1 style={{ fontSize: 22, margin: "16px 0 4px" }}>
            Nimadir xato ketdi
          </h1>
          <p style={{ color: "#71717a", margin: 0 }}>Что-то пошло не так</p>
          <p style={{ color: "#71717a", margin: "12px 0 0", fontSize: 14 }}>
            Qayta urinib ko&apos;ring · Попробуйте ещё раз
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 24,
              padding: "12px 28px",
              borderRadius: 12,
              border: "none",
              background: "#2563eb",
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Qayta urinish / Повторить
          </button>
        </div>
      </body>
    </html>
  );
}
