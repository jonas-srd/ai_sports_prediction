import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      allow: "/",
      disallow: ["/admin/", "/api/", "/widgets/account/", "/widgets/checkout", "/de/widgets/account/", "/de/widgets/checkout"],
      userAgent: "*"
    },
    sitemap: "https://www.ai-sports-prediction.net/sitemap.xml"
  };
}
