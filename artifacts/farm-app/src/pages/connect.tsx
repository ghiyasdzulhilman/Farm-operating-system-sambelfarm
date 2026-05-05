import { useState } from "react";
import { motion } from "framer-motion";
import { LinkIcon, Unlink, ExternalLink, Loader2, Database } from "lucide-react";
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
        // Redirect to Notion OAuth URL
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

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-connect-title">Koneksi Notion</h1>
        <p className="text-muted-foreground mt-1" data-testid="text-connect-subtitle">
          Kelola integrasi workspace Notion Anda dengan Sistem Manajemen Kebun.
        </p>
      </div>

      {isLoadingStatus ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-border overflow-hidden">
            <div className={`h-2 w-full ${connectionStatus?.connected ? 'bg-primary' : 'bg-muted'}`} />
            
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Status Integrasi</CardTitle>
                <Badge variant={connectionStatus?.connected ? "default" : "secondary"} className={connectionStatus?.connected ? "bg-primary" : ""}>
                  {connectionStatus?.connected ? "Terhubung" : "Belum Terhubung"}
                </Badge>
              </div>
              <CardDescription>
                {connectionStatus?.connected 
                  ? "Sistem sedang membaca database Laba Rugi dari workspace Anda." 
                  : "Hubungkan akun Notion Anda agar sistem dapat membaca data operasional kebun."}
              </CardDescription>
            </CardHeader>

            {connectionStatus?.connected ? (
              <CardContent className="space-y-6">
                <div className="bg-secondary/50 rounded-lg p-4 border border-border/50 flex items-start gap-4">
                  <div className="h-12 w-12 bg-background rounded border flex items-center justify-center text-xl overflow-hidden shrink-0">
                    {connectionStatus.workspaceIcon ? (
                      <span role="img" aria-label="workspace icon">{connectionStatus.workspaceIcon}</span>
                    ) : (
                      <Database className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">Workspace Notion</p>
                    <p className="font-semibold text-lg truncate" data-testid="text-workspace-name">
                      {connectionStatus.workspaceName || "Unknown Workspace"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Terhubung sejak: {formatDate(connectionStatus.connectedAt)}
                    </p>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md">
                  <p className="font-medium text-foreground mb-1">Penting:</p>
                  <p>Pastikan workspace Anda memiliki database dengan properti <strong>"Pendapatan"</strong> dan <strong>"Pengeluaran"</strong> berformat Number agar dapat terbaca di Dashboard.</p>
                </div>
              </CardContent>
            ) : (
              <CardContent>
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                  <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                    <LinkIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="max-w-sm">
                    <p className="text-sm text-muted-foreground">
                      Kami menggunakan OAuth resmi dari Notion. Anda akan diarahkan ke Notion untuk memberikan akses read-only ke halaman yang Anda pilih.
                    </p>
                  </div>
                </div>
              </CardContent>
            )}

            <CardFooter className="bg-muted/30 border-t px-6 py-4">
              {connectionStatus?.connected ? (
                <div className="flex justify-end w-full">
                  <Button 
                    variant="destructive" 
                    onClick={handleDisconnect} 
                    disabled={disconnect.isPending}
                    data-testid="button-disconnect-notion"
                  >
                    {disconnect.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Unlink className="mr-2 h-4 w-4" />
                    )}
                    Putuskan Koneksi
                  </Button>
                </div>
              ) : (
                <div className="flex justify-end w-full">
                  <Button 
                    onClick={handleConnect} 
                    disabled={isConnecting}
                    data-testid="button-connect-notion"
                  >
                    {isConnecting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="mr-2 h-4 w-4" />
                    )}
                    Hubungkan ke Notion
                  </Button>
                </div>
              )}
            </CardFooter>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
