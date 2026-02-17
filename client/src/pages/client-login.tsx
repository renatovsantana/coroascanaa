import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn, Factory } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ClientLogin() {
  const [cnpj, setCnpj] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const formatCnpj = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    let formatted = digits;
    if (digits.length > 12) formatted = digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5');
    else if (digits.length > 8) formatted = digits.replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/, '$1.$2.$3/$4');
    else if (digits.length > 5) formatted = digits.replace(/(\d{2})(\d{3})(\d{1,3})/, '$1.$2.$3');
    else if (digits.length > 2) formatted = digits.replace(/(\d{2})(\d{1,3})/, '$1.$2');
    return formatted;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cnpj || cnpj.replace(/\D/g, '').length < 14) {
      toast({ title: "Informe um CNPJ válido", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/client/login", { cnpj });
      const data = await res.json();
      queryClient.setQueryData(["/api/client/me"], data);
      setLocation("/portal");
    } catch (err: any) {
      const msg = err.message?.includes("404") 
        ? "Cliente não encontrado. Verifique o CNPJ informado." 
        : "Erro ao acessar. Tente novamente.";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-slate-200">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Factory className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-display">Portal do Cliente</CardTitle>
            <p className="text-slate-500 mt-1 text-sm">Acesse com seu CNPJ para fazer pedidos</p>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">CNPJ</label>
              <Input
                data-testid="input-cnpj"
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                className="text-center text-lg tracking-wider"
                autoFocus
              />
            </div>
            <Button
              data-testid="button-client-login"
              type="submit"
              className="w-full bg-blue-600"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
              Entrar
            </Button>
          </form>
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <a href="/login" className="text-sm text-slate-400 hover:text-blue-600 transition-colors">
              Acesso Administrativo
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
