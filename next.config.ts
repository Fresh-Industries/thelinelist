import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  trailingSlash: false,
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "thelinelist.com" }],
        destination: "https://www.thelinelist.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "the-line-list.vercel.app" }],
        destination: "https://www.thelinelist.com/:path*",
        permanent: true,
      },
      { source: "/copackers", destination: "/find-manufacturers", permanent: true },
      { source: "/copackers/:slug", destination: "/manufacturers/:slug", permanent: true },
      { source: "/claim", destination: "/claim-submit", permanent: true },
      { source: "/learn", destination: "/guides", permanent: true },
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/about.html", destination: "/about", permanent: true },
      { source: "/glossary.html", destination: "/glossary", permanent: true },
      { source: "/hpp.html", destination: "/guides/hpp", permanent: true },
      { source: "/hot-fill.html", destination: "/guides/hot-fill", permanent: true },
      { source: "/retort.html", destination: "/guides/retort", permanent: true },
      { source: "/small-moq.html", destination: "/guides/small-moq", permanent: true },
      { source: "/sauce.html", destination: "/guides/sauce", permanent: true },
    ];
  },
  async rewrites() {
    const filterKeys = [
      "product",
      "category",
      "process",
      "smallMoq",
      "smallRun",
      "moq",
      "packaging",
      "certification",
      "operationType",
      "state",
      "verified",
      "sort",
    ];

    return {
      beforeFiles: filterKeys.map((key) => ({
        source: "/find-manufacturers",
        has: [{ type: "query" as const, key }],
        destination: "/find-manufacturers/results",
      })),
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
