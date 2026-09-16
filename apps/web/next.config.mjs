/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    // TypeScript 7 has no JavaScript compiler API; the CLI also supports TypeScript 6.
    useTypeScriptCli: true
  },
  async headers() {
    return [
      {
        source: "/sports-logos/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
