import type { MetadataRoute } from "next";
import { BRAND_SITE_URL } from "@/lib/brand";
import { listArticles } from "@/lib/content/articles";
import { ARTICLES_PATH, articlePath } from "@/lib/content/articles/types";
import { GUIDE_PAGE_PATH } from "@/lib/content/guide-faq";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = BRAND_SITE_URL.replace(/\/$/, "");
  const now = new Date();
  const articleEntries: MetadataRoute.Sitemap = listArticles().map((a) => ({
    url: `${base}${articlePath(a.slug)}`,
    lastModified: new Date(a.updatedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}${GUIDE_PAGE_PATH}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}${ARTICLES_PATH}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    ...articleEntries,
  ];
}
