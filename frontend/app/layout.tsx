import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdMatch Landing Page Personalizer",
  description: "Rewrite landing pages to match ad copy and creative while preserving the original structure.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
