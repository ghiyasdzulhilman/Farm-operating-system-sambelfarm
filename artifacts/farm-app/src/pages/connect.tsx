import { useState } from "react";
import { motion } from "framer-motion";
import { LinkIcon, Unlink, ExternalLink, Loader2, Database, AlertTriangle, RefreshCw, Wheat, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

import { 
  useGetNotionConnectionStatus, 
  getGetNotionConnectionStatusQueryKey,
  useInitiateNotionOAuth,
  useDisconnectNotion
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ConnectPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);

  const { 
    data: connectionStatus, 
    isLoading: isLoadingStatus 
  } = useGetNotionConnectionStatus({
    query: {
      queryKey: getGetNotionConnectionStatusQueryKey()
    }
  });

  const initiateOAuth = useInitiateNotionOAuth({
    mutation: {
      onSuccess: (data) => {
        window.location.href = data.url;
      },
      onError: () => {
        setIsConnecting(false);
        toast({
          variant: "destructive",
          title: "Gagal menghubungkan",
          description: "Terjadi kesalahan saat memulai koneksi ke Notion."
        });
      }
    }
  });

  const disconnect = useDisconnectNotion({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Berhasil diputuskan",
          description: "Koneksi ke Notion berhasil dihapus."
        });
        queryClient.invalidateQueries({ queryKey: getGetNotionConnectionStatusQueryKey() });
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "Gagal memutuskan koneksi",
          description: "Terjadi kesalahan."
        });
      }
    }
  });

  const handleConnect = () => {
    setIsConnecting(true);
    initiateOAuth.mutate();
  };

  const handleDisconnect = () => {
    disconnect.mutate();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "dd MMMM yyyy", { locale: id });
    } catch (e) {
      return dateString;
    }
  };

  const isConnected = connectionStatus?.connected;
  const isTokenInvalid = isConnected && connectionStatus?.tokenStatus === "invalid";

  // Konfigurasi Pendaran Cahaya Pinggir (Edge Glow Dynamic)
  const glowColorClass = isTokenInvalid
    ? "border-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.15)]"
    : isConnected
      ? "border-primary/30 shadow-[0_0_30px_rgba(34,197,94,0.15)]"
      : "border-border/40 shadow-[0_0_20px_rgba(255,255,255,0.02)]";

  return (
    <div className="max-w-2xl mx-auto space-y-8 px-1 pb-16">
      {/* HEADER TYPOGRAPHY */}
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight text-foreground" data-testid="text-connect-title">
          Koneksi Notion
        </h1>
        <p className="text-sm text-muted-foreground/80 font-medium" data-testid="text-connect-subtitle">
          Kelola jalur pipa integrasi workspace Notion dengan pusat kendali Sambel Farm.
        </p>
      </div>

      {/* BANNER ERROR TOKEN PUTUS */}
      {isTokenInvalid && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Alert variant="destructive" className="border-destructive/30 bg-destructive/10 text-destructive dark:bg-red-950/20 rounded-2xl">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertTitle className="font-bold">Koneksi Autentikasi Putus</AlertTitle>
            <AlertDescription className="text-xs opacity-90 leading-relaxed mt-1">
              Token akses masuk ditolak atau dicabut dari dasbor integrasi internal Notion. 
              Gunakan opsi <strong>Hubungkan Ulang</strong> di bawah untuk menyegarkan jabat tangan data kebun.
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* VISUAL DATA PIPELINE PIPING PIPELINE (NODE COMPONENT) */}
      {!isLoadingStatus && (
        <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-slate-950/40 p-5 backdrop-blur-xl flex items-center justify-between shadow-sm">
          {/* Node 1: Notion */}
          <div className="flex flex-col items-center gap-2 z-10 w-24">
            <div className="h-14 w-14 rounded-2xl border border-white/10 bg-background/50 flex items-center justify-center text-xl shadow-inner backdrop-blur-md">
              {isConnected && connectionStatus.workspaceIcon ? (
                <span role="img" aria-label="workspace icon">{connectionStatus.workspaceIcon}</span>
              ) : (
                <Database className="h-6 w-6 text-muted-foreground/70" />
              )}
            </div>
            <span className="text-[10px] font-bold text-muted-foreground/80 tracking-wider uppercase truncate max-w-[90px]">
              {isConnected ? connectionStatus.workspaceName : "Notion DB"}
            </span>
          </div>

          {/* Jalur Kabel Aliran Data Menyala (The Live Pulse Line) */}
          <div className="flex-1 px-4 relative flex items-center justify-center">
            <div className="h-[2px] w-full bg-border/40 relative overflow-hidden rounded-full">
              {isConnected && !isTokenInvalid && (
                <motion.div 
                  initial={{ left: "-30%" }}
                  animate={{ left: "130%" }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
                  className="absolute top-0 h-full w-24 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_8px_var(--primary)]"
                />
              )}
            </div>
            <div className="absolute p-1.5 rounded-full border border-border bg-background shadow-sm">
              <LinkIcon className={"h-3.5 w-3.5 " + (isConnected && !isTokenInvalid ? "text-primary animate-pulse" : "text-muted-foreground")} />
            </div>
          </div>

          {/* Node 2: Sambel Farm App Layout Terminal */}
          <div className="flex flex-col items-center gap-2 z-10 w-24">
            <div className={"h-14 w-14 rounded-2xl border flex items-center justify-center shadow-lg transition-all duration-500 " + (isConnected && !isTokenInvalid ? "border-primary/40 bg-primary/10 shadow-primary/10" : "border-white/10 bg-background/50")}>
              <Wheat className={"h-6 w-6 " + (isConnected && !isTokenInvalid ? "text-primary" : "text-muted-foreground/70")} />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground/80 tracking-wider uppercase">
              Sambel Farm
            </span>
          </div>
        </div>
      )}

      {/* SKELETON LOADER SCREEN CONTROLLER */}
      {isLoadingStatus ? (
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/40 p-6 backdrop-blur-xl space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-7 w-32 rounded-lg" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-3/4 rounded" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          
          {/* THE MAIN FROSTED CONSOLE CARD */}
          <div className={"rounded-[2rem] border bg-slate-900/30 backdrop-blur-2xl overflow-hidden transition-all duration-500 " + glowColorClass}>
            
            <div className="p-6 md:p-8 space-y-6">
              {/* Baris Atas Status Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-black text-xl text-foreground">Status Integrasi</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
                    {isTokenInvalid
                      ? "Token API tidak terverifikasi. Sambungkan ulang enkripsi untuk memulihkan alur data dashboard."
                      : isConnected
                        ? "Pipa data dikunci secara aman. Menyelaraskan catatan keuangan & berat panen."
                        : "Hubungkan otentikasi OAuth Notion agar pusat kendali sistem bisa memetakan visualisasi grafik kebun."}
                  </p>
                </div>

                {/* Badge Status Neon */}
                <div>
                  {isTokenInvalid ? (
                    <span className="inline-flex items-center text-[11px] font-bold px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                      Token Bermasalah
                    </span>
                  ) : (
                    <span className={"inline-flex items-center text-[11px] font-bold px-3 py-1 rounded-full border transition-all " + (isConnected ? "border-primary/30 bg-primary/10 text-primary shadow-[0_0_10px_rgba(34,197,94,0.1)]" : "border-border bg-secondary text-muted-foreground")}>
                      {isConnected ? "Live Online" : "Offline"}
                    </span>
                  )}
                </div>
              </div>

              {/* JIKA STATUSNYA TERHUBUNG (CONNECTED STATE DESIGN) */}
              {isConnected ? (
                <div className="space-y-5">
                  {/* Info Workspace Glass Frame */}
                  <div className={"rounded-2xl p-4 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all " + (isTokenInvalid ? "bg-amber-950/10 border-amber-500/20" : "bg-slate-950/40 border-border/40")}>
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="h-12 w-12 bg-background border border-border/60 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-inner">
                        {connectionStatus.workspaceIcon ? (
                          <span role="img" aria-label="workspace icon">{connectionStatus.workspaceIcon}</span>
                        ) : (
                          <Database className="h-5 w-5 text-muted-foreground/60" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold tracking-wider text-muted-foreground/60 uppercase">Workspace Aktif</p>
                        <p className="font-bold text-lg text-foreground truncate mt-0.5" data-testid="text-workspace-name">
                          {connectionStatus.workspaceName || "Database Anonim"}
                        </p>
                        <p className="text-xs text-muted-foreground/80 mt-0.5">
                          {isTokenInvalid ? (
                            <span className="text-amber-500 font-medium">⚠ Autentikasi kedaluwarsa</span>
                          ) : (
                            <>Tersambung: {formatDate(connectionStatus.connectedAt)}</>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* DISCRETE DISCONNECT BUTTON (Pojok Kanan Atas internal Info) */}
                    <Button 
                      variant="outline" 
                      onClick={handleDisconnect} 
                      disabled={disconnect.isPending}
                      className="h-9 rounded-xl border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/15 active:scale-95 transition-all text-xs font-bold px-3 shrink-0 self-end sm:self-center"
                      data-testid="button-disconnect-notion"
                    >
                      {disconnect.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Unlink className="mr-1.5 h-3.5 w-3.5 stroke-[2]" />
                          Putuskan Jalur
                        </>
                      )}
                    </Button>
                  </div>

                  {/* INFO PANEL CYBER DASHED LOGIC */}
                  {!isTokenInvalid && (
                    <div className="text-xs text-muted-foreground bg-slate-950/20 border border-dashed border-border/60 p-4 rounded-2xl space-y-1.5">
                      <p className="font-bold text-foreground flex items-center gap-1.5 tracking-wide uppercase text-[10px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Ketentuan Pemetaan Skema Database:
                      </p>
                      <p className="leading-relaxed pl-3">
                        Aplikasi menyedot records database secara *real-time*. Supaya visualisasi data dashboard menyala penuh, pastikan lembar kerja database Notion Anda mempunyai kolom properti bernama exact <strong>"Pendapatan"</strong> dan <strong>"Pengeluaran"</strong> berformat tipe item <strong>Number</strong>.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* JIKA STATUSNYA OFFLINE (DISCONNECTED STATE DESIGN) */
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-4 bg-slate-950/20 border border-border/40 rounded-2xl">
                  <div className="h-14 w-14 bg-background border border-border/50 rounded-2xl flex items-center justify-center shadow-inner relative">
                    <div className="absolute inset-0 rounded-2xl bg-muted/20 animate-ping opacity-25" />
                    <LinkIcon className="h-6 w-6 text-muted-foreground/60" />
                  </div>
                  <div className="max-w-sm space-y-1">
                    <p className="text-sm font-bold text-foreground">Integrasi Kosong</p>
                    <p className="text-xs text-muted-foreground/80 leading-relaxed px-4">
                      Kami menggunakan gerbang jabat tangan OAuth resmi yang terenkripsi aman langsung dari Notion Core API.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* LOWER CONSOLE CONTROL BAR PANEL */}
            {/* Hanya nampilkan tombol aksi utama, bersih dari redundansi */}
            {!isConnected || isTokenInvalid ? (
              <div className="bg-slate-950/50 border-t border-border/40 px-6 py-4 flex justify-end">
                {isTokenInvalid ? (
                  <Button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="h-11 rounded-xl font-bold text-xs px-5 bg-primary hover:bg-primary/90 text-white shadow-md active:scale-95 transition-all"
                    data-testid="button-reconnect-notion"
                  >
                    {isConnecting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4 stroke-[2.5]" />
                    )}
                    Hubungkan Ulang Terminal Notion
                  </Button>
                ) : (
                  <Button 
                    onClick={handleConnect} 
                    disabled={isConnecting}
                    className="h-11 rounded-xl font-bold text-xs px-5 bg-primary hover:bg-primary/90 text-white shadow-md active:scale-95 transition-all"
                    data-testid="button-connect-notion"
                  >
                    {isConnecting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="mr-2 h-4 w-4 stroke-[2.5]" />
                    )}
                    Otentikasi Hubungkan ke Notion
                  </Button>
                )}
              </div>
            ) : null}

          </div>
        </motion.div>
      )}
    </div>
  );
}
