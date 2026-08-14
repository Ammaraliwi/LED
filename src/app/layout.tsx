import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "LEDWAVE — Premium LED Screen Rental & Event Technology",
  description:
    "Professional LED screens. Delivered. Installed. Ready for your event. Premium modular LED display rentals for conferences, exhibitions, celebrations and live events.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
