import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SITE_URL } from "@/lib/constants";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { FloatingBackground } from "@/components/FloatingBackground";
import "./globals.css";

const geist = localFont({
  src: "./fonts/GeistSans.woff2",
  display: "swap",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({ src: "./fonts/GeistMono.woff2", display: "swap", variable: "--font-geist-mono", weight: "100 900" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SecondCare | Trusted Second Opinions from Verified Specialists",
    template: "%s | SecondCare",
  },
  description:
    "Upload your medical records and get a second opinion from verified specialists. Make confident decisions about your diagnosis and treatment.",
  keywords: ["second opinion", "medical second opinion India", "verified specialists", "online doctor consultation", "medical review"],
  openGraph: {
    title: "SecondCare | Trusted Second Opinions from Verified Specialists",
    description: "Upload your medical records and get a second opinion from verified specialists.",
    type: "website",
    locale: "en_IN",
    siteName: "SecondCare",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#080c12",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN" className="dark" data-scroll-behavior="smooth">
      <body className={`${geist.variable} ${geistMono.variable} relative isolate min-h-screen flex flex-col font-sans antialiased`}>
        <FloatingBackground />
        <noscript><style>{"[data-reveal], [data-page-transition] { opacity: 1 !important; transform: none !important; }"}</style></noscript>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
