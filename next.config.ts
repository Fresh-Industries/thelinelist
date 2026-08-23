import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "the-line-list.vercel.app" }],
        destination: "https://www.thelinelist.com/:path*",
        permanent: true,
      },
      { source: "/copackers", destination: "/find-manufacturers", permanent: true },
      { source: "/copackers/:slug", destination: "/manufacturers/:slug", permanent: true },
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
};

export default nextConfig;
