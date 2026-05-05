import { Link } from "wouter";
import { Show } from "@clerk/react";
import { ArrowRight, Sprout, TrendingUp, NotebookTabs } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center py-12 md:py-24 max-w-4xl mx-auto space-y-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-6"
      >
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
          <Sprout className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground balance" data-testid="text-hero-title">
          Kendali Penuh untuk <br className="hidden md:block"/> Operasional Kebun Anda
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto" data-testid="text-hero-subtitle">
          Sistem Manajemen Kebun menghubungkan data finansial dari Notion Anda menjadi dashboard yang ringkas, solid, dan mudah diandalkan untuk pengusaha agrikultur.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Show when="signed-out">
            <Link href="/sign-up">
              <Button size="lg" className="h-12 px-8 text-base w-full sm:w-auto group" data-testid="button-hero-signup">
                Mulai Sekarang
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base w-full sm:w-auto" data-testid="button-hero-signin">
                Masuk ke Akun
              </Button>
            </Link>
          </Show>
          
          <Show when="signed-in">
            <Link href="/dashboard">
              <Button size="lg" className="h-12 px-8 text-base w-full sm:w-auto group" data-testid="button-hero-dashboard">
                Buka Dashboard
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </Show>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mt-16">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-8 shadow-sm"
        >
          <div className="h-12 w-12 bg-secondary rounded-lg flex items-center justify-center mb-6">
            <TrendingUp className="h-6 w-6 text-secondary-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-3">Monitor Keuangan</h3>
          <p className="text-muted-foreground leading-relaxed">
            Lacak pendapatan dan pengeluaran operasional kebun Anda secara real-time. Dapatkan ringkasan laba/rugi tanpa perlu membuka spreadsheet yang rumit.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-card border border-border rounded-xl p-8 shadow-sm"
        >
          <div className="h-12 w-12 bg-secondary rounded-lg flex items-center justify-center mb-6">
            <NotebookTabs className="h-6 w-6 text-secondary-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-3">Integrasi Notion</h3>
          <p className="text-muted-foreground leading-relaxed">
            Terhubung langsung dengan database Notion "Laba Rugi" Anda. Tetap gunakan alur kerja pencatatan Anda yang sudah ada, biarkan kami yang menyajikan datanya.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
