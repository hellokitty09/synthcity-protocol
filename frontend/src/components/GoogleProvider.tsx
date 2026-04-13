"use client";
import { GoogleOAuthProvider } from '@react-oauth/google';

const CLIENT_ID = "46563670881-97ib4shudphbp9adq4ru8sfk4dbj964v.apps.googleusercontent.com";

export default function GoogleProvider({ children }: { children: React.ReactNode }) {
  if (!CLIENT_ID) return <>{children}</>;
  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      {children}
    </GoogleOAuthProvider>
  );
}
