import type { MetadataRoute } from "next";
import { BRAND_SITE_URL } from "@/lib/brand";

export default function robots(): MetadataRoute.Robots {
  const base = BRAND_SITE_URL.replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/guide"],
      disallow: [
        "/account",
        "/admin",
        "/api/",
        "/project/",
        "/projects",
        "/templates",
        "/login",
        "/auth/",
        "/debug",
        "/canvas",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
