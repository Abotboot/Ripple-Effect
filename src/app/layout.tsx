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
  title: "A Ripple Effect Initiative | Freshwater & Microplastics Database",
  description:
    "A community-built freshwater and microplastics database. See what's in the rivers, lakes, and streams near you, and contribute readings for your community. Almost no public water database tracks microplastics, but we do.",
  keywords: [
    "freshwater",
    "untreated water",
    "rivers and lakes",
    "microplastics",
    "water quality",
    "water contamination",
    "EWG",
    "PFAS",
    "lead in water",
    "community water database",
    "A Ripple Effect Initiative",
  ],
  authors: [{ name: "A Ripple Effect Initiative Crew" }],
  openGraph: {
    title: "A Ripple Effect Initiative | Freshwater & Microplastics Database",
    description:
      "A community-built freshwater and microplastics database. What's in your water?",
    siteName: "A Ripple Effect Initiative",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "A Ripple Effect Initiative | Freshwater & Microplastics Database",
    description:
      "A community-built freshwater and microplastics database. What's in your water?",
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
