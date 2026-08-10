import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      allow: "/",
      disallow: ["/admin/", "/api/", "/coming-soon", "/widgets/account/", "/widgets/checkout", "/de/widgets/account/", "/de/widgets/checkout"],
      userAgent: "*"
    },
    sitemap: "https://residualsports.com/sitemap.xml",
    host: "https://residualsports.com"
  };
}
