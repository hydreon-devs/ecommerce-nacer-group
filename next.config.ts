import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Dos root layouts (storefront y admin): la 404 de URLs sin ruta vive en
    // `app/global-not-found.tsx`.
    globalNotFound: true,
  },
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
