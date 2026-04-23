import { useDocumentTitle } from "@/hooks/use-document-title";
import { motion } from "framer-motion";
import { Users, Target, ShieldCheck } from "lucide-react";
import aboutOffice from "@/assets/about-office.png";
import { Card, CardContent } from "@/components/ui/card";
import { PageHero } from "@/components/PageHero";

export default function About() {
  useDocumentTitle("About FintechPressHub | Fintech SEO Agency", "Bridging the gap between deep fintech expertise and search visibility.");

  return (
    <div className="min-h-screen bg-background">
      <PageHero
        eyebrow="About FintechPressHub"
        title={<>Bridging Fintech Expertise & Search Visibility</>}
        titleClassName="text-4xl font-extrabold leading-[1.1] tracking-tight text-white md:text-5xl lg:text-6xl"
        description={
          <div className="max-w-3xl space-y-4 text-base leading-relaxed text-white/85 md:text-lg">
            <p>
              We started FintechPressHub because we saw a gap: generalist marketing agencies didn't understand the nuances of Open Banking, BaaS, or DeFi.
            </p>
            <p>
              At the same time, the financial experts who lived and breathed those topics didn't know how to rank on Google. We built the team that does both.
            </p>
          </div>
        }
        showScrollIndicator
      />

      {/* Mission & Image */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <img
                  src={aboutOffice}
                  alt="Modern Professional Office"
                  className="rounded-2xl w-full h-auto aspect-[4/3] object-cover border border-blue-500/20 shadow-2xl shadow-blue-500/10 ring-1 ring-blue-500/10"
                />
              </motion.div>
            </div>
            <div className="flex-1 space-y-6">
              <motion.div
                initial={{ opacity: 0, x: 60 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <h2 className="text-3xl font-bold">Our Methodology</h2>
                <p className="text-lg text-muted-foreground mt-3">
                  Our approach is rooted in data and executed with editorial precision. We don't just chase volume; we chase qualified pipeline. Every piece of content we produce is designed to position your brand as an authority while capturing high-intent search queries.
                </p>
                <ol className="space-y-5 mt-8">
                  {[
                    "Data-Driven Topic Clusters",
                    "Subject Matter Expert (SME) Interviews",
                    "Technical SEO Optimization",
                    "High-Authority Digital PR",
                  ].map((item, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: 30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: "-60px" }}
                      transition={{ duration: 0.45, delay: 0.15 + i * 0.08, ease: "easeOut" }}
                      className="flex items-center gap-4"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm ring-1 ring-primary/20">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-foreground font-medium">{item}</span>
                    </motion.li>
                  ))}
                </ol>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">Core Values</h2>
            <p className="text-muted-foreground text-lg">The principles that drive our work and our relationships with clients.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-card">
              <CardContent className="pt-6">
                <Target className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2">Precision</h3>
                <p className="text-muted-foreground">We measure twice and cut once. Our SEO strategies are backed by rigorous data analysis and competitor research.</p>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardContent className="pt-6">
                <ShieldCheck className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2">Integrity</h3>
                <p className="text-muted-foreground">No black-hat tactics or empty promises. We build sustainable organic growth engines that withstand algorithm updates.</p>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardContent className="pt-6">
                <Users className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2">Partnership</h3>
                <p className="text-muted-foreground">We act as an extension of your internal marketing team, aligning our KPIs directly with your revenue goals.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
