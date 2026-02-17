import { useState, useEffect } from "react";
import { useClients } from "@/hooks/use-clients";
import { useProducts } from "@/hooks/use-products";
import { useTrips } from "@/hooks/use-trips";
import { useCreateOrder, useOrder } from "@/hooks/use-orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, ShoppingCart, Check, ArrowLeft, Save } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface OrderItemDraft {
  productId: string; // string for select handling
  quantity: number;
}

export default function CreateOrderPage() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id?: string }>();
  const isEditing = !!id;
  const { data: existingOrder, isLoading: isLoadingOrder } = useOrder(id ? parseInt(id) : 0);
  const { toast } = useToast();
  
  const { data: clients } = useClients();
  const { data: products } = useProducts();
  const { data: trips } = useTrips();
  const createOrderMutation = useCreateOrder();

  const [tripId, setTripId] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [items, setItems] = useState<OrderItemDraft[]>([{ productId: "", quantity: 1 }]);

  useEffect(() => {
    if (isEditing && existingOrder) {
      setTripId(existingOrder.tripId?.toString() || "");
      setClientId(existingOrder.clientId.toString());
      setItems(existingOrder.items.map((item: any) => ({
        productId: item.productId.toString(),
        quantity: item.quantity
      })));
    }
  }, [isEditing, existingOrder]);

  const { data: clientPrices } = useQuery<any[]>({
    queryKey: [`/api/clients/${clientId}/prices`],
    enabled: !!clientId
  });

  // Filter only active trips
  const activeTrips = trips?.filter(t => t.status === "open" || t.id.toString() === tripId);

  const handleAddItem = () => {
    setItems([...items, { productId: "", quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: keyof OrderItemDraft, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (!tripId || !clientId) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }

    const validItems = items.filter(i => i.productId && i.quantity > 0);
    if (validItems.length === 0) {
      toast({ title: "Adicione pelo menos um produto", variant: "destructive" });
      return;
    }

    try {
      if (isEditing) {
        await apiRequest("PUT", `/api/orders/${id}`, {
          tripId: parseInt(tripId),
          clientId: parseInt(clientId),
          items: validItems.map(i => ({
            productId: parseInt(i.productId),
            quantity: i.quantity
          }))
        });
        toast({ title: "Pedido atualizado com sucesso!" });
      } else {
        await createOrderMutation.mutateAsync({
          tripId: parseInt(tripId),
          clientId: parseInt(clientId),
          items: validItems.map(i => ({
            productId: parseInt(i.productId),
            quantity: i.quantity
          }))
        });
        toast({ title: "Pedido criado com sucesso!" });
      }
      setLocation("/painel/pedidos");
    } catch {
      toast({ title: "Erro ao salvar pedido", variant: "destructive" });
    }
  };

  if (isEditing && isLoadingOrder) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/painel/pedidos")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-3xl font-display font-bold text-slate-900">
            {isEditing ? "Editar Pedido" : "Novo Pedido"}
          </h2>
          <p className="text-slate-500">
            {isEditing ? `Editando pedido #${id}` : "Preencha os dados do pedido"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações Gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Viagem</label>
              <Select value={tripId} onValueChange={setTripId} disabled={isEditing}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a viagem" />
                </SelectTrigger>
                <SelectContent>
                  {activeTrips?.map(trip => (
                    <SelectItem key={trip.id} value={trip.id.toString()}>
                      {trip.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cliente</label>
              <Select value={clientId} onValueChange={setClientId} disabled={isEditing}>
                <SelectTrigger data-testid="select-client">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map(client => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.nomeFantasia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Resumo</CardTitle>
            <ShoppingCart className="w-5 h-5 text-slate-400" />
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center items-center text-center text-slate-500 space-y-2">
            <div className="text-3xl font-bold text-slate-900">{items.filter(i => i.productId).length}</div>
            <div className="text-sm">Itens no pedido</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Itens do Pedido</CardTitle>
          <Button variant="outline" size="sm" onClick={handleAddItem}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, index) => {
             const selectedProduct = products?.find(p => p.id.toString() === item.productId);
             const customPrice = selectedProduct ? clientPrices?.find(p => p.size === selectedProduct.size)?.price : undefined;
             return (
              <div key={index} className="flex gap-4 items-end animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="flex-1 space-y-2">
                  <label className="text-xs font-medium text-slate-500">Produto</label>
                  <Select 
                    value={item.productId} 
                    onValueChange={(val) => handleUpdateItem(index, 'productId', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.filter(p => p.active).map(product => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.size} - {product.color}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-2">
                  <label className="text-xs font-medium text-slate-500">Qtd</label>
                  <Input 
                    type="number" 
                    min="1" 
                    value={item.quantity}
                    onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="w-32 space-y-2">
                  <label className="text-xs font-medium text-slate-500">Preço Unit.</label>
                  <div className="h-10 flex items-center px-3 bg-white rounded-md border text-sm font-medium">
                    R$ {customPrice || "0,00"}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="mb-0.5 text-slate-400 hover:text-red-500"
                  onClick={() => handleRemoveItem(index)}
                  disabled={items.length === 1}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4 pt-4">
        <Button variant="outline" onClick={() => setLocation("/painel/pedidos")}>
          Cancelar
        </Button>
        <Button 
          size="lg" 
          className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20"
          onClick={handleSubmit}
          disabled={createOrderMutation.isPending}
        >
          {createOrderMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {isEditing ? "Salvar Alterações" : "Confirmar Pedido"}
        </Button>
      </div>
    </div>
  );
}
