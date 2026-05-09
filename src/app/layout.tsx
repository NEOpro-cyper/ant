import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MeowTV Stream",
  description: "Video player + streaming API",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
