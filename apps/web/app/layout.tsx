import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import { Analytics } from "@/components/analytics/Analytics";
import "./globals.css";

const brand = {
  name: "Hazl Academy",
  origin: "https://skill.hazl.id",
  supportEmail: "support@hazl.id",
} as const;

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Hazl Academy: Belajar & Jualan Karya Video AI",
    template: `%s | ${brand.name}`,
  },
  description:
    "Hazl Academy: kelas video AI, template, dan webinar dari kreator Indonesia. Belajar dari kreator, lalu jadi kreator dan jual karyamu sendiri.",
  keywords: [
    "kelas video AI",
    "kreator AI",
    "template video",
    "kursus online",
    "webinar video AI",
    "jual produk digital",
    "Hazl Academy",
  ],
  authors: [{ name: brand.name }],
  creator: brand.name,
  publisher: brand.name,
  formatDetection: { email: false, address: false, telephone: false },
  metadataBase: new URL(brand.origin),
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: brand.origin,
    siteName: brand.name,
    title: "Hazl Academy: Belajar & Jualan Karya Video AI",
    description:
      "Hazl Academy: kelas video AI, template, dan webinar dari kreator Indonesia. Belajar dari kreator, lalu jadi kreator dan jual karyamu sendiri.",
    // Explicit so WhatsApp/Telegram/X link previews always pick the Hazl
    // artwork; the old file at this path was still the Jago Akademi logo.
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Hazl Academy" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hazl Academy: Belajar & Jualan Karya Video AI",
    description: "Kelas video AI, template, dan webinar dari kreator Indonesia.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0077A8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${jakartaSans.variable} ${inter.variable}`}>
      <body className="min-h-screen antialiased bg-[#FAFAFA] text-[#16181D]">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
