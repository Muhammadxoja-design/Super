import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Welcome() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-background">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/20 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center z-10 max-w-md w-full"
      >
        <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-2xl mb-8 backdrop-blur-xl border border-white/10 shadow-2xl animate-float">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>

        <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
          Yoshlar ishlari<br />agentligi
        </h1>
        
        <p className="text-lg text-muted-foreground mb-12 font-light leading-relaxed">
          O'zbekiston yoshlari uchun maxsus platforma. Kelajagingizni biz bilan quring.
        </p>

        <Link href="/register" className="w-full block">
          <Button 
            size="lg" 
            className="w-full h-14 text-lg font-semibold rounded-2xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-[0_0_30px_-5px_rgba(var(--primary),0.5)] transition-all duration-300 group"
          >
            Ro'yxatdan o'tish
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
        
        <p className="mt-8 text-xs text-muted-foreground/60">
          © 2024 Yoshlar ishlari agentligi
        </p>
      </motion.div>
    </div>
  );
}
