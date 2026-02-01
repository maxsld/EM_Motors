import type { Metadata } from "next";
import "./globals.css";

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "EM’Motors",
  description:
    "Association automobile de l’EM Strasbourg Business School : événements, projets et réseau étudiant à Strasbourg.",
  logo: "/assets/logo.png",
  image: "/assets/og-cover.png",
  areaServed: "Strasbourg",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Strasbourg",
    addressCountry: "FR",
  },
  sameAs: ["https://www.instagram.com/em_motors2025/"],
};

export const metadata: Metadata = {
  title: "EM’Motors | Association Automobile EM Strasbourg Business School",
  description:
    "EM’Motors est l’association automobile de l’EM Strasbourg Business School : événements, projets, partenariats et réseau autour de la passion auto à Strasbourg.",
  keywords: [
    "association automobile",
    "EM Strasbourg",
    "EM Strasbourg Business School",
    "auto",
    "voitures",
    "événements",
    "étudiants",
    "Strasbourg",
    "club auto",
    "partenariats",
  ],
  authors: [{ name: "EM’Motors" }],
  themeColor: "#0b0b0b",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    title: "EM’Motors | Association Automobile EM Strasbourg",
    description:
      "L’association automobile de l’EM Strasbourg Business School : événements, projets, partenariats et réseau étudiant à Strasbourg.",
    images: ["/assets/og-cover.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "EM’Motors | Association Automobile EM Strasbourg",
    description:
      "Association automobile EM Strasbourg : événements, projets et réseau étudiant autour de la passion auto.",
    images: ["/assets/og-cover.png"],
  },
  icons: {
    icon: "/assets/favicon.ico",
    apple: "/assets/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
        <link rel="icon" href="/assets/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/assets/logo.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
      </head>
      <body className="is-loading">{children}</body>
    </html>
  );
}
