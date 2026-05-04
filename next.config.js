
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {},
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'img1.teletype.in' },
      { protocol: 'https', hostname: 'img2.teletype.in' },
      { protocol: 'https', hostname: 'img3.teletype.in' },
      { protocol: 'https', hostname: 'img4.teletype.in' },
      { protocol: 'https', hostname: 'cdn.sanity.io' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'cdn.prod.website-files.com' }
    ],
  },
};

module.exports = nextConfig;
