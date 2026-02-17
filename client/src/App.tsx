import { Switch, Route, useLocation, useParams } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import ClientsPage from "@/pages/clients";
import ProductsPage from "@/pages/products";
import TripsPage from "@/pages/trips";
import OrdersPage from "@/pages/orders";
import CreateOrderPage from "@/pages/create-order";
import Login from "@/pages/login";
import ClientLogin from "@/pages/client-login";
import ClientPortal from "@/pages/client-portal";
import MessagesPage from "@/pages/messages";
import ReportsPage from "@/pages/reports";
import OrderRequestsPage from "@/pages/order-requests";
import CashFlowPage from "@/pages/cash-flow";
import AdminUsersPage from "@/pages/admin-users";
import ShowcaseAdminPage from "@/pages/showcase-admin";
import { VitrineHome, VitrineProdutos, VitrineProdutoDetalhe, VitrineSobre, VitrineContato } from "@/pages/vitrine";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function VitrineProdutoRoute() {
  const params = useParams<{ id: string }>();
  return <VitrineProdutoDetalhe id={params.id || ""} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={VitrineHome} />
      <Route path="/produtos" component={VitrineProdutos} />
      <Route path="/sobre" component={VitrineSobre} />
      <Route path="/contato" component={VitrineContato} />
      <Route path="/produto/:id" component={VitrineProdutoRoute} />

      <Route path="/login" component={Login} />
      <Route path="/portal/login" component={ClientLogin} />
      <Route path="/portal" component={ClientPortal} />

      <Route path="/painel">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/painel/solicitacoes">
        <ProtectedRoute component={OrderRequestsPage} />
      </Route>
      <Route path="/painel/clientes">
        <ProtectedRoute component={ClientsPage} />
      </Route>
      <Route path="/painel/produtos">
        <ProtectedRoute component={ProductsPage} />
      </Route>
      <Route path="/painel/viagens">
        <ProtectedRoute component={TripsPage} />
      </Route>
      <Route path="/painel/pedidos">
        <ProtectedRoute component={OrdersPage} />
      </Route>
      <Route path="/painel/pedidos/novo">
        <ProtectedRoute component={CreateOrderPage} />
      </Route>
      <Route path="/painel/pedidos/editar/:id">
        <ProtectedRoute component={CreateOrderPage} />
      </Route>
      <Route path="/painel/mensagens">
        <ProtectedRoute component={MessagesPage} />
      </Route>
      <Route path="/painel/relatorios">
        <ProtectedRoute component={ReportsPage} />
      </Route>
      <Route path="/painel/financeiro">
        <ProtectedRoute component={CashFlowPage} />
      </Route>
      <Route path="/painel/usuarios">
        <ProtectedRoute component={AdminUsersPage} />
      </Route>
      <Route path="/painel/vitrine">
        <ProtectedRoute component={ShowcaseAdminPage} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
