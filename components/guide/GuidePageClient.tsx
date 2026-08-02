"use client";

import Link from "next/link";
import BrandFooter from "@/components/brand/BrandFooter";
import BrandMark from "@/components/brand/BrandMark";
import LocaleSwitcher from "@/components/i18n/LocaleSwitcher";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { BRAND_CONTACT_EMAIL } from "@/lib/brand";
import { getGuideContent } from "@/lib/content/guide-faq";

/** 功能介绍 / FAQ 正文：随界面语言切换 */
export default function GuidePageClient() {
  const { locale } = useLocale();
  const copy = getGuideContent(locale);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
          <BrandMark
            href="/"
            variant="short"
            nameClassName="text-base"
            iconClassName="h-7 w-7"
          />
          <nav
            aria-label={copy.navAria}
            className="flex flex-wrap items-center gap-2 text-xs sm:gap-3"
          >
            <LocaleSwitcher size="sm" />
            <Link href="/" className="pf-btn-text">
              {copy.navHome}
            </Link>
            <Link href="/?mode=register" className="pf-btn-primary px-3 py-1.5">
              {copy.navRegister}
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
        <p className="text-xs font-medium uppercase tracking-wide text-brand">
          {copy.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          {copy.heroTitle}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
          {copy.heroLead}
        </p>

        <nav
          aria-label={copy.tocAria}
          className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm"
        >
          <a href="#features" className="text-brand hover:text-brand-dark">
            {copy.tocFeatures}
          </a>
          <a href="#howto" className="text-brand hover:text-brand-dark">
            {copy.tocHowto}
          </a>
          <a href="#faq" className="text-brand hover:text-brand-dark">
            {copy.tocFaq}
          </a>
          <a href="#contact" className="text-brand hover:text-brand-dark">
            {copy.tocContact}
          </a>
        </nav>

        <section
          id="features"
          className="mt-10 scroll-mt-20"
          aria-labelledby="features-heading"
        >
          <h2 id="features-heading" className="text-xl font-semibold">
            {copy.featuresHeading}
          </h2>
          <ul className="mt-4 space-y-4">
            {copy.features.map((item) => (
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

        <section
          id="howto"
          className="mt-12 scroll-mt-20"
          aria-labelledby="howto-heading"
        >
          <h2 id="howto-heading" className="text-xl font-semibold">
            {copy.howtoHeading}
          </h2>
          <ol className="mt-4 space-y-4">
            {copy.steps.map((step, i) => (
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
            <Link
              href="/"
              className="pf-btn-primary inline-flex px-4 py-2 text-sm"
            >
              {copy.howtoCta}
            </Link>
          </p>
        </section>

        <section
          id="faq"
          className="mt-12 scroll-mt-20"
          aria-labelledby="faq-heading"
        >
          <h2 id="faq-heading" className="text-xl font-semibold">
            {copy.faqHeading}
          </h2>
          <div className="mt-4 space-y-3">
            {copy.faq.map((item) => (
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

        <section
          id="contact"
          className="mt-12 scroll-mt-20"
          aria-labelledby="contact-heading"
        >
          <h2 id="contact-heading" className="text-xl font-semibold">
            {copy.contactHeading}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {copy.contactBodyBefore}{" "}
            <a
              href={`mailto:${BRAND_CONTACT_EMAIL}`}
              className="font-medium text-brand hover:text-brand-dark"
            >
              {BRAND_CONTACT_EMAIL}
            </a>
            {copy.contactBodyAfter}
          </p>
        </section>
      </main>

      <div className="border-t border-border px-4 py-8">
        <BrandFooter showGuideLink={false} />
      </div>
    </div>
  );
}
