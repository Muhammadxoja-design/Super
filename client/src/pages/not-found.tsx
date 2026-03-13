import { Link } from "wouter";
import { ArrowLeft, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/use-page-title";

export default function NotFound() {
  usePageTitle("404 — TaskBot");
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
        <SearchX className="w-10 h-10 text-destructive" />
      </div>
      <h1 className="text-3xl font-display font-bold mb-2">404</h1>
      <p className="text-muted-foreground max-w-xs mx-auto mb-8">
        Kechirasiz, siz qidirayotgan sahifa topilmadi yoki mavjud emas.
      </p>
      <Link href="/">
        <Button className="rounded-xl gap-2">
          <ArrowLeft className="w-4 h-4" />
          Bosh sahifaga qaytish
        </Button>
      </Link>
    </div>
  );
}
