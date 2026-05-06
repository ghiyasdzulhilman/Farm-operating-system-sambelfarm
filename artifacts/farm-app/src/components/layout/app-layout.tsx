import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Show, UserButton } from "@clerk/react";
import { Leaf, LayoutDashboard, Link as LinkIcon, Settings, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();

  const navigation = [
    { name: "Beranda", href: "/", icon: Leaf },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Koneksi Notion", href: "/connect", icon: LinkIcon },
    { name: "Pengaturan", href: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" data-testid="button-mobile-menu">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 sm:max-w-none">
                <div className="flex items-center gap-2 font-semibold mb-6">
                  <Leaf className="h-6 w-6 text-primary" />
                  <span>Manajemen Kebun</span>
                </div>
                <nav className="flex flex-col gap-2">
                  {navigation.map((item) => {
                    const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                    return (
                      <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`} data-testid={`link-mobile-nav-${item.name.toLowerCase().replace(" ", "-")}`}>
                        <item.icon className="h-4 w-4" />
                        {item.name}
                      </Link>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>
            <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-foreground transition-colors hover:text-primary" data-testid="link-logo">
              <Leaf className="h-6 w-6 text-primary" />
              <span className="hidden sm:inline-block">Manajemen Kebun</span>
            </Link>
          </div>
          
          <Show when="signed-in">
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              {navigation.map((item) => {
                const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href} className={`transition-colors hover:text-foreground/80 ${isActive ? "text-foreground" : "text-foreground/60"}`} data-testid={`link-desktop-nav-${item.name.toLowerCase().replace(" ", "-")}`}>
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </Show>

          <div className="flex items-center gap-4">
            <Show when="signed-out">
              <Link href="/sign-in" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-login">Masuk</Link>
              <Link href="/sign-up" className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" data-testid="link-register">
                Daftar
              </Link>
            </Show>
            <Show when="signed-in">
              <UserButton appearance={{ elements: { userButtonAvatarBox: "h-9 w-9" } }} />
            </Show>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-8">
        {children}
      </main>
      
      <footer className="py-6 border-t border-border/40 text-center text-sm text-muted-foreground">
        <p>Sistem Manajemen Kebun &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
