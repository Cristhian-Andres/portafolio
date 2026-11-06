import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Poppins } from "next/font/google";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { GatekeeperProvider } from "@/components/gatekeeper/GatekeeperProvider";
import { GoogleTagManager } from "@/components/analytics/GoogleTagManager";
import { WaterRipple } from "@/components/effects/WaterRipple";
import { ScrollReset } from "@/components/layout/ScrollReset";
import { SCROLL_RESET_INLINE_SCRIPT } from "@/lib/scrollReset";
import { profile } from "@/data/profile";
import { SITE_URL } from "@/lib/constants";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const title = profile.name; // en la pestaña solo el nombre, sin el rol

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description: profile.tagline,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: "/",
    title,
    description: profile.tagline,
    siteName: profile.name,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: profile.tagline,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#070a05" },
    { media: "(prefers-color-scheme: light)", color: "#fafdf2" },
  ],
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  jobTitle: profile.role,
  description: profile.summary,
  url: SITE_URL,
  image: `${SITE_URL}${profile.photoSrc}`,
  address: { "@type": "PostalAddress", addressLocality: "Popayán", addressCountry: "CO" },
  sameAs: profile.socialLinks.filter((link) => link.url.startsWith("http")).map((link) => link.url),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${poppins.variable} ${mono.variable} h-full antialiased`}
    >
      <head>
        {/* Desactiva la restauración de scroll del navegador antes de que actúe. */}
        <script dangerouslySetInnerHTML={{ __html: SCROLL_RESET_INLINE_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <ScrollReset />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <GoogleTagManager />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <GatekeeperProvider>{children}</GatekeeperProvider>
          <WaterRipple />
        </ThemeProvider>
      </body>
    </html>
  );
}
