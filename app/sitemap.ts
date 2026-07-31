import type { MetadataRoute } from "next";
import { BRAND_SITE_URL } from "@/lib/brand";
import { GUIDE_PAGE_PATH } from "@/lib/content/guide-faq";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = BRAND_SITE_URL.replace(/\/$/, "");
  const now = new Date();
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
  ];
}
