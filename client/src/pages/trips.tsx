import { useState } from "react";
import { useTrips, useCreateTrip, useUpdateTrip } from "@/hooks/use-trips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Calendar, Map, CheckCircle2, Pencil, Trash2, FileText } from "lucide-react";
import { Link } from "wouter";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTripSchema, type InsertTrip, type Trip, type Order } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useOrders } from "@/hooks/use-orders";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";


const SIZE_ORDER = ["GRANDE", "MÉDIA", "PEQUENA", "OVAL", "PLANO"];

function renderClientPage(doc: jsPDF, trip: Trip, client: any, items: any[], observations: string[], prices: any[], copyLabel: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text(`Viagem: ${trip.name}`, 14, yPos);

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(copyLabel, pageWidth - 14, yPos, { align: "right" });

  yPos += 8;
  doc.setFontSize(9);
  doc.setTextColor(100);
  const startDate = format(new Date(trip.startDate), "dd/MM/yyyy");
  doc.text(`Início: ${startDate}`, 14, yPos);
  if (trip.endDate) {
    const endDate = format(new Date(trip.endDate), "dd/MM/yyyy");
    doc.text(`Fim: ${endDate}`, 70, yPos);
  }
  doc.text(`Status: ${trip.status === 'open' ? 'Em Aberto' : 'Encerrada'}`, 120, yPos);
  yPos += 8;

  doc.setDrawColor(200);
  doc.line(14, yPos, pageWidth - 14, yPos);
  yPos += 8;

  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(client.nomeFantasia || client.razaoSocial, 14, yPos);
  yPos += 6;

  doc.setFontSize(9);
  doc.setTextColor(80);
  if (client.cnpj) {
    doc.text(`CNPJ: ${client.cnpj}`, 14, yPos);
    yPos += 4;
  }
  const endereco = [client.logradouro, client.numero, client.bairro, client.cidade, client.estado].filter(Boolean).join(", ");
  if (endereco) {
    doc.text(`Endereço: ${endereco}`, 14, yPos);
    yPos += 4;
  }
  if (client.telefones) {
    doc.text(`Telefone: ${client.telefones}`, 14, yPos);
    yPos += 4;
  }
  if (observations.length > 0) {
    const obsText = observations.join("; ");
    doc.text(`Obs: ${obsText}`, 14, yPos);
    yPos += 4;
  }
  yPos += 6;

  if (items.length > 0) {
    const itemsBySize: Record<string, any[]> = {};
    for (const item of items) {
      const size = item.product?.size || "OUTROS";
      if (!itemsBySize[size]) itemsBySize[size] = [];
      itemsBySize[size].push(item);
    }

    const sortedSizes = Object.keys(itemsBySize).sort((a, b) => {
      const ia = SIZE_ORDER.indexOf(a);
      const ib = SIZE_ORDER.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    let clientTotal = 0;

    for (const size of sortedSizes) {
      const sizeItems = itemsBySize[size];
      const sizePrice = prices.find((p: any) => p.size === size);
      const unitPrice = sizePrice ? parseFloat(sizePrice.price) : 0;

      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(10);
      doc.setTextColor(40);
      doc.text(size, 14, yPos);
      yPos += 2;

      const tableData = sizeItems.map((item: any) => {
        const qty = item.quantity;
        const subtotal = qty * unitPrice;
        clientTotal += subtotal;
        return [
          item.product ? item.product.color : `Produto #${item.productId}`,
          qty.toString(),
          unitPrice > 0 ? `R$ ${unitPrice.toFixed(2)}` : "-",
          unitPrice > 0 ? `R$ ${subtotal.toFixed(2)}` : "-",
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [["Cor", "Qtd", "Valor Unit.", "Subtotal"]],
        body: tableData,
        theme: "grid",
        headStyles: { fillColor: [51, 51, 51], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
        tableWidth: "auto",
      });

      yPos = (doc as any).lastAutoTable.finalY + 6;
    }

    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    doc.setDrawColor(0);
    doc.line(14, yPos, pageWidth - 14, yPos);
    yPos += 6;
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`Total: R$ ${clientTotal.toFixed(2)}`, 14, yPos);

    return clientTotal;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text("Nenhum item neste pedido", 14, yPos);
    return 0;
  }
}

async function generateTripPDF(trip: Trip, orders: any[]) {
  const doc = new jsPDF();

  const clientOrdersMap: Record<number, { client: any; items: any[]; observations: string[] }> = {};
  for (const order of orders) {
    if (!order.client) continue;
    const cId = order.client.id;
    if (!clientOrdersMap[cId]) {
      clientOrdersMap[cId] = { client: order.client, items: [], observations: [] };
    }
    if (order.observation && !clientOrdersMap[cId].observations.includes(order.observation)) {
      clientOrdersMap[cId].observations.push(order.observation);
    }
    if (order.items) {
      for (const item of order.items) {
        clientOrdersMap[cId].items.push(item);
      }
    }
  }

  const clientPricesCache: Record<number, any[]> = {};
  for (const cId of Object.keys(clientOrdersMap)) {
    try {
      const res = await fetch(`/api/clients/${cId}/prices`, { credentials: "include" });
      if (res.ok) {
        clientPricesCache[Number(cId)] = await res.json();
      } else {
        clientPricesCache[Number(cId)] = [];
      }
    } catch {
      clientPricesCache[Number(cId)] = [];
    }
  }

  const entries = Object.values(clientOrdersMap);
  let isFirstPage = true;
  let grandTotal = 0;
  const clientTotals: { name: string; total: number }[] = [];

  for (const entry of entries) {
    const { client, items, observations } = entry;
    const prices = clientPricesCache[client.id] || [];

    if (!isFirstPage) doc.addPage();
    isFirstPage = false;
    const total1 = renderClientPage(doc, trip, client, items, observations, prices, "1\u00AA Via - Empresa");

    doc.addPage();
    renderClientPage(doc, trip, client, items, observations, prices, "2\u00AA Via - Cliente");

    grandTotal += total1;
    clientTotals.push({ name: client.nomeFantasia || client.razaoSocial, total: total1 });
  }

  if (clientTotals.length > 1) {
    doc.addPage();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text(`Resumo - Viagem: ${trip.name}`, 14, yPos);
    yPos += 12;

    autoTable(doc, {
      startY: yPos,
      head: [["Cliente", "Total"]],
      body: clientTotals.map(ct => [ct.name, `R$ ${ct.total.toFixed(2)}`]),
      theme: "grid",
      headStyles: { fillColor: [51, 51, 51], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
    doc.setDrawColor(0);
    doc.line(14, yPos, pageWidth - 14, yPos);
    yPos += 8;
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(`TOTAL GERAL: R$ ${grandTotal.toFixed(2)}`, 14, yPos);
  }

  doc.save(`viagem-${trip.name.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

export default function TripsPage() {
  const { data: trips, isLoading } = useTrips();
  const [open, setOpen] = useState(false);
  const [editOrdersOpen, setEditOrdersOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const updateMutation = useUpdateTrip();
  const { toast } = useToast();

  const handleCloseTrip = async (trip: Trip) => {
    try {
      await updateMutation.mutateAsync({ 
        id: trip.id, 
        status: "closed", 
        endDate: new Date().toISOString().split('T')[0] 
      });
      toast({ title: "Viagem encerrada com sucesso" });
    } catch {
      toast({ title: "Erro ao encerrar viagem", variant: "destructive" });
    }
  };

  const handleReopenTrip = async (trip: Trip) => {
    try {
      await updateMutation.mutateAsync({ 
        id: trip.id, 
        status: "open", 
        endDate: null 
      });
      toast({ title: "Viagem reaberta com sucesso" });
    } catch {
      toast({ title: "Erro ao reabrir viagem", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-display font-bold text-slate-900">Viagens</h2>
          <p className="text-slate-500">Gerencie as rotas de entrega</p>
        </div>
        <Button onClick={() => setOpen(true)} className="shadow-lg shadow-amber-500/20 bg-amber-500 hover:bg-amber-600">
          <Plus className="w-4 h-4 mr-2" />
          Nova Viagem
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips?.map((trip) => (
            <Card key={trip.id} className="group hover:shadow-lg transition-shadow border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold text-slate-900">{trip.name}</CardTitle>
                <Badge variant={trip.status === 'open' ? 'default' : 'secondary'} className={trip.status === 'open' ? 'bg-amber-500' : ''}>
                  {trip.status === 'open' ? 'Em Aberto' : 'Encerrada'}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center text-sm text-slate-500">
                    <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                    Início: {format(new Date(trip.startDate), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                  </div>
                  {trip.endDate && (
                    <div className="flex items-center text-sm text-slate-500">
                      <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                      Fim: {format(new Date(trip.endDate), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                    </div>
                  )}
                  <div className="flex items-center text-sm text-slate-500">
                    <Map className="w-4 h-4 mr-2 text-slate-400" />
                    Status: {trip.status === 'open' ? 'Entregas pendentes' : 'Finalizada'}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setSelectedTrip(trip);
                    setEditOrdersOpen(true);
                  }}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar Viagem
                </Button>
                <Button
                  variant="outline"
                  className="border-slate-200 text-slate-700"
                  data-testid={`button-print-trip-${trip.id}`}
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/orders?tripId=${trip.id}`, { credentials: "include" });
                      const tripOrders = await res.json();
                      if (!tripOrders || tripOrders.length === 0) {
                        toast({ title: "Nenhum pedido para imprimir", variant: "destructive" });
                        return;
                      }
                      generateTripPDF(trip, tripOrders);
                      toast({ title: "PDF gerado com sucesso" });
                    } catch {
                      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
                    }
                  }}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                {trip.status === 'open' ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="border-amber-200 text-amber-700 hover:bg-amber-50"
                      >
                        Encerrar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Encerrar Viagem</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja encerrar esta viagem?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleCloseTrip(trip)}>
                          Encerrar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="border-blue-200 text-blue-700 hover:bg-blue-50"
                      >
                        Ativar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reativar Viagem</AlertDialogTitle>
                        <AlertDialogDescription>
                          Deseja abrir esta viagem novamente para novas entregas?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleReopenTrip(trip)}>
                          Reativar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </CardFooter>
            </Card>
          ))}
          {trips?.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
              Nenhuma viagem cadastrada
            </div>
          )}
        </div>
      )}

      <TripDialog open={open} onOpenChange={setOpen} />
      <TripOrdersDialog 
        open={editOrdersOpen} 
        onOpenChange={setEditOrdersOpen} 
        trip={selectedTrip} 
      />
    </div>
  );
}

function TripOrdersDialog({ open, onOpenChange, trip }: { open: boolean, onOpenChange: (open: boolean) => void, trip: Trip | null }) {
  const { data: orders, isLoading } = useOrders(trip?.id);
  const { toast } = useToast();

  const handleDeleteOrder = async (orderId: number) => {
    try {
      await apiRequest("DELETE", `/api/orders/${orderId}`);
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path, trip?.id] });
      toast({ title: "Pedido excluído com sucesso" });
    } catch {
      toast({ title: "Erro ao excluir pedido", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <DialogTitle>Pedidos da Viagem: {trip?.name}</DialogTitle>
            {orders && orders.length > 0 && trip && (
              <Button
                variant="outline"
                size="sm"
                data-testid="button-print-trip-dialog"
                onClick={() => {
                  generateTripPDF(trip, orders);
                }}
              >
                <FileText className="w-4 h-4 mr-2" />
                Imprimir PDF
              </Button>
            )}
          </div>
        </DialogHeader>
        
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mt-4">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                      Nenhum pedido nesta viagem
                    </TableCell>
                  </TableRow>
                ) : (
                  orders?.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">#{order.id}</TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900">{order.client?.nomeFantasia}</div>
                        <div className="text-xs text-slate-500">{order.client?.cidade}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/painel/pedidos/editar/${order.id}`}>
                            <Button variant="ghost" size="sm">
                              <Pencil className="w-4 h-4 text-slate-500 hover:text-blue-600" />
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Pedido</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteOrder(order.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TripDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const createMutation = useCreateTrip();
  
  const form = useForm<InsertTrip>({
    resolver: zodResolver(insertTripSchema),
    defaultValues: {
      name: "",
      startDate: new Date().toISOString().split('T')[0],
      status: "open"
    }
  });

  async function onSubmit(data: InsertTrip) {
    try {
      await createMutation.mutateAsync(data);
      toast({ title: "Viagem criada com sucesso" });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast({ 
        title: "Erro ao criar", 
        description: "Não foi possível criar a viagem", 
        variant: "destructive" 
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Viagem</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Viagem (Rota)</FormLabel>
                  <FormControl><Input placeholder="Ex: Rota Sul - Agosto" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Início</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Criar Viagem
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
