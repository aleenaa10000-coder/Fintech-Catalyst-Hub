import { PageMeta } from "@/components/PageMeta";
import { motion } from "framer-motion";
import { Users, Target, ShieldCheck, ArrowRight, type LucideIcon } from "lucide-react";
import { Link } from "wouter";
import aboutOffice from "@/assets/about-office.png";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/PageHero";

interface CoreValue {
  icon: LucideIcon;
  title: string;
  body: string;
}

const methodologyData: string[] = [
  "Data-Driven Topic Clusters",
  "Subject Matter Expert (SME) Interviews",
  "Technical SEO Optimization",
  "High-Authority Digital PR",
];

const valuesData: CoreValue[] = [
  {
    icon: Target,
    title: "Precision",
    body: "We measure twice and cut once. Our SEO strategies are backed by rigorous data analysis and competitor research.",
  },
  {
    icon: ShieldCheck,
    title: "Integrity",
    body: "No black-hat tactics or empty promises. We build sustainable organic growth engines that withstand algorithm updates.",
  },
  {
    icon: Users,
    title: "Partnership",
    body: "We act as an extension of your internal marketing team, aligning our KPIs directly with your revenue goals.",
  },
];

export default function About() {

  return (
    <div className="min-h-screen bg-background">
      <PageMeta page="about" />
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
                  {methodologyData.map((item, i) => (
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
            {valuesData.map(({ icon: Icon, title, body }) => (
              <Card
                key={title}
                className="group relative overflow-hidden bg-card border-border/60 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-[#0052FF]/15 hover:border-[#0052FF]/40 bg-gradient-to-br from-card to-card hover:from-[#0052FF]/5 hover:to-[#0052FF]/15"
              >
                <CardContent className="pt-6">
                  <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-[#0052FF] group-hover:text-white">
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{title}</h3>
                  <p className="text-muted-foreground">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <Link href="/services">
              <Button
                size="lg"
                className="h-12 px-8 font-semibold bg-[#0052FF] hover:bg-[#0047DB] text-white shadow-lg group"
              >
                Learn more about our process
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
