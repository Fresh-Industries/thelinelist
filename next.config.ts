import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
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
