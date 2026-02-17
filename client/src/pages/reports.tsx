import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useClients } from "@/hooks/use-clients";
import { useTrips } from "@/hooks/use-trips";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  BarChart3, TrendingUp, ShoppingCart, Users, DollarSign,
  Filter, Loader2, Package
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

export default function ReportsPage() {
  const { data: reportData, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/report/sales"],
  });
  const { data: clients } = useClients();
  const { data: trips } = useTrips();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterClientId, setFilterClientId] = useState("all");
  const [filterTripId, setFilterTripId] = useState("all");
  const [filterSource, setFilterSource] = useState("all");

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

  const stats = useMemo(() => {
    const clientPrices = reportData?.clientPrices || {};

    function getItemPrice(order: any, item: any): number {
      const prices = clientPrices[order.clientId] || [];
      const productSize = item.product?.size;
      const priceEntry = prices.find((p: any) => p.size === productSize);
      return priceEntry ? parseFloat(priceEntry.price) : 0;
    }

    let totalRevenue = 0;
    let totalItems = 0;
    let totalOrders = filteredOrders.length;
    const clientsSet = new Set<number>();
    const productTotals: Record<string, { name: string; color: string; size: string; qty: number; revenue: number }> = {};
    const clientTotals: Record<number, { name: string; orderCount: number; revenue: number; items: number }> = {};
    const monthlyData: Record<string, { month: string; revenue: number; orders: number }> = {};

    for (const order of filteredOrders) {
      clientsSet.add(order.clientId);
      const clientName = order.client?.nomeFantasia || `Cliente #${order.clientId}`;

      if (!clientTotals[order.clientId]) {
        clientTotals[order.clientId] = { name: clientName, orderCount: 0, revenue: 0, items: 0 };
      }
      clientTotals[order.clientId].orderCount++;

      const monthKey = new Date(order.createdAt).toISOString().slice(0, 7);
      const monthLabel = new Date(order.createdAt).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthLabel, revenue: 0, orders: 0 };
      }
      monthlyData[monthKey].orders++;

      for (const item of order.items || []) {
        const price = getItemPrice(order, item);
        const lineTotal = price * item.quantity;
        totalRevenue += lineTotal;
        totalItems += item.quantity;

        clientTotals[order.clientId].revenue += lineTotal;
        clientTotals[order.clientId].items += item.quantity;
        monthlyData[monthKey].revenue += lineTotal;

        const productKey = `${item.productId}`;
        if (!productTotals[productKey]) {
          productTotals[productKey] = {
            name: item.product?.name || "Produto",
            color: item.product?.color || "",
            size: item.product?.size || "",
            qty: 0,
            revenue: 0
          };
        }
        productTotals[productKey].qty += item.quantity;
        productTotals[productKey].revenue += lineTotal;
      }
    }

    return {
      totalRevenue,
      totalItems,
      totalOrders,
      uniqueClients: clientsSet.size,
      avgTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      productTotals: Object.values(productTotals).sort((a, b) => b.revenue - a.revenue),
      clientTotals: Object.values(clientTotals).sort((a, b) => b.revenue - a.revenue),
      monthlyData: Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month)),
    };
  }, [filteredOrders, reportData]);

  const sourceLabels: Record<string, string> = {
    admin: "Admin",
    client: "Portal"
  };

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setFilterClientId("all");
    setFilterTripId("all");
    setFilterSource("all");
  }

  const hasFilters = dateFrom || dateTo || filterClientId !== "all" || filterTripId !== "all" || filterSource !== "all";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-slate-900" data-testid="text-reports-title">Relatório de Vendas</h2>
          <p className="text-slate-500 mt-1">Análise completa do fluxo de vendas</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <CardTitle className="text-base">Filtros</CardTitle>
            {hasFilters && (
              <Button size="sm" variant="ghost" onClick={clearFilters} className="ml-auto text-xs text-slate-500" data-testid="button-clear-filters">
                Limpar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Data Início</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                data-testid="input-date-from"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Data Fim</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                data-testid="input-date-to"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Cliente</label>
              <Select value={filterClientId} onValueChange={setFilterClientId}>
                <SelectTrigger data-testid="select-filter-client">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {clients?.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.nomeFantasia}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Viagem</label>
              <Select value={filterTripId} onValueChange={setFilterTripId}>
                <SelectTrigger data-testid="select-filter-trip">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as viagens</SelectItem>
                  {trips?.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Origem</label>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger data-testid="select-filter-source">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="client">Portal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard title="Faturamento" value={formatCurrency(stats.totalRevenue)} icon={DollarSign} color="bg-emerald-500" />
        <SummaryCard title="Total Pedidos" value={stats.totalOrders.toString()} icon={ShoppingCart} color="bg-blue-500" />
        <SummaryCard title="Itens Vendidos" value={stats.totalItems.toString()} icon={Package} color="bg-violet-500" />
        <SummaryCard title="Clientes Ativos" value={stats.uniqueClients.toString()} icon={Users} color="bg-amber-500" />
        <SummaryCard title="Ticket Médio" value={formatCurrency(stats.avgTicket)} icon={TrendingUp} color="bg-rose-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              <CardTitle className="text-base">Vendas por Cliente</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {stats.clientTotals.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Nenhum dado disponível</p>
            ) : (
              <div className="space-y-3">
                {stats.clientTotals.map((ct, i) => {
                  const maxRevenue = stats.clientTotals[0]?.revenue || 1;
                  const pct = Math.round((ct.revenue / maxRevenue) * 100);
                  return (
                    <div key={i} data-testid={`client-stat-${i}`}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-slate-900 truncate mr-2">{ct.name}</span>
                        <div className="flex items-center gap-3 text-slate-500 text-xs flex-shrink-0">
                          <span>{ct.orderCount} pedido(s)</span>
                          <span className="font-semibold text-slate-900">{formatCurrency(ct.revenue)}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-violet-500" />
              <CardTitle className="text-base">Produtos Mais Vendidos</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {stats.productTotals.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Nenhum dado disponível</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.productTotals.slice(0, 10).map((pt, i) => (
                      <TableRow key={i} data-testid={`product-stat-${i}`}>
                        <TableCell>
                          <div className="font-medium text-sm">{pt.size}</div>
                          <div className="text-xs text-slate-400">{pt.color}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{pt.qty}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(pt.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-500" />
            <CardTitle className="text-base">Detalhamento de Pedidos</CardTitle>
            <Badge variant="outline" className="ml-2">{filteredOrders.length} pedido(s)</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Nenhum pedido encontrado com os filtros aplicados</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Viagem</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order: any) => {
                    const clientPrices = reportData?.clientPrices?.[order.clientId] || [];
                    let orderTotal = 0;
                    let itemCount = 0;
                    for (const item of order.items || []) {
                      const priceEntry = clientPrices.find((p: any) => p.size === item.product?.size);
                      const price = priceEntry ? parseFloat(priceEntry.price) : 0;
                      orderTotal += price * item.quantity;
                      itemCount += item.quantity;
                    }

                    return (
                      <TableRow key={order.id} data-testid={`order-row-${order.id}`}>
                        <TableCell className="font-mono text-sm font-medium">#{order.id}</TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {order.createdAt ? formatDate(order.createdAt) : "—"}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{order.client?.nomeFantasia || "—"}</TableCell>
                        <TableCell className="text-sm text-slate-600">{order.trip?.name || "Sem viagem"}</TableCell>
                        <TableCell className="text-sm text-slate-600">{itemCount} itens</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              order.source === "client" ? "text-violet-600 border-violet-300" : "text-slate-600 border-slate-300"
                            )}
                          >
                            {sourceLabels[order.source] || order.source}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">
                          {formatCurrency(orderTotal)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, color }: { title: string; value: string; icon: any; color: string }) {
  return (
    <Card className="shadow-sm border-slate-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">{title}</p>
            <p className="text-xl font-bold font-display text-slate-900 mt-1">{value}</p>
          </div>
          <div className={`p-2.5 rounded-xl ${color} bg-opacity-10`}>
            <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
