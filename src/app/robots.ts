import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/api/', '/keys', '/usage', '/playground', '/generations'],
      },
    ],
    sitemap: 'https://princemarketing.ai/sitemap.xml',
  };
}
