import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SynthCity — Autonomous Prediction Protocol",
  description:
    "A living 3D terrarium of autonomous AI agents competing in multi-domain volatility prediction markets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Silkscreen&family=VT323&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg font-pixel text-warm">
        <GoogleProviderWrapper>
          <ProtocolProviderWrapper>
            <AuthGuardWrapper>
              <SidebarWrapper />
              {children}
            </AuthGuardWrapper>
          </ProtocolProviderWrapper>
        </GoogleProviderWrapper>
      </body>
    </html>
  );
}

// Client component wrapper for sidebar 
import dynamic from "next/dynamic";
const SidebarWrapper = dynamic(
  () => import("@/components/Sidebar").then((m) => ({ default: m.Sidebar })),
  { ssr: false }
);
const ProtocolProviderWrapper = dynamic(
  () => import("@/lib/useProtocol").then((m) => ({ default: m.ProtocolProvider })),
  { ssr: false }
);
const AuthGuardWrapper = dynamic(
  () => import("@/components/AuthGuard").then((m) => ({ default: m.AuthProvider })),
  { ssr: false }
);
const GoogleProviderWrapper = dynamic(
  () => import("@/components/GoogleProvider"),
  { ssr: false }
);
