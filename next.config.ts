import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pbjwbozxpzqqtheatxsi.supabase.co",
        pathname: "/storage/v1/object/public/catalogo_nacergroup/**",
      },
    ],
  },
};

export default nextConfig;
