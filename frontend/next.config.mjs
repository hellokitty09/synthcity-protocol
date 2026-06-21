/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: 'https://synthcity-api.onrender.com',
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

