"use client";

import Link from "next/link";
import BrandFooter from "@/components/brand/BrandFooter";
import BrandMark from "@/components/brand/BrandMark";
import LocaleSwitcher from "@/components/i18n/LocaleSwitcher";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  listArticles,
  getArticleBySlug,
} from "@/lib/content/articles";
import {
  ARTICLES_PATH,
  articlePath,
  getArticleCopy,
  getArticlesHubCopy,
  seriesLabel,
} from "@/lib/content/articles/types";
import { GUIDE_PAGE_PATH } from "@/lib/content/guide-faq";

function ArticlesChrome({
  navAria,
  navHome,
  navGuide,
  navRegister,
}: {
  navAria: string;
  navHome: string;
  navGuide: string;
  navRegister: string;
}) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
        <BrandMark
          href="/"
          variant="short"
          nameClassName="text-base"
          iconClassName="h-7 w-7"
        />
        <nav
          aria-label={navAria}
          className="flex flex-wrap items-center gap-2 text-xs sm:gap-3"
        >
          <LocaleSwitcher size="sm" />
          <Link href="/" className="pf-btn-text">
            {navHome}
          </Link>
          <Link href={GUIDE_PAGE_PATH} className="pf-btn-text">
            {navGuide}
          </Link>
          <Link href="/?mode=register" className="pf-btn-primary px-3 py-1.5">
            {navRegister}
          </Link>
        </nav>
      </div>
    </header>
  );
}

/** `/articles` 目录：随语言切换 EN/ZH 标题与摘要 */
export function ArticlesIndexClient() {
  const { locale } = useLocale();
  const hub = getArticlesHubCopy(locale);
  const articles = listArticles();
  const fundamentals = articles.filter((a) => a.series === "fundamentals");
  const howto = articles.filter((a) => a.series === "howto");
  const roles = articles.filter((a) => a.series === "roles");
  const compare = articles.filter((a) => a.series === "compare");

  const renderGroup = (
    heading: string,
    items: typeof articles,
  ) => (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-foreground">{heading}</h2>
      <ul className="mt-4 space-y-3">
        {items.map((article) => {
          const copy = getArticleCopy(article, locale);
          return (
            <li key={article.slug}>
              <Link
                href={articlePath(article.slug)}
                className="pf-card block p-4 transition hover:border-brand-light"
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-brand">
                  {seriesLabel(article.series, locale)}
                </p>
                <h3 className="mt-1 text-sm font-semibold text-foreground">
                  {copy.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {copy.description}
                </p>
                <span className="mt-2 inline-block text-xs font-medium text-brand">
                  {hub.readMore} →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ArticlesChrome
        navAria={hub.navAria}
        navHome={hub.navHome}
        navGuide={hub.navGuide}
        navRegister={hub.navRegister}
      />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
        <p className="text-xs font-medium uppercase tracking-wide text-brand">
          {hub.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          {hub.heroTitle}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
          {hub.heroLead}
        </p>
        {renderGroup(hub.seriesFundamentals, fundamentals)}
        {renderGroup(hub.seriesHowto, howto)}
        {renderGroup(hub.seriesRoles, roles)}
        {renderGroup(hub.seriesCompare, compare)}
      </main>
      <div className="border-t border-border px-4 py-8">
        <BrandFooter showArticlesLink={false} />
      </div>
    </div>
  );
}

type ArticleBodyProps = { slug: string };

/** `/articles/[slug]` 正文：EN/ZH 同步切换 */
export function ArticleBodyClient({ slug }: ArticleBodyProps) {
  const { locale } = useLocale();
  const hub = getArticlesHubCopy(locale);
  const article = getArticleBySlug(slug);
  if (!article) return null;

  const copy = getArticleCopy(article, locale);
  const related = article.relatedSlugs
    .map((s) => getArticleBySlug(s))
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ArticlesChrome
        navAria={hub.navAria}
        navHome={hub.navHome}
        navGuide={hub.navGuide}
        navRegister={hub.navRegister}
      />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
        <p className="text-xs">
          <Link
            href={ARTICLES_PATH}
            className="font-medium text-brand hover:text-brand-dark"
          >
            {hub.backToIndex}
          </Link>
        </p>
        <p className="mt-4 text-[10px] font-medium uppercase tracking-wide text-brand">
          {seriesLabel(article.series, locale)}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          {copy.title}
        </h1>
        <p className="mt-2 text-[11px] text-muted">
          {hub.updated} {article.updatedAt}
        </p>
        <p className="mt-4 rounded-lg border border-brand-light bg-brand-soft/50 px-4 py-3 text-sm leading-relaxed text-foreground">
          {copy.definition}
        </p>
        <p className="mt-3 text-sm text-muted">
          <span className="font-medium text-foreground">
            {hub.audienceLabel}:{" "}
          </span>
          {copy.audience}
        </p>

        {copy.sections.map((section) => (
          <section key={section.heading} className="mt-8">
            <h2 className="text-xl font-semibold">{section.heading}</h2>
            {section.paragraphs?.map((p) => (
              <p
                key={p.slice(0, 24)}
                className="mt-3 text-sm leading-relaxed text-muted"
              >
                {p}
              </p>
            ))}
            {section.bullets ? (
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
                {section.bullets.map((b) => (
                  <li key={b.slice(0, 32)}>{b}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        {copy.steps && copy.steps.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-xl font-semibold">{hub.stepsHeading}</h2>
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
                    <h3 className="text-sm font-semibold">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <section className="mt-10">
          <h2 className="text-xl font-semibold">{hub.faqHeading}</h2>
          <div className="mt-4 space-y-3">
            {copy.faq.map((item) => (
              <details
                key={item.question}
                className="pf-card group open:border-brand-light"
              >
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold marker:content-none [&::-webkit-details-marker]:hidden">
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

        <section className="mt-10 rounded-xl border border-brand-light bg-brand-soft/40 p-5">
          <p className="text-xs font-medium text-brand">{hub.ctaHint}</p>
          <Link
            href="/?mode=register"
            className="pf-btn-primary mt-3 inline-flex px-4 py-2 text-sm"
          >
            {copy.ctaLabel}
          </Link>
        </section>

        {related.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-lg font-semibold">{hub.related}</h2>
            <ul className="mt-3 space-y-2">
              {related.map((rel) => {
                if (!rel) return null;
                const relCopy = getArticleCopy(rel, locale);
                return (
                  <li key={rel.slug}>
                    <Link
                      href={articlePath(rel.slug)}
                      className="text-sm font-medium text-brand hover:text-brand-dark"
                    >
                      {relCopy.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </main>
      <div className="border-t border-border px-4 py-8">
        <BrandFooter />
      </div>
    </div>
  );
}
