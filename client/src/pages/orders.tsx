import { useState } from "react";
import { useOrders } from "@/hooks/use-orders";
import { useTrips } from "@/hooks/use-trips";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Plus, Loader2, ShoppingCart, Filter, Pencil, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function OrdersPage() {
  const [selectedTrip, setSelectedTrip] = useState<string>("all");
  const { data: trips } = useTrips();
  const { data: orders, isLoading } = useOrders(selectedTrip !== "all" ? parseInt(selectedTrip) : undefined);
  const { toast } = useToast();

  const handleDeleteOrder = async (orderId: number) => {
    try {
      await apiRequest("DELETE", `/api/orders/${orderId}`);
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
      toast({ title: "Pedido excluído com sucesso" });
    } catch {
      toast({ title: "Erro ao excluir pedido", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-slate-900">Pedidos</h2>
          <p className="text-slate-500">Histórico e gestão de pedidos</p>
        </div>
        <Link href="/painel/pedidos/novo">
          <Button className="shadow-lg shadow-blue-500/20 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Pedido
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Filter className="w-4 h-4" />
          Filtrar por Viagem:
        </div>
        <Select value={selectedTrip} onValueChange={setSelectedTrip}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Todas as viagens" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as viagens</SelectItem>
            {trips?.map(trip => (
              <SelectItem key={trip.id} value={trip.id.toString()}>
                {trip.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Viagem</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Nenhum pedido encontrado
                  </TableCell>
                </TableRow>
              ) : (
                orders?.map((order: any) => (
                  <TableRow key={order.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-mono text-xs">#{order.id}</TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900">{order.client?.nomeFantasia}</div>
                      <div className="text-xs text-slate-500">{order.client?.cidade}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal text-slate-600">
                        {order.trip?.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {order.createdAt && format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-slate-600">
                        <ShoppingCart className="w-3 h-3" />
                        {order.items?.length || 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/painel/pedidos/editar/${order.id}`}>
                          <Button variant="ghost" size="icon">
                            <Pencil className="w-4 h-4 text-slate-500 hover:text-blue-600" />
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
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
        )}
      </div>
    </div>
  );
}

