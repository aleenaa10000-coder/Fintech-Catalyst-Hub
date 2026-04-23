import { useDocumentTitle } from "@/hooks/use-document-title";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useGetTrustStats, useListTestimonials, useListFeaturedPosts, useListServices } from "@workspace/api-client-react";
import heroBg from "@/assets/hero-bg.png";
import servicesGraph from "@/assets/services-graph.png";
import { ArrowRight, CheckCircle2, TrendingUp, ShieldCheck, Globe } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { CountUp } from "@/components/CountUp";
import { ParticleNetwork } from "@/components/ParticleNetwork";

export default function Home() {
  useDocumentTitle("FintechPressHub | Fintech SEO & Content Marketing Agency", "Expert content marketing and off-page SEO for fintech companies.");
  
  const { data: stats } = useGetTrustStats();
  const { data: testimonials } = useListTestimonials();
  const { data: featuredPosts } = useListFeaturedPosts();
  const { data: services } = useListServices();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden bg-gradient-to-br from-[#0b1e4d] via-[#102a6b] to-[#0a1633]">
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(125, 211, 252, 0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(125, 211, 252, 0.55) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage:
                "radial-gradient(ellipse at center, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 75%)",
              WebkitMaskImage:
                "radial-gradient(ellipse at center, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 75%)",
            }}
          />
          <ParticleNetwork className="absolute inset-0 w-full h-full" />
          <div className="absolute -top-32 -left-32 w-[32rem] h-[32rem] rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-[32rem] h-[32rem] rounded-full bg-blue-500/25 blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a1633]/60" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1
                className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-tight"
                style={{ textShadow: "0 2px 24px rgba(8, 18, 51, 0.55), 0 1px 2px rgba(0,0,0,0.3)" }}
              >
                Optimized Fintech Content That <span className="text-cyan-200">Ranks & Converts</span>
              </h1>
              <p
                className="text-xl text-blue-100/95 mb-10 max-w-2xl mx-auto leading-relaxed"
                style={{ textShadow: "0 1px 12px rgba(8, 18, 51, 0.5)" }}
              >
                We blend deep financial expertise with high-authority link building and technical SEO to scale organic growth for ambitious fintech companies.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/contact">
                  <Button size="lg" className="h-12 px-8 text-base bg-white text-blue-700 hover:bg-blue-50">
                    Get a Free Audit
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/services">
                  <Button variant="outline" size="lg" className="h-12 px-8 text-base border-white/40 text-white bg-white/10 hover:bg-white/20 hover:text-white">
                    View Our Services
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Stats */}
      <section className="py-12 bg-secondary/50 border-y">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats ? (
              <>
                <div className="text-center">
                  <div className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-blue-600 via-cyan-500 to-cyan-400 bg-clip-text text-transparent">
                    <CountUp end={stats.clientsServed} suffix="+" />
                  </div>
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Clients Served</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-blue-600 via-cyan-500 to-cyan-400 bg-clip-text text-transparent">
                    <CountUp end={stats.articlesPublished} suffix="+" />
                  </div>
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Articles Published</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-blue-600 via-cyan-500 to-cyan-400 bg-clip-text text-transparent">
                    <CountUp end={stats.backlinksAcquired} suffix="+" />
                  </div>
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Backlinks Built</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-blue-600 via-cyan-500 to-cyan-400 bg-clip-text text-transparent">
                    <CountUp end={stats.averageDomainRating} suffix="+" />
                  </div>
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Avg. Partner DR</div>
                </div>
              </>
            ) : (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Services Overview */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-6">Expertise meets execution.</h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Generic content agencies don't understand Open Banking, DeFi, or Payment gateways. We do. We pair industry experts with SEO specialists to drive qualified traffic that actually converts to pipeline.
                </p>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3 text-foreground">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <span>Authoritative long-form content</span>
                  </li>
                  <li className="flex items-center gap-3 text-foreground">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <span>High-DR digital PR and link building</span>
                  </li>
                  <li className="flex items-center gap-3 text-foreground">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <span>Technical SEO architecture</span>
                  </li>
                </ul>
                <Link href="/services">
                  <Button>Explore Solutions <ArrowRight className="ml-2 w-4 h-4" /></Button>
                </Link>
              </motion.div>
            </div>
            <div className="flex-1">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="relative rounded-2xl overflow-hidden shadow-2xl border bg-card"
              >
                <img src={servicesGraph} alt="Growth Graph" className="w-full h-auto object-cover aspect-[4/3]" />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Trusted by Fintech Leaders</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials ? (
              testimonials.map((testimonial, i) => (
                <motion.div
                  key={testimonial.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <Card className="h-full bg-card">
                    <CardContent className="p-8 flex flex-col h-full">
                      <div className="flex gap-1 mb-6">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <svg key={i} className={`w-5 h-5 ${i < testimonial.rating ? 'text-yellow-400' : 'text-muted'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <p className="text-foreground text-lg mb-8 flex-1 italic">"{testimonial.quote}"</p>
                      <div>
                        <div className="font-bold text-foreground">{testimonial.name}</div>
                        <div className="text-sm text-muted-foreground">{testimonial.role}, {testimonial.company}</div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="h-full"><CardContent className="p-8"><Skeleton className="h-32 w-full mb-4" /><Skeleton className="h-4 w-1/2" /></CardContent></Card>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Featured Posts */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-4">Latest Insights</h2>
              <p className="text-muted-foreground text-lg">Actionable SEO and marketing strategies for fintech.</p>
            </div>
            <Link href="/blog" className="hidden md:flex">
              <Button variant="ghost">View All Posts <ArrowRight className="ml-2 w-4 h-4" /></Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredPosts ? (
              featuredPosts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="group cursor-pointer"
                >
                  <Link href={`/blog/${post.slug}`}>
                    <div className="rounded-xl overflow-hidden mb-6 aspect-video">
                      <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                    <div className="text-sm text-primary font-medium mb-3">{post.category}</div>
                    <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2">{post.title}</h3>
                    <p className="text-muted-foreground line-clamp-2 mb-4">{post.excerpt}</p>
                    <div className="text-sm text-muted-foreground">{new Date(post.publishedAt).toLocaleDateString()} · {post.readingMinutes} min read</div>
                  </Link>
                </motion.div>
              ))
            ) : (
               Array.from({ length: 3 }).map((_, i) => (
                <div key={i}><Skeleton className="aspect-video w-full rounded-xl mb-4" /><Skeleton className="h-6 w-full mb-2" /><Skeleton className="h-4 w-2/3" /></div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-primary text-primary-foreground text-center">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-4xl font-bold mb-6">Ready to dominate search results?</h2>
          <p className="text-xl mb-10 opacity-90">Join top fintech companies scaling their organic revenue with our specialized SEO and content strategies.</p>
          <Link href="/contact">
            <Button size="lg" variant="secondary" className="h-14 px-10 text-lg font-semibold">
              Get Started Today
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
