import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useClients } from "@/hooks/use-clients";
import { useProducts } from "@/hooks/use-products";
import { useTrips } from "@/hooks/use-trips";
import { useOrders } from "@/hooks/use-orders";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Package, Truck, ShoppingCart, TrendingUp,
  Clock, CheckCircle, XCircle, MessageSquare, Loader2,
  AlertCircle, ChevronDown, ChevronUp, BarChart3
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Area, AreaChart
} from "recharts";

export default function Dashboard() {
  const { data: clients } = useClients();
  const { data: products } = useProducts();
  const { data: trips } = useTrips();
  const { data: orders } = useOrders();
  const { toast } = useToast();

  const { data: pendingOrders, isLoading: loadingPending } = useQuery<any[]>({
    queryKey: ["/api/admin/pending-orders"],
  });

  const { data: unreadMessages } = useQuery<any[]>({
    queryKey: ["/api/admin/messages/unread"],
  });

  const activeTrips = trips?.filter(t => t.status === "open") || [];
  const pendingCount = pendingOrders?.length || 0;
  const unreadCount = unreadMessages?.length || 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-bold text-slate-900">Painel de Controle</h2>
        <p className="text-slate-500 mt-1">Visão geral do sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Clientes"
          value={clients?.length || 0}
          icon={Users}
          description="Total cadastrado"
          color="bg-blue-500"
        />
        <StatsCard
          title="Produtos"
          value={products?.length || 0}
          icon={Package}
          description="Itens no catálogo"
          color="bg-emerald-500"
        />
        <StatsCard
          title="Viagens Ativas"
          value={activeTrips.length}
          icon={Truck}
          description="Em andamento"
          color="bg-amber-500"
        />
        <StatsCard
          title="Pedidos Totais"
          value={orders?.length || 0}
          icon={ShoppingCart}
          description="Registrados no sistema"
          color="bg-violet-500"
        />
      </div>

      {(pendingCount > 0 || unreadCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingCount > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="py-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-amber-100">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{pendingCount} pedido(s) aguardando aprovação</p>
                  <p className="text-sm text-slate-500">Pedidos enviados por clientes do portal</p>
                </div>
              </CardContent>
            </Card>
          )}
          {unreadCount > 0 && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="py-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{unreadCount} mensagem(ns) não lida(s)</p>
                  <p className="text-sm text-slate-500">Mensagens de clientes</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <SalesChartsSection clients={clients} trips={trips} />

      <PendingOrdersSection pendingOrders={pendingOrders} loadingPending={loadingPending} trips={activeTrips} clients={clients} />

      <MessagesSection clients={clients} limit={10} />
    </div>
  );
}

function PendingOrdersSection({ pendingOrders, loadingPending, trips, clients }: any) {
  const { toast } = useToast();
  const [approveDialogOrder, setApproveDialogOrder] = useState<any>(null);
  const [selectedTripId, setSelectedTripId] = useState("");

  const approveMutation = useMutation({
    mutationFn: async ({ orderId, tripId }: { orderId: number; tripId: number }) => {
      const res = await apiRequest("POST", `/api/admin/orders/${orderId}/approve`, { tripId });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Pedido aprovado e atribuído à viagem!" });
      setApproveDialogOrder(null);
      setSelectedTripId("");
    },
    onError: () => {
      toast({ title: "Erro ao aprovar pedido", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (orderId: number) => {
      await apiRequest("POST", `/api/admin/orders/${orderId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-orders"] });
      toast({ title: "Pedido rejeitado" });
    },
    onError: () => {
      toast({ title: "Erro ao rejeitar pedido", variant: "destructive" });
    },
  });

  if (loadingPending) return null;
  if (!pendingOrders?.length) return null;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <CardTitle>Pedidos Aguardando Aprovação</CardTitle>
          </div>
          <Badge variant="outline" className="text-amber-600 border-amber-300">{pendingOrders.length}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingOrders.map((order: any) => (
            <PendingOrderRow
              key={order.id}
              order={order}
              onApprove={() => setApproveDialogOrder(order)}
              onReject={() => rejectMutation.mutate(order.id)}
              isRejecting={rejectMutation.isPending}
            />
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!approveDialogOrder} onOpenChange={(open) => { if (!open) setApproveDialogOrder(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Pedido #{approveDialogOrder?.id}</DialogTitle>
            <DialogDescription>
              Selecione a viagem para atribuir este pedido. Se o cliente já tiver um pedido nesta viagem, os itens serão mesclados.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Viagem</label>
            <Select value={selectedTripId} onValueChange={setSelectedTripId}>
              <SelectTrigger data-testid="select-trip-approve">
                <SelectValue placeholder="Selecione a viagem..." />
              </SelectTrigger>
              <SelectContent>
                {trips?.map((trip: any) => (
                  <SelectItem key={trip.id} value={trip.id.toString()}>
                    {trip.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setApproveDialogOrder(null)}>
              Cancelar
            </Button>
            <Button
              data-testid="button-confirm-approve"
              className="bg-green-600"
              disabled={!selectedTripId || approveMutation.isPending}
              onClick={() => approveMutation.mutate({ orderId: approveDialogOrder.id, tripId: parseInt(selectedTripId) })}
            >
              {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PendingOrderRow({ order, onApprove, onReject, isRejecting }: any) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div data-testid={`pending-order-${order.id}`} className="border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-sm font-medium">#{order.id}</span>
          <span className="text-sm font-semibold text-slate-900">{order.client?.nomeFantasia}</span>
          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
            <Clock className="w-3 h-3 mr-1" />
            Portal do cliente
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            data-testid={`button-approve-${order.id}`}
            size="sm"
            className="bg-green-600"
            onClick={onApprove}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Aprovar
          </Button>
          <Button
            data-testid={`button-reject-${order.id}`}
            size="sm"
            variant="outline"
            className="text-red-600 border-red-200"
            onClick={onReject}
            disabled={isRejecting}
          >
            <XCircle className="w-4 h-4 mr-1" />
            Rejeitar
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>
      {expanded && order.items?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="space-y-2">
            {order.items.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  {item.product?.size} - {item.product?.color}
                </span>
                <span className="text-slate-500">Qtd: {item.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MessagesSection({ clients, limit = 10 }: { clients: any[] | undefined; limit?: number }) {
  const { data: allMessages, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/messages"],
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/messages/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages/unread"] });
    },
  });

  if (isLoading || !allMessages?.length) return null;

  const recentMessages = allMessages.slice(0, limit);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-500" />
          <CardTitle>Mensagens Recentes</CardTitle>
        </div>
        <Link href="/painel/mensagens" className="text-sm text-blue-600 font-medium" data-testid="link-view-all-messages">
          Ver todas
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentMessages.map((msg: any) => {
          const clientName = clients?.find(c => c.id === msg.clientId)?.nomeFantasia || `Cliente #${msg.clientId}`;

          return (
            <div
              key={msg.id}
              className={`text-sm p-3 rounded-lg ${
                msg.direction === "client_to_admin"
                  ? "bg-slate-50 border border-slate-200"
                  : "bg-blue-50 border border-blue-100"
              }`}
              onClick={() => {
                if (msg.direction === "client_to_admin" && !msg.read) {
                  markReadMutation.mutate(msg.id);
                }
              }}
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-semibold text-slate-900 text-xs">{clientName}</span>
                <span className="font-medium text-xs text-slate-500">
                  {msg.direction === "client_to_admin" ? "enviou" : "— Você respondeu"}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(msg.createdAt).toLocaleString("pt-BR")}
                </span>
                {msg.direction === "client_to_admin" && !msg.read && (
                  <Badge variant="outline" className="text-xs text-red-500 border-red-200">Não lida</Badge>
                )}
              </div>
              <p className="text-slate-700 line-clamp-2">{msg.content}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function SalesChartsSection({ clients, trips }: { clients: any[] | undefined; trips: any[] | undefined }) {
  const { data: reportData, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/report/sales"],
  });

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterClientId, setFilterClientId] = useState("all");
  const [filterTripId, setFilterTripId] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [periodGroup, setPeriodGroup] = useState("daily");

  const hasFilters = dateFrom || dateTo || filterClientId !== "all" || filterTripId !== "all" || filterSource !== "all";

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setFilterClientId("all");
    setFilterTripId("all");
    setFilterSource("all");
  }

  const filteredOrders = useMemo(() => {
    if (!reportData?.orders) return [];
    let result = [...reportData.orders];
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      result = result.filter((o: any) => new Date(o.createdAt) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter((o: any) => new Date(o.createdAt) <= toDate);
    }
    if (filterClientId !== "all") {
      result = result.filter((o: any) => o.clientId === parseInt(filterClientId));
    }
    if (filterTripId !== "all") {
      result = result.filter((o: any) => o.tripId === parseInt(filterTripId));
    }
    if (filterSource !== "all") {
      result = result.filter((o: any) => o.source === filterSource);
    }
    return result;
  }, [reportData, dateFrom, dateTo, filterClientId, filterTripId, filterSource]);

  const { periodData, productData, totalRevenue, totalOrders, totalItems } = useMemo(() => {
    const clientPrices = reportData?.clientPrices || {};
    function getItemPrice(order: any, item: any): number {
      const prices = clientPrices[order.clientId] || [];
      const priceEntry = prices.find((p: any) => p.size === item.product?.size);
      return priceEntry ? parseFloat(priceEntry.price) : 0;
    }

    const periodMap: Record<string, { label: string; revenue: number; orders: number; items: number }> = {};
    const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    let totalRev = 0;
    let totalOrd = filteredOrders.length;
    let totalItm = 0;

    for (const order of filteredOrders) {
      const date = new Date(order.createdAt);
      let key: string;
      let label: string;

      if (periodGroup === "daily") {
        key = date.toISOString().slice(0, 10);
        label = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      } else if (periodGroup === "weekly") {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        key = startOfWeek.toISOString().slice(0, 10);
        label = `Sem ${startOfWeek.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
      } else {
        key = date.toISOString().slice(0, 7);
        label = date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      }

      if (!periodMap[key]) {
        periodMap[key] = { label, revenue: 0, orders: 0, items: 0 };
      }
      periodMap[key].orders++;

      for (const item of order.items || []) {
        const price = getItemPrice(order, item);
        const lineTotal = price * item.quantity;
        totalRev += lineTotal;
        totalItm += item.quantity;
        periodMap[key].revenue += lineTotal;
        periodMap[key].items += item.quantity;

        const pKey = `${item.product?.size || ""} - ${item.product?.color || ""}`;
        if (!productMap[pKey]) {
          productMap[pKey] = { name: pKey, qty: 0, revenue: 0 };
        }
        productMap[pKey].qty += item.quantity;
        productMap[pKey].revenue += lineTotal;
      }
    }

    const periodData = Object.entries(periodMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);

    const productData = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    return { periodData, productData, totalRevenue: totalRev, totalOrders: totalOrd, totalItems: totalItm };
  }, [filteredOrders, reportData, periodGroup]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  const customTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-slate-900 mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-slate-600" style={{ color: entry.color }}>
            {entry.name}: {entry.name === "Receita" ? formatCurrency(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              <CardTitle>Gráficos de Vendas</CardTitle>
            </div>
            {hasFilters && (
              <Button size="sm" variant="ghost" onClick={clearFilters} className="text-xs text-slate-500" data-testid="button-clear-chart-filters">
                Limpar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Data Início</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} data-testid="input-chart-date-from" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Data Fim</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} data-testid="input-chart-date-to" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Cliente</label>
              <Select value={filterClientId} onValueChange={setFilterClientId}>
                <SelectTrigger data-testid="select-chart-client">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {clients?.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.nomeFantasia}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Viagem</label>
              <Select value={filterTripId} onValueChange={setFilterTripId}>
                <SelectTrigger data-testid="select-chart-trip">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {trips?.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Origem</label>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger data-testid="select-chart-source">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="client">Portal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Agrupar por</label>
              <Select value={periodGroup} onValueChange={setPeriodGroup}>
                <SelectTrigger data-testid="select-chart-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">Faturamento</p>
              <p className="text-lg font-bold font-display text-slate-900">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">Pedidos</p>
              <p className="text-lg font-bold font-display text-slate-900">{totalOrders}</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">Itens Vendidos</p>
              <p className="text-lg font-bold font-display text-slate-900">{totalItems}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Vendas por Período</CardTitle>
          </CardHeader>
          <CardContent>
            {periodData.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-12">Nenhum dado para o período selecionado</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={periodData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={customTooltip} />
                  <Area type="monotone" dataKey="revenue" name="Receita" stroke="#3b82f6" strokeWidth={2} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pedidos por Período</CardTitle>
          </CardHeader>
          <CardContent>
            {periodData.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-12">Nenhum dado para o período selecionado</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={periodData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                  <Tooltip content={customTooltip} />
                  <Bar dataKey="orders" name="Pedidos" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="items" name="Itens" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Receita por Produto</CardTitle>
          </CardHeader>
          <CardContent>
            {productData.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-12">Nenhum dado disponível</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `R$${v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} width={120} />
                  <Tooltip content={customTooltip} />
                  <Bar dataKey="revenue" name="Receita" radius={[0, 4, 4, 0]}>
                    {productData.map((_: any, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quantidade por Produto</CardTitle>
          </CardHeader>
          <CardContent>
            {productData.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-12">Nenhum dado disponível</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={productData}
                    dataKey="qty"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    label={({ name, percent }: any) => `${name.split(" - ")[0]} ${(percent * 100).toFixed(0)}%`}
                  >
                    {productData.map((_: any, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any, name: any) => [`${value} un.`, name]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, description, color }: any) {
  return (
    <Card className="shadow-sm border-slate-200 overflow-hidden relative">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <h3 className="text-3xl font-bold font-display text-slate-900 mt-2">{value}</h3>
          </div>
          <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
            <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
          </div>
        </div>
        <div className="mt-4 flex items-center text-xs text-slate-400">
          <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
          {description}
        </div>
      </CardContent>
    </Card>
  );
}
