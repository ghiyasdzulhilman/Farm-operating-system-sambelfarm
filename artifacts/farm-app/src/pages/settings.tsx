import { useEffect, useMemo, useState } from "react";
import { UserButton, useUser } from "@clerk/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Database,
  Eye,
  FlaskConical,
  LayoutDashboard,
  Leaf,
  Loader2,
  RefreshCcw,
  Save,
  ServerCog,
  Settings,
  Sparkles,
  Tags,
  Users2,
  Workflow,
  Zap,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import {
  getGetFieldMappingsQueryKey,
  getGetNotionConnectionStatusQueryKey,
  getInspectDatabaseQueryKey,
  getListDatabasesQueryKey,
  useGetFieldMappings,
  useGetNotionConnectionStatus,
  useInspectDatabase,
  useListDatabases,
  useSaveFieldMappings,
} from "@workspace/api-client-react";
import type { DatabaseProperty, FieldMappingEntry, SaveFieldMappingsBody } from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// 📂 DOMAIN DEFINITIONS (The "Brain" of Scaleable UI)
// ---------------------------------------------------------------------------
type DomainType = "finance" | "agronomy" | "lab" | "resource";

interface DomainConfig {
  id: DomainType;
  label: string;
  icon: any;
  description: string;
  databases: DatabaseType[];
}

type DatabaseType = 
  | "laba_rugi" | "panen" | "expenses" // Finance
  | "pindah_tanam" | "treatment_blocks" | "inspeksi" // Agronomy
  | "master_pupuk" | "kalkulator_berat" | "kombinasi_pupuk" // Lab
  | "pekerja"; // Resource

const DOMAINS: DomainConfig[] = [
  { id: "finance", label: "Finance & Ops", icon: ServerCog, description: "Laba rugi, harvest revenue, & expense tracking", databases: ["laba_rugi", "panen", "expenses"] },
  { id: "agronomy", label: "Agronomy", icon: Leaf, description: "Pindah tanam, treatment blok, & inspeksi", databases: ["pindah_tanam", "treatment_blocks", "inspeksi"] },
  { id: "lab", label: "Lab & Tools", icon: FlaskConical, description: "Kalkulator nutrisi & master data pupuk", databases: ["master_pupuk", "kalkulator_berat", "kombinasi_pupuk"] },
  { id: "resource", label: "Resources", icon: Users2, description: "Manajemen data pekerja & petugas", databases: ["pekerja"] },
];

// ---------------------------------------------------------------------------
// 🧱 SHARED SCHEMAS (Anti-Redundancy)
// ---------------------------------------------------------------------------
const TREATMENT_FIELDS = [
  { key: "kegiatan", label: "Kegiatan", expectedType: "title", description: "Contoh: Penyemprotan fungisida" },
  { key: "tanggal", label: "Date", expectedType: "date", description: "Tanggal kegiatan dilakukan" },
  { key: "status", label: "Status", expectedType: "status|select", description: "Rencana -> Proses -> Selesai" },
  { key: "petugas", label: "Petugas Lapangan", expectedType: "relation", description: "Relasi ke Data Pekerja" },
];

// ---------------------------------------------------------------------------
// 🎨 UI COMPONENTS
// ---------------------------------------------------------------------------
const glassCard = "rounded-[1.75rem] border-white/60 bg-white/70 shadow-[0_8px_32px_rgba(15,23,42,0.05)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05]";

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    title: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    number: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    relation: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    date: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  };
  return <Badge variant="outline" className={cn("rounded-full border-none px-2 py-0.5 text-[10px] font-black uppercase tracking-wider", colors[type] || "bg-slate-100")}>{type}</Badge>;
}

// ---------------------------------------------------------------------------
// 🚀 MAIN SETTINGS PAGE
// ---------------------------------------------------------------------------
export function SettingsPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const queryClient = useQueryClient();

  const [activeDomain, setActiveDomain] = useState<DomainType>("finance");
  const [dbSelections, setDbSelections] = useState<Record<string, string>>({});
  const [expandedMapping, setExpandedMapping] = useState<string | null>(null);

  const { data: connectionStatus } = useGetNotionConnectionStatus({ query: { queryKey: getGetNotionConnectionStatusQueryKey() } });
  const { data: databaseList, isFetching: isRefreshingDatabases, refetch: refreshDatabases } = useListDatabases({ query: { queryKey: getListDatabasesQueryKey() } });
  const { mutateAsync: saveFieldMappings } = useSaveFieldMappings();

  const allDatabases = databaseList?.databases ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
      
      {/* --- HEADER SECTION --- */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">System Center</h1>
          <p className="text-muted-foreground">Manage your SambelFarm relational infrastructure.</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white/50 p-2 backdrop-blur dark:bg-slate-950/50">
          <Button variant="ghost" size="icon" onClick={() => void refreshDatabases()} disabled={isRefreshingDatabases} className="rounded-xl">
            <RefreshCcw className={cn("h-4 w-4", isRefreshingDatabases && "animate-spin")} />
          </Button>
          <div className="h-8 w-px bg-border" />
          <UserButton />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        
        {/* --- SIDEBAR NAVIGATION (Domains) --- */}
        <aside className="space-y-2">
          {DOMAINS.map((domain) => {
            const Icon = domain.icon;
            const isActive = activeDomain === domain.id;
            return (
              <button
                key={domain.id}
                onClick={() => setActiveDomain(domain.id)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-2xl p-4 transition-all duration-300",
                  isActive 
                    ? "bg-slate-950 text-white shadow-xl shadow-slate-200 dark:bg-white dark:text-slate-950 dark:shadow-none" 
                    : "hover:bg-white/60 dark:hover:bg-white/5"
                )}
              >
                <div className={cn("rounded-xl p-2 transition-colors", isActive ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800")}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black">{domain.label}</p>
                  <p className={cn("text-[10px] opacity-60", isActive ? "text-white" : "text-muted-foreground")}>
                    {domain.databases.length} Databases
                  </p>
                </div>
                {isActive && <motion.div layoutId="active-pill" className="ml-auto"><ChevronRight className="h-4 w-4" /></motion.div>}
              </button>
            );
          })}
        </aside>

        {/* --- MAIN CONTENT (Details) --- */}
        <main className="space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeDomain}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="rounded-[2rem] bg-emerald-500/10 p-6 dark:bg-emerald-500/5">
                <h2 className="text-xl font-black text-emerald-800 dark:text-emerald-400">
                  {DOMAINS.find(d => d.id === activeDomain)?.label}
                </h2>
                <p className="text-sm text-emerald-700/70 dark:text-emerald-400/60">
                  {DOMAINS.find(d => d.id === activeDomain)?.description}
                </p>
              </div>

              {/* --- DATABASE CARDS IN DOMAIN --- */}
              <div className="grid gap-4">
                {DOMAINS.find(d => d.id === activeDomain)?.databases.map((dbType) => (
                  <DatabaseControlCard 
                    key={dbType} 
                    type={dbType} 
                    allDatabases={allDatabases}
                    isExpanded={expandedMapping === dbType}
                    onToggleExpand={() => setExpandedMapping(expandedMapping === dbType ? null : dbType)}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 📦 SUB-COMPONENT: Database Control Card
// ---------------------------------------------------------------------------
function DatabaseControlCard({ type, allDatabases, isExpanded, onToggleExpand }: { type: string, allDatabases: any[], isExpanded: boolean, onToggleExpand: () => void }) {
  const [selectedDb, setSelectedDb] = useState("");

  return (
    <Card className={cn(glassCard, "transition-all duration-300", isExpanded && "ring-2 ring-slate-950 dark:ring-white")}>
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
              <Database className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{type.replace("_", " ")}</p>
              <h3 className="text-lg font-black tracking-tight">Connect Notion Table</h3>
            </div>
          </div>

          <div className="flex flex-1 items-center gap-2 md:max-w-xs">
            <Select value={selectedDb} onValueChange={setSelectedDb}>
              <SelectTrigger className="h-11 rounded-full border-white/60 bg-white/50 px-4 font-bold shadow-sm backdrop-blur dark:bg-slate-900/50">
                <SelectValue placeholder="Pilih Database..." />
              </SelectTrigger>
              <SelectContent>
                {allDatabases.map(db => (
                  <SelectItem key={db.id} value={db.id}>{db.iconEmoji} {db.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={onToggleExpand}
              className={cn("h-11 w-11 shrink-0 rounded-full transition-transform", isExpanded && "rotate-180 bg-slate-950 text-white dark:bg-white dark:text-slate-950")}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* --- COLLAPSIBLE MAPPING SECTION --- */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-6 space-y-4 border-t border-dashed pt-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Property Mapping</h4>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="rounded-full text-xs font-bold"><Sparkles className="mr-2 h-3 w-3" /> Smart Map</Button>
                    <Button size="sm" className="rounded-full bg-slate-950 px-4 text-xs font-bold dark:bg-white dark:text-slate-950"><Save className="mr-2 h-3 w-3" /> Save Schema</Button>
                  </div>
                </div>

                {/* Dummy Mapping Rows */}
                <div className="grid gap-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 dark:bg-slate-900/40">
                      <div className="flex items-center gap-3">
                         <TypeBadge type="title" />
                         <span className="text-sm font-bold">Property {i}</span>
                      </div>
                      <Select>
                        <SelectTrigger className="h-9 w-44 rounded-xl text-xs">
                          <SelectValue placeholder="Select property..." />
                        </SelectTrigger>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
