import type { MetadataRoute } from "next";

const SITE = process.env.APP_BASE_URL ?? "https://ustoz.uz";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/cabinet", "/auth"] }],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
