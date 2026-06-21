"use client";
import { GoogleOAuthProvider } from '@react-oauth/google';

const CLIENT_ID = "268233101037-3idedvdoi6s6lcjgsqm251nh3nbc16ss.apps.googleusercontent.com";

export default function GoogleProvider({ children }: { children: React.ReactNode }) {
  if (!CLIENT_ID) return <>{children}</>;
  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      {children}
    </GoogleOAuthProvider>
  );
}
