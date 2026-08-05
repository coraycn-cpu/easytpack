import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleBodyClient } from "@/components/articles/ArticlesClient";
import {
  BRAND_NAME,
  BRAND_SHORT_NAME,
  BRAND_SITE_URL,
} from "@/lib/brand";
import {
  getArticleBySlug,
  listArticleSlugs,
} from "@/lib/content/articles";
import {
  ARTICLES_PATH,
  articlePath,
  getArticleCopy,
  getArticlesHubCopy,
} from "@/lib/content/articles/types";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return listArticleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return { title: "Not found" };
  const en = article.en;
  const path = articlePath(slug);
  return {
    title: `${en.title} · ${BRAND_SHORT_NAME}`,
    description: en.description,
    alternates: { canonical: path },
    openGraph: {
      title: en.title,
      description: en.description,
      url: path,
      siteName: BRAND_NAME,
      locale: "en_US",
      alternateLocale: ["zh_CN"],
      type: "article",
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
    },
    twitter: {
      card: "summary",
      title: en.title,
      description: en.description,
    },
    robots: { index: true, follow: true },
  };
}

function buildArticleJsonLd(slug: string) {
  const article = getArticleBySlug(slug);
  if (!article) return null;
  const base = BRAND_SITE_URL.replace(/\/$/, "");
  const path = articlePath(slug);
  const en = getArticleCopy(article, "en");
  const zh = getArticleCopy(article, "zh");
  const hubEn = getArticlesHubCopy("en");

  const faqEntity = (copy: typeof en, lang: string, idSuffix: string) => ({
    "@type": "FAQPage",
    "@id": `${base}${path}#faq-${idSuffix}`,
    inLanguage: lang,
    mainEntity: copy.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  });

  const howTo =
    en.steps && en.steps.length > 0
      ? {
          "@type": "HowTo",
          name: en.title,
          description: en.definition,
          inLanguage: "en",
          step: en.steps.map((s, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: s.title,
            text: s.body,
          })),
        }
      : null;

  const howToZh =
    zh.steps && zh.steps.length > 0
      ? {
          "@type": "HowTo",
          name: zh.title,
          description: zh.definition,
          inLanguage: "zh-CN",
          step: zh.steps.map((s, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: s.title,
            text: s.body,
          })),
        }
      : null;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: en.title,
        description: en.description,
        datePublished: article.publishedAt,
        dateModified: article.updatedAt,
        inLanguage: "en",
        author: { "@type": "Organization", name: BRAND_SHORT_NAME },
        publisher: {
          "@type": "Organization",
          name: BRAND_NAME,
          url: base,
        },
        mainEntityOfPage: `${base}${path}`,
        about: en.definition,
      },
      {
        "@type": "Article",
        headline: zh.title,
        description: zh.description,
        datePublished: article.publishedAt,
        dateModified: article.updatedAt,
        inLanguage: "zh-CN",
        author: { "@type": "Organization", name: BRAND_SHORT_NAME },
        publisher: {
          "@type": "Organization",
          name: BRAND_NAME,
          url: base,
        },
        mainEntityOfPage: `${base}${path}`,
        about: zh.definition,
      },
      faqEntity(en, "en", "en"),
      faqEntity(zh, "zh-CN", "zh"),
      ...(howTo ? [howTo] : []),
      ...(howToZh ? [howToZh] : []),
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
          {
            "@type": "ListItem",
            position: 3,
            name: en.title,
            item: `${base}${path}`,
          },
        ],
      },
    ],
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  if (!getArticleBySlug(slug)) notFound();
  const jsonLd = buildArticleJsonLd(slug);

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      <ArticleBodyClient slug={slug} />
    </>
  );
}
