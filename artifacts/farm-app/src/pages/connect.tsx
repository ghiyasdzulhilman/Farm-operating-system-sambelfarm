import { useState } from "react";
import { motion } from "framer-motion";
import { LinkIcon, Unlink, ExternalLink, Loader2, Database, AlertTriangle, RefreshCw, X } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

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

  const deleteConnection = useDisconnectNotion({
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

  const isConnected = connectionStatus?.connected;
  const isTokenInvalid = isConnected && connectionStatus?.tokenStatus === "invalid";

  // FIX FIX BUG NOTION: Deteksi & amankan link gambar AWS S3 biar gak tumpah jadi teks rongsokan
  const renderWorkspaceIcon = () => {
    const icon = connectionStatus?.workspaceIcon;
    if (!icon) return <Database className="h-4 w-4 text-muted-foreground/70" />;
    if (icon.startsWith("http")) {
      return <img src={icon} alt="Notion" className="h-4 w-4 object-cover rounded-md shrink-0" />;
    }
    return <span role="img" aria-label="workspace icon" className="text-sm shrink-0">{icon}</span>;
  };

  return (
    /* ANIMASI LACI: Panel otomatis merosot mulus dari atas layar begitu dibuka */
    <motion.div 
      initial={{ opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="max-w-md mx-auto px-2 pt-2 pb-12"
    >
      {/* THE ULTRA-MINIMAL TOP LACI CONSOLE */}
      <div className="rounded-3xl border border-border/40 bg-slate-900/30 backdrop-blur-2xl shadow-[0_25px_50px_rgba(0,0,0,0.2)] overflow-hidden">
        
        {/* HEADER MINI PANEL */}
        <div className="flex items-center justify-between border-b border-border/30 px-5 py-3.5 bg-slate-950/20">
          <div className="flex items-center gap-2">
            <div className={"w-2 h-2 rounded-full " + (isTokenInvalid ? "bg-amber-500 animate-pulse" : isConnected ? "bg-primary animate-pulse shadow-[0_0_8px_var(--primary)]" : "bg-muted-foreground/40")} />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
              {isTokenInvalid ? "Integrasi Error" : isConnected ? "Notion Connected" : "Notion Disconnected"}
            </span>
          </div>
          
          {/* Tombol Silang Minimalis buat balik ke Dashboard */}
          <Link href="/dashboard">
            <a className="p-1 rounded-lg hover:bg-white/5 text-muted-foreground/60 hover:text-foreground transition-all">
              <X className="h-4 w-4 stroke-[2]" />
            </a>
          </Link>
        </div>

        {/* BODY CONSOLE CONTENT */}
        <div className="p-5">
          {isLoadingStatus ? (
            <div className="space-y-3 py-2">
              <div className="h-4 bg-white/5 rounded w-1/3 animate-pulse" />
              <div className="h-10 bg-white/5 rounded-xl w-full animate-pulse" />
            </div>
          ) : isConnected ? (
            /* STATE TERHUBUNG: Bersih Tanpa Boks Gede */
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 bg-slate-950/40 border border-border/40 p-3 rounded-2xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 bg-background border border-border/60 rounded-xl flex items-center justify-center shrink-0">
                    {renderWorkspaceIcon()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wide">Workspace</p>
                    <p className="font-bold text-sm text-foreground truncate mt-0.5" data-testid="text-workspace-name">
                      {connectionStatus.workspaceName || "Database Aktif"}
                    </p>
                  </div>
                </div>

                {/* Tombol Putus Kapsul Kecil */}
                <Button 
                  variant="outline" 
                  onClick={handleDisconnect} 
                  disabled={deleteConnection.isPending}
                  className="h-8 rounded-lg border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10 text-[11px] font-bold px-2.5 shrink-0 transition-all"
                  data-testid="button-disconnect-notion"
                >
                  {deleteConnection.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Putus Jalur"
                  )}
                </Button>
              </div>

              {isTokenInvalid && (
                <p className="text-[11px] text-amber-500 font-medium leading-relaxed bg-amber-500/5 border border-amber-500/20 p-3 rounded-xl">
                  ⚠ Token kedaluwarsa atau dicabut dari dasbor Notion. Silakan klik tombol hubungkan kembali di bawah.
                </p>
              )}
            </div>
          ) : (
            /* STATE OFFLINE: Super Clean */
            <div className="py-4 flex flex-col items-center text-center space-y-2">
              <p className="text-xs text-muted-foreground/90 max-w-xs leading-relaxed">
                Hubungkan autentikasi enkripsi OAuth resmi Notion agar pusat kendali sistem bisa menyedot data catatan kebun Anda.
              </p>
            </div>
          )}
        </div>

        {/* CONTROL FOOTER INTERACTION BAR */}
        {/* Tombol aksi utama dipasang di bawah murni jika offline atau token invalid */}
        {(!isConnected || isTokenInvalid) && !isLoadingStatus && (
          <div className="bg-slate-950/40 border-t border-border/30 px-5 py-3 flex justify-end">
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="h-9 rounded-xl font-bold text-[11px] px-4 bg-primary hover:bg-primary/90 text-white shadow-md active:scale-95 transition-all w-full sm:w-auto"
              data-testid={isTokenInvalid ? "button-reconnect-notion" : "button-connect-notion"}
            >
              {isConnecting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : isTokenInvalid ? (
                <RefreshCw className="mr-1.5 h-3.5 w-3.5 stroke-[2.5]" />
              ) : (
                <ExternalLink className="mr-1.5 h-3.5 w-3.5 stroke-[2.5]" />
              )}
              {isTokenInvalid ? "Hubungkan Ulang" : "Otentikasi Notion"}
            </Button>
          </div>
        )}

      </div>
    </motion.div>
  );
}
