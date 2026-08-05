import type { Metadata } from "next";
import { ArticlesIndexClient } from "@/components/articles/ArticlesClient";
import {
  BRAND_NAME,
  BRAND_SHORT_NAME,
  BRAND_SITE_URL,
} from "@/lib/brand";
import { listArticles } from "@/lib/content/articles";
import {
  ARTICLES_PATH,
  articlePath,
  getArticlesHubCopy,
} from "@/lib/content/articles/types";

const hubEn = getArticlesHubCopy("en");
const hubZh = getArticlesHubCopy("zh");

export const metadata: Metadata = {
  title: hubEn.pageTitle,
  description: hubEn.pageDescription,
  alternates: {
    canonical: ARTICLES_PATH,
  },
  openGraph: {
    title: hubEn.pageTitle,
    description: hubEn.pageDescription,
    url: ARTICLES_PATH,
    siteName: BRAND_NAME,
    locale: "en_US",
    alternateLocale: ["zh_CN"],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: hubEn.pageTitle,
    description: hubEn.pageDescription,
  },
  robots: { index: true, follow: true },
};

function buildJsonLd() {
  const base = BRAND_SITE_URL.replace(/\/$/, "");
  const items = listArticles().map((a, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: `${base}${articlePath(a.slug)}`,
    name: a.en.title,
  }));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${base}${ARTICLES_PATH}#collection`,
        name: hubEn.pageTitle,
        description: hubEn.pageDescription,
        inLanguage: ["en", "zh-CN"],
        isPartOf: { "@type": "WebSite", name: BRAND_SHORT_NAME, url: base },
      },
      {
        "@type": "ItemList",
        itemListElement: items,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${base}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: hubEn.heroTitle,
            item: `${base}${ARTICLES_PATH}`,
          },
        ],
      },
      // 中文目录名便于中文 GEO 引用
      {
        "@type": "WebPage",
        name: hubZh.pageTitle,
        description: hubZh.pageDescription,
        inLanguage: "zh-CN",
        url: `${base}${ARTICLES_PATH}`,
      },
    ],
  };
}

export default function ArticlesIndexPage() {
  const jsonLd = buildJsonLd();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ArticlesIndexClient />
    </>
  );
}
