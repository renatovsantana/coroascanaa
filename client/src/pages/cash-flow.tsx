import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTrips } from "@/hooks/use-trips";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DollarSign,
  CheckCircle,
  XCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Plus,
  Pencil,
  Trash2,
  MessageSquare,
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  Filter,
  Repeat,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const RECEIVABLE_CATEGORIES = [
  "Venda de Produtos",
  "Serviços",
  "Outros Recebimentos",
];

const PAYABLE_CATEGORIES = [
  "Fornecedores",
  "Combustível",
  "Manutenção",
  "Salários",
  "Aluguel",
  "Impostos",
  "Frete",
  "Material de Escritório",
  "Outros Gastos",
];

type EntryFormData = {
  type: "receivable" | "payable";
  description: string;
  amount: string;
  dueDate: string;
  paidDate: string;
  status: "open" | "paid" | "overdue";
  category: string;
  observation: string;
  clientId: string;
  tripId: string;
  isRecurring: boolean;
  recurrencePeriod: "monthly" | "biweekly" | "weekly" | "quarterly" | "yearly";
  recurrenceCount: string;
};

const emptyForm: EntryFormData = {
  type: "receivable",
  description: "",
  amount: "",
  dueDate: new Date().toISOString().split("T")[0],
  paidDate: "",
  status: "open",
  category: "",
  observation: "",
  clientId: "",
  tripId: "",
  isRecurring: false,
  recurrencePeriod: "monthly",
  recurrenceCount: "12",
};

function getOrderTotal(order: any, clientPrices: Record<number, any[]>) {
  const prices = clientPrices[order.clientId] || [];
  let total = 0;
  for (const item of order.items || []) {
    const priceEntry = prices.find((p: any) => p.size === item.product?.size);
    const unitPrice = priceEntry ? parseFloat(priceEntry.price) : 0;
    total += unitPrice * item.quantity;
  }
  return total;
}

function formatCurrency(value: number) {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  return format(new Date(dateStr + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR });
}

export default function CashFlowPage() {
  const [activeTab, setActiveTab] = useState("summary");
  const [entryModal, setEntryModal] = useState<{ open: boolean; editId: number | null; form: EntryFormData }>({
    open: false,
    editId: null,
    form: { ...emptyForm },
  });
  const [observationModal, setObservationModal] = useState<{ open: boolean; orderId: number | null; text: string }>({
    open: false,
    orderId: null,
    text: "",
  });
  const [selectedTrip, setSelectedTrip] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: trips } = useTrips();
  const { data: clients } = useQuery<any[]>({ queryKey: ["/api/clients"] });
  const { toast } = useToast();

  const { data: entries, isLoading: loadingEntries } = useQuery<any[]>({
    queryKey: ["/api/finance/entries"],
  });

  const { data: allOrders } = useQuery<any[]>({
    queryKey: ["/api/orders"],
  });

  const { data: salesData } = useQuery<any>({
    queryKey: ["/api/admin/report/sales"],
  });

  const clientPrices: Record<number, any[]> = salesData?.clientPrices || {};

  const sortedTrips = trips?.slice().sort((a, b) => {
    if (a.status === "closed" && b.status !== "closed") return -1;
    if (a.status !== "closed" && b.status === "closed") return 1;
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
  });

  const tripOrders = selectedTrip
    ? (allOrders || []).filter((o: any) => o.tripId?.toString() === selectedTrip)
    : [];

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/finance/entries", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/entries"] });
      const count = Array.isArray(data) ? data.length : 1;
      toast({ title: count > 1 ? `${count} lançamentos criados` : "Lançamento criado" });
      setEntryModal({ open: false, editId: null, form: { ...emptyForm } });
    },
    onError: () => {
      toast({ title: "Erro ao criar lançamento", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/finance/entries/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/entries"] });
      toast({ title: "Lançamento atualizado" });
      setEntryModal({ open: false, editId: null, form: { ...emptyForm } });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar lançamento", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/finance/entries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/entries"] });
      toast({ title: "Lançamento excluído" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir lançamento", variant: "destructive" });
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async ({ orderId, paid, observation }: { orderId: number; paid: boolean; observation: string | null }) => {
      const res = await apiRequest("PUT", `/api/orders/${orderId}/payment`, { paid, observation });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Pagamento atualizado" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar pagamento", variant: "destructive" });
    },
  });

  const handleSaveEntry = () => {
    const { form, editId } = entryModal;
    const payload: any = {
      type: form.type,
      description: form.description,
      amount: form.amount,
      dueDate: form.dueDate,
      paidDate: form.paidDate || null,
      status: form.status,
      category: form.category,
      observation: form.observation || null,
      clientId: form.clientId && form.clientId !== "none" ? parseInt(form.clientId) : null,
      tripId: form.tripId && form.tripId !== "none" ? parseInt(form.tripId) : null,
    };

    if (!editId && form.isRecurring) {
      payload.isRecurring = true;
      payload.recurrencePeriod = form.recurrencePeriod;
      payload.recurrenceCount = parseInt(form.recurrenceCount) || 1;
    }

    if (editId) {
      updateMutation.mutate({ id: editId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openCreateModal = (type: "receivable" | "payable") => {
    setEntryModal({
      open: true,
      editId: null,
      form: { ...emptyForm, type },
    });
  };

  const openEditModal = (entry: any) => {
    setEntryModal({
      open: true,
      editId: entry.id,
      form: {
        type: entry.type,
        description: entry.description,
        amount: entry.amount,
        dueDate: entry.dueDate,
        paidDate: entry.paidDate || "",
        status: entry.status,
        category: entry.category,
        observation: entry.observation || "",
        clientId: entry.clientId?.toString() || "",
        tripId: entry.tripId?.toString() || "",
        isRecurring: false,
        recurrencePeriod: "monthly",
        recurrenceCount: "1",
      },
    });
  };

  const toggleEntryStatus = (entry: any) => {
    const newStatus = entry.status === "paid" ? "open" : "paid";
    const paidDate = newStatus === "paid" ? new Date().toISOString().split("T")[0] : null;
    updateMutation.mutate({
      id: entry.id,
      data: { status: newStatus, paidDate },
    });
  };

  const handleToggleOrderPaid = (order: any) => {
    updatePaymentMutation.mutate({
      orderId: order.id,
      paid: !order.paid,
      observation: order.observation || null,
    });
  };

  const saveObservation = () => {
    if (observationModal.orderId === null) return;
    const order = tripOrders.find((o: any) => o.id === observationModal.orderId);
    updatePaymentMutation.mutate({
      orderId: observationModal.orderId,
      paid: order?.paid ?? false,
      observation: observationModal.text || null,
    });
    setObservationModal({ open: false, orderId: null, text: "" });
  };

  const receivableEntries = (entries || []).filter((e: any) => e.type === "receivable");
  const payableEntries = (entries || []).filter((e: any) => e.type === "payable");

  const totalReceivable = receivableEntries.reduce((s: number, e: any) => s + parseFloat(e.amount || "0"), 0);
  const paidReceivable = receivableEntries.filter((e: any) => e.status === "paid").reduce((s: number, e: any) => s + parseFloat(e.amount || "0"), 0);
  const openReceivable = totalReceivable - paidReceivable;

  const totalPayable = payableEntries.reduce((s: number, e: any) => s + parseFloat(e.amount || "0"), 0);
  const paidPayable = payableEntries.filter((e: any) => e.status === "paid").reduce((s: number, e: any) => s + parseFloat(e.amount || "0"), 0);
  const openPayable = totalPayable - paidPayable;

  const orderReceivable = (allOrders || []).reduce((s: number, o: any) => s + getOrderTotal(o, clientPrices), 0);
  const orderPaidReceivable = (allOrders || []).filter((o: any) => o.paid).reduce((s: number, o: any) => s + getOrderTotal(o, clientPrices), 0);

  const balance = (paidReceivable + orderPaidReceivable) - paidPayable;

  const filteredReceivable = statusFilter === "all"
    ? receivableEntries
    : receivableEntries.filter((e: any) => e.status === statusFilter);

  const filteredPayable = statusFilter === "all"
    ? payableEntries
    : payableEntries.filter((e: any) => e.status === statusFilter);

  const categories = entryModal.form.type === "receivable" ? RECEIVABLE_CATEGORIES : PAYABLE_CATEGORIES;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-display font-bold text-slate-900" data-testid="text-page-title">Financeiro</h2>
        <p className="text-slate-500">Fluxo de caixa - Contas a pagar e a receber</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-lg" data-testid="tabs-financial">
          <TabsTrigger value="summary" data-testid="tab-summary">Resumo</TabsTrigger>
          <TabsTrigger value="receivable" data-testid="tab-receivable">Contas a Receber</TabsTrigger>
          <TabsTrigger value="payable" data-testid="tab-payable">Contas a Pagar</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Total a Receber</CardTitle>
                <ArrowDownCircle className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="text-summary-receivable">
                  {formatCurrency(totalReceivable + orderReceivable)}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {formatCurrency(paidReceivable + orderPaidReceivable)} recebido
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Total a Pagar</CardTitle>
                <ArrowUpCircle className="w-4 h-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600" data-testid="text-summary-payable">
                  {formatCurrency(totalPayable)}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {formatCurrency(paidPayable)} pago
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Pendente Receber</CardTitle>
                <TrendingUp className="w-4 h-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600" data-testid="text-summary-open-receivable">
                  {formatCurrency(openReceivable + (orderReceivable - orderPaidReceivable))}
                </div>
                <p className="text-xs text-slate-500 mt-1">aguardando pagamento</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Saldo</CardTitle>
                <DollarSign className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`} data-testid="text-summary-balance">
                  {formatCurrency(balance)}
                </div>
                <p className="text-xs text-slate-500 mt-1">recebido - pago</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base">Contas a Receber - Pendentes</CardTitle>
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  {receivableEntries.filter((e: any) => e.status === "open").length + (allOrders || []).filter((o: any) => !o.paid).length}
                </Badge>
              </CardHeader>
              <CardContent>
                {receivableEntries.filter((e: any) => e.status === "open").length === 0 &&
                 (allOrders || []).filter((o: any) => !o.paid).length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Nenhuma conta pendente</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {receivableEntries
                      .filter((e: any) => e.status === "open")
                      .slice(0, 5)
                      .map((e: any) => (
                        <div key={`entry-${e.id}`} className="flex items-center justify-between p-2 rounded-lg border border-slate-100">
                          <div>
                            <p className="text-sm font-medium text-slate-800">{e.description}</p>
                            <p className="text-xs text-slate-500">Venc: {formatDate(e.dueDate)}</p>
                          </div>
                          <span className="text-sm font-semibold text-green-600">{formatCurrency(parseFloat(e.amount))}</span>
                        </div>
                      ))}
                    {(allOrders || [])
                      .filter((o: any) => !o.paid && o.tripId)
                      .slice(0, 5)
                      .map((o: any) => (
                        <div key={`order-${o.id}`} className="flex items-center justify-between p-2 rounded-lg border border-slate-100">
                          <div>
                            <p className="text-sm font-medium text-slate-800">Pedido #{o.id} - {o.client?.nomeFantasia}</p>
                            <p className="text-xs text-slate-500">Pedido de venda</p>
                          </div>
                          <span className="text-sm font-semibold text-green-600">{formatCurrency(getOrderTotal(o, clientPrices))}</span>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base">Contas a Pagar - Pendentes</CardTitle>
                <Badge variant="outline" className="text-red-600 border-red-300">
                  {payableEntries.filter((e: any) => e.status === "open").length}
                </Badge>
              </CardHeader>
              <CardContent>
                {payableEntries.filter((e: any) => e.status === "open").length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Nenhuma conta pendente</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {payableEntries
                      .filter((e: any) => e.status === "open")
                      .slice(0, 10)
                      .map((e: any) => (
                        <div key={e.id} className="flex items-center justify-between p-2 rounded-lg border border-slate-100">
                          <div>
                            <p className="text-sm font-medium text-slate-800">{e.description}</p>
                            <p className="text-xs text-slate-500">Venc: {formatDate(e.dueDate)} - {e.category}</p>
                          </div>
                          <span className="text-sm font-semibold text-red-600">{formatCurrency(parseFloat(e.amount))}</span>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">Pedidos por Viagem</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Filter className="w-4 h-4" />
                  Viagem:
                </div>
                <Select value={selectedTrip} onValueChange={setSelectedTrip}>
                  <SelectTrigger className="w-[300px]" data-testid="select-trip-filter">
                    <SelectValue placeholder="Selecione uma viagem" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedTrips?.map(trip => (
                      <SelectItem key={trip.id} value={trip.id.toString()} data-testid={`select-trip-${trip.id}`}>
                        <span className="flex items-center gap-2">
                          {trip.name}
                          {trip.status === "closed" && (
                            <Badge variant="outline" className="text-xs ml-1 text-slate-500 border-slate-300">Finalizada</Badge>
                          )}
                          {trip.status === "open" && (
                            <Badge variant="outline" className="text-xs ml-1 text-green-600 border-green-300">Aberta</Badge>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTrip && tripOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Observação</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tripOrders.map((order: any) => {
                        const orderTotal = getOrderTotal(order, clientPrices);
                        return (
                          <TableRow key={order.id} className={order.paid ? "bg-green-50/30" : ""}>
                            <TableCell className="font-mono text-xs" data-testid={`text-order-id-${order.id}`}>#{order.id}</TableCell>
                            <TableCell>
                              <div className="font-medium text-slate-900">{order.client?.nomeFantasia}</div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium text-slate-900">{formatCurrency(orderTotal)}</span>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setObservationModal({ open: true, orderId: order.id, text: order.observation || "" })}
                                data-testid={`button-observation-${order.id}`}
                                className="gap-1"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                {order.observation ? (
                                  <span className="max-w-[120px] truncate text-xs">{order.observation}</span>
                                ) : (
                                  <span className="text-xs text-slate-400">Adicionar</span>
                                )}
                              </Button>
                            </TableCell>
                            <TableCell>
                              {order.paid ? (
                                <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                                  <CheckCircle className="w-3 h-3 mr-1" />Pago
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">
                                  <XCircle className="w-3 h-3 mr-1" />Pendente
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant={order.paid ? "outline" : "default"}
                                size="sm"
                                onClick={() => handleToggleOrderPaid(order)}
                                disabled={updatePaymentMutation.isPending}
                                className={order.paid ? "" : "bg-green-600"}
                                data-testid={`button-toggle-paid-${order.id}`}
                              >
                                {order.paid ? (
                                  <><XCircle className="w-3 h-3 mr-1" />Desfazer</>
                                ) : (
                                  <><CheckCircle className="w-3 h-3 mr-1" />Marcar Pago</>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : selectedTrip ? (
                <p className="text-sm text-slate-400 text-center py-4">Nenhum pedido nesta viagem</p>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">Selecione uma viagem para ver os pedidos</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receivable" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Total a Receber</CardTitle>
                <ArrowDownCircle className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="text-receivable-total">{formatCurrency(totalReceivable)}</div>
                <p className="text-xs text-slate-500 mt-1">{receivableEntries.length} lançamento(s)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium text-green-600">Recebido</CardTitle>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="text-receivable-paid">{formatCurrency(paidReceivable)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium text-amber-600">Pendente</CardTitle>
                <TrendingDown className="w-4 h-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600" data-testid="text-receivable-open">{formatCurrency(openReceivable)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-status-filter-receivable">
                  <SelectValue placeholder="Filtrar status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="open">Em Aberto</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="overdue">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => openCreateModal("receivable")} data-testid="button-add-receivable">
              <Plus className="w-4 h-4 mr-1" />
              Nova Conta a Receber
            </Button>
          </div>

          <FinancialTable
            entries={filteredReceivable}
            loading={loadingEntries}
            onEdit={openEditModal}
            onDelete={(id) => deleteMutation.mutate(id)}
            onToggleStatus={toggleEntryStatus}
            emptyMessage="Nenhuma conta a receber cadastrada"
            type="receivable"
          />
        </TabsContent>

        <TabsContent value="payable" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Total a Pagar</CardTitle>
                <ArrowUpCircle className="w-4 h-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600" data-testid="text-payable-total">{formatCurrency(totalPayable)}</div>
                <p className="text-xs text-slate-500 mt-1">{payableEntries.length} lançamento(s)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium text-green-600">Pago</CardTitle>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="text-payable-paid">{formatCurrency(paidPayable)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium text-red-600">Pendente</CardTitle>
                <TrendingDown className="w-4 h-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600" data-testid="text-payable-open">{formatCurrency(openPayable)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-status-filter-payable">
                  <SelectValue placeholder="Filtrar status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="open">Em Aberto</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="overdue">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => openCreateModal("payable")} data-testid="button-add-payable">
              <Plus className="w-4 h-4 mr-1" />
              Nova Conta a Pagar
            </Button>
          </div>

          <FinancialTable
            entries={filteredPayable}
            loading={loadingEntries}
            onEdit={openEditModal}
            onDelete={(id) => deleteMutation.mutate(id)}
            onToggleStatus={toggleEntryStatus}
            emptyMessage="Nenhuma conta a pagar cadastrada"
            type="payable"
          />
        </TabsContent>
      </Tabs>

      <Dialog open={entryModal.open} onOpenChange={(open) => {
        if (!open) setEntryModal({ open: false, editId: null, form: { ...emptyForm } });
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {entryModal.editId ? "Editar Lançamento" : entryModal.form.type === "receivable" ? "Nova Conta a Receber" : "Nova Conta a Pagar"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Descrição</Label>
              <Input
                value={entryModal.form.description}
                onChange={(e) => setEntryModal(prev => ({ ...prev, form: { ...prev.form, description: e.target.value } }))}
                placeholder="Descrição do lançamento"
                data-testid="input-entry-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={entryModal.form.amount}
                  onChange={(e) => setEntryModal(prev => ({ ...prev, form: { ...prev.form, amount: e.target.value } }))}
                  placeholder="0,00"
                  data-testid="input-entry-amount"
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select
                  value={entryModal.form.category}
                  onValueChange={(val) => setEntryModal(prev => ({ ...prev, form: { ...prev.form, category: val } }))}
                >
                  <SelectTrigger data-testid="select-entry-category">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data de Vencimento</Label>
                <Input
                  type="date"
                  value={entryModal.form.dueDate}
                  onChange={(e) => setEntryModal(prev => ({ ...prev, form: { ...prev.form, dueDate: e.target.value } }))}
                  data-testid="input-entry-due-date"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={entryModal.form.status}
                  onValueChange={(val) => setEntryModal(prev => ({ ...prev, form: { ...prev.form, status: val as any } }))}
                >
                  <SelectTrigger data-testid="select-entry-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Em Aberto</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="overdue">Vencido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {entryModal.form.status === "paid" && (
              <div>
                <Label>Data de Pagamento</Label>
                <Input
                  type="date"
                  value={entryModal.form.paidDate}
                  onChange={(e) => setEntryModal(prev => ({ ...prev, form: { ...prev.form, paidDate: e.target.value } }))}
                  data-testid="input-entry-paid-date"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cliente (opcional)</Label>
                <Select
                  value={entryModal.form.clientId}
                  onValueChange={(val) => setEntryModal(prev => ({ ...prev, form: { ...prev.form, clientId: val } }))}
                >
                  <SelectTrigger data-testid="select-entry-client">
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {clients?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.nomeFantasia}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Viagem (opcional)</Label>
                <Select
                  value={entryModal.form.tripId}
                  onValueChange={(val) => setEntryModal(prev => ({ ...prev, form: { ...prev.form, tripId: val } }))}
                >
                  <SelectTrigger data-testid="select-entry-trip">
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {trips?.map(t => (
                      <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Observação</Label>
              <Textarea
                value={entryModal.form.observation}
                onChange={(e) => setEntryModal(prev => ({ ...prev, form: { ...prev.form, observation: e.target.value } }))}
                placeholder="Observações sobre este lançamento"
                rows={3}
                data-testid="textarea-entry-observation"
              />
            </div>
            {!entryModal.editId && (
              <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Repeat className="w-4 h-4 text-slate-500" />
                    <Label className="font-medium">Conta Recorrente</Label>
                  </div>
                  <Select
                    value={entryModal.form.isRecurring ? "yes" : "no"}
                    onValueChange={(val) => setEntryModal(prev => ({ ...prev, form: { ...prev.form, isRecurring: val === "yes" } }))}
                  >
                    <SelectTrigger className="w-[120px]" data-testid="select-recurring">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">Não</SelectItem>
                      <SelectItem value="yes">Sim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {entryModal.form.isRecurring && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Período</Label>
                      <Select
                        value={entryModal.form.recurrencePeriod}
                        onValueChange={(val) => setEntryModal(prev => ({ ...prev, form: { ...prev.form, recurrencePeriod: val as any } }))}
                      >
                        <SelectTrigger data-testid="select-recurrence-period">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Semanal</SelectItem>
                          <SelectItem value="biweekly">Quinzenal</SelectItem>
                          <SelectItem value="monthly">Mensal</SelectItem>
                          <SelectItem value="quarterly">Trimestral</SelectItem>
                          <SelectItem value="yearly">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Quantidade de parcelas</Label>
                      <Input
                        type="number"
                        min="2"
                        max="60"
                        value={entryModal.form.recurrenceCount}
                        onChange={(e) => setEntryModal(prev => ({ ...prev, form: { ...prev.form, recurrenceCount: e.target.value } }))}
                        data-testid="input-recurrence-count"
                      />
                    </div>
                  </div>
                )}
                {entryModal.form.isRecurring && (
                  <p className="text-xs text-slate-500">
                    Serão geradas {parseInt(entryModal.form.recurrenceCount) || 0} parcelas a partir de {formatDate(entryModal.form.dueDate)}, com intervalo {
                      { weekly: "semanal", biweekly: "quinzenal", monthly: "mensal", quarterly: "trimestral", yearly: "anual" }[entryModal.form.recurrencePeriod]
                    }.
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEntryModal({ open: false, editId: null, form: { ...emptyForm } })} data-testid="button-cancel-entry">
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEntry}
              disabled={createMutation.isPending || updateMutation.isPending || !entryModal.form.description || !entryModal.form.amount || !entryModal.form.category}
              data-testid="button-save-entry"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={observationModal.open} onOpenChange={(open) => {
        if (!open) setObservationModal({ open: false, orderId: null, text: "" });
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Observação do Pedido #{observationModal.orderId}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={observationModal.text}
            onChange={(e) => setObservationModal(prev => ({ ...prev, text: e.target.value }))}
            placeholder="Informe as negociações de pagamento, condições acordadas, prazos, etc."
            rows={5}
            data-testid="textarea-observation"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setObservationModal({ open: false, orderId: null, text: "" })} data-testid="button-cancel-observation">
              Cancelar
            </Button>
            <Button onClick={saveObservation} disabled={updatePaymentMutation.isPending} data-testid="button-save-observation">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FinancialTable({
  entries,
  loading,
  onEdit,
  onDelete,
  onToggleStatus,
  emptyMessage,
  type,
}: {
  entries: any[];
  loading?: boolean;
  onEdit: (entry: any) => void;
  onDelete: (id: number) => void;
  onToggleStatus: (entry: any) => void;
  emptyMessage: string;
  type: "receivable" | "payable";
}) {
  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead>Descrição</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry: any) => (
            <TableRow key={entry.id} className={entry.status === "paid" ? "bg-green-50/30" : entry.status === "overdue" ? "bg-red-50/30" : ""}>
              <TableCell>
                <div className="font-medium text-slate-900" data-testid={`text-entry-desc-${entry.id}`}>{entry.description}</div>
                {entry.client && <div className="text-xs text-slate-500">{entry.client.nomeFantasia}</div>}
                {entry.observation && <div className="text-xs text-slate-400 mt-0.5 max-w-[200px] truncate">{entry.observation}</div>}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">{entry.category}</Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm text-slate-700">{formatDate(entry.dueDate)}</div>
                {entry.paidDate && <div className="text-xs text-green-600">Pago: {formatDate(entry.paidDate)}</div>}
              </TableCell>
              <TableCell>
                <span className={`font-medium ${type === "receivable" ? "text-green-700" : "text-red-700"}`} data-testid={`text-entry-amount-${entry.id}`}>
                  {formatCurrency(parseFloat(entry.amount))}
                </span>
              </TableCell>
              <TableCell>
                {entry.status === "paid" ? (
                  <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50" data-testid={`badge-entry-status-${entry.id}`}>
                    <CheckCircle className="w-3 h-3 mr-1" />Pago
                  </Badge>
                ) : entry.status === "overdue" ? (
                  <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50" data-testid={`badge-entry-status-${entry.id}`}>
                    <XCircle className="w-3 h-3 mr-1" />Vencido
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50" data-testid={`badge-entry-status-${entry.id}`}>
                    <Calendar className="w-3 h-3 mr-1" />Em Aberto
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-center gap-1">
                  <Button
                    variant={entry.status === "paid" ? "outline" : "default"}
                    size="sm"
                    onClick={() => onToggleStatus(entry)}
                    className={entry.status === "paid" ? "" : "bg-green-600"}
                    data-testid={`button-toggle-entry-${entry.id}`}
                  >
                    {entry.status === "paid" ? (
                      <><XCircle className="w-3 h-3 mr-1" />Desfazer</>
                    ) : (
                      <><CheckCircle className="w-3 h-3 mr-1" />Pagar</>
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(entry)} data-testid={`button-edit-entry-${entry.id}`}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(entry.id)} data-testid={`button-delete-entry-${entry.id}`}>
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
