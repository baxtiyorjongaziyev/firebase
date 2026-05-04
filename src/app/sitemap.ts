import { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';
import { client } from '@/sanity/lib/client';

const BASE_URL = 'https://jonbranding.uz';
const locales = ['uz', 'ru', 'en', 'zh'] as const;
type Locale = (typeof locales)[number];

const staticRoutes = [
  '',
  '/blog',
  '/checklist',
  '/pricing/sotuvchi-kartochka',
  '/privacy',
  '/quiz',
  '/sitemap',
  '/terms',
  '/xizmatlar',
  '/xizmatlar/brand-strategiyasi',
  '/xizmatlar/brand-strategy',
  '/xizmatlar/brandbook',
  '/xizmatlar/firmenniy-stil',
  '/xizmatlar/logo-dizayni',
  '/xizmatlar/neyming',
  '/xizmatlar/patent-kalkulyatori',
  '/xizmatlar/qadoq-dizayni',
];

function localizedUrl(lang: Locale, route: string) {
  const cleanRoute = route === '' ? '' : route;
  return lang === 'uz'
    ? `${BASE_URL}${cleanRoute || '/'}`
    : `${BASE_URL}/${lang}${cleanRoute}`;
}

function getMarkdownBlogEntries(): MetadataRoute.Sitemap {
  const postsDirectory = path.join(process.cwd(), 'src/posts');
  if (!fs.existsSync(postsDirectory)) return [];

  return locales.flatMap((lang) => {
    const langDirectory = path.join(postsDirectory, lang);
    if (!fs.existsSync(langDirectory)) return [];

    return fs.readdirSync(langDirectory)
      .filter((fileName) => fileName.endsWith('.md'))
      .map((fileName) => ({
        url: localizedUrl(lang, `/blog/${fileName.replace(/\.md$/, '')}`),
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }));
  });
}

async function getSanityBlogEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const posts = await client.fetch<Array<{ slug?: { current?: string }; language?: Locale; _updatedAt?: string }>>(
      `*[_type == "post" && defined(slug.current) && language in $locales]{
        slug,
        language,
        _updatedAt
      }`,
      { locales }
    );

    return posts
      .filter((post) => post.slug?.current && post.language)
      .map((post) => ({
        url: localizedUrl(post.language as Locale, `/blog/${post.slug!.current}`),
        lastModified: post._updatedAt ? new Date(post._updatedAt) : new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = locales.flatMap((lang) =>
    staticRoutes.map((route) => ({
      url: localizedUrl(lang, route),
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: route === '' ? 1.0 : 0.8,
    }))
  );

  const blogPages = [...await getSanityBlogEntries(), ...getMarkdownBlogEntries()];
  const deduped = new Map([...staticPages, ...blogPages].map((entry) => [entry.url, entry]));

  return Array.from(deduped.values());
}
