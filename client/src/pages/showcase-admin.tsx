import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useUpload } from "@/hooks/use-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import {
  Plus, Pencil, Trash2, Loader2, Flower2, Upload,
  Eye, EyeOff, ExternalLink, ImageIcon, Settings, Layers, Save, Phone, MapPin, MessageCircle, FileText, Image,
  Mail, User, Clock, CheckCircle, Inbox, Globe, BarChart3, AlertTriangle, CheckCircle2, XCircle, TrendingUp, Info,
  Palette, Target
} from "lucide-react";
import { SiInstagram } from "react-icons/si";
import type { ShowcaseProduct, HeroSlide, ContactSubmission } from "@shared/schema";

const SHOWCASE_SIZES = [
  { value: "GRANDE", label: "Grande" },
  { value: "MÉDIA", label: "Média" },
  { value: "PEQUENA", label: "Pequena" },
  { value: "OVAL", label: "Oval" },
  { value: "PLANO", label: "Plano" },
];

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['link'],
    ['clean']
  ]
};

const quillFormats = [
  'header', 'bold', 'italic', 'underline',
  'list', 'align', 'link'
];

function ImageUploadField({ value, onChange, label, testId }: { value: string; onChange: (v: string) => void; label: string; testId: string }) {
  const { toast } = useToast();
  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      onChange(response.objectPath);
      toast({ title: "Imagem enviada com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao enviar imagem", description: error.message, variant: "destructive" });
    }
  });

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Selecione apenas imagens", variant: "destructive" });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "Imagem muito grande (máx. 10MB)", variant: "destructive" });
        return;
      }
      uploadFile(file);
    }
  }

  return (
    <div>
      <label className="text-sm font-medium text-slate-700 mb-1 block">{label}</label>
      <div className="flex items-start gap-3">
        <div className="w-24 h-24 bg-slate-100 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-200">
          {value ? (
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-8 h-8 text-slate-300" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <label className="cursor-pointer">
            <input type="file" accept="image/*" onChange={handleFile} className="hidden" data-testid={testId} />
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={isUploading} asChild>
                <span>
                  {isUploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                  {isUploading ? "Enviando..." : "Enviar imagem"}
                </span>
              </Button>
              {value && (
                <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")} data-testid={`${testId}-remove`}>
                  <Trash2 className="w-3 h-3 mr-1" />
                  Remover
                </Button>
              )}
            </div>
          </label>
          {value && <p className="text-xs text-slate-500 truncate max-w-[200px]">{value}</p>}
        </div>
      </div>
    </div>
  );
}

function SiteSettingsTab() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/admin/site-settings"],
  });

  const [logo, setLogo] = useState("");
  const [footerLogo, setFooterLogo] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [aboutText, setAboutText] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [mission, setMission] = useState("");
  const [vision, setVision] = useState("");
  const [values, setValues] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#059669");

  useEffect(() => {
    if (settings) {
      setLogo(settings.logo || "");
      setFooterLogo(settings.footerLogo || "");
      setPhone(settings.phone || "");
      setWhatsapp(settings.whatsapp || "");
      setAddress(settings.address || "");
      setAboutText(settings.aboutText || "");
      setEmail(settings.email || "");
      setInstagram(settings.instagram || "");
      setMission(settings.mission || "");
      setVision(settings.vision || "");
      setValues(settings.values || "");
      setPrimaryColor(settings.primaryColor || "#059669");
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/admin/site-settings", {
        logo, footerLogo, phone, whatsapp, address, aboutText, email, instagram,
        mission, vision, values, primaryColor
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/site-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vitrine/settings"] });
      toast({ title: "Configurações salvas com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao salvar configurações", variant: "destructive" });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Image className="w-5 h-5" />
            Logo do Site
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUploadField value={logo} onChange={setLogo} label="Logo" testId="input-logo-upload" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Image className="w-5 h-5" />
            Logo do Rodapé
          </CardTitle>
          <p className="text-sm text-slate-500">Logo branca/alternativa para exibir no rodapé do site (fundo escuro)</p>
        </CardHeader>
        <CardContent>
          <ImageUploadField value={footerLogo} onChange={setFooterLogo} label="Logo do Rodapé" testId="input-footer-logo-upload" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="w-5 h-5" />
            Cor Principal do Site
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-12 h-10 rounded-md border border-slate-200 cursor-pointer"
              data-testid="input-primary-color"
            />
            <Input
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#059669"
              className="w-32"
              data-testid="input-primary-color-text"
            />
            <div className="flex items-center gap-2">
              <div
                className="px-3 py-1.5 rounded-md text-white text-sm font-medium"
                style={{ backgroundColor: primaryColor }}
                data-testid="preview-primary-color"
              >
                Exemplo
              </div>
              <div
                className="px-3 py-1.5 rounded-md text-sm font-medium border"
                style={{ color: primaryColor, borderColor: primaryColor }}
              >
                Outline
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400">Escolha a cor principal que será usada no site da vitrine.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Phone className="w-5 h-5" />
            Informações de Contato
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Telefone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(38) 3333-3333" data-testid="input-phone" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">WhatsApp</label>
              <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(38) 99907-2903" data-testid="input-whatsapp" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                <Mail className="w-4 h-4 inline mr-1" />
                E-mail
              </label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@empresa.com" data-testid="input-email" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                <SiInstagram className="w-4 h-4 inline mr-1" />
                Instagram
              </label>
              <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@suaempresa" data-testid="input-instagram" />
              <p className="text-xs text-slate-400 mt-1">Nome de usuário do Instagram (ex: @coroascanaa)</p>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              <MapPin className="w-4 h-4 inline mr-1" />
              Endereço
            </label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua Exemplo, 123 - Centro, Cidade - MG" data-testid="input-address" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5" />
            Texto "Sobre Nós"
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="quill-editor-container" data-testid="input-about-text">
            <ReactQuill
              theme="snow"
              value={aboutText}
              onChange={setAboutText}
              modules={quillModules}
              formats={quillFormats}
              placeholder="Escreva aqui o texto da página 'Sobre' do seu site..."
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">Este texto será exibido na página "Sobre" do site.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5" />
            Missão, Visão e Valores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Missão</label>
            <Textarea
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              placeholder="Qual é a missão da sua empresa?"
              data-testid="textarea-mission"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Visão</label>
            <Textarea
              value={vision}
              onChange={(e) => setVision(e.target.value)}
              placeholder="Qual é a visão da empresa para o futuro?"
              data-testid="textarea-vision"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Valores</label>
            <Textarea
              value={values}
              onChange={(e) => setValues(e.target.value)}
              placeholder="Quais são os valores da empresa?"
              data-testid="textarea-values"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          data-testid="button-save-settings"
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}

function HeroSlidesTab() {
  const { toast } = useToast();
  const { data: slides, isLoading } = useQuery<HeroSlide[]>({
    queryKey: ["/api/admin/slides"],
  });

  const [showDialog, setShowDialog] = useState(false);
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);
  const [deletingSlide, setDeletingSlide] = useState<HeroSlide | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formSubtitle, setFormSubtitle] = useState("");
  const [formButtonText, setFormButtonText] = useState("");
  const [formButtonLink, setFormButtonLink] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formActive, setFormActive] = useState(true);

  function resetForm() {
    setFormTitle("");
    setFormSubtitle("");
    setFormButtonText("");
    setFormButtonLink("");
    setFormImageUrl("");
    setFormSortOrder(0);
    setFormActive(true);
  }

  function openCreate() {
    resetForm();
    setEditingSlide(null);
    setShowDialog(true);
  }

  function openEdit(slide: HeroSlide) {
    setFormTitle(slide.title);
    setFormSubtitle(slide.subtitle || "");
    setFormButtonText(slide.buttonText || "");
    setFormButtonLink(slide.buttonLink || "");
    setFormImageUrl(slide.imageUrl || "");
    setFormSortOrder(slide.sortOrder || 0);
    setFormActive(slide.active !== false);
    setEditingSlide(slide);
    setShowDialog(true);
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/slides", {
        title: formTitle, subtitle: formSubtitle || null,
        buttonText: formButtonText || null, buttonLink: formButtonLink || null,
        imageUrl: formImageUrl || null, sortOrder: formSortOrder, active: formActive
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/slides"] });
      setShowDialog(false);
      setEditingSlide(null);
      toast({ title: "Slide criado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao criar slide", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingSlide) return;
      await apiRequest("PUT", `/api/admin/slides/${editingSlide.id}`, {
        title: formTitle, subtitle: formSubtitle || null,
        buttonText: formButtonText || null, buttonLink: formButtonLink || null,
        imageUrl: formImageUrl || null, sortOrder: formSortOrder, active: formActive
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/slides"] });
      setShowDialog(false);
      setEditingSlide(null);
      toast({ title: "Slide atualizado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar slide", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/slides/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/slides"] });
      setDeletingSlide(null);
      toast({ title: "Slide excluído com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir slide", variant: "destructive" });
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      await apiRequest("PUT", `/api/admin/slides/${id}`, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/slides"] });
    }
  });

  const isDialogOpen = showDialog;
  const isEditing = !!editingSlide;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">Gerencie as imagens e textos do carrossel principal do site</p>
        <Button onClick={openCreate} data-testid="button-create-slide">
          <Plus className="w-4 h-4 mr-1" />
          Novo Slide
        </Button>
      </div>

      {(!slides || slides.length === 0) ? (
        <Card>
          <CardContent className="text-center py-16">
            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-2">Nenhum slide cadastrado</p>
            <p className="text-xs text-slate-400">Adicione slides para o carrossel da página inicial</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {slides.map((slide) => (
            <Card key={slide.id} data-testid={`slide-card-${slide.id}`}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="w-40 h-24 bg-slate-100 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-200">
                    {slide.imageUrl ? (
                      <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <h4 className="font-medium text-sm text-slate-900">{slide.title}</h4>
                        {slide.subtitle && <p className="text-xs text-slate-500 mt-0.5">{slide.subtitle}</p>}
                        {slide.buttonText && (
                          <p className="text-xs text-slate-400 mt-1">
                            Botão: "{slide.buttonText}" {slide.buttonLink && `→ ${slide.buttonLink}`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant={slide.active ? "default" : "secondary"} className="text-xs">
                          {slide.active ? "Ativo" : "Inativo"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">#{slide.sortOrder || 0}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-3">
                      <Button variant="ghost" size="icon" onClick={() => toggleMutation.mutate({ id: slide.id, active: !slide.active })} data-testid={`button-toggle-slide-${slide.id}`}>
                        {slide.active ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(slide)} data-testid={`button-edit-slide-${slide.id}`}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeletingSlide(slide)} data-testid={`button-delete-slide-${slide.id}`}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) { setShowDialog(false); setEditingSlide(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Slide" : "Novo Slide"}</DialogTitle>
            <DialogDescription>{isEditing ? "Atualize as informações do slide" : "Adicione um novo slide ao carrossel"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Título *</label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Ex: Coroas e Flores com Qualidade" data-testid="input-slide-title" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Subtítulo</label>
              <Input value={formSubtitle} onChange={(e) => setFormSubtitle(e.target.value)} placeholder="Ex: Tradição e respeito em cada homenagem" data-testid="input-slide-subtitle" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Texto do Botão</label>
                <Input value={formButtonText} onChange={(e) => setFormButtonText(e.target.value)} placeholder="Ex: Ver Produtos" data-testid="input-slide-button-text" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Link do Botão</label>
                <Input value={formButtonLink} onChange={(e) => setFormButtonLink(e.target.value)} placeholder="Ex: /vitrine/produtos" data-testid="input-slide-button-link" />
              </div>
            </div>
            <ImageUploadField value={formImageUrl} onChange={setFormImageUrl} label="Imagem do Slide (recomendado: 1920x600)" testId="input-slide-image" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Ordem</label>
                <Input type="number" value={formSortOrder} onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)} data-testid="input-slide-order" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Status</label>
                <Select value={formActive ? "active" : "inactive"} onValueChange={(v) => setFormActive(v === "active")}>
                  <SelectTrigger data-testid="select-slide-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setShowDialog(false); setEditingSlide(null); }} data-testid="button-cancel-slide">Cancelar</Button>
            <Button
              onClick={() => isEditing ? updateMutation.mutate() : createMutation.mutate()}
              disabled={!formTitle || (isEditing ? updateMutation.isPending : createMutation.isPending)}
              data-testid="button-save-slide"
            >
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              {isEditing ? "Salvar Alterações" : "Criar Slide"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingSlide} onOpenChange={(open) => !open && setDeletingSlide(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Slide</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir o slide "{deletingSlide?.title}"? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingSlide && deleteMutation.mutate(deletingSlide.id)} data-testid="button-confirm-delete-slide">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProductsTab() {
  const { toast } = useToast();
  const { data: products, isLoading } = useQuery<ShowcaseProduct[]>({
    queryKey: ["/api/admin/showcase"],
  });

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ShowcaseProduct | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<ShowcaseProduct | null>(null);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState<string>("GRANDE");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formSortOrder, setFormSortOrder] = useState(0);

  function resetForm() {
    setFormName("");
    setFormDescription("");
    setFormCategory("GRANDE");
    setFormImageUrl("");
    setFormActive(true);
    setFormSortOrder(0);
  }

  function openCreate() {
    resetForm();
    setShowCreateDialog(true);
  }

  function openEdit(product: ShowcaseProduct) {
    setFormName(product.name);
    setFormDescription(product.description || "");
    setFormCategory(product.category);
    setFormImageUrl(product.imageUrl || "");
    setFormActive(product.active !== false);
    setFormSortOrder(product.sortOrder || 0);
    setEditingProduct(product);
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/showcase", {
        name: formName, description: formDescription || null,
        category: formCategory, imageUrl: formImageUrl || null,
        active: formActive, sortOrder: formSortOrder
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/showcase"] });
      setShowCreateDialog(false);
      toast({ title: "Produto criado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao criar produto", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingProduct) return;
      await apiRequest("PUT", `/api/admin/showcase/${editingProduct.id}`, {
        name: formName, description: formDescription || null,
        category: formCategory, imageUrl: formImageUrl || null,
        active: formActive, sortOrder: formSortOrder
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/showcase"] });
      setEditingProduct(null);
      toast({ title: "Produto atualizado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar produto", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/showcase/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/showcase"] });
      setDeletingProduct(null);
      toast({ title: "Produto excluído com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir produto", variant: "destructive" });
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      await apiRequest("PUT", `/api/admin/showcase/${id}`, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/showcase"] });
    }
  });

  function getSizeLabel(category: string) {
    return SHOWCASE_SIZES.find(s => s.value === category)?.label || category;
  }

  const productFormContent = (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1 block">Nome *</label>
        <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Coroa Grande Luxo Artificial" data-testid="input-showcase-name" />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1 block">Tamanho *</label>
        <Select value={formCategory} onValueChange={setFormCategory}>
          <SelectTrigger data-testid="select-showcase-category">
            <SelectValue placeholder="Selecione o tamanho" />
          </SelectTrigger>
          <SelectContent>
            {SHOWCASE_SIZES.map((size) => (
              <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1 block">Descrição</label>
        <div className="quill-editor-container" data-testid="input-showcase-description">
          <ReactQuill
            theme="snow"
            value={formDescription}
            onChange={setFormDescription}
            modules={quillModules}
            formats={quillFormats}
            placeholder="Descrição opcional do produto..."
          />
        </div>
      </div>
      <ImageUploadField value={formImageUrl} onChange={setFormImageUrl} label="Imagem" testId="input-showcase-image" />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Ordem de exibição</label>
          <Input type="number" value={formSortOrder} onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)} data-testid="input-showcase-order" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Status</label>
          <Select value={formActive ? "active" : "inactive"} onValueChange={(v) => setFormActive(v === "active")}>
            <SelectTrigger data-testid="select-showcase-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">Gerencie os produtos exibidos no catálogo do site</p>
        <Button onClick={openCreate} data-testid="button-create-showcase">
          <Plus className="w-4 h-4 mr-1" />
          Novo Produto
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {(!products || products.length === 0) ? (
            <div className="text-center py-16">
              <Flower2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 mb-2">Nenhum produto na vitrine</p>
              <p className="text-xs text-slate-400">Adicione produtos para exibir no site</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Imagem</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ordem</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id} data-testid={`showcase-row-${product.id}`}>
                      <TableCell>
                        <div className="w-12 h-12 bg-slate-100 rounded-md overflow-hidden flex items-center justify-center">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Flower2 className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell><span className="font-medium text-sm">{product.name}</span></TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {getSizeLabel(product.category)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => toggleActiveMutation.mutate({ id: product.id, active: !product.active })} data-testid={`button-toggle-${product.id}`}>
                          {product.active ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                        </Button>
                      </TableCell>
                      <TableCell><span className="text-sm text-slate-500">{product.sortOrder || 0}</span></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(product)} data-testid={`button-edit-${product.id}`}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeletingProduct(product)} data-testid={`button-delete-${product.id}`}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Produto da Vitrine</DialogTitle>
            <DialogDescription>Adicione um produto para exibir no site</DialogDescription>
          </DialogHeader>
          {productFormContent}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!formName || createMutation.isPending}
              data-testid="button-save-showcase"
            >
              {createMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              Criar Produto
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
            <DialogDescription>Atualize as informações do produto da vitrine</DialogDescription>
          </DialogHeader>
          {productFormContent}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditingProduct(null)}>Cancelar</Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={!formName || updateMutation.isPending}
              data-testid="button-update-showcase"
            >
              {updateMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingProduct} onOpenChange={(open) => !open && setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deletingProduct?.name}" da vitrine? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingProduct && deleteMutation.mutate(deletingProduct.id)}
              data-testid="button-confirm-delete"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SeoSettingsTab() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/admin/site-settings"],
  });

  const [siteUrl, setSiteUrl] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [ogImage, setOgImage] = useState("");

  useEffect(() => {
    if (settings) {
      setSiteUrl(settings.siteUrl || "");
      setSeoTitle(settings.seoTitle || "");
      setSeoDescription(settings.seoDescription || "");
      setSeoKeywords(settings.seoKeywords || "");
      setOgImage(settings.ogImage || "");
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/admin/site-settings", {
        siteUrl, seoTitle, seoDescription, seoKeywords, ogImage
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/site-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vitrine/settings"] });
      toast({ title: "Configurações de SEO salvas com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao salvar configurações de SEO", variant: "destructive" });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="w-5 h-5" />
            Título e Descrição (SEO)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">URL do Site (para URLs canônicas e sitemap)</label>
            <Input
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="https://seusite.com.br"
              data-testid="input-site-url"
            />
            <p className="text-xs text-slate-400 mt-1">URL completa do site. Usado para gerar URLs canônicas, sitemap e dados estruturados.</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Título do Site (Meta Title)</label>
            <Input
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder="Coroas Canaã - Coroas Fúnebres de Qualidade"
              data-testid="input-seo-title"
              maxLength={70}
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-slate-400">Aparece na aba do navegador e nos resultados do Google</p>
              <span className={`text-xs ${seoTitle.length > 60 ? "text-amber-500" : "text-slate-400"}`}>{seoTitle.length}/70</span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Descrição (Meta Description)</label>
            <Textarea
              value={seoDescription}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSeoDescription(e.target.value)}
              placeholder="Coroas fúnebres de qualidade para todo o Brasil. Coroas naturais desidratadas e artificiais com entrega rápida."
              data-testid="input-seo-description"
              rows={3}
              maxLength={160}
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-slate-400">Descrição exibida nos resultados de busca</p>
              <span className={`text-xs ${seoDescription.length > 150 ? "text-amber-500" : "text-slate-400"}`}>{seoDescription.length}/160</span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Palavras-chave (Keywords)</label>
            <Input
              value={seoKeywords}
              onChange={(e) => setSeoKeywords(e.target.value)}
              placeholder="coroas fúnebres, coroas para funeral, coroas naturais, coroas artificiais"
              data-testid="input-seo-keywords"
            />
            <p className="text-xs text-slate-400 mt-1">Separe as palavras-chave por vírgulas</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Image className="w-5 h-5" />
            Imagem de Compartilhamento (Open Graph)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUploadField value={ogImage} onChange={setOgImage} label="Imagem OG" testId="input-og-image" />
          <p className="text-xs text-slate-400 mt-2">Imagem exibida ao compartilhar o site em redes sociais (recomendado: 1200x630px)</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="w-5 h-5" />
            Pré-visualização no Google
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-white border border-slate-200 rounded-md p-4 max-w-xl">
            <p className="text-blue-700 text-lg leading-tight truncate">
              {seoTitle || "Coroas Canaã - Coroas Fúnebres"}
            </p>
            <p className="text-green-700 text-xs mt-0.5 truncate">
              {siteUrl ? `${siteUrl.replace(/^https?:\/\//, '')}/vitrine` : 'seusite.com.br/vitrine'}
            </p>
            <p className="text-sm text-slate-600 mt-1 line-clamp-2">
              {seoDescription || "Sem descrição definida. Adicione uma descrição para melhorar a aparência nos resultados de busca."}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          data-testid="button-save-seo"
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar SEO
        </Button>
      </div>
    </div>
  );
}

function SeoReportTab() {
  const { data: settings, isLoading: settingsLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/admin/site-settings"],
  });
  const { data: products } = useQuery<ShowcaseProduct[]>({
    queryKey: ["/api/admin/showcase-products"],
  });
  const { data: slides } = useQuery<HeroSlide[]>({
    queryKey: ["/api/admin/slides"],
  });

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const checks: { label: string; status: "ok" | "warning" | "error"; detail: string }[] = [];

  if (settings?.seoTitle && settings.seoTitle.length >= 10) {
    checks.push({ label: "Meta Título", status: settings.seoTitle.length <= 60 ? "ok" : "warning", detail: settings.seoTitle.length <= 60 ? `Definido (${settings.seoTitle.length} caracteres)` : `Muito longo (${settings.seoTitle.length}/60 caracteres). Reduza para melhor exibição.` });
  } else {
    checks.push({ label: "Meta Título", status: "error", detail: "Não definido. Adicione um título nas configurações de SEO." });
  }

  if (settings?.seoDescription && settings.seoDescription.length >= 50) {
    checks.push({ label: "Meta Descrição", status: settings.seoDescription.length <= 150 ? "ok" : "warning", detail: settings.seoDescription.length <= 150 ? `Definida (${settings.seoDescription.length} caracteres)` : `Longa (${settings.seoDescription.length}/160). Considere reduzir.` });
  } else {
    checks.push({ label: "Meta Descrição", status: settings?.seoDescription ? "warning" : "error", detail: settings?.seoDescription ? `Muito curta (${settings.seoDescription.length} caracteres). Recomendamos ao menos 50 caracteres.` : "Não definida. Adicione uma descrição nas configurações de SEO." });
  }

  if (settings?.seoKeywords && settings.seoKeywords.split(",").filter(k => k.trim()).length >= 3) {
    checks.push({ label: "Palavras-chave", status: "ok", detail: `${settings.seoKeywords.split(",").filter(k => k.trim()).length} palavras-chave definidas` });
  } else {
    checks.push({ label: "Palavras-chave", status: settings?.seoKeywords ? "warning" : "error", detail: settings?.seoKeywords ? "Poucas palavras-chave. Recomendamos ao menos 3." : "Não definidas. Adicione palavras-chave nas configurações de SEO." });
  }

  if (settings?.ogImage) {
    checks.push({ label: "Imagem Open Graph", status: "ok", detail: "Imagem definida para compartilhamento" });
  } else {
    checks.push({ label: "Imagem Open Graph", status: "warning", detail: "Sem imagem. Adicione uma imagem para melhor aparência ao compartilhar." });
  }

  if (settings?.logo) {
    checks.push({ label: "Logo do Site", status: "ok", detail: "Logo definido" });
  } else {
    checks.push({ label: "Logo do Site", status: "warning", detail: "Sem logo. Adicione um logo para identidade visual." });
  }

  if (settings?.phone || settings?.whatsapp) {
    checks.push({ label: "Informações de Contato", status: "ok", detail: "Telefone/WhatsApp configurado" });
  } else {
    checks.push({ label: "Informações de Contato", status: "error", detail: "Sem telefone ou WhatsApp. Essencial para o negócio." });
  }

  if (settings?.address) {
    checks.push({ label: "Endereço", status: "ok", detail: "Endereço definido (ajuda no SEO local)" });
  } else {
    checks.push({ label: "Endereço", status: "warning", detail: "Sem endereço. Importante para SEO local." });
  }

  const productCount = products?.length || 0;
  const productsWithImages = products?.filter(p => p.imageUrl).length || 0;
  const productsWithDescriptions = products?.filter(p => p.description && p.description.length > 20).length || 0;

  if (productCount > 0) {
    checks.push({ label: "Produtos Cadastrados", status: productCount >= 5 ? "ok" : "warning", detail: `${productCount} produto(s). ${productCount < 5 ? "Recomendamos ao menos 5 para um catálogo completo." : "Bom volume de produtos."}` });
  } else {
    checks.push({ label: "Produtos Cadastrados", status: "error", detail: "Nenhum produto cadastrado. Adicione produtos ao catálogo." });
  }

  if (productCount > 0) {
    const imgPercent = Math.round((productsWithImages / productCount) * 100);
    checks.push({ label: "Imagens de Produtos", status: imgPercent >= 80 ? "ok" : imgPercent >= 50 ? "warning" : "error", detail: `${productsWithImages}/${productCount} produtos com imagem (${imgPercent}%). ${imgPercent < 80 ? "Adicione imagens aos produtos restantes." : ""}` });
  }

  if (productCount > 0) {
    const descPercent = Math.round((productsWithDescriptions / productCount) * 100);
    checks.push({ label: "Descrições de Produtos", status: descPercent >= 70 ? "ok" : descPercent >= 40 ? "warning" : "error", detail: `${productsWithDescriptions}/${productCount} produtos com descrição detalhada (${descPercent}%). ${descPercent < 70 ? "Descrições ajudam no SEO." : ""}` });
  }

  const activeSlides = slides?.filter(s => s.active).length || 0;
  if (activeSlides > 0) {
    checks.push({ label: "Hero Slides", status: "ok", detail: `${activeSlides} slide(s) ativo(s)` });
  } else {
    checks.push({ label: "Hero Slides", status: "warning", detail: "Nenhum slide ativo. Slides melhoram a experiência visual." });
  }

  if (settings?.aboutText && settings.aboutText.length > 50) {
    checks.push({ label: "Texto Sobre Nós", status: "ok", detail: "Texto definido com conteúdo relevante" });
  } else {
    checks.push({ label: "Texto Sobre Nós", status: settings?.aboutText ? "warning" : "error", detail: settings?.aboutText ? "Texto muito curto. Expanda a história da empresa." : "Sem texto. Adicione informações sobre a empresa." });
  }

  if (settings?.instagram) {
    checks.push({ label: "Redes Sociais", status: "ok", detail: "Instagram configurado" });
  } else {
    checks.push({ label: "Redes Sociais", status: "warning", detail: "Sem Instagram. Redes sociais ajudam na presença online." });
  }

  if (settings?.email) {
    checks.push({ label: "E-mail de Contato", status: "ok", detail: "E-mail configurado" });
  } else {
    checks.push({ label: "E-mail de Contato", status: "warning", detail: "Sem e-mail. Adicione um e-mail para contato profissional." });
  }

  if (settings?.siteUrl) {
    checks.push({ label: "URL do Site", status: "ok", detail: "URL configurada para URLs canônicas e sitemap" });
  } else {
    checks.push({ label: "URL do Site", status: "warning", detail: "Sem URL do site. Configure para gerar URLs canônicas e sitemap corretamente." });
  }

  checks.push({ label: "Sitemap XML", status: "ok", detail: "Gerado automaticamente em /sitemap.xml" });
  checks.push({ label: "Robots.txt", status: "ok", detail: "Configurado automaticamente em /robots.txt" });
  checks.push({ label: "Dados Estruturados", status: "ok", detail: "Schema.org Organization gerado automaticamente" });

  if (productCount > 0) {
    const productsWithoutImage = productCount - productsWithImages;
    if (productsWithoutImage > 0) {
      checks.push({
        label: "Alt-text de Imagens",
        status: productsWithoutImage > Math.floor(productCount / 2) ? "error" : "warning",
        detail: `${productsWithoutImage} produto(s) sem imagem. O alt-text é gerado automaticamente a partir do nome do produto, mas a imagem precisa estar presente.`
      });
    } else {
      checks.push({ label: "Alt-text de Imagens", status: "ok", detail: "Todos os produtos possuem imagem com alt-text automático." });
    }
  }

  const slidesWithoutImage = slides?.filter(s => s.active && !s.imageUrl).length || 0;
  if (slidesWithoutImage > 0) {
    checks.push({
      label: "Imagens dos Slides",
      status: "warning",
      detail: `${slidesWithoutImage} slide(s) ativo(s) sem imagem. Adicione imagens para melhor impacto visual.`
    });
  }

  const okCount = checks.filter(c => c.status === "ok").length;
  const warningCount = checks.filter(c => c.status === "warning").length;
  const errorCount = checks.filter(c => c.status === "error").length;
  const totalScore = Math.round((okCount / checks.length) * 100);

  function StatusIcon({ status }: { status: "ok" | "warning" | "error" }) {
    if (status === "ok") return <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />;
    if (status === "warning") return <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />;
    return <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5" />
            Pontuação SEO
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 flex-wrap">
            <div className="relative w-28 h-28">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100" />
                <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray={`${totalScore * 3.27} 327`} strokeLinecap="round" className={totalScore >= 70 ? "text-green-500" : totalScore >= 40 ? "text-amber-500" : "text-red-500"} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-2xl font-bold ${totalScore >= 70 ? "text-green-600" : totalScore >= 40 ? "text-amber-600" : "text-red-600"}`}>{totalScore}%</span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm text-slate-700">{okCount} itens corretos</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-slate-700">{warningCount} avisos</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-slate-700">{errorCount} problemas</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5" />
            Relatório Detalhado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {checks.map((check, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0" data-testid={`seo-check-${i}`}>
                <StatusIcon status={check.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{check.label}</p>
                  <p className="text-xs text-slate-500">{check.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="w-5 h-5" />
            Dicas de Otimização
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-slate-600">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-md bg-emerald-100 flex-shrink-0 mt-0.5">
                <Globe className="w-3.5 h-3.5 text-emerald-700" />
              </div>
              <div>
                <p className="font-medium text-slate-800">Título e Descrição</p>
                <p>Mantenha o título entre 30-60 caracteres e a descrição entre 120-155 caracteres para melhor exibição nos resultados de busca.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-md bg-emerald-100 flex-shrink-0 mt-0.5">
                <Image className="w-3.5 h-3.5 text-emerald-700" />
              </div>
              <div>
                <p className="font-medium text-slate-800">Imagens</p>
                <p>Adicione imagens a todos os produtos. Imagens de alta qualidade aumentam o engajamento e melhoram o SEO.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-md bg-emerald-100 flex-shrink-0 mt-0.5">
                <FileText className="w-3.5 h-3.5 text-emerald-700" />
              </div>
              <div>
                <p className="font-medium text-slate-800">Conteúdo</p>
                <p>Descrições detalhadas dos produtos e um texto "Sobre Nós" completo ajudam os mecanismos de busca a entender seu negócio.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-md bg-emerald-100 flex-shrink-0 mt-0.5">
                <SiInstagram className="w-3.5 h-3.5 text-emerald-700" />
              </div>
              <div>
                <p className="font-medium text-slate-800">Redes Sociais</p>
                <p>Configure a imagem Open Graph e mantenha o Instagram atualizado. Compartilhamentos em redes sociais geram tráfego e autoridade.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ContactSubmissionsTab() {
  const { toast } = useToast();
  const { data: submissions, isLoading } = useQuery<ContactSubmission[]>({
    queryKey: ["/api/admin/contact-submissions"],
  });

  const [viewingSubmission, setViewingSubmission] = useState<ContactSubmission | null>(null);
  const [deletingSubmission, setDeletingSubmission] = useState<ContactSubmission | null>(null);

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PUT", `/api/admin/contact-submissions/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contact-submissions"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/contact-submissions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contact-submissions"] });
      setDeletingSubmission(null);
      setViewingSubmission(null);
      toast({ title: "Mensagem excluída com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir mensagem", variant: "destructive" });
    }
  });

  function openSubmission(submission: ContactSubmission) {
    setViewingSubmission(submission);
    if (!submission.read) {
      markReadMutation.mutate(submission.id);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const unreadCount = submissions?.filter(s => !s.read).length || 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">
          {submissions?.length || 0} mensagens recebidas
          {unreadCount > 0 && <Badge variant="destructive" className="ml-2 text-xs">{unreadCount} não lidas</Badge>}
        </p>
      </div>

      {(!submissions || submissions.length === 0) ? (
        <Card>
          <CardContent className="text-center py-16">
            <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-2">Nenhuma mensagem de contato recebida</p>
            <p className="text-xs text-slate-400">As mensagens enviadas pelo formulário de contato do site aparecerão aqui</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {submissions.map((submission) => (
            <Card
              key={submission.id}
              className="cursor-pointer hover-elevate"
              onClick={() => openSubmission(submission)}
              data-testid={`contact-card-${submission.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {!submission.read && (
                        <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                      )}
                      <span className={`text-sm font-medium ${!submission.read ? "text-slate-900" : "text-slate-600"}`}>
                        {submission.name}
                      </span>
                      {!submission.read && (
                        <Badge variant="default" className="text-[10px]">Nova</Badge>
                      )}
                    </div>
                    <p className={`text-sm ${!submission.read ? "font-medium text-slate-800" : "text-slate-600"}`}>
                      {submission.subject}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 truncate">{submission.message}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(submission.createdAt as any)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); setDeletingSubmission(submission); }}
                      data-testid={`button-delete-contact-${submission.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                {(submission.phone || submission.email) && (
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    {submission.phone && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {submission.phone}
                      </span>
                    )}
                    {submission.email && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {submission.email}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!viewingSubmission} onOpenChange={(open) => !open && setViewingSubmission(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
              {viewingSubmission?.subject}
            </DialogTitle>
            <DialogDescription>
              Mensagem de {viewingSubmission?.name} - {viewingSubmission?.createdAt && formatDate(viewingSubmission.createdAt as any)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">{viewingSubmission?.name}</span>
              </div>
              {viewingSubmission?.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">{viewingSubmission.phone}</span>
                </div>
              )}
              {viewingSubmission?.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">{viewingSubmission.email}</span>
                </div>
              )}
            </div>
            <div className="bg-slate-50 rounded-md p-4">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{viewingSubmission?.message}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setViewingSubmission(null)}>Fechar</Button>
            <Button
              variant="destructive"
              onClick={() => viewingSubmission && setDeletingSubmission(viewingSubmission)}
              data-testid="button-delete-from-dialog"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingSubmission} onOpenChange={(open) => !open && setDeletingSubmission(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Mensagem</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a mensagem de "{deletingSubmission?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSubmission && deleteMutation.mutate(deletingSubmission.id)}
              data-testid="button-confirm-delete-contact"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ShowcaseAdminPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-slate-900" data-testid="text-showcase-title">Vitrine Virtual</h2>
          <p className="text-slate-500 mt-1">Gerencie o site, slides, produtos e configurações</p>
        </div>
        <a href="/" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" data-testid="button-preview-site">
            <ExternalLink className="w-3 h-3 mr-1" />
            Ver Site
          </Button>
        </a>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList className="flex w-full overflow-x-auto" data-testid="showcase-tabs">
          <TabsTrigger value="settings" data-testid="tab-settings" className="flex-1 min-w-0">
            <Settings className="w-4 h-4 mr-1.5 flex-shrink-0" />
            <span className="truncate">Config</span>
          </TabsTrigger>
          <TabsTrigger value="slides" data-testid="tab-slides" className="flex-1 min-w-0">
            <Layers className="w-4 h-4 mr-1.5 flex-shrink-0" />
            <span className="truncate">Slides</span>
          </TabsTrigger>
          <TabsTrigger value="products" data-testid="tab-products" className="flex-1 min-w-0">
            <Flower2 className="w-4 h-4 mr-1.5 flex-shrink-0" />
            <span className="truncate">Produtos</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" data-testid="tab-contacts" className="flex-1 min-w-0">
            <Inbox className="w-4 h-4 mr-1.5 flex-shrink-0" />
            <span className="truncate">Contatos</span>
          </TabsTrigger>
          <TabsTrigger value="seo" data-testid="tab-seo" className="flex-1 min-w-0">
            <Globe className="w-4 h-4 mr-1.5 flex-shrink-0" />
            <span className="truncate">SEO</span>
          </TabsTrigger>
          <TabsTrigger value="seo-report" data-testid="tab-seo-report" className="flex-1 min-w-0">
            <BarChart3 className="w-4 h-4 mr-1.5 flex-shrink-0" />
            <span className="truncate">Relatório</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="settings">
          <SiteSettingsTab />
        </TabsContent>
        <TabsContent value="slides">
          <HeroSlidesTab />
        </TabsContent>
        <TabsContent value="products">
          <ProductsTab />
        </TabsContent>
        <TabsContent value="contacts">
          <ContactSubmissionsTab />
        </TabsContent>
        <TabsContent value="seo">
          <SeoSettingsTab />
        </TabsContent>
        <TabsContent value="seo-report">
          <SeoReportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
