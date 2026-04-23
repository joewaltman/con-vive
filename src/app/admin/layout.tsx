import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Con-Vive Dashboard",
  description: "Guest management dashboard for Con-Vive dinner parties",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {children}
    </div>
  );
}
