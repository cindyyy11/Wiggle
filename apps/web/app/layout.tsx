import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Wiggle",
  description: "An adaptive learning universe for curious minds.",
  icons: { icon: "/icon.png" }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning style={{ margin: 0 }}>
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
          background: "#fbbf24", color: "#1f2937", textAlign: "center",
          padding: "4px 12px", fontSize: 12, fontWeight: 600,
          pointerEvents: "none"
        }}>
          🚧 Wiggle is still in development — things may change or break.
        </div>
        {children}
      </body>
    </html>
  );
}
