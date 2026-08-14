"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: "#14171b",
            border: "1px solid #23272d",
            color: "#f5f6f8",
          },
        }}
      />
    </SessionProvider>
  );
}
