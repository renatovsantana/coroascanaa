import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Loader2, Plus, Trash2, ShoppingCart, Send, MessageSquare,
  LogOut, Package, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, Info
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface OrderItemDraft {
  productId: string;
  quantity: number;
}

function useClientAuth() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/client/me"],
    queryFn: async () => {
      const res = await fetch("/api/client/me", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    retry: false,
  });
  return { client: data, isLoading };
}

export default function ClientPortal() {
  const { client, isLoading: authLoading } = useClientAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState<"orders" | "messages">("orders");

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!client) {
    setLocation("/portal/login");
    return null;
  }

  const handleLogout = async () => {
    await apiRequest("POST", "/api/client/logout");
    queryClient.setQueryData(["/api/client/me"], null);
    setLocation("/portal/login");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display font-bold text-lg text-slate-900">{client.nomeFantasia}</h1>
            <p className="text-xs text-slate-400">{client.cnpj}</p>
          </div>
          <Button data-testid="button-client-logout" variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex gap-2">
          <Button
            data-testid="tab-orders"
            variant={tab === "orders" ? "default" : "outline"}
            onClick={() => setTab("orders")}
            className={tab === "orders" ? "bg-blue-600" : ""}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Pedidos
          </Button>
          <Button
            data-testid="tab-messages"
            variant={tab === "messages" ? "default" : "outline"}
            onClick={() => setTab("messages")}
            className={tab === "messages" ? "bg-blue-600" : ""}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Mensagens
          </Button>
        </div>

        {tab === "orders" ? (
          <OrdersTab clientId={client.id} />
        ) : (
          <MessagesTab />
        )}
      </div>
    </div>
  );
}

function OrdersTab({ clientId }: { clientId: number }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState<OrderItemDraft[]>([{ productId: "", quantity: 1 }]);

  const { data: products, isLoading: loadingProducts } = useQuery<any[]>({
    queryKey: ["/api/client/products"],
  });

  const { data: prices } = useQuery<any[]>({
    queryKey: ["/api/client/prices"],
  });

  const { data: myOrders, isLoading: loadingOrders } = useQuery<any[]>({
    queryKey: ["/api/client/orders"],
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/client/orders", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/orders"] });
      toast({ title: "Pedido enviado com sucesso! Aguarde a aprovação." });
      setShowForm(false);
      setItems([{ productId: "", quantity: 1 }]);
    },
    onError: () => {
      toast({ title: "Erro ao enviar pedido", variant: "destructive" });
    },
  });

  const handleAddItem = () => setItems([...items, { productId: "", quantity: 1 }]);
  const handleRemoveItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const handleUpdateItem = (i: number, field: keyof OrderItemDraft, val: string | number) => {
    const newItems = [...items];
    newItems[i] = { ...newItems[i], [field]: val };
    setItems(newItems);
  };

  const handleSubmit = () => {
    const validItems = items.filter(i => i.productId && i.quantity > 0);
    if (validItems.length === 0) {
      toast({ title: "Adicione pelo menos um produto", variant: "destructive" });
      return;
    }
    createOrderMutation.mutate({
      items: validItems.map(i => ({ productId: parseInt(i.productId), quantity: i.quantity })),
    });
  };

  const getOrderStatusBadge = (order: any) => {
    if (!order.tripId) {
      return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50"><Clock className="w-3 h-3 mr-1" />Aguardando aprovação</Badge>;
    }
    return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50"><CheckCircle className="w-3 h-3 mr-1" />Aprovado</Badge>;
  };

  return (
    <div className="space-y-6">
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-800">
          Ao fazer um <strong>Novo Pedido</strong>, as quantidades serão <strong>adicionadas</strong> ao pedido já existente.
          Para alterar um pedido existente ou excluir produtos, entre em contato conosco através da aba <strong>Mensagens</strong>.
        </AlertDescription>
      </Alert>

      {!showForm ? (
        <Button data-testid="button-new-order" className="bg-blue-600" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Pedido
        </Button>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-lg">Novo Pedido</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-sm font-medium">Produtos</label>
              <Button variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </div>

            {loadingProducts ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : (
              items.map((item, index) => {
                const selectedProduct = products?.find(p => p.id.toString() === item.productId);
                const unitPrice = selectedProduct ? prices?.find(p => p.size === selectedProduct.size)?.price : undefined;
                return (
                  <div key={index} className="flex gap-3 items-end flex-wrap">
                    <div className="flex-1 min-w-[200px] space-y-1">
                      <label className="text-xs text-slate-500">Produto</label>
                      <Select value={item.productId} onValueChange={(v) => handleUpdateItem(index, "productId", v)}>
                        <SelectTrigger data-testid={`select-product-${index}`}>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {products?.map(p => (
                            <SelectItem key={p.id} value={p.id.toString()}>
                              {p.size} - {p.color}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-20 space-y-1">
                      <label className="text-xs text-slate-500">Qtd</label>
                      <Input
                        data-testid={`input-qty-${index}`}
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(index, "quantity", parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="w-28 space-y-1">
                      <label className="text-xs text-slate-500">Preço</label>
                      <div className="h-9 flex items-center px-3 bg-slate-50 rounded-md border text-sm">
                        R$ {unitPrice || "—"}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(index)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="w-4 h-4 text-slate-400" />
                    </Button>
                  </div>
                );
              })
            )}

            <div className="flex justify-end pt-4">
              <Button
                data-testid="button-submit-order"
                className="bg-blue-600"
                onClick={handleSubmit}
                disabled={createOrderMutation.isPending}
              >
                {createOrderMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Enviar Pedido
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Meus Pedidos</h3>
        {loadingOrders ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : !myOrders?.length ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-400">
              <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>Nenhum pedido encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {myOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: any }) {
  const [expanded, setExpanded] = useState(false);

  const getStatusBadge = () => {
    if (!order.tripId) {
      return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50"><Clock className="w-3 h-3 mr-1" />Aguardando</Badge>;
    }
    return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50"><CheckCircle className="w-3 h-3 mr-1" />Aprovado</Badge>;
  };

  return (
    <Card data-testid={`order-card-${order.id}`}>
      <CardContent className="py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm text-slate-500">#{order.id}</span>
            {getStatusBadge()}
            {order.trip && <span className="text-sm text-slate-500">{order.trip.name}</span>}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">
              {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'itens'}
            </span>
            {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </div>
        {expanded && order.items?.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
            {order.items.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  {item.product?.size} - {item.product?.color}
                </span>
                <span className="text-slate-500">Qtd: {item.quantity}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MessagesTab() {
  const { toast } = useToast();
  const [content, setContent] = useState("");

  const { data: messages, isLoading } = useQuery<any[]>({
    queryKey: ["/api/client/messages"],
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/client/messages", { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/messages"] });
      setContent("");
      toast({ title: "Mensagem enviada!" });
    },
    onError: () => {
      toast({ title: "Erro ao enviar mensagem", variant: "destructive" });
    },
  });

  const handleSend = () => {
    if (!content.trim()) return;
    sendMutation.mutate(content.trim());
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Enviar Mensagem</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            data-testid="input-message"
            placeholder="Escreva sua mensagem para o administrador..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end">
            <Button
              data-testid="button-send-message"
              className="bg-blue-600"
              onClick={handleSend}
              disabled={sendMutation.isPending || !content.trim()}
            >
              {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Enviar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Histórico</h3>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : !messages?.length ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>Nenhuma mensagem</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {messages.map(msg => (
              <Card key={msg.id} data-testid={`message-${msg.id}`}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={msg.direction === "client_to_admin" ? "default" : "secondary"} className="text-xs">
                          {msg.direction === "client_to_admin" ? "Você" : "Administrador"}
                        </Badge>
                        <span className="text-xs text-slate-400">
                          {new Date(msg.createdAt).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">{msg.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
