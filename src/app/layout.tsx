import type { Metadata } from "next";
import Script from "next/script";
import { Lora, Playfair_Display } from "next/font/google";
import "./globals.css";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Con-Vive — Home-Hosted Dinner Parties in North County San Diego",
  description:
    "Join intimate dinner gatherings with interesting strangers at real homes in Encinitas and North County SD. Great food, real connection, small groups.",
  openGraph: {
    title: "Con-Vive — Home-Hosted Dinner Parties in North County San Diego",
    description:
      "Join intimate dinner gatherings with interesting strangers at real homes in Encinitas and North County SD. Great food, real connection, small groups.",
    type: "website",
    locale: "en_US",
    siteName: "Con-Vive",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Con-Vive — Home-Hosted Dinner Parties",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${lora.variable} ${playfairDisplay.variable} antialiased`}>{children}</body>
      <Script
        async
        src="https://www.googletagmanager.com/gtag/js?id=G-3CXFWBPY4N"
      />
      <Script id="gtag-init">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-3CXFWBPY4N');
        `}
      </Script>
    </html>
  );
}
