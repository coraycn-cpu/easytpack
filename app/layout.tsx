import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {
  BRAND_CONTACT_EMAIL,
  BRAND_NAME,
  BRAND_SITE_URL,
  BRAND_SLOGAN,
} from "@/lib/brand";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(BRAND_SITE_URL),
  title: {
    default: `${BRAND_NAME} — ${BRAND_SLOGAN}`,
    template: `%s · ${BRAND_NAME}`,
  },
  description: `${BRAND_SLOGAN}。面向服装从业者，支持手动标注与 AI 辅助生成工艺包；注册可免费试用。业务联系：${BRAND_CONTACT_EMAIL}。`,
  applicationName: BRAND_NAME,
  authors: [{ name: BRAND_NAME }],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "/",
    siteName: BRAND_NAME,
    title: `${BRAND_NAME} — ${BRAND_SLOGAN}`,
    description: `${BRAND_SLOGAN}。注册可免费试用。`,
  },
  twitter: {
    card: "summary",
    title: `${BRAND_NAME} — ${BRAND_SLOGAN}`,
    description: `${BRAND_SLOGAN}。注册可免费试用。`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
