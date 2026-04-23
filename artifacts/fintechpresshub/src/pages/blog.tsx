import { useDocumentTitle } from "@/hooks/use-document-title";
import { useListBlogPosts, useListBlogCategories } from "@workspace/api-client-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHero } from "@/components/PageHero";

export default function Blog() {
  useDocumentTitle("Blog | FintechPressHub", "Insights, strategies, and guides on fintech marketing and SEO.");
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);

  const { data: categories } = useListBlogCategories();
  const { data: posts, isLoading } = useListBlogPosts(activeCategory ? { category: activeCategory } : undefined);

  return (
    <div className="min-h-screen bg-background">
      <PageHero
        eyebrow="The Fintech Growth Hub"
        title={<>Insights From the Front Lines of Fintech SEO</>}
        description="Actionable strategy on SEO, off-page authority, digital PR, and content marketing — written by the operators running these programs for fintech brands every day."
      />

      <section className="py-12 border-b bg-card">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap gap-2 justify-center">
            <Badge 
              variant={activeCategory === undefined ? "default" : "secondary"}
              className="cursor-pointer text-sm px-4 py-1.5"
              onClick={() => setActiveCategory(undefined)}
            >
              All Posts
            </Badge>
            {categories?.map((cat) => (
              <Badge
                key={cat.name}
                variant={activeCategory === cat.name ? "default" : "secondary"}
                className="cursor-pointer text-sm px-4 py-1.5"
                onClick={() => setActiveCategory(cat.name)}
              >
                {cat.name} ({cat.count})
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="overflow-hidden border-border h-full">
                  <Skeleton className="h-48 w-full" />
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-24 mb-4" />
                    <Skeleton className="h-6 w-full mb-4" />
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : posts?.length === 0 ? (
              <div className="col-span-full text-center py-20 text-muted-foreground">
                No posts found for this category.
              </div>
            ) : (
              posts?.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                >
                  <Link href={`/blog/${post.slug}`}>
                    <Card className="overflow-hidden h-full hover:shadow-md transition-shadow border-border group cursor-pointer bg-card">
                      <div className="aspect-[16/9] overflow-hidden">
                        <img 
                          src={post.coverImage} 
                          alt={post.title} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        />
                      </div>
                      <CardContent className="p-6 flex flex-col">
                        <div className="text-sm font-medium text-primary mb-3 uppercase tracking-wider">{post.category}</div>
                        <h2 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2">{post.title}</h2>
                        <p className="text-muted-foreground line-clamp-3 mb-6 flex-1">{post.excerpt}</p>
                        <div className="flex justify-between items-center text-sm text-muted-foreground pt-4 border-t border-border">
                          <span>{new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                          <span>{post.readingMinutes} min read</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
