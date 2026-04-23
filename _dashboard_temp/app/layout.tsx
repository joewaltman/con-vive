import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Con-Vive Dashboard",
  description: "Guest management dashboard for Con-Vive dinner parties",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
