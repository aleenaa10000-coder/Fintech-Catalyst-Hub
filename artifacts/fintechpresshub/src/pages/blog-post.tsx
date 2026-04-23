import { useDocumentTitle } from "@/hooks/use-document-title";
import { useGetBlogPost, getGetBlogPostQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BlogPost() {
  const params = useParams();
  const slug = params.slug || "";
  
  const { data: post, isLoading, error } = useGetBlogPost(slug, {
    query: { enabled: !!slug, queryKey: getGetBlogPostQueryKey(slug) }
  });

  useDocumentTitle(post ? `${post.title} | FintechPressHub` : "Blog | FintechPressHub");

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-24 max-w-3xl">
        <Skeleton className="h-8 w-24 mb-6" />
        <Skeleton className="h-12 w-full mb-6" />
        <Skeleton className="h-6 w-1/2 mb-12" />
        <Skeleton className="aspect-video w-full mb-12 rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container mx-auto px-4 py-32 text-center max-w-md">
        <h1 className="text-3xl font-bold mb-4">Post Not Found</h1>
        <p className="text-muted-foreground mb-8">The article you are looking for does not exist or has been removed.</p>
        <Link href="/blog">
          <Button>Back to Blog</Button>
        </Link>
      </div>
    );
  }

  return (
    <article className="min-h-screen bg-background pb-24">
      <header className="pt-24 pb-12 bg-secondary/30 border-b">
        <div className="container mx-auto px-4 max-w-3xl">
          <Link href="/blog" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Link>
          
          <div className="mb-6">
            <Badge variant="default" className="text-xs">{post.category}</Badge>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight text-foreground">{post.title}</h1>
          <p className="text-xl text-muted-foreground mb-8">{post.excerpt}</p>
          
          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground border-t border-border pt-6">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="font-medium text-foreground">{post.author}</span>
              <span className="opacity-70">— {post.authorRole}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{post.readingMinutes} min read</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 max-w-3xl mt-12">
        <img 
          src={post.coverImage} 
          alt={post.title} 
          className="w-full aspect-[2/1] object-cover rounded-2xl mb-16 shadow-md border"
        />
        
        <div 
          className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
        
        <div className="mt-16 pt-8 border-t border-border">
          <h3 className="text-lg font-bold mb-4">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {post.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="font-normal">{tag}</Badge>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
