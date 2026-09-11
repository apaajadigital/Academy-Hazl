import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import { Analytics } from "@/components/analytics/Analytics";
import "./globals.css";

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
    default: "Jago Akademi — Platform Edukasi Digital Indonesia",
    template: "%s | Jago Akademi",
  },
  // BL-23: "terlengkap" dropped. This is the default description for every page
  // that does not set its own, and search engines quote it verbatim — an
  // unprovable superlative travels furthest from exactly here. The product list
  // that follows it is factual and does the persuading on its own.
  description:
    "Platform edukasi digital Indonesia: E-Course, Event, Trainer Program, LMS, E-Book, dan Marketplace Materi. Belajar, berlatih, dan berkarier bersama Jago Akademi.",
  keywords: [
    "edukasi digital", "kursus online", "trainer profesional",
    "LMS Indonesia", "sertifikasi", "belajar online",
  ],
  authors: [{ name: "Jago Akademi" }],
  creator: "Jago Akademi",
  metadataBase: new URL("https://jagoakademi.com"),
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://jagoakademi.com",
    siteName: "Jago Akademi",
    title: "Jago Akademi — Platform Edukasi Digital Indonesia",
    description:
      "Platform pertama di Indonesia yang menyatukan ekosistem belajar, berlatih, dan berkarier dalam satu pintu digital.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Jago Akademi — Platform Edukasi Digital Indonesia",
    description: "Belajar, berlatih, dan berkarier bersama Jago Akademi.",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#f5f5f7",
  width: "device-width",
  initialScale: 1,
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "Jago Akademi",
  url: "https://jagoakademi.com",
  logo: "https://jagoakademi.com/logo.png",
  // BL-23: same superlative removed here too. This one is structured data —
  // search engines read it as a machine-readable assertion about the
  // organisation, not as marketing copy.
  description: "Platform edukasi digital Indonesia — E-Course, Event, LMS B2B, E-Book, dan Trainer Program.",
  sameAs: [
    "https://instagram.com/jagoakademi",
    "https://linkedin.com/company/jagoakademi",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: "support@jagoakademi.com",
    availableLanguage: "Indonesian",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${jakartaSans.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <Analytics />
        {children}
      </body>
    </html>
  );
}
