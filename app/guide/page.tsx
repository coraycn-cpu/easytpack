import type { Metadata } from "next";
import Link from "next/link";
import BrandFooter from "@/components/brand/BrandFooter";
import BrandMark from "@/components/brand/BrandMark";
import {
  BRAND_CONTACT_EMAIL,
  BRAND_NAME,
  BRAND_SITE_URL,
  BRAND_SLOGAN,
} from "@/lib/brand";
import {
  GUIDE_FAQ,
  GUIDE_FEATURES,
  GUIDE_PAGE_DESCRIPTION,
  GUIDE_PAGE_PATH,
  GUIDE_PAGE_TITLE,
  GUIDE_STEPS,
} from "@/lib/content/guide-faq";

export const metadata: Metadata = {
  title: GUIDE_PAGE_TITLE,
  description: GUIDE_PAGE_DESCRIPTION,
  alternates: {
    canonical: GUIDE_PAGE_PATH,
  },
  openGraph: {
    title: GUIDE_PAGE_TITLE,
    description: GUIDE_PAGE_DESCRIPTION,
    url: GUIDE_PAGE_PATH,
    siteName: BRAND_NAME,
    locale: "zh_CN",
    type: "article",
  },
  twitter: {
    card: "summary",
    title: GUIDE_PAGE_TITLE,
    description: GUIDE_PAGE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

function buildJsonLd() {
  const faqLd = {
    "@type": "FAQPage",
    "@id": `${BRAND_SITE_URL}${GUIDE_PAGE_PATH}#faq`,
    mainEntity: GUIDE_FAQ.map((item) => ({
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
      description: "注册可免费试用",
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
    name: `如何用 ${BRAND_NAME} 生成工艺包`,
    description: GUIDE_PAGE_DESCRIPTION,
    step: GUIDE_STEPS.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.title,
      text: step.body,
    })),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [orgLd, softwareLd, howToLd, faqLd],
  };
}

export default function GuidePage() {
  const jsonLd = buildJsonLd();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
          <BrandMark href="/" nameClassName="text-base" iconClassName="h-7 w-7" />
          <nav aria-label="页面导航" className="flex flex-wrap items-center gap-3 text-xs">
            <Link href="/" className="pf-btn-text">
              回首页
            </Link>
            <Link href="/?mode=register" className="pf-btn-primary px-3 py-1.5">
              免费注册试用
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
        <p className="text-xs font-medium uppercase tracking-wide text-brand">
          功能介绍 · 使用说明 · FAQ
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          {BRAND_NAME} 怎么用
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
          {BRAND_SLOGAN}。面向服装打版、跟单与工艺沟通场景：从款式图到可交付工艺包，
          支持手动标注与 AI 辅助；注册可免费试用。
        </p>

        <nav
          aria-label="本页目录"
          className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm"
        >
          <a href="#features" className="text-brand hover:text-brand-dark">
            功能介绍
          </a>
          <a href="#howto" className="text-brand hover:text-brand-dark">
            使用步骤
          </a>
          <a href="#faq" className="text-brand hover:text-brand-dark">
            常见问题
          </a>
          <a href="#contact" className="text-brand hover:text-brand-dark">
            业务联系
          </a>
        </nav>

        <section id="features" className="mt-10 scroll-mt-20" aria-labelledby="features-heading">
          <h2 id="features-heading" className="text-xl font-semibold">
            功能介绍
          </h2>
          <ul className="mt-4 space-y-4">
            {GUIDE_FEATURES.map((item) => (
              <li key={item.title} className="pf-card p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section id="howto" className="mt-12 scroll-mt-20" aria-labelledby="howto-heading">
          <h2 id="howto-heading" className="text-xl font-semibold">
            使用说明（四步开始）
          </h2>
          <ol className="mt-4 space-y-4">
            {GUIDE_STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-5">
            <Link href="/" className="pf-btn-primary inline-flex px-4 py-2 text-sm">
              回首页开始新建款式
            </Link>
          </p>
        </section>

        <section id="faq" className="mt-12 scroll-mt-20" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-xl font-semibold">
            常见问题 FAQ
          </h2>
          <div className="mt-4 space-y-3">
            {GUIDE_FAQ.map((item) => (
              <details
                key={item.question}
                className="pf-card group open:border-brand-light"
              >
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-start justify-between gap-3">
                    <span>{item.question}</span>
                    <span
                      className="shrink-0 text-muted transition group-open:rotate-45"
                      aria-hidden
                    >
                      +
                    </span>
                  </span>
                </summary>
                <p className="border-t border-border px-4 py-3 text-sm leading-relaxed text-muted">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section id="contact" className="mt-12 scroll-mt-20" aria-labelledby="contact-heading">
          <h2 id="contact-heading" className="text-xl font-semibold">
            业务联系
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            合作、试用或产品咨询，请发邮件至{" "}
            <a
              href={`mailto:${BRAND_CONTACT_EMAIL}`}
              className="font-medium text-brand hover:text-brand-dark"
            >
              {BRAND_CONTACT_EMAIL}
            </a>
            。注册可免费试用。
          </p>
        </section>
      </main>

      <div className="border-t border-border px-4 py-8">
        <BrandFooter showGuideLink={false} />
      </div>
    </div>
  );
}
