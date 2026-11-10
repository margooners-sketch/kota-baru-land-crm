/** @type {import('next').NextConfig} */
const nextConfig = {
  // Upload berkas pelanggan maks 10 MB via Server Action — batas default 1 MB
  // akan menolak file di atas 1 MB, jadi dinaikkan (10 Nov 2026).
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};
export default nextConfig;
