import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Shield, ShieldCheck, Users, Pencil, Loader2, Plus, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ALL_MODULES, MODULE_LABELS } from "@shared/models/auth";
import type { User } from "@shared/models/auth";
import type { ModuleKey } from "@shared/models/auth";

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [editModal, setEditModal] = useState<{
    open: boolean;
    user: User | null;
    permissions: string[];
    role: string;
  }>({ open: false, user: null, permissions: [], role: "admin" });

  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    username: "",
    password: "",
    permissions: [] as string[],
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, role, permissions }: { id: string; role: string; permissions: string[] }) => {
      const res = await apiRequest("PUT", `/api/admin/users/${id}/permissions`, { role, permissions });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Permissões atualizadas" });
      setEditModal({ open: false, user: null, permissions: [], role: "admin" });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "Erro ao atualizar permissões", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { email: string; firstName: string; lastName: string; username: string; password: string; permissions: string[] }) => {
      const res = await apiRequest("POST", "/api/admin/users", { ...data, role: "admin" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Usuário criado com sucesso" });
      setCreateModal(false);
      setCreateForm({ email: "", firstName: "", lastName: "", username: "", password: "", permissions: [] });
    },
    onError: async (err: any) => {
      let message = "Erro ao criar usuário";
      try {
        if (err?.message) message = err.message;
      } catch {}
      toast({ title: message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Usuário excluído com sucesso" });
      setDeleteConfirm({ open: false, user: null });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "Erro ao excluir usuário", variant: "destructive" });
    },
  });

  const openEdit = (user: User) => {
    setEditModal({
      open: true,
      user,
      permissions: (user.permissions as string[]) || [],
      role: user.role || "admin",
    });
  };

  const togglePermission = (moduleKey: string) => {
    setEditModal(prev => {
      const perms = prev.permissions.includes(moduleKey)
        ? prev.permissions.filter(p => p !== moduleKey)
        : [...prev.permissions, moduleKey];
      return { ...prev, permissions: perms };
    });
  };

  const toggleCreatePermission = (moduleKey: string) => {
    setCreateForm(prev => {
      const perms = prev.permissions.includes(moduleKey)
        ? prev.permissions.filter(p => p !== moduleKey)
        : [...prev.permissions, moduleKey];
      return { ...prev, permissions: perms };
    });
  };

  const selectAll = () => {
    setEditModal(prev => ({ ...prev, permissions: [...ALL_MODULES] }));
  };

  const deselectAll = () => {
    setEditModal(prev => ({ ...prev, permissions: [] }));
  };

  const handleSave = () => {
    if (!editModal.user) return;
    updateMutation.mutate({
      id: editModal.user.id,
      role: editModal.role,
      permissions: editModal.permissions,
    });
  };

  const handleCreate = () => {
    if (!createForm.email || !createForm.firstName || !createForm.lastName || !createForm.username || !createForm.password) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    createMutation.mutate(createForm);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const adminUsers = (users || []).filter(u => u.role !== "global_admin");
  const globalAdmins = (users || []).filter(u => u.role === "global_admin");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-display font-bold text-slate-900" data-testid="text-page-title">
            Gerenciar Usuários
          </h2>
          <p className="text-slate-500">Controle de acesso e permissões dos administradores</p>
        </div>
        <Button onClick={() => setCreateModal(true)} data-testid="button-add-user">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Usuário
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            Administradores Globais
          </CardTitle>
          <Badge variant="outline" className="text-green-600 border-green-300">
            {globalAdmins.length}
          </Badge>
        </CardHeader>
        <CardContent>
          {globalAdmins.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Nenhum administrador global</p>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Módulos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {globalAdmins.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium" data-testid={`text-user-name-${user.id}`}>
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell className="text-slate-500" data-testid={`text-user-email-${user.id}`}>
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800 border-green-300">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        Admin Global
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-500">Acesso total</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Administradores
          </CardTitle>
          <Badge variant="outline" className="text-blue-600 border-blue-300">
            {adminUsers.length}
          </Badge>
        </CardHeader>
        <CardContent>
          {adminUsers.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">
              Nenhum administrador cadastrado. Clique em "Adicionar Usuário" para criar um novo.
            </p>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Módulos Liberados</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminUsers.map(user => {
                  const perms = (user.permissions as string[]) || [];
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium" data-testid={`text-user-name-${user.id}`}>
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell className="text-slate-500" data-testid={`text-user-email-${user.id}`}>
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {perms.length === 0 ? (
                            <span className="text-sm text-red-500">Sem acesso</span>
                          ) : perms.length === ALL_MODULES.length ? (
                            <Badge variant="outline" className="text-green-600 border-green-300">Todos</Badge>
                          ) : (
                            perms.map(p => (
                              <Badge key={p} variant="outline" className="text-xs">
                                {MODULE_LABELS[p as ModuleKey] || p}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(user)}
                            data-testid={`button-edit-user-${user.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirm({ open: true, user })}
                            className="text-red-500"
                            data-testid={`button-delete-user-${user.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editModal.open} onOpenChange={(open) => {
        if (!open) setEditModal({ open: false, user: null, permissions: [], role: "admin" });
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Permissões - {editModal.user?.firstName} {editModal.user?.lastName}
            </DialogTitle>
            <DialogDescription>
              Selecione os módulos que este usuário pode acessar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-end gap-2 flex-wrap">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll} data-testid="button-select-all">
                  Todos
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll} data-testid="button-deselect-all">
                  Nenhum
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {ALL_MODULES.map(moduleKey => {
                const isChecked = editModal.permissions.includes(moduleKey);
                return (
                  <label
                    key={moduleKey}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isChecked
                        ? "border-blue-300 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    data-testid={`checkbox-module-${moduleKey}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => togglePermission(moduleKey)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`text-sm font-medium ${isChecked ? "text-blue-700" : "text-slate-700"}`}>
                      {MODULE_LABELS[moduleKey]}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditModal({ open: false, user: null, permissions: [], role: "admin" })}
              data-testid="button-cancel-permissions"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              data-testid="button-save-permissions"
            >
              Salvar Permissões
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createModal} onOpenChange={(open) => {
        if (!open) {
          setCreateModal(false);
          setCreateForm({ email: "", firstName: "", lastName: "", username: "", password: "", permissions: [] });
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Adicionar Usuário
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do novo administrador
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-firstName">Nome *</Label>
              <Input
                id="create-firstName"
                value={createForm.firstName}
                onChange={e => setCreateForm(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="Nome"
                data-testid="input-create-firstname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-lastName">Sobrenome *</Label>
              <Input
                id="create-lastName"
                value={createForm.lastName}
                onChange={e => setCreateForm(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="Sobrenome"
                data-testid="input-create-lastname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">Email *</Label>
              <Input
                id="create-email"
                type="email"
                value={createForm.email}
                onChange={e => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
                data-testid="input-create-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-username">Usuário (login) *</Label>
              <Input
                id="create-username"
                value={createForm.username}
                onChange={e => setCreateForm(prev => ({ ...prev, username: e.target.value }))}
                placeholder="nome.usuario"
                data-testid="input-create-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Senha *</Label>
              <Input
                id="create-password"
                type="password"
                value={createForm.password}
                onChange={e => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
                data-testid="input-create-password"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label>Permissões</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateForm(prev => ({ ...prev, permissions: [...ALL_MODULES] }))}
                    data-testid="button-create-select-all"
                  >
                    Todos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateForm(prev => ({ ...prev, permissions: [] }))}
                    data-testid="button-create-deselect-all"
                  >
                    Nenhum
                  </Button>
                </div>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {ALL_MODULES.map(moduleKey => {
                  const isChecked = createForm.permissions.includes(moduleKey);
                  return (
                    <label
                      key={moduleKey}
                      className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                        isChecked
                          ? "border-blue-300 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                      data-testid={`checkbox-create-module-${moduleKey}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCreatePermission(moduleKey)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`text-sm font-medium ${isChecked ? "text-blue-700" : "text-slate-700"}`}>
                        {MODULE_LABELS[moduleKey]}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCreateModal(false);
                setCreateForm({ email: "", firstName: "", lastName: "", username: "", password: "", permissions: [] });
              }}
              data-testid="button-cancel-create"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              data-testid="button-confirm-create"
            >
              {createMutation.isPending ? "Criando..." : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => {
        if (!open) setDeleteConfirm({ open: false, user: null });
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{deleteConfirm.user?.firstName} {deleteConfirm.user?.lastName}</strong> ({deleteConfirm.user?.email})? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (deleteConfirm.user && !deleteMutation.isPending) {
                  deleteMutation.mutate(deleteConfirm.user.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
