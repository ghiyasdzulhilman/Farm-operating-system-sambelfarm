import { useState, useEffect, useRef } from "react";
import { motion, animate } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CircleDollarSign,
  LineChart,
  PieChart as PieChartIcon,
  Target,
  WalletCards,
} from "lucide-react";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { Card, CardContent } from "@/components/ui/card";

// Interface untuk properti section
interface FinancialSectionProps {
  displayData: any;
  formatCurrency: (amount: number) => string;
  profitChartData: any[];
}

const metricAccent: Record<string, string> = {
  modal: "from-slate-900 to-slate-700 text-white",
  pendapatan: "from-primary to-teal-600 text-white",
  pengeluaran: "from-amber-500 to-orange-600 text-white",
  profit: "from-secondary to-primary text-white",
  margin: "from-cyan-500 to-blue-600 text-white",
  hpp: "from-stone-700 to-zinc-900 text-white",
};


// ... (lanjut ke const metricAccent = { ... } dan kode komponen yang tadi)


// --- KOMPONEN ANIMASI ANGKA HALUS ---
function SubtleAnimatedNumber({ 
  value, 
  formatFn 
}: { 
  value: number; 
  formatFn: (val: number) => string 
}) {
  const [displayValue, setDisplayValue] = useState(formatFn(0));
  const formatRef = useRef(formatFn);

  useEffect(() => {
    formatRef.current = formatFn;
  }, [formatFn]);

  useEffect(() => {
    // Animasi mulus selama 1 detik (tidak terlalu heboh)
    const controls = animate(0, value, {
      duration: 1.0, 
      ease: "easeOut",
      onUpdate: (latest) => {
        setDisplayValue(formatRef.current(latest));
      },
    });

    return () => controls.stop();
  }, [value]);

  return <>{displayValue}</>;
}

// --- METRIC CARD ---
function MetricCard({
  label,
  rawValue, // Terima angka mentahnya
  formatFn, // Cara nampilin angkanya (misal + '%', atau format rupiah)
  valueTooltip, // Angka asli buat di-hover
  caption,
  icon: Icon,
  accent,
  status,
}: any) {
  const StatusIcon = status === "down" ? ArrowDownRight : ArrowUpRight;

  return (
    <Card
      /* AUDIT WARNA: Mengganti bg-white/75 dkk dengan token semantik card & border */
      className="
        relative
        overflow-hidden
        rounded-[1.5rem]
        border-border/50
        bg-card
        text-card-foreground
        shadow-sm
      "
    >
      <CardContent className="flex min-h-[120px] flex-col justify-between p-3">
        <div
          className={`absolute right-2.5 top-2.5 rounded-xl bg-gradient-to-br p-2 shadow-sm ${metricAccent[accent]}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>

        <div className="pr-8">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground">
            {label}
          </p>
        </div>

        <div className="mt-1 flex flex-1 items-center justify-start py-1.5">
          <p
            className="w-full truncate text-left text-[17px] font-black tracking-tighter sm:text-lg"
            title={valueTooltip}
          >
            {/* Terapkan animasi di sini */}
            <SubtleAnimatedNumber value={rawValue} formatFn={formatFn} />
          </p>
        </div>

        <div>
          <div className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
            <StatusIcon
              className={`h-3 w-3 ${status === "down" ? "text-destructive" : "text-primary"}`}
            />
            live indicator
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- FINANCIAL SECTION UTAMA ---
export function FinancialSection({
  displayData,
  formatCurrency,
  profitChartData,
}: FinancialSectionProps) {
  const hpp = displayData.pengeluaran / (displayData.harvestWeight || 1);
  const bepProgress = Math.min((displayData.pendapatan / (displayData.modal || 1)) * 100, 100);

    const donutData = profitChartData.map((item, index) => ({
    ...item,
    value: Math.abs(item.profit),
    color: [
      "url(#gradEmerald)", // Warna Area 1 (Hijau zamrud)
      "url(#gradLime)",    // Warna Area 2 (Hijau limau)
      "url(#gradAmber)",   // Warna Area 3 (Kuning amber)
      "url(#gradOrange)",  // Warna Area 4 (Oranye)
    ][index % 4],
  }));

  // Ambil langsung dari sumber utama biar selalu klop sama kartu atas
const totalProfit = displayData.profit; 

  // VARIAN ANIMASI
  // Bikin kartu munculnya berurutan dengan jeda 0.08 detik (stagger)
  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  // Gerakan slide-up yang soft ala Apple/Fintech
  const fadeSlideItem = {
    hidden: { opacity: 0, y: 15 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  return (
    // Bungkus semua konten pake motion.div supaya efek stagger jalan
    <motion.div 
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-4 md:space-y-5"
    >
      
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
        <motion.div variants={fadeSlideItem}>
          <MetricCard
            label="Modal"
            rawValue={displayData.modal}
            formatFn={formatCurrency}
            valueTooltip={formatCurrency(displayData.modal)}
            icon={WalletCards}
            accent="modal"
            status="neutral"
          />
        </motion.div>

        <motion.div variants={fadeSlideItem}>
          <MetricCard
            label="Pendapatan"
            rawValue={displayData.pendapatan}
            formatFn={formatCurrency}
            valueTooltip={formatCurrency(displayData.pendapatan)}
            icon={Banknote}
            accent="pendapatan"
            status="up"
          />
        </motion.div>

        <motion.div variants={fadeSlideItem}>
          <MetricCard
            label="Pengeluaran"
            rawValue={displayData.pengeluaran}
            formatFn={formatCurrency}
            valueTooltip={formatCurrency(displayData.pengeluaran)}
            icon={ArrowDownRight}
            accent="pengeluaran"
            status="down"
          />
        </motion.div>

        <motion.div variants={fadeSlideItem}>
          <MetricCard
            label="Profit"
            rawValue={displayData.profit}
            formatFn={formatCurrency}
            valueTooltip={formatCurrency(displayData.profit)}
            icon={CircleDollarSign}
            accent="profit"
            status={displayData.profit >= 0 ? "up" : "down"}
          />
        </motion.div>

        <motion.div variants={fadeSlideItem}>
          <MetricCard
            label="Margin"
            rawValue={displayData.margin}
            formatFn={(val: number) => `${val.toFixed(1)}%`}
            valueTooltip={`${displayData.margin.toFixed(1)}%`}
            icon={PieChartIcon}
            accent="margin"
            status={displayData.margin >= 0 ? "up" : "down"}
          />
        </motion.div>
        
        <motion.div variants={fadeSlideItem}>
          <MetricCard
            label="HPP"
            rawValue={hpp}
            formatFn={(val: number) => `${formatCurrency(val)}/kg`}
            valueTooltip={`${formatCurrency(hpp)}/kg`}
            icon={LineChart}
            accent="hpp"
            status="neutral"
          />
        </motion.div>
      </div>

      <motion.div variants={fadeSlideItem}>
        {/* AUDIT WARNA: Mengganti bg-white/75 dkk dengan token semantik card & border */}
        <Card className="rounded-[1.75rem] border-border/50 bg-card text-card-foreground shadow-sm">
          <CardContent className="p-4 md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                  Area Profitability
                </p>
                <h3 className="text-xl font-black tracking-[-0.04em]">
                  Profit per area
                </h3>
              </div>
            </div>

            <div className="relative h-[250px] md:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                {/* Tambahin margin biar tooltip ga kepotong pas minggir */}
                <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  
                  {/* --- DEFS UNTUK GRADASI WARNA --- */}
                  <defs>
                    <linearGradient id="gradEmerald" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#6ee7b7" /> 
                      <stop offset="100%" stopColor="#10b981" /> 
                    </linearGradient>
                    
                    <linearGradient id="gradLime" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#bef264" /> 
                      <stop offset="100%" stopColor="#84cc16" /> 
                    </linearGradient>
                    
                    <linearGradient id="gradAmber" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#fde68a" /> 
                      <stop offset="100%" stopColor="#f59e0b" /> 
                    </linearGradient>
                    
                    <linearGradient id="gradOrange" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#fdba74" /> 
                      <stop offset="100%" stopColor="#ea580c" /> 
                    </linearGradient>
                  </defs>

                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={65} // Dikecilin dikit biar ruang tengah lega
                    outerRadius={95}
                    paddingAngle={4}
                    strokeWidth={0}
                  >
                    {donutData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color} 
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    offset={40} // <-- Ini yang bikin tooltip minggir menjauh dari jari
                    wrapperStyle={{ zIndex: 100 }}
                    contentStyle={{
                      borderRadius: "1rem",
                      border: "none",
                      boxShadow: "0 10px 40px -10px rgba(0,0,0,0.15)",
                      /* AUDIT WARNA: Background tooltip diubah biar elegan di dark mode */
                      background: "var(--card)",
                      color: "var(--card-foreground)",
                      padding: "8px 12px",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                    itemStyle={{ color: "var(--foreground)", fontWeight: "900" }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/80">
                  Total Profit
                </p>
                {/* Teks total profit dikecilin jadi text-lg biar ga nabrak */}
                <p className="mt-0.5 text-lg font-black tracking-tighter text-foreground">
                  <SubtleAnimatedNumber 
                    value={totalProfit} 
                    formatFn={formatCurrency} 
                  />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

    </motion.div>
  );
}
