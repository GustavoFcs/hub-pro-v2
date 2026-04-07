/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Prevent Next.js from bundling these packages — let Node.js resolve them
  // directly so pdfjs-dist can locate its worker file in node_modules.
  serverExternalPackages: ['pdf-to-img', 'pdfjs-dist'],
}

export default nextConfig
