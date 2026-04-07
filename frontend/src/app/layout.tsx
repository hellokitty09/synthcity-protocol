import type { Metadata } from "next";
import "./globals.css";
import GoogleProvider from "@/components/GoogleProvider";
import { ProtocolProvider } from "@/lib/useProtocol";
import { AuthProvider } from "@/components/AuthGuard";
import { Sidebar } from "@/components/Sidebar";

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
        <GoogleProvider>
          <ProtocolProvider>
            <AuthProvider>
              <Sidebar />
              {children}
            </AuthProvider>
          </ProtocolProvider>
        </GoogleProvider>
      </body>
    </html>
  );
}


