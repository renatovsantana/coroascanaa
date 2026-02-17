import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  Truck, 
  ShoppingCart, 
  LogOut, 
  Menu,
  MessageSquare,
  BarChart3,
  ClipboardList,
  DollarSign,
  Shield,
  Store,
  X
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { ModuleKey } from "@shared/models/auth";

const NAV_ITEMS: { href: string; label: string; icon: any; module?: ModuleKey }[] = [
  { href: "/painel", label: "Painel", icon: LayoutDashboard, module: "dashboard" },
  { href: "/painel/solicitacoes", label: "Solicitações de Pedidos", icon: ClipboardList, module: "order_requests" },
  { href: "/painel/viagens", label: "Viagens", icon: Truck, module: "trips" },
  { href: "/painel/pedidos", label: "Pedidos", icon: ShoppingCart, module: "orders" },
  { href: "/painel/clientes", label: "Clientes", icon: Users, module: "clients" },
  { href: "/painel/produtos", label: "Produtos", icon: Package, module: "products" },
  { href: "/painel/financeiro", label: "Financeiro", icon: DollarSign, module: "finance" },
  { href: "/painel/mensagens", label: "Mensagens", icon: MessageSquare, module: "messages" },
  { href: "/painel/relatorios", label: "Relatórios", icon: BarChart3, module: "reports" },
  { href: "/painel/vitrine", label: "Vitrine Virtual", icon: Store, module: "products" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isGlobalAdmin = user?.role === "global_admin";
  const userPermissions = (user?.permissions as string[]) || [];

  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (isGlobalAdmin) return true;
    if (!item.module) return true;
    return userPermissions.includes(item.module);
  });

  const hasMessagesAccess = isGlobalAdmin || userPermissions.includes("messages");
  const hasOrderRequestsAccess = isGlobalAdmin || userPermissions.includes("order_requests");

  const { data: unreadMessages } = useQuery<any[]>({
    queryKey: ["/api/admin/messages/unread"],
    refetchInterval: 15000,
    enabled: hasMessagesAccess,
  });
  const unreadCount = unreadMessages?.length || 0;

  const { data: pendingOrders } = useQuery<any[]>({
    queryKey: ["/api/admin/pending-orders"],
    refetchInterval: 10000,
    enabled: hasOrderRequestsAccess,
  });
  const pendingCount = pendingOrders?.length || 0;

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-white p-4">
      <div className="flex items-center gap-3 px-2 py-6 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Truck className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-display font-bold text-xl leading-none">Indústria</h1>
          <p className="text-slate-400 text-xs mt-1">Gestão de Pedidos</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {visibleNavItems.map((item) => (
          <Link 
            key={item.href} 
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 group",
              location === item.href 
                ? "bg-blue-600/20 text-blue-400" 
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            )}
            onClick={() => setMobileOpen(false)}
          >
            <item.icon className={cn(
              "w-5 h-5 transition-colors",
              location === item.href ? "text-blue-400" : "text-slate-500 group-hover:text-white"
            )} />
            <span className="flex-1">{item.label}</span>
            {item.href === "/painel/solicitacoes" && pendingCount > 0 && (
              <Badge className="bg-amber-500 text-white text-xs min-w-[20px] flex items-center justify-center" data-testid="badge-pending-orders">
                {pendingCount}
              </Badge>
            )}
            {item.href === "/painel/mensagens" && unreadCount > 0 && (
              <Badge className="bg-red-500 text-white text-xs min-w-[20px] flex items-center justify-center" data-testid="badge-unread-messages">
                {unreadCount}
              </Badge>
            )}
          </Link>
        ))}
        {isGlobalAdmin && (
          <Link 
            href="/painel/usuarios"
            className={cn(
              "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 group",
              location === "/painel/usuarios" 
                ? "bg-blue-600/20 text-blue-400" 
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            )}
            onClick={() => setMobileOpen(false)}
            data-testid="link-admin-users"
          >
            <Shield className={cn(
              "w-5 h-5 transition-colors",
              location === "/painel/usuarios" ? "text-blue-400" : "text-slate-500 group-hover:text-white"
            )} />
            <span className="flex-1">Usuários</span>
          </Link>
        )}
      </nav>

      <div className="pt-4 mt-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 mb-4">
          {user?.profileImageUrl ? (
            <img src={user.profileImageUrl} alt={user.firstName || "User"} className="w-8 h-8 rounded-full border border-white/10" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-white/10">
              <span className="text-xs font-bold">{user?.firstName?.[0] || "U"}</span>
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate text-slate-200">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
          onClick={() => logout()}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 fixed inset-y-0 left-0 z-50 border-r bg-slate-900 border-slate-800 shadow-xl">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64 border-r-slate-800 bg-slate-900">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 min-h-screen flex flex-col">
        {/* Mobile Header */}
        <div className="lg:hidden h-16 bg-white border-b flex items-center px-4 justify-between sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-slate-900">Indústria</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
            <Menu className="w-6 h-6 text-slate-600" />
          </Button>
        </div>

        <div className="flex-1 p-4 md:p-8 animate-in fade-in duration-500">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
