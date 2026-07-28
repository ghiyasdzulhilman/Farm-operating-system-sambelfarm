import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Leaf, Loader2, ArrowRight } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
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

// ==========================================
// ZOD SCHEMA — sinkron dengan validasi backend (routes/onboarding.ts)
// ==========================================
const onboardingSchema = z.object({
  namaKebun: z
    .string()
    .min(3, "Nama kebun minimal 3 karakter")
    .max(100, "Nama kebun maksimal 100 karakter"),
  namaOwner: z.string().min(1, "Nama pemilik wajib diisi"),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

export function OnboardingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { namaKebun: "", namaOwner: "" },
  });

  const createOrganisasi = useMutation({
    mutationFn: async (values: OnboardingFormValues) => {
      const res = await fetch("/api/onboarding/create-organisasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal membuat kebun. Coba lagi.");
      }

      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Kebun berhasil dibuat", description: "Selamat datang di SambelFarm." });
      // Bikin RequireOnboarding di App.tsx nge-fetch ulang status, biar nggak nyangkut di /onboarding
      queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
      setLocation("/dashboard");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Gagal membuat kebun",
        description: error instanceof Error ? error.message : "Cek kembali koneksi internet.",
      });
    },
  });

  function onSubmit(values: OnboardingFormValues) {
    createOrganisasi.mutate(values);
  }

  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] w-full items-center justify-center overflow-hidden px-4 py-12">
      {/* ORGANIC GLOBAL BACKGROUND — konsisten sama home.tsx */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute left-[-10%] top-[-10%] h-[420px] w-[420px] rounded-full bg-primary/[0.10] blur-3xl dark:bg-primary/[0.14]" />
        <div className="absolute right-[-10%] bottom-[-10%] h-[420px] w-[420px] rounded-full bg-amber-400/[0.08] blur-3xl dark:bg-amber-400/[0.10]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-[1.75rem] border border-border/50 bg-card/60 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:bg-slate-950/60">
          {/* ICON BADGE */}
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
            <Leaf className="h-7 w-7" />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-foreground md:text-3xl">
            Buat Kebun Anda
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Satu langkah terakhir sebelum mulai. Beri nama kebun Anda — semua data
            operasional dan keuangan yang Anda catat nanti akan terpisah aman di sini.
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5">
              <FormField
                control={form.control}
                name="namaKebun"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      Nama Kebun
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Contoh: Kebun Cabai Pak Budi"
                        className="h-12 rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="namaOwner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      Nama Pemilik
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nama Anda"
                        className="h-12 rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={createOrganisasi.isPending}
                className="h-14 w-full rounded-2xl bg-slate-950 text-sm font-semibold tracking-wide text-white shadow-[0_20px_40px_rgba(15,23,42,0.16)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_56px_rgba(15,23,42,0.22)] dark:bg-white dark:text-slate-950"
              >
                {createOrganisasi.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Membuat kebun...
                  </>
                ) : (
                  <>
                    Mulai Kelola Kebun
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>
      </motion.div>
    </div>
  );
}
