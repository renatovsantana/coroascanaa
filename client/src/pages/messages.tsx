import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useClients } from "@/hooks/use-clients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare, Send, Loader2, CheckCheck, User, Headset
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function MessagesPage() {
  const { data: clients } = useClients();
  const { toast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [replyContent, setReplyContent] = useState("");

  const { data: allMessages, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/messages"],
  });

  const sendReplyMutation = useMutation({
    mutationFn: async ({ clientId, content }: { clientId: number; content: string }) => {
      const res = await apiRequest("POST", "/api/admin/messages", { clientId, content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages/unread"] });
      setReplyContent("");
      toast({ title: "Mensagem enviada!" });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/messages/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages/unread"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async (clientId: number) => {
      const clientMsgs = allMessages?.filter(m => m.clientId === clientId && m.direction === "client_to_admin" && !m.read) || [];
      await Promise.all(clientMsgs.map(m => apiRequest("POST", `/api/admin/messages/${m.id}/read`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages/unread"] });
    },
  });

  const clientMessageGroups = (allMessages || []).reduce((acc: Record<number, any[]>, msg) => {
    if (!acc[msg.clientId]) acc[msg.clientId] = [];
    acc[msg.clientId].push(msg);
    return acc;
  }, {});

  const clientIds = Object.keys(clientMessageGroups).map(Number);
  const activeClientId = selectedClientId ? parseInt(selectedClientId) : (clientIds.length > 0 ? clientIds[0] : null);
  const activeMessages = activeClientId ? (clientMessageGroups[activeClientId] || []) : [];
  const activeClientName = activeClientId ? clients?.find(c => c.id === activeClientId)?.nomeFantasia || `Cliente #${activeClientId}` : "";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-display font-bold text-slate-900" data-testid="text-messages-title">Mensagens</h2>
        <p className="text-slate-500 mt-1">Comunicação com clientes do portal</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : clientIds.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">Nenhuma mensagem ainda</p>
            <p className="text-slate-400 text-sm mt-1">As mensagens dos clientes aparecerão aqui</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ minHeight: "500px" }}>
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Conversas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {clientIds.map(clientId => {
                  const clientName = clients?.find(c => c.id === clientId)?.nomeFantasia || `Cliente #${clientId}`;
                  const msgs = clientMessageGroups[clientId] || [];
                  const unreadCount = msgs.filter((m: any) => m.direction === "client_to_admin" && !m.read).length;
                  const lastMsg = msgs[0];
                  const isActive = activeClientId === clientId;

                  return (
                    <button
                      key={clientId}
                      data-testid={`conversation-${clientId}`}
                      className={cn(
                        "w-full text-left px-4 py-3 transition-colors",
                        isActive ? "bg-blue-50" : "hover:bg-slate-50"
                      )}
                      onClick={() => setSelectedClientId(clientId.toString())}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("text-sm font-semibold truncate", isActive ? "text-blue-700" : "text-slate-900")}>{clientName}</span>
                        {unreadCount > 0 && (
                          <Badge className="bg-red-500 text-white text-xs">{unreadCount}</Badge>
                        )}
                      </div>
                      {lastMsg && (
                        <p className="text-xs text-slate-400 mt-1 truncate">
                          {lastMsg.direction === "admin_to_client" ? "Você: " : ""}{lastMsg.content}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3 border-b">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                <CardTitle className="text-base" data-testid="text-active-conversation">{activeClientName}</CardTitle>
              </div>
              {activeClientId && activeMessages.some((m: any) => m.direction === "client_to_admin" && !m.read) && (
                <Button
                  size="sm"
                  variant="outline"
                  data-testid="button-mark-all-read"
                  onClick={() => markAllReadMutation.mutate(activeClientId)}
                  disabled={markAllReadMutation.isPending}
                >
                  <CheckCheck className="w-3 h-3 mr-1" />
                  Marcar todas como lidas
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "400px" }}>
                {activeMessages.slice().reverse().map((msg: any) => (
                  <div
                    key={msg.id}
                    data-testid={`message-${msg.id}`}
                    className={cn(
                      "flex",
                      msg.direction === "admin_to_client" ? "justify-end" : "justify-start"
                    )}
                    onClick={() => {
                      if (msg.direction === "client_to_admin" && !msg.read) {
                        markReadMutation.mutate(msg.id);
                      }
                    }}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] rounded-lg px-4 py-2",
                        msg.direction === "admin_to_client"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-900"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {msg.direction === "client_to_admin" ? (
                          <User className="w-3 h-3 text-slate-400" />
                        ) : (
                          <Headset className="w-3 h-3 text-blue-200" />
                        )}
                        <span className={cn("text-xs font-medium", msg.direction === "admin_to_client" ? "text-blue-100" : "text-slate-500")}>
                          {msg.direction === "client_to_admin" ? "Cliente" : "Você"}
                        </span>
                        <span className={cn("text-xs", msg.direction === "admin_to_client" ? "text-blue-200" : "text-slate-400")}>
                          {new Date(msg.createdAt).toLocaleString("pt-BR")}
                        </span>
                        {msg.direction === "client_to_admin" && !msg.read && (
                          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                        )}
                      </div>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              {activeClientId && (
                <div className="p-4 border-t border-slate-100">
                  <div className="flex gap-2">
                    <Textarea
                      data-testid="input-admin-message"
                      placeholder="Digite sua mensagem..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      rows={2}
                      className="resize-none"
                    />
                    <Button
                      data-testid="button-send-admin-message"
                      className="bg-blue-600 self-end"
                      disabled={!replyContent.trim() || sendReplyMutation.isPending}
                      onClick={() => sendReplyMutation.mutate({ clientId: activeClientId, content: replyContent.trim() })}
                    >
                      {sendReplyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
