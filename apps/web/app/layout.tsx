import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import { Analytics } from "@/components/analytics/Analytics";
import "./globals.css";

// Provisional literal values (was `@repo/brand`, reverted for this deploy — that
// package isn't finished/committed yet; these three constants are its exact
// current values, kept here so the site isn't blocked on it).
const brand = {
  name: "Hazl Academy",
  origin: "https://academy.hazl.id",
  supportEmail: "TBD",
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
    default: `${brand.name} — Platform Edukasi Digital`,
    template: `%s | ${brand.name}`,
  },
  // BL-23: "terlengkap" dropped. This is the default description for every page
  // that does not set its own, and search engines quote it verbatim — an
  // unprovable superlative travels furthest from exactly here. The product list
  // that follows it is factual and does the persuading on its own.
  description:
    `Platform edukasi digital: E-Course, Event, Trainer Program, LMS, E-Book, dan Marketplace Materi. Belajar, berlatih, dan berkarier bersama ${brand.name}.`,
  keywords: [
    "edukasi digital", "kursus online", "trainer profesional",
    "LMS", "sertifikasi", "belajar online",
  ],
  authors: [{ name: brand.name }],
  creator: brand.name,
  metadataBase: new URL(brand.origin),
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: brand.origin,
    siteName: brand.name,
    title: `${brand.name} — Platform Edukasi Digital`,
    description:
      "Platform yang menyatukan ekosistem belajar, berlatih, dan berkarier dalam satu pintu digital.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${brand.name} — Platform Edukasi Digital`,
    description: `Belajar, berlatih, dan berkarier bersama ${brand.name}.`,
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
  name: brand.name,
  url: brand.origin,
  logo: "/logo.png",
  // BL-23: same superlative removed here too. This one is structured data —
  // search engines read it as a machine-readable assertion about the
  // organisation, not as marketing copy.
  description: "Platform edukasi digital — E-Course, Event, LMS B2B, E-Book, dan Trainer Program.",
  // sameAs dropped: Jago's Instagram/LinkedIn are not Hazl's accounts —
  // restore once real Hazl social handles exist. contactPoint.email is
  // "TBD" (@repo/brand) for the same reason — Jago's support inbox isn't
  // Hazl's.
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: brand.supportEmail,
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
