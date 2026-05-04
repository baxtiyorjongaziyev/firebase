'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, User, Share2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { PortableText } from '@portabletext/react';
import { motion } from 'framer-motion';
import { urlFor } from '@/sanity/lib/client';

const components = {
  types: {
    image: ({ value }: any) => (
      <div className="relative w-full h-[400px] my-10 rounded-[2rem] overflow-hidden shadow-2xl">
        <Image
          src={urlFor(value).url()}
          alt={value.alt || 'Blog image'}
          fill
          className="object-cover"
        />
      </div>
    ),
  },
  block: {
    h2: ({ children }: any) => <h2 className="text-3xl font-black text-dark-blue mt-12 mb-6">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-2xl font-bold text-dark-blue mt-8 mb-4">{children}</h3>,
    normal: ({ children }: any) => <p className="text-lg text-gray-700 leading-relaxed mb-6">{children}</p>,
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-8 border-primary bg-primary/5 p-8 my-10 rounded-r-[2rem] italic text-xl text-dark-blue">
        {children}
      </blockquote>
    ),
  },
};

const BlogPostClient = ({ post }: { post: any }) => {
  const router = useRouter();
  const imageUrl = post.image && typeof post.image === 'object' ? urlFor(post.image).url() : post.image;
  const publishedAt = post.publishedAt || post._createdAt || post.date;

  return (
    <motion.main 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="bg-secondary/30 min-h-screen pb-20 pt-32"
    >
      <div className="container mx-auto px-4 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-8 group text-dark-blue hover:bg-white/50 backdrop-blur-sm rounded-full px-6"
        >
          <ArrowLeft className="mr-2 h-5 w-5 transition-transform group-hover:-translate-x-1" />
          Orqaga qaytish
        </Button>

        <article className="liquid-glass bg-white/80 p-8 sm:p-12 md:p-16 rounded-[3rem] shadow-2xl border border-white/40 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10 translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-blue/10 rounded-full blur-[80px] -z-10 -translate-x-1/2 translate-y-1/2" />

          {imageUrl && (
            <div className="relative w-full h-[300px] sm:h-[500px] rounded-[2.5rem] overflow-hidden mb-12 shadow-xl ring-1 ring-black/5">
              <Image
                src={imageUrl}
                alt={post.title}
                fill
                priority
                className="object-cover"
              />
            </div>
          )}

          <header className="mb-12">
            <div className="flex flex-wrap items-center gap-6 mb-6 text-sm font-bold text-primary/80 uppercase tracking-widest">
              <span className="flex items-center bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full ring-1 ring-black/5">
                <Calendar className="mr-2 h-4 w-4" />
                {format(parseISO(publishedAt), 'MMMM d, yyyy')}
              </span>
              <span className="flex items-center bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full ring-1 ring-black/5">
                <User className="mr-2 h-4 w-4" />
                Jon.Branding Team
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-dark-blue leading-tight mb-8">
              {post.title}
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed font-medium italic border-l-4 border-primary/30 pl-6 mb-12">
              {post.description}
            </p>
          </header>

          <div className="prose prose-lg prose-primary max-w-none">
            {post.htmlContent ? (
              <div dangerouslySetInnerHTML={{ __html: post.htmlContent }} />
            ) : (
              <PortableText value={post.content} components={components} />
            )}
          </div>

          <footer className="mt-16 pt-10 border-t border-gray-100 flex items-center justify-between">
             <div className="flex items-center gap-4">
                 <span className="text-sm font-bold text-dark-blue/60 uppercase">Ulashish:</span>
                 <Button variant="ghost" size="icon" className="rounded-full bg-secondary/50 hover:bg-primary hover:text-white transition-all">
                     <Share2 className="h-5 w-5" />
                 </Button>
             </div>
          </footer>
        </article>
      </div>
    </motion.main>
  );
};

export default BlogPostClient;
