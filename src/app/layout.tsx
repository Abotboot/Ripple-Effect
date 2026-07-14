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
  title: "RippleEffect — Tap Water & Microplastics Database",
  description:
    "A community-built tap water and microplastics database. Search your ZIP code, see contaminants in your drinking water, and contribute reports for your community.",
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
  ],
  authors: [{ name: "RippleEffect Volunteer Crew" }],
  openGraph: {
    title: "RippleEffect — Tap Water & Microplastics Database",
    description:
      "A community-built tap water and microplastics database. Know what's in your water.",
    siteName: "RippleEffect",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RippleEffect — Tap Water & Microplastics Database",
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
