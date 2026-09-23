import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The project root is this folder, not the repository's: the assignment
  // lives in a subdirectory, and without this Turbopack walks up the tree
  // looking for a lockfile and may pick the wrong folder — both locally and in
  // the Vercel build.
  turbopack: { root: fileURLToPath(new URL('.', import.meta.url)) },
};

export default nextConfig;
