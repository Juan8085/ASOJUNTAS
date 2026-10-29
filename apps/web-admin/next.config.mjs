/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@conectajac/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
