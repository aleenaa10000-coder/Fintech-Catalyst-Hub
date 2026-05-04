import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!visible) return null;

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      aria-label="Back to top"
      className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg bg-[#0052FF] hover:bg-[#0040cc] text-white transition-opacity duration-300"
    >
      <ArrowUp className="w-4 h-4" />
    </Button>
  );
}
