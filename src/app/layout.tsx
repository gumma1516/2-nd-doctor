import type { Metadata, Viewport } from "next";
import { SITE_URL } from "@/lib/constants";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import "./globals.css";

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
  themeColor: "#09090b",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN" className="dark">
      <body className="font-sans min-h-screen flex flex-col antialiased bg-zinc-950 text-zinc-50 selection:bg-brand-500 selection:text-white">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
