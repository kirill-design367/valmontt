import type { NextConfig } from 'next'

/**
 * GitHub Pages serves this project from https://<user>.github.io/valmontt/,
 * so every asset URL has to carry that prefix and nothing may be rendered on demand.
 */
const repo = '/valmontt'

const nextConfig: NextConfig = {
  output: 'export',
  basePath: repo,
  assetPrefix: repo,
  images: { unoptimized: true },
  trailingSlash: true,
  env: { NEXT_PUBLIC_BASE_PATH: repo },
}

export default nextConfig
