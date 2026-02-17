import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, ClipboardList } from "lucide-react";

function useTrips() {
  return useQuery<any[]>({ queryKey: ["/api/trips"] });
}

export default function OrderRequestsPage() {
  const { toast } = useToast();
  const { data: pendingOrders, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/pending-orders"],
    refetchInterval: 10000,
  });
  const { data: trips } = useTrips();
  const [approveDialogOrder, setApproveDialogOrder] = useState<any>(null);
  const [selectedTripId, setSelectedTripId] = useState("");

  const approveMutation = useMutation({
    mutationFn: async ({ orderId, tripId }: { orderId: number; tripId: number }) => {
      const res = await apiRequest("POST", `/api/admin/orders/${orderId}/approve`, { tripId });
      return res.json();
    },
    onSuccess: () => {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900" data-testid="text-page-title">
            Solicitações de Pedidos
          </h1>
          <p className="text-slate-500 mt-1">Pedidos enviados pelos clientes aguardando aprovação</p>
        </div>
        {pendingOrders && pendingOrders.length > 0 && (
          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-sm" data-testid="badge-pending-count">
            {pendingOrders.length} pendente{pendingOrders.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : !pendingOrders?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-600">Nenhuma solicitação pendente</h3>
            <p className="text-slate-400 mt-1 max-w-md">
              Quando os clientes enviarem pedidos pelo portal, eles aparecerão aqui para sua aprovação.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <CardTitle>Pedidos Aguardando Aprovação</CardTitle>
            </div>
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
      )}

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
            <Button variant="outline" onClick={() => setApproveDialogOrder(null)} data-testid="button-cancel-approve">
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
    </div>
  );
}

function PendingOrderRow({ order, onApprove, onReject, isRejecting }: any) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div data-testid={`pending-order-${order.id}`} className="border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-sm font-medium">#{order.id}</span>
          <span className="text-sm font-semibold text-slate-900">{order.client?.nomeFantasia || order.client?.razaoSocial}</span>
          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
            <Clock className="w-3 h-3 mr-1" />
            Portal do cliente
          </Badge>
          {order.createdAt && (
            <span className="text-xs text-slate-400">
              {new Date(order.createdAt).toLocaleDateString("pt-BR")} {new Date(order.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
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
          <Button variant="ghost" size="icon" onClick={() => setExpanded(!expanded)} data-testid={`button-expand-${order.id}`}>
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
