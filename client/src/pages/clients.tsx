import { useState, useEffect } from "react";
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from "@/hooks/use-clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogTrigger 
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2, Loader2, Mail, Phone, MapPin, DollarSign } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema, type InsertClient, type Client, type ClientPrice } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ClientsPage() {
  const { data: clients, isLoading } = useClients();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const filteredClients = clients?.filter(client => 
    client.nomeFantasia.toLowerCase().includes(search.toLowerCase()) ||
    client.razaoSocial.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-slate-900">Clientes</h2>
          <p className="text-slate-500">Gerencie sua base de clientes</p>
        </div>
        <Button onClick={() => { setEditingClient(null); setOpen(true); }} className="shadow-lg shadow-blue-500/20">
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <div className="flex items-center space-x-2 bg-white p-2 rounded-xl shadow-sm border border-slate-200 max-w-sm">
        <Search className="w-5 h-5 text-slate-400 ml-2" />
        <Input 
          placeholder="Buscar por nome ou razão social..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-none shadow-none focus-visible:ring-0"
        />
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
                <TableHead>Nome Fantasia</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead className="hidden md:table-cell">Localização</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    Nenhum cliente encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients?.map((client) => (
                  <TableRow key={client.id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <div className="font-medium text-slate-900">{client.nomeFantasia}</div>
                      <div className="text-xs text-slate-500">{client.razaoSocial} • {client.cnpj}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3 text-slate-400" /> {client.telefones}
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3 text-slate-400" /> {client.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {client.cidade}, {client.estado}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge 
                        variant={client.active !== false ? "default" : "secondary"}
                        className={client.active !== false ? "bg-emerald-500" : ""}
                        data-testid={`badge-client-status-${client.id}`}
                      >
                        {client.active !== false ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => { setSelectedClient(client); setPriceDialogOpen(true); }}
                          title="Preços Customizados"
                        >
                          <DollarSign className="w-4 h-4 text-emerald-500 hover:text-emerald-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setEditingClient(client); setOpen(true); }}>
                          <Pencil className="w-4 h-4 text-slate-500 hover:text-blue-600" />
                        </Button>
                        <DeleteClientDialog id={client.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <ClientDialog 
        open={open} 
        onOpenChange={setOpen} 
        client={editingClient} 
      />

      <ClientPricesDialog
        open={priceDialogOpen}
        onOpenChange={setPriceDialogOpen}
        client={selectedClient}
      />
    </div>
  );
}

const PRODUCT_SIZES = ["GRANDE", "MÉDIA", "PEQUENA", "OVAL", "PLANO"] as const;

function ClientPricesDialog({ open, onOpenChange, client }: { open: boolean, onOpenChange: (open: boolean) => void, client: Client | null }) {
  const { data: clientPrices } = useQuery<ClientPrice[]>({ 
    queryKey: [`/api/clients/${client?.id}/prices`],
    enabled: !!client 
  });

  const upsertMutation = useMutation({
    mutationFn: async ({ size, price }: { size: string, price: string }) => {
      return await apiRequest("POST", `/api/clients/${client?.id}/prices`, {
        clientId: client?.id,
        size,
        price
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${client?.id}/prices`] });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Preços por Tamanho - {client?.nomeFantasia}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {PRODUCT_SIZES.map((size) => {
            const currentPrice = clientPrices?.find(p => p.size === size)?.price || "";
            return (
              <div key={size} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                <div className="font-medium text-slate-900">{size}</div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">R$</span>
                  <Input
                    className="w-32 bg-white"
                    placeholder="Valor"
                    defaultValue={currentPrice}
                    onBlur={(e) => {
                      const value = e.target.value;
                      if (value !== currentPrice) {
                        upsertMutation.mutate({ size, price: value });
                      }
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

async function fetchCepData(cep: string) {
  const cleanCep = cep.replace(/\D/g, "");
  if (cleanCep.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}

async function fetchCnpjData(cnpj: string) {
  const cleanCnpj = cnpj.replace(/\D/g, "");
  if (cleanCnpj.length !== 14) return null;
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

function ClientDialog({ open, onOpenChange, client }: { open: boolean, onOpenChange: (open: boolean) => void, client: Client | null }) {
  const { toast } = useToast();
  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  
  const form = useForm<InsertClient>({
    resolver: zodResolver(insertClientSchema),
    defaultValues: client || {
      razaoSocial: "",
      nomeFantasia: "",
      cnpj: "",
      inscricaoEstadual: "",
      cep: "",
      logradouro: "",
      numero: "",
      bairro: "",
      cidade: "",
      estado: "",
      telefones: "",
      email: "",
      responsavel: "",
      active: true
    }
  });

  useEffect(() => {
    if (client) {
      form.reset(client);
    } else {
      form.reset({
        razaoSocial: "",
        nomeFantasia: "",
        cnpj: "",
        inscricaoEstadual: "",
        cep: "",
        logradouro: "",
        numero: "",
        bairro: "",
        cidade: "",
        estado: "",
        telefones: "",
        email: "",
        responsavel: "",
        active: true
      });
    }
  }, [client, open]);

  async function handleCepBlur(cepValue: string) {
    const cleanCep = cepValue.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;
    setLoadingCep(true);
    const data = await fetchCepData(cleanCep);
    setLoadingCep(false);
    if (data) {
      form.setValue("logradouro", data.logradouro || "");
      form.setValue("bairro", data.bairro || "");
      form.setValue("cidade", data.localidade || "");
      form.setValue("estado", data.uf || "");
      toast({ title: "Endereço preenchido automaticamente" });
    } else {
      toast({ title: "CEP não encontrado", variant: "destructive" });
    }
  }

  async function handleCnpjBlur(cnpjValue: string) {
    const cleanCnpj = cnpjValue.replace(/\D/g, "");
    if (cleanCnpj.length !== 14) return;
    setLoadingCnpj(true);
    const data = await fetchCnpjData(cleanCnpj);
    setLoadingCnpj(false);
    if (data) {
      if (data.razao_social) form.setValue("razaoSocial", data.razao_social);
      if (data.nome_fantasia) form.setValue("nomeFantasia", data.nome_fantasia);
      if (data.cep) form.setValue("cep", data.cep);
      if (data.logradouro) form.setValue("logradouro", data.logradouro);
      if (data.numero) form.setValue("numero", data.numero);
      if (data.bairro) form.setValue("bairro", data.bairro);
      if (data.municipio) form.setValue("cidade", data.municipio);
      if (data.uf) form.setValue("estado", data.uf);
      if (data.ddd_telefone_1) form.setValue("telefones", data.ddd_telefone_1.replace(/\D/g, ""));
      if (data.email && data.email.trim()) form.setValue("email", data.email.toLowerCase().trim());
      toast({ title: "Dados do CNPJ preenchidos automaticamente" });
    } else {
      toast({ title: "CNPJ não encontrado", variant: "destructive" });
    }
  }

  async function onSubmit(data: InsertClient) {
    try {
      if (client) {
        await updateMutation.mutateAsync({ id: client.id, ...data });
        toast({ title: "Cliente atualizado com sucesso" });
      } else {
        await createMutation.mutateAsync(data);
        toast({ title: "Cliente criado com sucesso" });
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast({ 
        title: "Erro ao salvar", 
        description: error instanceof Error ? error.message : "Ocorreu um erro", 
        variant: "destructive" 
      });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="00.000.000/0000-00"
                          onBlur={(e) => {
                            field.onBlur();
                            handleCnpjBlur(e.target.value);
                          }}
                          data-testid="input-cnpj"
                        />
                      </FormControl>
                      {loadingCnpj && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-2.5 text-slate-400" />}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="inscricaoEstadual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inscrição Estadual</FormLabel>
                    <FormControl><Input {...field} value={field.value || ''} data-testid="input-inscricao-estadual" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="razaoSocial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razão Social</FormLabel>
                    <FormControl><Input {...field} data-testid="input-razao-social" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nomeFantasia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Fantasia</FormLabel>
                    <FormControl><Input {...field} data-testid="input-nome-fantasia" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input {...field} type="email" data-testid="input-email" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telefones"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefones</FormLabel>
                    <FormControl><Input {...field} data-testid="input-telefones" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="responsavel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
                    <FormControl><Input {...field} data-testid="input-responsavel" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-semibold mb-3">Endereço</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''}
                            placeholder="00000-000"
                            onBlur={(e) => {
                              field.onBlur();
                              handleCepBlur(e.target.value);
                            }}
                            data-testid="input-cep"
                          />
                        </FormControl>
                        {loadingCep && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-2.5 text-slate-400" />}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="logradouro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logradouro</FormLabel>
                      <FormControl><Input {...field} data-testid="input-logradouro" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="numero"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl><Input {...field} data-testid="input-numero" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bairro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro</FormLabel>
                      <FormControl><Input {...field} value={field.value || ''} data-testid="input-bairro" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl><Input {...field} data-testid="input-cidade" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="estado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl><Input {...field} data-testid="input-estado" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {client && (
              <div className="border-t pt-4 mt-4">
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                      <div>
                        <FormLabel className="text-sm font-medium">Status do Cliente</FormLabel>
                        <p className="text-xs text-slate-500">Clientes inativos não podem fazer login no portal</p>
                      </div>
                      <FormControl>
                        <Button
                          type="button"
                          size="sm"
                          variant={field.value !== false ? "default" : "secondary"}
                          className={field.value !== false ? "bg-emerald-500" : ""}
                          data-testid="button-toggle-client-active"
                          onClick={() => field.onChange(!field.value)}
                        >
                          {field.value !== false ? "Ativo" : "Inativo"}
                        </Button>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            <Button type="submit" className="w-full mt-4" disabled={isPending} data-testid="button-save-client">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar Cliente
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteClientDialog({ id }: { id: number }) {
  const { toast } = useToast();
  const deleteMutation = useDeleteClient();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. Isso excluirá permanentemente o cliente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            className="bg-red-500 hover:bg-red-600"
            onClick={async () => {
              try {
                await deleteMutation.mutateAsync(id);
                toast({ title: "Cliente excluído" });
              } catch {
                toast({ title: "Erro ao excluir", variant: "destructive" });
              }
            }}
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
