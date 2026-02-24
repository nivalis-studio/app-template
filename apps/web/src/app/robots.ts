import { seo } from '@/constants/seo';
import type { MetadataRoute } from 'next';

const allowedPaths: Array<string> = [];
const disallowedPaths: Array<string> = ['/'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: allowedPaths,
        disallow: disallowedPaths,
      },
    ],
    sitemap: `${seo.baseUrl}/sitemap.xml`,
  };
}
