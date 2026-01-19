import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ChevronRight, Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRegister } from "@/hooks/use-auth";
import { insertUserSchema, DIRECTIONS } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DirectionCard } from "@/components/ui/DirectionCard";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";

// Create a schema that makes fields required for the form
const formSchema = insertUserSchema.omit({ 
  telegramId: true, 
  role: true, 
  status: true,
  createdAt: true 
}).extend({
  fullName: z.string().min(3, "To'liq ism kiritilishi shart"),
  phone: z.string().min(9, "Telefon raqam noto'g'ri"),
  direction: z.string().min(1, "Yo'nalish tanlanishi shart"),
});

type FormValues = z.infer<typeof formSchema>;

export default function Register() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const register = useRegister();
  const [isTelegramWebApp, setIsTelegramWebApp] = useState(false);
  const hasAuthToken =
    typeof window !== "undefined" && Boolean(window.localStorage.getItem("authToken"));
  const canRegister = isTelegramWebApp || hasAuthToken;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const webApp = window.Telegram?.WebApp;
    const hasInitData = Boolean(webApp?.initData);
    const hasUnsafeUser = Boolean(webApp?.initDataUnsafe?.user);
    setIsTelegramWebApp(hasInitData || hasUnsafeUser);
    console.log("[Register] Telegram WebApp detection", {
      hasTelegramObject: Boolean(window.Telegram),
      hasWebApp: Boolean(webApp),
      hasInitData,
      hasUnsafeUser,
      initDataLength: webApp?.initData?.length || 0,
    });
    console.log("[Register] Auth token present", { hasAuthToken });
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      phone: "+998",
      region: "",
      district: "",
      mahalla: "",
      address: "",
      direction: "",
    },
  });

  async function onSubmit(data: FormValues) {
    try {
      if (!canRegister) {
        toast({
          variant: "destructive",
          title: "Telegram orqali kirish talab qilinadi",
          description: "Ro'yxatdan o'tish uchun ilovani Telegram ichida oching.",
        });
        return;
      }
      await register.mutateAsync(data);
      toast({
        title: "Muvaffaqiyatli!",
        description: "Ro'yxatdan o'tish yakunlandi. Admin tasdiqlashi kutilmoqda.",
      });
      setLocation("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: error.message || "Ro'yxatdan o'tishda xatolik yuz berdi",
      });
    }
  }

  const nextStep = async () => {
    const fields = step === 1 
      ? ['fullName', 'phone', 'birthDate'] 
      : ['region', 'district', 'mahalla', 'address'];
      
    const valid = await form.trigger(fields as any);
    if (valid) setStep(s => s + 1);
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border/50 px-6 py-4 flex items-center justify-between">
        {step > 1 ? (
          <Button variant="ghost" size="icon" onClick={() => setStep(s => s - 1)} className="-ml-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        ) : (
          <div className="w-10" />
        )}
        <h1 className="font-display font-bold text-lg">Ro'yxatdan o'tish</h1>
        <div className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-1 rounded-md">
          {step}/3
        </div>
      </div>

      <div className="p-6 max-w-md mx-auto">
        {!canRegister && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Ro'yxatdan o'tish uchun ilovani Telegram WebApp ichida ochishingiz kerak.
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <fieldset disabled={!canRegister} className={!canRegister ? "opacity-60" : ""}>
            
            {/* STEP 1: Personal Info */}
            {step === 1 && (
              <motion.div 
                initial={{ x: 20, opacity: 0 }} 
                animate={{ x: 0, opacity: 1 }}
                className="space-y-4"
              >
                <div className="space-y-1 mb-6">
                  <h2 className="text-2xl font-bold">Shaxsiy ma'lumotlar</h2>
                  <p className="text-muted-foreground text-sm">O'zingiz haqingizda ma'lumot bering</p>
                </div>

                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>F.I.SH</FormLabel>
                      <FormControl>
                        <Input placeholder="Eshmatov Toshmat" className="h-12 bg-card/50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefon raqam</FormLabel>
                      <FormControl>
                        <Input placeholder="+998 90 123 45 67" className="h-12 bg-card/50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tug'ilgan sana</FormLabel>
                      <FormControl>
                        <Input type="date" className="h-12 bg-card/50" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  onClick={nextStep}
                  className="w-full h-12 mt-4 text-base rounded-xl"
                >
                  Davom etish
                  <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </motion.div>
            )}

            {/* STEP 2: Address Info */}
            {step === 2 && (
              <motion.div 
                initial={{ x: 20, opacity: 0 }} 
                animate={{ x: 0, opacity: 1 }}
                className="space-y-4"
              >
                <div className="space-y-1 mb-6">
                  <h2 className="text-2xl font-bold">Manzil</h2>
                  <p className="text-muted-foreground text-sm">Yashash manzilingizni kiriting</p>
                </div>

                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Viloyat</FormLabel>
                      <FormControl>
                        <Input placeholder="Toshkent shahri" className="h-12 bg-card/50" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tuman</FormLabel>
                      <FormControl>
                        <Input placeholder="Chilonzor tumani" className="h-12 bg-card/50" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mahalla"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mahalla</FormLabel>
                      <FormControl>
                        <Input placeholder="Navro'z mahallasi" className="h-12 bg-card/50" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aniq manzil</FormLabel>
                      <FormControl>
                        <Input placeholder="Ko'cha, uy, xonadon" className="h-12 bg-card/50" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  onClick={nextStep}
                  className="w-full h-12 mt-4 text-base rounded-xl"
                >
                  Davom etish
                  <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </motion.div>
            )}

            {/* STEP 3: Direction Selection */}
            {step === 3 && (
              <motion.div 
                initial={{ x: 20, opacity: 0 }} 
                animate={{ x: 0, opacity: 1 }}
                className="space-y-4"
              >
                <div className="space-y-1 mb-6">
                  <h2 className="text-2xl font-bold">Yo'nalish tanlang</h2>
                  <p className="text-muted-foreground text-sm">Qaysi sohada faoliyat yuritmoqchisiz?</p>
                </div>

                <FormField
                  control={form.control}
                  name="direction"
                  render={({ field }) => (
                    <div className="grid grid-cols-1 gap-3">
                      {DIRECTIONS.map((direction) => (
                        <DirectionCard
                          key={direction}
                          title={direction}
                          selected={field.value === direction}
                          onClick={() => field.onChange(direction)}
                        />
                      ))}
                      <FormMessage />
                    </div>
                  )}
                />

                <Button
                  type="submit"
                  disabled={register.isPending}
                  className="w-full h-14 mt-8 text-base font-bold rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                >
                  {register.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Yuborilmoqda...</>
                  ) : (
                    "Ro'yxatdan o'tishni yakunlash"
                  )}
                </Button>
              </motion.div>
            )}
            </fieldset>
          </form>
        </Form>
      </div>
    </div>
  );
}
