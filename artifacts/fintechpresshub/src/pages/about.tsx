import { useDocumentTitle } from "@/hooks/use-document-title";
import { motion } from "framer-motion";
import { CheckCircle2, Users, Target, ShieldCheck } from "lucide-react";
import aboutOffice from "@/assets/about-office.png";
import { Card, CardContent } from "@/components/ui/card";

export default function About() {
  useDocumentTitle("About FintechPressHub | Fintech SEO Agency", "Bridging the gap between deep fintech expertise and search visibility.");

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="pt-24 pb-16 border-b">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Bridging Fintech Expertise & Search Visibility</h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              We started FintechPressHub because we noticed a gap: generalist marketing agencies didn't understand the nuances of Open Banking, BaaS, or DeFi, while financial experts didn't know how to rank on Google.
            </p>
          </motion.div>
        </div>
      </section>

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
                <img src={aboutOffice} alt="Modern Professional Office" className="rounded-2xl shadow-xl w-full h-auto aspect-[4/3] object-cover border" />
              </motion.div>
            </div>
            <div className="flex-1 space-y-6">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-3xl font-bold">Our Methodology</h2>
                <p className="text-lg text-muted-foreground">
                  Our approach is rooted in data and executed with editorial precision. We don't just chase volume; we chase qualified pipeline. Every piece of content we produce is designed to position your brand as an authority while capturing high-intent search queries.
                </p>
                <div className="space-y-4 mt-8">
                  {[
                    "Data-Driven Topic Clusters",
                    "Subject Matter Expert (SME) Interviews",
                    "Technical SEO Optimization",
                    "High-Authority Digital PR"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <span className="text-foreground font-medium">{item}</span>
                    </div>
                  ))}
                </div>
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
