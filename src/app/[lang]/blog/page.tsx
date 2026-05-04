import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { uz, ru, enUS } from 'date-fns/locale';
import { getDictionary, Locale } from '@/lib/dictionaries';
import { client, urlFor } from '@/sanity/lib/client';
import { getSortedPostsData } from '@/lib/blog-posts';

type Props = {
  params: { lang: Locale };
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { lang } = props.params;
  const dictionary = await getDictionary(lang);
  const metadata = dictionary.blog?.metadata;

  return {
    title: metadata?.title || "Jon.Branding Blog | Branding, Dizayn va Marketing",
    description: metadata?.description || "Brending, neyming va dizayn sohasidagi eng so'nggi maqolalar va tavsiyalar.",
  };
}

const BlogPage = async (props: Props) => {
  const { lang } = props.params;
  const dictionary = await getDictionary(lang as Locale);
  const translations = dictionary.blog;
  
  const query = `*[_type == "post" && language == $lang] | order(publishedAt desc)`;
  const sanityPosts = await client.fetch(query, { lang }).catch(() => []);
  const posts = sanityPosts.length > 0 ? sanityPosts : getSortedPostsData(lang);
  
  const locale = lang === 'ru' ? ru : (lang === 'en' ? enUS : uz);

  return (
    <main className="flex-grow bg-secondary/50">
      <section className="py-20 sm:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-dark-blue" suppressHydrationWarning>
              {translations?.title}
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg md:text-xl text-gray-700" suppressHydrationWarning>
              {translations?.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post: any) => {
              const slug = post.slug?.current || post.slug;
              const date = post.publishedAt || post._createdAt || post.date;
              const imageUrl = post.image && typeof post.image === 'object' ? urlFor(post.image).url() : post.image;

              return (
              <Link key={slug} href={`${lang === 'uz' ? '' : `/${lang}`}/blog/${slug}`} className="block group">
                <Card className="liquid-glass liquid-glass-hover h-full flex flex-col overflow-hidden shadow-lg rounded-[2.5rem] transition-all duration-500 transform active:scale-95">
                  <div className="relative w-full h-64 flex-shrink-0 overflow-hidden">
                    {imageUrl ? (
                        <Image
                            src={imageUrl}
                            alt={post.title}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                    ) : (
                        <div className="w-full h-full bg-secondary/20 flex items-center justify-center">
                            <span className="text-muted-foreground">No image</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500"></div>
                  </div>
                  <div className="flex flex-col flex-grow p-4">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-sm font-medium text-primary/80 uppercase tracking-wider">
                        <span>{format(parseISO(date), 'MMMM d, yyyy', { locale })}</span>
                      </CardDescription>
                      <CardTitle className="text-2xl font-black text-dark-blue leading-tight group-hover:text-primary transition-colors">
                        {post.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-gray-600 line-clamp-3 leading-relaxed">{post.description}</p>
                    </CardContent>
                    <div className="p-6 pt-0 mt-auto">
                       <span className="font-bold text-primary flex items-center transition-all duration-300 group-hover:gap-2">
                          {translations?.readMore} <ArrowRight className="ml-1 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                       </span>
                    </div>
                  </div>
                </Card>
              </Link>
              );
            })}
          </div>
          
          {posts.length === 0 && (
            <div className="text-center py-20 bg-white/30 backdrop-blur-xl rounded-[3rem] border border-white/20 shadow-xl">
                <p className="text-xl text-muted-foreground">{translations?.noPosts || "Hozircha maqolalar mavjud emas."}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default BlogPage;
