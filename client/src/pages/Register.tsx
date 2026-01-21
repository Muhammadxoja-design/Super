import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Loader2,
  ArrowLeft,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRegister, useUser } from "@/hooks/use-auth";
import { DIRECTIONS } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";

// ✅ shadcn/ui
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";

// ✅ JSON
import UZ_LOCATIONS_JSON from "@/lib/uz_locations.json";

function cn(...classes: Array<string | boolean | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

// ✅ type-safe locations
type UzLocations = Record<
  string,
  {
    districts: string[];
    mahallas?: Record<string, string[]>;
  }
>;

const UZ_LOCATIONS = UZ_LOCATIONS_JSON as unknown as UzLocations;

const REGIONS = Object.keys(UZ_LOCATIONS).sort((a, b) =>
  a.localeCompare(b, "uz"),
);

const formSchema = z.object({
  login: z.string().min(3, "Login kamida 3 ta belgidan iborat bo'lishi kerak"),
  password: z
    .string()
    .min(8, "Parol kamida 8 ta belgidan iborat bo'lishi kerak"),
  username: z.string().optional(),
  firstName: z.string().min(2, "Ism kiriting"),
  lastName: z.string().min(2, "Familiya kiriting"),
  phone: z.string().min(9, "Telefon raqam noto'g'ri"),
  birthDate: z.string().min(1, "Tug'ilgan sana kiritilishi shart"),

  region: z.string().min(2, "Viloyat tanlang"),
  district: z.string().min(2, "Tuman/shahar tanlang"),
  mahalla: z.string().min(2, "Mahalla tanlang yoki kiriting"),
  address: z.string().optional(),

  direction: z.string().min(1, "Yo'nalish tanlanishi shart"),
});

type FormValues = z.infer<typeof formSchema>;

type TelegramUser = {
  id?: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

function SearchRadioSelect(props: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  items: string[];
  disabled?: boolean;
  emptyText?: string;
  allowCustom?: boolean;
  customLabel?: string;
  onCustomSelected?: () => void;
}) {
  const {
    value,
    onChange,
    placeholder,
    items,
    disabled,
    emptyText = "Hech narsa topilmadi",
    allowCustom,
    customLabel = "Qo'lda kiritish",
    onCustomSelected,
  } = props;

  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full h-12 justify-between rounded-xl bg-card/50",
            !value && "text-muted-foreground",
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-70" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Qidirish..." />
          <CommandEmpty>{emptyText}</CommandEmpty>

          <CommandGroup className="max-h-64 overflow-auto">
            {allowCustom && (
              <CommandItem
                value="__custom__"
                onSelect={() => {
                  onCustomSelected?.();
                  setOpen(false);
                }}
                className="gap-2"
              >
                <div className="h-4 w-4 rounded-full border flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full opacity-0" />
                </div>
                <span className="font-medium">{customLabel}</span>
              </CommandItem>
            )}

            {items.map((it) => {
              const selected = it === value;
              return (
                <CommandItem
                  key={it}
                  value={it}
                  onSelect={() => {
                    onChange(it);
                    setOpen(false);
                  }}
                  className="gap-2"
                >
                  <div className="h-4 w-4 rounded-full border flex items-center justify-center">
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full",
                        selected && "bg-primary",
                      )}
                    />
                  </div>

                  <span className="truncate">{it}</span>

                  {selected ? (
                    <Check className="ml-auto h-4 w-4 opacity-70" />
                  ) : null}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function Register() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const register = useRegister();
  const { data: user } = useUser();
  const [isTelegramWebApp, setIsTelegramWebApp] = useState(false);

  const telegramDefaults = useMemo(() => {
    if (typeof window === "undefined") {
      return { login: "", username: "", firstName: "", lastName: "" };
    }
    const webApp = window.Telegram?.WebApp;
    const tgUser = webApp?.initDataUnsafe?.user as TelegramUser | undefined;
    const loginCandidate =
      tgUser?.username || (tgUser?.id ? `user_${tgUser.id}` : "");

    return {
      login: loginCandidate,
      username: tgUser?.username || "",
      firstName: tgUser?.first_name || "",
      lastName: tgUser?.last_name || "",
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const webApp = window.Telegram?.WebApp;
    const hasInitData = Boolean(webApp?.initData);
    const hasUnsafeUser = Boolean(webApp?.initDataUnsafe?.user);

    webApp?.ready?.();
    setIsTelegramWebApp(hasInitData || hasUnsafeUser);
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      login: telegramDefaults.login,
      password: "",
      username: telegramDefaults.username,
      firstName: telegramDefaults.firstName,
      lastName: telegramDefaults.lastName,
      phone: user?.phone || "+998",
      birthDate: user?.birthDate || "",

      region: user?.region || "",
      district: user?.district || "",
      mahalla: user?.mahalla || "",
      address: user?.address || "",

      direction: user?.direction || "",
    },
    mode: "onTouched",
  });

  const regionValue = form.watch("region");
  const districtValue = form.watch("district");

  const districtItems = useMemo(() => {
    if (!regionValue) return [];
    return UZ_LOCATIONS[regionValue]?.districts ?? [];
  }, [regionValue]);

  const mahallaItems = useMemo(() => {
    if (!regionValue || !districtValue) return [];
    return UZ_LOCATIONS[regionValue]?.mahallas?.[districtValue] ?? [];
  }, [regionValue, districtValue]);

  const [mahallaCustom, setMahallaCustom] = useState(false);

  // ✅ region o'zgarsa district/mahalla tozalansin
  useEffect(() => {
    form.setValue("district", "");
    form.setValue("mahalla", "");
    setMahallaCustom(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionValue]);

  // ✅ district o'zgarsa mahalla tozalansin + agar ro'yxat bo'lmasa customga o't
  useEffect(() => {
    form.setValue("mahalla", "");
    const hasMahallas =
      regionValue &&
      districtValue &&
      (UZ_LOCATIONS[regionValue]?.mahallas?.[districtValue]?.length ?? 0) > 0;

    setMahallaCustom(!hasMahallas); // ro'yxat yo'q bo'lsa true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districtValue]);

  async function onSubmit(data: FormValues) {
    try {
      if (!isTelegramWebApp && !user) {
        toast({
          variant: "destructive",
          title: "Telegram orqali kirish talab qilinadi",
          description:
            "Ro'yxatdan o'tish uchun ilovani Telegram ichida oching.",
        });
        return;
      }

      await register.mutateAsync({
        login: data.login,
        password: data.password,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        birthDate: data.birthDate,
        region: data.region,
        district: data.district,
        mahalla: data.mahalla,
        address: data.address,
        direction: data.direction,
      });

      toast({
        title: "Muvaffaqiyatli!",
        description: "Ro'yxatdan o'tish yakunlandi.",
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
    const fields =
      step === 1
        ? ["login", "password", "firstName", "lastName", "phone", "birthDate"]
        : step === 2
          ? ["region", "district", "mahalla"]
          : ["direction"];

    const valid = await form.trigger(fields as any, { shouldFocus: true });
    if (valid) setStep((s) => Math.min(3, s + 1));
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border/50 px-6 py-4 flex items-center justify-between">
        {step > 1 ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setStep((s) => s - 1)}
            className="-ml-2"
          >
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
        {!isTelegramWebApp && !user && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Ro'yxatdan o'tish uchun ilovani Telegram WebApp ichida ochishingiz
            kerak.
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <fieldset
              disabled={!isTelegramWebApp && !user}
              className={!isTelegramWebApp && !user ? "opacity-60" : ""}
            >
              {step === 1 && (
                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="space-y-1 mb-6">
                    <h2 className="text-2xl font-bold">Login va parol</h2>
                    <p className="text-muted-foreground text-sm">
                      Telegram ma'lumotlari avtomatik to'ldirildi
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="login"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Login</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="login"
                            className="h-12 bg-card/50"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telegram username</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="@username"
                            className="h-12 bg-card/50"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parol</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="********"
                            className="h-12 bg-card/50"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ism</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ism"
                              className="h-12 bg-card/50"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Familiya</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Familiya"
                              className="h-12 bg-card/50"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon raqam</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+998 90 123 45 67"
                            className="h-12 bg-card/50"
                            {...field}
                          />
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
                          <Input
                            type="date"
                            className="h-12 bg-card/50"
                            {...field}
                            value={field.value || ""}
                          />
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
                    Davom etish <ChevronRight className="ml-2 w-4 h-4" />
                  </Button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="space-y-1 mb-6">
                    <h2 className="text-2xl font-bold">Manzil</h2>
                    <p className="text-muted-foreground text-sm">
                      Viloyat / tuman / mahallani qidirib tanlang
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Viloyat</FormLabel>
                        <FormControl>
                          <SearchRadioSelect
                            value={field.value || ""}
                            onChange={(v) => field.onChange(v)}
                            placeholder="Viloyat tanlang..."
                            items={REGIONS}
                          />
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
                        <FormLabel>Tuman / Shahar</FormLabel>
                        <FormControl>
                          <SearchRadioSelect
                            value={field.value || ""}
                            onChange={(v) => field.onChange(v)}
                            placeholder={
                              regionValue
                                ? "Tuman/shahar tanlang..."
                                : "Avval viloyat tanlang"
                            }
                            items={districtItems}
                            disabled={!regionValue}
                            emptyText={
                              regionValue
                                ? "Bu viloyatda ro'yxat topilmadi"
                                : "Avval viloyat tanlang"
                            }
                          />
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

                        {mahallaCustom ? (
                          <FormControl>
                            <div className="space-y-2">
                              <Input
                                className="h-12 bg-card/50"
                                placeholder="Mahalla nomini kiriting"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value)}
                              />

                              {mahallaItems.length > 0 ? (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="w-full rounded-xl"
                                  onClick={() => {
                                    setMahallaCustom(false);
                                    field.onChange("");
                                  }}
                                >
                                  Ro'yxatdan tanlashga qaytish
                                </Button>
                              ) : null}
                            </div>
                          </FormControl>
                        ) : (
                          <FormControl>
                            <SearchRadioSelect
                              value={field.value || ""}
                              onChange={(v) => field.onChange(v)}
                              placeholder={
                                districtValue
                                  ? "Mahalla tanlang..."
                                  : "Avval tuman/shahar tanlang"
                              }
                              items={mahallaItems}
                              disabled={!districtValue}
                              allowCustom
                              customLabel="Qo'lda kiritish"
                              onCustomSelected={() => {
                                setMahallaCustom(true);
                                field.onChange("");
                              }}
                              emptyText={
                                districtValue
                                  ? "Mahalla topilmadi — Qo'lda kiritish tanlang"
                                  : "Avval tuman/shahar tanlang"
                              }
                            />
                          </FormControl>
                        )}

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aniq manzil (ixtiyoriy)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ko'cha, uy, xonadon"
                            className="h-12 bg-card/50"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <p className="mt-8 text-xs text-muted-foreground/60">
                    Dasturchi Bilan Bog'lanish: <br />
                    <a
                      href="https://t.me/m_kimyonazarov"
                      className="text-primary hover:underline"
                    >
                      Muhammadxo'ja Kimyonazarov
                    </a>
                  </p>

                  <Button
                    type="button"
                    onClick={nextStep}
                    className="w-full h-12 mt-4 text-base rounded-xl"
                  >
                    Davom etish <ChevronRight className="ml-2 w-4 h-4" />
                  </Button>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="space-y-1 mb-6">
                    <h2 className="text-2xl font-bold">Yo'nalish tanlang</h2>
                    <p className="text-muted-foreground text-sm">
                      Qaysi sohada faoliyat yuritmoqchisiz?
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="direction"
                    render={({ field }) => (
                      <div className="grid grid-cols-1 gap-3">
                        {DIRECTIONS.map((direction) => (
                          <button
                            type="button"
                            key={direction}
                            onClick={() => field.onChange(direction)}
                            className={cn(
                              "rounded-xl border px-4 py-3 text-left transition",
                              field.value === direction
                                ? "border-primary bg-primary/10"
                                : "border-border bg-card/50",
                            )}
                          >
                            <div className="font-semibold">{direction}</div>
                          </button>
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
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                        Yuborilmoqda...
                      </>
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
