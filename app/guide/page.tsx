import type { Metadata } from "next";
import GuidePageClient from "@/components/guide/GuidePageClient";
import {
  BRAND_CONTACT_EMAIL,
  BRAND_NAME,
  BRAND_SITE_URL,
  BRAND_SLOGAN,
} from "@/lib/brand";
import {
  GUIDE_PAGE_PATH,
  getGuideContent,
} from "@/lib/content/guide-faq";

const zh = getGuideContent("zh");
const en = getGuideContent("en");

export const metadata: Metadata = {
  title: zh.pageTitle,
  description: zh.pageDescription,
  alternates: {
    canonical: GUIDE_PAGE_PATH,
  },
  openGraph: {
    title: zh.pageTitle,
    description: zh.pageDescription,
    url: GUIDE_PAGE_PATH,
    siteName: BRAND_NAME,
    locale: "zh_CN",
    alternateLocale: ["en_US"],
    type: "article",
  },
  twitter: {
    card: "summary",
    title: zh.pageTitle,
    description: zh.pageDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
};

function buildJsonLd() {
  const faqLdZh = {
    "@type": "FAQPage",
    "@id": `${BRAND_SITE_URL}${GUIDE_PAGE_PATH}#faq`,
    inLanguage: "zh-CN",
    mainEntity: zh.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const faqLdEn = {
    "@type": "FAQPage",
    "@id": `${BRAND_SITE_URL}${GUIDE_PAGE_PATH}#faq-en`,
    inLanguage: "en",
    mainEntity: en.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const softwareLd = {
    "@type": "SoftwareApplication",
    name: BRAND_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: BRAND_SITE_URL,
    description: BRAND_SLOGAN,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "CNY",
      description: zh.freeTrialOffer,
    },
  };

  const orgLd = {
    "@type": "Organization",
    name: BRAND_NAME,
    url: BRAND_SITE_URL,
    email: BRAND_CONTACT_EMAIL,
    description: BRAND_SLOGAN,
  };

  const howToLd = {
    "@type": "HowTo",
    name: zh.howToName,
    description: zh.pageDescription,
    inLanguage: "zh-CN",
    step: zh.steps.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.title,
      text: step.body,
    })),
  };

  const howToLdEn = {
    "@type": "HowTo",
    name: en.howToName,
    description: en.pageDescription,
    inLanguage: "en",
    step: en.steps.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.title,
      text: step.body,
    })),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [orgLd, softwareLd, howToLd, howToLdEn, faqLdZh, faqLdEn],
  };
}

export default function GuidePage() {
  const jsonLd = buildJsonLd();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <GuidePageClient />
    </>
  );
}
