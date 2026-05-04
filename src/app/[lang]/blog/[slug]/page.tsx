import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import BlogPostClient from '@/components/blog-post-client';
import Script from 'next/script';
import { client, urlFor } from '@/sanity/lib/client';
import { getPostData } from '@/lib/blog-posts';

type Props = {
  params: { slug: string; lang: string };
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug, lang } = props.params;
  
  const query = `*[_type == "post" && slug.current == $slug && language == $lang][0]`;
  const post = await client.fetch(query, { slug, lang }).catch(() => null) || await getPostData(lang, slug);

  if (!post) {
    return {
      title: 'Maqola topilmadi',
    };
  }
  
  const postSlug = post.slug?.current || post.slug;
  const canonicalUrl = `https://jonbranding.uz/${lang === 'uz' ? '' : lang + '/'}blog/${postSlug}`;

  return {
    title: `${post.title} | Jon.Branding Blog`,
    description: post.description,
     alternates: {
      canonical: canonicalUrl,
      languages: {
        'uz': `https://jonbranding.uz/blog/${postSlug}`,
        'ru': `https://jonbranding.uz/ru/blog/${postSlug}`,
        'en': `https://jonbranding.uz/en/blog/${postSlug}`,
        'zh': `https://jonbranding.uz/zh/blog/${postSlug}`,
      },
    },
    openGraph: {
      title: `${post.title} | Jon.Branding Blog`,
      description: post.description,
      url: canonicalUrl,
      type: 'article',
      publishedTime: post.publishedAt || post._createdAt || post.date,
      images: post.image ? [
        {
          url: typeof post.image === 'object' ? urlFor(post.image).url() : post.image,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${post.title} | Jon.Branding Blog`,
      description: post.description,
      images: post.image ? [typeof post.image === 'object' ? urlFor(post.image).url() : post.image] : [],
    },
  };
}

const generateJsonLd = (post: any, lang: string) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    image: post.image ? (typeof post.image === 'object' ? urlFor(post.image).url() : post.image) : undefined,
    datePublished: post.publishedAt || post._createdAt || post.date,
    dateModified: post._updatedAt,
    author: {
      '@type': 'Person',
      name: 'Jon.Branding Team',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Jon.Branding',
      logo: {
        '@type': 'ImageObject',
        url: 'https://img2.teletype.in/files/92/3c/923cd394-a437-47e1-86a1-51e1a2a3eb38.png',
      },
    },
  };
};

const BlogPostPage = async (props: { params: { lang: string, slug: string } }) => {
  const { lang, slug } = props.params;
  
  const query = `*[_type == "post" && slug.current == $slug && language == $lang][0]`;
  const post = await client.fetch(query, { slug, lang }).catch(() => null) || await getPostData(lang, slug);

  if (!post) {
    notFound();
  }
  
  const jsonLd = generateJsonLd(post, lang);

  return (
    <>
      <Script
        id="blog-post-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogPostClient post={post} />
    </>
  );
};

export default BlogPostPage;
