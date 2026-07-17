import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/site/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "A Ripples Effect — Tap Water & Microplastics Database",
  description:
    "A community-built tap water and microplastics database. Search your ZIP code, see contaminants in your drinking water, and contribute reports for your community. Almost no public water database tracks microplastics — we do.",
  keywords: [
    "tap water",
    "drinking water",
    "microplastics",
    "water quality",
    "water contamination",
    "EWG",
    "PFAS",
    "lead in water",
    "community water database",
    "A Ripples Effect",
  ],
  authors: [{ name: "A Ripples Effect Crew" }],
  openGraph: {
    title: "A Ripples Effect — Tap Water & Microplastics Database",
    description:
      "A community-built tap water and microplastics database. Know what's in your water.",
    siteName: "A Ripples Effect",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "A Ripples Effect — Tap Water & Microplastics Database",
    description:
      "A community-built tap water and microplastics database. Know what's in your water.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
