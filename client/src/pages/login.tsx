import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/painel");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        toast({ title: data.message || "Erro ao fazer login", variant: "destructive" });
        return;
      }
      window.location.href = "/painel";
    } catch {
      toast({ title: "Erro de conexão", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="fixed inset-0 z-0 opacity-10 pointer-events-none">
        <img 
          src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80" 
          alt="Industrial background"
          className="w-full h-full object-cover grayscale"
        />
      </div>

      <div className="w-full max-w-md z-10 relative">
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-600/20 rotate-3">
            <Truck className="w-10 h-10 text-white" />
          </div>
        </div>
        
        <Card className="shadow-2xl border-slate-200/60 backdrop-blur-sm bg-white/90">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-display font-bold text-slate-900">Bem-vindo</CardTitle>
            <CardDescription className="text-slate-500">
              Sistema de gestão de pedidos e viagens
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Digite seu usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  data-testid="input-username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="input-password"
                />
              </div>
              <Button 
                type="submit"
                className="w-full h-12 text-base font-semibold shadow-lg shadow-blue-600/20" 
                disabled={isSubmitting}
                data-testid="button-login"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar"}
              </Button>
            </form>
            <p className="text-center text-xs text-slate-400 mt-4">
              Acesso restrito a administradores
            </p>
            <div className="pt-2 border-t border-slate-100 mt-4">
              <a href="/portal/login" className="block text-center text-sm text-blue-600 hover:text-blue-700 transition-colors" data-testid="link-client-portal">
                Portal do Cliente
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
