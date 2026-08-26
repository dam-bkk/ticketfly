import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Service Desk", template: "%s · Service Desk" },
  description: "IT service platform for QI Group",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get("tf_theme")?.value === "dark" ? "dark" : "light";
  return (
    <html lang="en" data-theme={theme} suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} font-sans`}>{children}</body>
    </html>
  );
}
