import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OptiLLM — Cost-Control Smart Model Router",
  description:
    "Prototype SaaS to route AI prompts to the most cost-efficient model based on complexity.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
      >
        <div className="min-h-screen bg-[radial-gradient(60%_60%_at_10%_10%,rgba(34,211,238,0.16),transparent_60%),radial-gradient(60%_60%_at_90%_20%,rgba(139,92,246,0.16),transparent_55%),radial-gradient(60%_60%_at_50%_90%,rgba(16,185,129,0.10),transparent_60%)]">
          <Navbar />
          <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
