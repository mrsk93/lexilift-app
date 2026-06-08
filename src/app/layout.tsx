import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { PostHogProvider } from "@/lib/analytics/posthog-client";
import { SentryUserBridge } from "@/components/SentryUserBridge";
import { env } from "@/lib/env";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(env.APP_URL),
  title: { default: "LexiLift", template: "%s — LexiLift" },
  description:
    "RAG-as-a-service for SaaS teams. Upload documents, chat with citations, embed a widget on your site.",
  openGraph: {
    siteName: "LexiLift",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <SentryUserBridge user={null} />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PostHogProvider>{children}</PostHogProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
