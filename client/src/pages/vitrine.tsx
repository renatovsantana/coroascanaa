import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Phone, Mail, MapPin, Search, Flower2, ArrowRight,
  Loader2, ShieldCheck, Truck, Award, ChevronLeft, ChevronRight, Info, Send, CheckCircle, User, MessageSquare,
  Target, Eye, Heart
} from "lucide-react";
import { SiWhatsapp, SiInstagram } from "react-icons/si";
import type { ShowcaseProduct, HeroSlide } from "@shared/schema";

const SHOWCASE_SIZES = [
  { value: "GRANDE", label: "Grande" },
  { value: "MÉDIA", label: "Média" },
  { value: "PEQUENA", label: "Pequena" },
  { value: "OVAL", label: "Oval" },
  { value: "PLANO", label: "Plano" },
];

function getSizeLabel(category: string) {
  return SHOWCASE_SIZES.find(s => s.value === category)?.label || category;
}

function useSiteSettings() {
  return useQuery<Record<string, string>>({
    queryKey: ["/api/vitrine/settings"],
    staleTime: 60000,
  });
}

function formatWhatsappLink(whatsapp: string, message?: string) {
  const digits = whatsapp.replace(/\D/g, "");
  const fullNumber = digits.startsWith("55") ? digits : `55${digits}`;
  const encoded = encodeURIComponent(message || "Quero saber mais sobre os produtos");
  return `https://wa.me/${fullNumber}?text=${encoded}`;
}

function useSeoMeta(settings?: Record<string, string>, pageTitle?: string) {
  useEffect(() => {
    if (!settings) return;
    const siteTitle = settings.seoTitle || "Coroas Canaã";
    document.title = pageTitle ? `${pageTitle} | ${siteTitle}` : siteTitle;

    function setMeta(name: string, content: string) {
      let el = document.querySelector(`meta[name="${name}"]`) || document.querySelector(`meta[property="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        if (name.startsWith("og:")) {
          el.setAttribute("property", name);
        } else {
          el.setAttribute("name", name);
        }
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    }

    if (settings.seoDescription) setMeta("description", settings.seoDescription);
    if (settings.seoKeywords) setMeta("keywords", settings.seoKeywords);
    setMeta("og:title", pageTitle ? `${pageTitle} | ${siteTitle}` : siteTitle);
    if (settings.seoDescription) setMeta("og:description", settings.seoDescription);
    if (settings.ogImage) setMeta("og:image", settings.ogImage);
    setMeta("og:type", "website");

    const siteUrl = settings.siteUrl || '';
    if (siteUrl) {
      let canonicalEl = document.querySelector('link[rel="canonical"]');
      if (!canonicalEl) {
        canonicalEl = document.createElement('link');
        canonicalEl.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalEl);
      }
      canonicalEl.setAttribute('href', `${siteUrl}${window.location.pathname}`);
    }

    let ldScript = document.querySelector('script[type="application/ld+json"]#org-schema');
    if (!ldScript) {
      ldScript = document.createElement('script');
      ldScript.setAttribute('type', 'application/ld+json');
      ldScript.setAttribute('id', 'org-schema');
      document.head.appendChild(ldScript);
    }
    const orgData: any = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": settings.seoTitle || "Coroas Canaã",
      "url": siteUrl || window.location.origin,
    };
    if (settings.logo) orgData.logo = settings.logo;
    if (settings.phone) orgData.telephone = settings.phone;
    if (settings.email) orgData.email = settings.email;
    if (settings.address) orgData.address = { "@type": "PostalAddress", "streetAddress": settings.address };
    if (settings.instagram) {
      orgData.sameAs = [`https://instagram.com/${settings.instagram.replace("@", "")}`];
    }
    ldScript.textContent = JSON.stringify(orgData);

    return () => {
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) canonical.remove();
      const ldJson = document.querySelector('script#org-schema');
      if (ldJson) ldJson.remove();
    };
  }, [settings, pageTitle]);
}

function WhatsAppFloatingButton({ whatsapp }: { whatsapp?: string }) {
  const number = whatsapp || "(38) 99907-2903";
  return (
    <a
      href={formatWhatsappLink(number)}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 bg-green-500 text-white p-4 rounded-full shadow-lg transition-colors"
      data-testid="button-whatsapp-float"
      aria-label="WhatsApp"
    >
      <SiWhatsapp className="w-6 h-6" />
    </a>
  );
}

function VitrineTopBar({ settings }: { settings?: Record<string, string> }) {
  const phone = settings?.phone || settings?.whatsapp;
  const email = settings?.email;
  const instagram = settings?.instagram;

  return (
    <div className="bg-emerald-900 text-emerald-100 text-xs py-1.5 hidden sm:block" data-testid="topbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          {phone && (
            <span className="flex items-center gap-1.5">
              <Phone className="w-3 h-3" />
              {phone}
            </span>
          )}
          {email && (
            <a href={`mailto:${email}`} className="flex items-center gap-1.5 hover:text-white transition-colors" data-testid="topbar-email">
              <Mail className="w-3 h-3" />
              {email}
            </a>
          )}
        </div>
        <div className="flex items-center gap-3">
          {instagram && (
            <a
              href={`https://instagram.com/${instagram.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-white transition-colors"
              data-testid="topbar-instagram"
            >
              <SiInstagram className="w-3 h-3" />
              {instagram}
            </a>
          )}
          {settings?.whatsapp && (
            <a
              href={formatWhatsappLink(settings.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-white transition-colors"
              data-testid="topbar-whatsapp"
            >
              <SiWhatsapp className="w-3 h-3" />
              WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function VitrineHeader({ settings }: { settings?: Record<string, string> }) {
  const [, setLocation] = useLocation();
  const [location] = useLocation();

  return (
    <div className="sticky top-0 z-50">
      <VitrineTopBar settings={settings} />
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" data-testid="link-vitrine-home">
              <div className="flex items-center gap-2 cursor-pointer">
                {settings?.logo ? (
                  <img src={settings.logo} alt="Logo" className="h-10 w-auto max-w-[140px] object-contain" data-testid="img-logo" />
                ) : (
                  <>
                    <Flower2 className="w-7 h-7 text-emerald-700" />
                    <div>
                      <span className="font-display font-bold text-lg text-slate-900 leading-none block">
                        Coroas Canaã
                      </span>
                      <span className="text-[10px] text-slate-400 leading-none">Coroas Fúnebres</span>
                    </div>
                  </>
                )}
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link href="/" className={`text-sm font-medium transition-colors ${location === "/" ? "text-emerald-700" : "text-slate-600 hover:text-slate-900"}`} data-testid="link-nav-home">
                Início
              </Link>
              <Link href="/produtos" className={`text-sm font-medium transition-colors ${location === "/produtos" ? "text-emerald-700" : "text-slate-600 hover:text-slate-900"}`} data-testid="link-nav-products">
                Produtos
              </Link>
              <Link href="/sobre" className={`text-sm font-medium transition-colors ${location === "/sobre" ? "text-emerald-700" : "text-slate-600 hover:text-slate-900"}`} data-testid="link-nav-about">
                Sobre
              </Link>
              <Link href="/contato" className={`text-sm font-medium transition-colors ${location === "/contato" ? "text-emerald-700" : "text-slate-600 hover:text-slate-900"}`} data-testid="link-nav-contact">
                Contato
              </Link>
            </nav>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/portal/login")}
                data-testid="button-client-portal"
              >
                Portal do Cliente
              </Button>
              <Button
                size="sm"
                onClick={() => setLocation("/login")}
                data-testid="button-admin-access"
                className="hidden sm:inline-flex"
              >
                Área Administrativa
              </Button>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}

function FloralDivider({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className || ""}`}>
      <div className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent to-emerald-600/30" />
      <Flower2 className="w-4 h-4 text-emerald-600/40" />
      <div className="h-px flex-1 max-w-[80px] bg-gradient-to-l from-transparent to-emerald-600/30" />
    </div>
  );
}

function VitrineFooter({ settings }: { settings?: Record<string, string> }) {
  const whatsapp = settings?.whatsapp || "(38) 99907-2903";
  const phone = settings?.phone || whatsapp;
  const address = settings?.address || "Minas Gerais, Brasil";
  const email = settings?.email;
  const instagram = settings?.instagram;

  return (
    <footer className="bg-slate-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath d='M30 5 C35 15 45 20 40 30 C35 40 25 40 20 30 C15 20 25 15 30 5z' fill='none' stroke='%2310b981' stroke-width='0.5'/%3E%3C/svg%3E\")", backgroundSize: "60px 60px" }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            {settings?.footerLogo ? (
              <img src={settings.footerLogo} alt="Logo" className="h-10 w-auto max-w-[140px] object-contain" data-testid="img-footer-logo" />
            ) : settings?.logo ? (
              <img src={settings.logo} alt="Logo" className="h-10 w-auto max-w-[140px] object-contain brightness-0 invert" data-testid="img-footer-logo-inverted" />
            ) : (
              <>
                <Flower2 className="w-7 h-7 text-emerald-400" />
                <span className="font-display font-bold text-xl">Coroas Canaã</span>
              </>
            )}
          </div>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Produtos funerários de qualidade para quem busca diversidade e praticidade.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="h-px flex-1 max-w-[120px] bg-gradient-to-r from-transparent to-slate-700" />
          <Flower2 className="w-4 h-4 text-emerald-700" />
          <div className="h-px flex-1 max-w-[120px] bg-gradient-to-l from-transparent to-slate-700" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div>
            <h3 className="font-display font-semibold text-sm mb-4 text-emerald-400 uppercase tracking-wider">Contato</h3>
            <div className="space-y-3">
              <a
                href={formatWhatsappLink(whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-emerald-400 transition-colors"
                data-testid="link-whatsapp-footer"
              >
                <SiWhatsapp className="w-4 h-4" />
                {whatsapp}
              </a>
              {phone && (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                  <Phone className="w-4 h-4" />
                  {phone}
                </div>
              )}
              {email && (
                <a href={`mailto:${email}`} className="flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-emerald-400 transition-colors" data-testid="link-email-footer">
                  <Mail className="w-4 h-4" />
                  {email}
                </a>
              )}
              <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                <MapPin className="w-4 h-4" />
                {address}
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-display font-semibold text-sm mb-4 text-emerald-400 uppercase tracking-wider">Navegação</h3>
            <div className="space-y-2">
              <Link href="/produtos" className="block text-sm text-slate-400 hover:text-emerald-400 transition-colors">
                Catálogo Completo
              </Link>
              <Link href="/sobre" className="block text-sm text-slate-400 hover:text-emerald-400 transition-colors">
                Sobre Nós
              </Link>
              <Link href="/contato" className="block text-sm text-slate-400 hover:text-emerald-400 transition-colors">
                Contato
              </Link>
              <Link href="/portal/login" className="block text-sm text-slate-400 hover:text-emerald-400 transition-colors">
                Portal do Cliente
              </Link>
            </div>
          </div>

          <div>
            <h3 className="font-display font-semibold text-sm mb-4 text-emerald-400 uppercase tracking-wider">Redes Sociais</h3>
            <div className="flex items-center justify-center gap-4">
              {instagram && (
                <a
                  href={`https://instagram.com/${instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-full bg-slate-800 text-slate-400 hover-elevate"
                  data-testid="link-instagram-footer"
                  aria-label="Instagram"
                >
                  <SiInstagram className="w-5 h-5" />
                </a>
              )}
              <a
                href={formatWhatsappLink(whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-full bg-slate-800 text-slate-400 hover-elevate"
                aria-label="WhatsApp"
              >
                <SiWhatsapp className="w-5 h-5" />
              </a>
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="p-2.5 rounded-full bg-slate-800 text-slate-400 hover-elevate"
                  aria-label="E-mail"
                >
                  <Mail className="w-5 h-5" />
                </a>
              )}
            </div>
            {instagram && (
              <p className="text-xs text-slate-500 mt-3">{instagram}</p>
            )}
          </div>
        </div>

        <div className="border-t border-slate-800 mt-10 pt-6 text-center text-xs text-slate-500">
          <p>Coroas Canaã &mdash; Todos os direitos reservados</p>
        </div>
      </div>
    </footer>
  );
}

function HeroSlider({ slides, settings }: { slides?: HeroSlide[]; settings?: Record<string, string> }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const activeSlides = slides?.filter(s => s.active) || [];

  const nextSlide = useCallback(() => {
    if (activeSlides.length > 0) {
      setCurrentSlide((prev) => (prev + 1) % activeSlides.length);
    }
  }, [activeSlides.length]);

  const prevSlide = useCallback(() => {
    if (activeSlides.length > 0) {
      setCurrentSlide((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
    }
  }, [activeSlides.length]);

  useEffect(() => {
    if (activeSlides.length <= 1) return;
    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, [activeSlides.length, nextSlide]);

  if (activeSlides.length === 0) {
    return (
      <section className="relative bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 relative z-10">
          <div className="max-w-2xl">
            <Badge variant="outline" className="text-emerald-200 border-emerald-400/40 mb-4 bg-emerald-800/30 no-default-hover-elevate no-default-active-elevate">
              Qualidade e Tradição
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4 leading-tight">
              Coroas Fúnebres com <span className="text-emerald-300">Respeito</span> e <span className="text-emerald-300">Carinho</span>
            </h1>
            <p className="text-lg text-emerald-100/80 mb-8 leading-relaxed">
              Produtos funerários para quem busca diversidade e praticidade.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/produtos">
                <Button size="lg" variant="secondary" data-testid="button-see-catalog">
                  Ver Catálogo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <a href={formatWhatsappLink(settings?.whatsapp || "")} target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="border-emerald-400/40 text-white bg-emerald-800/30" data-testid="button-whatsapp-hero">
                  <SiWhatsapp className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const slide = activeSlides[currentSlide];

  return (
    <section className="relative overflow-hidden" data-testid="hero-slider">
      <div className="relative h-[400px] md:h-[500px] lg:h-[560px]">
        {slide.imageUrl ? (
          <img
            src={slide.imageUrl}
            alt={slide.title}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
            data-testid={`slide-image-${currentSlide}`}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />

        <div className="relative z-10 h-full flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-2xl">
              <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 leading-tight" data-testid="text-slide-title">
                {slide.title}
              </h1>
              {slide.subtitle && (
                <p className="text-base md:text-lg text-white/80 mb-6 leading-relaxed" data-testid="text-slide-subtitle">
                  {slide.subtitle}
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                {slide.buttonText && slide.buttonLink && (
                  <Link href={slide.buttonLink}>
                    <Button size="lg" variant="secondary" data-testid="button-slide-cta">
                      {slide.buttonText}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                )}
                <a href={formatWhatsappLink(settings?.whatsapp || "")} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="border-white/30 text-white bg-white/10" data-testid="button-whatsapp-hero">
                    <SiWhatsapp className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>

        {activeSlides.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/30 text-white p-2 rounded-full transition-colors"
              data-testid="button-slide-prev"
              aria-label="Slide anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/30 text-white p-2 rounded-full transition-colors"
              data-testid="button-slide-next"
              aria-label="Próximo slide"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
              {activeSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    index === currentSlide ? "bg-white" : "bg-white/40"
                  }`}
                  data-testid={`slide-dot-${index}`}
                  aria-label={`Ir para slide ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: ShowcaseProduct }) {
  return (
    <Link href={`/produto/${product.id}`}>
      <Card className="group cursor-pointer overflow-visible hover-elevate" data-testid={`card-product-${product.id}`}>
        <div className="aspect-square bg-slate-100 rounded-t-md overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Flower2 className="w-12 h-12 text-slate-300" />
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <Badge variant="outline" className="text-[10px] mb-2">
            {getSizeLabel(product.category)}
          </Badge>
          <h3 className="font-display font-semibold text-sm text-slate-900 leading-tight line-clamp-2 mb-1" data-testid={`text-product-name-${product.id}`}>
            {product.name}
          </h3>
        </CardContent>
      </Card>
    </Link>
  );
}

export function VitrineHome() {
  const { data: products, isLoading } = useQuery<ShowcaseProduct[]>({
    queryKey: ["/api/vitrine/products"],
  });
  const { data: slides } = useQuery<HeroSlide[]>({
    queryKey: ["/api/vitrine/slides"],
  });
  const { data: settings } = useSiteSettings();
  useSeoMeta(settings);

  const featuredProducts = products?.slice(0, 6) || [];

  return (
    <div className="min-h-screen bg-white" style={{ '--vitrine-primary': settings?.primaryColor || '#059669' } as React.CSSProperties}>
      <VitrineHeader settings={settings} />

      <HeroSlider slides={slides} settings={settings} />

      <section className="py-10 bg-emerald-50/50 border-b border-emerald-100 relative overflow-hidden">
        <div className="absolute top-2 left-6 text-emerald-200/30"><Flower2 className="w-16 h-16 rotate-12" /></div>
        <div className="absolute bottom-2 right-8 text-emerald-200/30"><Flower2 className="w-12 h-12 -rotate-12" /></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex items-center gap-4 p-4">
              <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-200">
                <Award className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-sm text-slate-900">Qualidade Premium</h3>
                <p className="text-xs text-slate-500">Materiais selecionados e acabamento impecável</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4">
              <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-200">
                <Truck className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-sm text-slate-900">Entrega Rápida</h3>
                <p className="text-xs text-slate-500">Logística eficiente para todo o Brasil</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4">
              <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-200">
                <ShieldCheck className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-sm text-slate-900">Confiança</h3>
                <p className="text-xs text-slate-500">Atendimento atencioso e compromisso</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 relative">
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M40 10 C48 25 60 30 55 40 C48 52 32 52 25 40 C20 30 32 25 40 10z' fill='none' stroke='%2310b981' stroke-width='0.8'/%3E%3Ccircle cx='40' cy='35' r='3' fill='none' stroke='%2310b981' stroke-width='0.5'/%3E%3C/svg%3E\")", backgroundSize: "80px 80px" }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl font-bold text-slate-900" data-testid="text-section-products">Nossos Produtos</h2>
            <p className="text-sm text-slate-500 mt-1">Confira nossa linha completa de coroas fúnebres</p>
            <FloralDivider className="mt-4" />
          </div>
          <div className="flex items-center justify-end mb-6 flex-wrap gap-3">
            <Link href="/produtos">
              <Button variant="outline" size="sm" data-testid="button-view-all">
                Ver todos
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="text-center py-20">
              <Flower2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Produtos em breve disponíveis</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {(settings?.mission || settings?.vision || settings?.values) && (
        <section className="py-16 bg-emerald-50" data-testid="section-mission-vision-values">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="font-display text-2xl font-bold text-slate-900" data-testid="text-mvv-title">Missão, Visão e Valores</h2>
              <FloralDivider className="mt-4" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {settings?.mission && (
                <div className="text-center" data-testid="card-mission">
                  <div className="inline-flex p-3 rounded-xl bg-emerald-100 border border-emerald-200 mb-4">
                    <Target className="w-6 h-6 text-emerald-700" />
                  </div>
                  <h3 className="font-display font-semibold text-lg text-slate-900 mb-2">Missão</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{settings.mission}</p>
                </div>
              )}
              {settings?.vision && (
                <div className="text-center" data-testid="card-vision">
                  <div className="inline-flex p-3 rounded-xl bg-emerald-100 border border-emerald-200 mb-4">
                    <Eye className="w-6 h-6 text-emerald-700" />
                  </div>
                  <h3 className="font-display font-semibold text-lg text-slate-900 mb-2">Visão</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{settings.vision}</p>
                </div>
              )}
              {settings?.values && (
                <div className="text-center" data-testid="card-values">
                  <div className="inline-flex p-3 rounded-xl bg-emerald-100 border border-emerald-200 mb-4">
                    <Heart className="w-6 h-6 text-emerald-700" />
                  </div>
                  <h3 className="font-display font-semibold text-lg text-slate-900 mb-2">Valores</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{settings.values}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <VitrineFooter settings={settings} />
      <WhatsAppFloatingButton whatsapp={settings?.whatsapp} />
    </div>
  );
}

export function VitrineProdutos() {
  const { data: products, isLoading } = useQuery<ShowcaseProduct[]>({
    queryKey: ["/api/vitrine/products"],
  });
  const { data: settings } = useSiteSettings();
  useSeoMeta(settings, "Catálogo de Produtos");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let result = [...products];
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(searchLower)
      );
    }
    if (categoryFilter !== "all") {
      result = result.filter(p => p.category === categoryFilter);
    }
    return result;
  }, [products, search, categoryFilter]);

  return (
    <div className="min-h-screen bg-white" style={{ '--vitrine-primary': settings?.primaryColor || '#059669' } as React.CSSProperties}>
      <VitrineHeader settings={settings} />

      <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 text-white py-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10"><Flower2 className="w-32 h-32 -mt-4 -mr-4 rotate-45" /></div>
        <div className="absolute bottom-0 left-10 opacity-10"><Flower2 className="w-20 h-20 mb-0 -rotate-12" /></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h1 className="font-display text-3xl font-bold mb-2" data-testid="text-catalog-title">Catálogo de Produtos</h1>
          <p className="text-emerald-200 text-sm">Todas as nossas coroas fúnebres disponíveis</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-products"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={categoryFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter("all")}
              data-testid="button-filter-all"
            >
              Todos
            </Button>
            {SHOWCASE_SIZES.map((size) => (
              <Button
                key={size.value}
                variant={categoryFilter === size.value ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter(size.value)}
                data-testid={`button-filter-${size.value.toLowerCase()}`}
              >
                {size.label}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <Flower2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      <VitrineFooter settings={settings} />
      <WhatsAppFloatingButton whatsapp={settings?.whatsapp} />
    </div>
  );
}

export function VitrineSobre() {
  const { data: settings, isLoading } = useSiteSettings();
  useSeoMeta(settings, "Sobre Nós");

  return (
    <div className="min-h-screen bg-white" style={{ '--vitrine-primary': settings?.primaryColor || '#059669' } as React.CSSProperties}>
      <VitrineHeader settings={settings} />

      <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 text-white py-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10"><Flower2 className="w-32 h-32 -mt-4 -mr-4 rotate-45" /></div>
        <div className="absolute bottom-0 left-10 opacity-10"><Flower2 className="w-20 h-20 mb-0 -rotate-12" /></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h1 className="font-display text-3xl font-bold mb-2" data-testid="text-about-title">Sobre Nós</h1>
          <p className="text-emerald-200 text-sm">Conheça nossa história e valores</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : settings?.aboutText ? (
          <div
            className="prose prose-slate max-w-none"
            data-testid="text-about-content"
            dangerouslySetInnerHTML={{ __html: settings.aboutText }}
          />
        ) : (
          <div className="text-center py-20">
            <Info className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">O texto "Sobre Nós" ainda não foi configurado.</p>
            <p className="text-sm text-slate-400 mt-1">Configure-o pelo painel administrativo em Vitrine Virtual &gt; Configurações.</p>
          </div>
        )}

        {(settings?.mission || settings?.vision || settings?.values) && (
          <div className="mt-12" data-testid="section-about-mvv">
            <h3 className="font-display font-semibold text-lg text-slate-900 mb-6 text-center">Missão, Visão e Valores</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {settings?.mission && (
                <div className="text-center p-4" data-testid="about-card-mission">
                  <div className="inline-flex p-3 rounded-xl bg-emerald-100 border border-emerald-200 mb-3">
                    <Target className="w-5 h-5 text-emerald-700" />
                  </div>
                  <h4 className="font-display font-semibold text-sm text-slate-900 mb-1">Missão</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{settings.mission}</p>
                </div>
              )}
              {settings?.vision && (
                <div className="text-center p-4" data-testid="about-card-vision">
                  <div className="inline-flex p-3 rounded-xl bg-emerald-100 border border-emerald-200 mb-3">
                    <Eye className="w-5 h-5 text-emerald-700" />
                  </div>
                  <h4 className="font-display font-semibold text-sm text-slate-900 mb-1">Visão</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{settings.vision}</p>
                </div>
              )}
              {settings?.values && (
                <div className="text-center p-4" data-testid="about-card-values">
                  <div className="inline-flex p-3 rounded-xl bg-emerald-100 border border-emerald-200 mb-3">
                    <Heart className="w-5 h-5 text-emerald-700" />
                  </div>
                  <h4 className="font-display font-semibold text-sm text-slate-900 mb-1">Valores</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{settings.values}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {(settings?.phone || settings?.whatsapp || settings?.address) && (
          <Card className="mt-12">
            <CardContent className="p-6">
              <h3 className="font-display font-semibold text-lg text-slate-900 mb-4">Entre em Contato</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {settings?.phone && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100">
                      <Phone className="w-4 h-4 text-emerald-700" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Telefone</p>
                      <p className="text-sm font-medium text-slate-900">{settings.phone}</p>
                    </div>
                  </div>
                )}
                {settings?.whatsapp && (
                  <a href={formatWhatsappLink(settings.whatsapp)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover-elevate rounded-md p-1 -m-1">
                    <div className="p-2 rounded-lg bg-green-100">
                      <SiWhatsapp className="w-4 h-4 text-green-700" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">WhatsApp</p>
                      <p className="text-sm font-medium text-slate-900">{settings.whatsapp}</p>
                    </div>
                  </a>
                )}
                {settings?.address && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <MapPin className="w-4 h-4 text-blue-700" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Endereço</p>
                      <p className="text-sm font-medium text-slate-900">{settings.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <VitrineFooter settings={settings} />
      <WhatsAppFloatingButton whatsapp={settings?.whatsapp} />
    </div>
  );
}

export function VitrineContato() {
  const { data: settings, isLoading } = useSiteSettings();
  useSeoMeta(settings, "Contato");
  const { toast } = useToast();
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/vitrine/contact", {
        name: formName,
        email: formEmail || null,
        phone: formPhone || null,
        subject: formSubject,
        message: formMessage,
      });
    },
    onSuccess: () => {
      setSubmitted(true);
      setFormName("");
      setFormEmail("");
      setFormPhone("");
      setFormSubject("");
      setFormMessage("");
    },
    onError: () => {
      toast({ title: "Erro ao enviar mensagem", description: "Tente novamente mais tarde.", variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-white" style={{ '--vitrine-primary': settings?.primaryColor || '#059669' } as React.CSSProperties}>
      <VitrineHeader settings={settings} />

      <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 text-white py-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10"><Flower2 className="w-32 h-32 -mt-4 -mr-4 rotate-45" /></div>
        <div className="absolute bottom-0 left-10 opacity-10"><Flower2 className="w-20 h-20 mb-0 -rotate-12" /></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h1 className="font-display text-3xl font-bold mb-2" data-testid="text-contact-title">Contato</h1>
          <p className="text-emerald-200 text-sm">Envie uma mensagem ou entre em contato conosco</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-display font-semibold text-lg text-slate-900 mb-1" data-testid="text-form-title">
                  <MessageSquare className="w-5 h-5 inline mr-2 text-emerald-600" />
                  Envie sua Mensagem
                </h3>
                <p className="text-sm text-slate-500 mb-6">Preencha o formulário abaixo e retornaremos o mais breve possível.</p>

                {submitted ? (
                  <div className="text-center py-12" data-testid="contact-success">
                    <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <h4 className="font-display font-semibold text-xl text-slate-900 mb-2">Mensagem Enviada!</h4>
                    <p className="text-slate-500 mb-6">Obrigado pelo seu contato. Responderemos em breve.</p>
                    <Button variant="outline" onClick={() => setSubmitted(false)} data-testid="button-new-message">
                      Enviar outra mensagem
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">
                          <User className="w-3.5 h-3.5 inline mr-1" />
                          Nome *
                        </label>
                        <Input
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          placeholder="Seu nome completo"
                          data-testid="input-contact-name"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">
                          <Phone className="w-3.5 h-3.5 inline mr-1" />
                          Telefone
                        </label>
                        <Input
                          value={formPhone}
                          onChange={(e) => setFormPhone(e.target.value)}
                          placeholder="(00) 00000-0000"
                          data-testid="input-contact-phone"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">
                        <Mail className="w-3.5 h-3.5 inline mr-1" />
                        E-mail
                      </label>
                      <Input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="seu@email.com"
                        data-testid="input-contact-email"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Assunto *</label>
                      <Input
                        value={formSubject}
                        onChange={(e) => setFormSubject(e.target.value)}
                        placeholder="Ex: Orçamento, Dúvida, Parceria..."
                        data-testid="input-contact-subject"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Mensagem *</label>
                      <Textarea
                        value={formMessage}
                        onChange={(e) => setFormMessage(e.target.value)}
                        placeholder="Escreva sua mensagem aqui..."
                        className="min-h-[120px]"
                        data-testid="input-contact-message"
                      />
                    </div>
                    <Button
                      onClick={() => submitMutation.mutate()}
                      disabled={!formName || !formSubject || !formMessage || submitMutation.isPending}
                      className="w-full sm:w-auto"
                      data-testid="button-submit-contact"
                    >
                      {submitMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Enviar Mensagem
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-display font-semibold text-lg text-slate-900 mb-4">Informações de Contato</h3>
                <div className="space-y-4">
                  {settings?.phone && (
                    <div className="flex items-center gap-3" data-testid="contact-phone">
                      <div className="p-2.5 rounded-lg bg-emerald-100 flex-shrink-0">
                        <Phone className="w-4 h-4 text-emerald-700" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Telefone</p>
                        <p className="text-sm font-medium text-slate-900">{settings.phone}</p>
                      </div>
                    </div>
                  )}
                  {settings?.whatsapp && (
                    <a
                      href={formatWhatsappLink(settings.whatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 hover-elevate rounded-md p-1 -m-1"
                      data-testid="contact-whatsapp"
                    >
                      <div className="p-2.5 rounded-lg bg-green-100 flex-shrink-0">
                        <SiWhatsapp className="w-4 h-4 text-green-700" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">WhatsApp</p>
                        <p className="text-sm font-medium text-slate-900">{settings.whatsapp}</p>
                      </div>
                    </a>
                  )}
                  {settings?.address && (
                    <div className="flex items-center gap-3" data-testid="contact-address">
                      <div className="p-2.5 rounded-lg bg-blue-100 flex-shrink-0">
                        <MapPin className="w-4 h-4 text-blue-700" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Endereço</p>
                        <p className="text-sm font-medium text-slate-900">{settings.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {settings?.whatsapp && (
              <Card>
                <CardContent className="p-6 text-center">
                  <SiWhatsapp className="w-8 h-8 text-green-600 mx-auto mb-3" />
                  <h4 className="font-display font-semibold text-slate-900 mb-1">Atendimento Rápido</h4>
                  <p className="text-sm text-slate-500 mb-4">Prefere falar pelo WhatsApp? Clique abaixo.</p>
                  <a href={formatWhatsappLink(settings.whatsapp)} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full" data-testid="button-contact-whatsapp">
                      <SiWhatsapp className="w-4 h-4 mr-2" />
                      Chamar no WhatsApp
                    </Button>
                  </a>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <VitrineFooter settings={settings} />
      <WhatsAppFloatingButton whatsapp={settings?.whatsapp} />
    </div>
  );
}

export function VitrineProdutoDetalhe({ id }: { id: string }) {
  const { data: product, isLoading } = useQuery<ShowcaseProduct>({
    queryKey: ["/api/vitrine/products", id],
  });
  const { data: settings } = useSiteSettings();
  useSeoMeta(settings, product?.name);
  const whatsapp = settings?.whatsapp || "(38) 99907-2903";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white" style={{ '--vitrine-primary': settings?.primaryColor || '#059669' } as React.CSSProperties}>
        <VitrineHeader settings={settings} />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white" style={{ '--vitrine-primary': settings?.primaryColor || '#059669' } as React.CSSProperties}>
        <VitrineHeader settings={settings} />
        <div className="text-center py-20">
          <p className="text-slate-500">Produto não encontrado</p>
          <Link href="/produtos">
            <Button variant="outline" className="mt-4">Voltar ao catálogo</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" style={{ '--vitrine-primary': settings?.primaryColor || '#059669' } as React.CSSProperties}>
      <VitrineHeader settings={settings} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/produtos">
          <Button variant="ghost" size="sm" className="mb-6 text-slate-500" data-testid="button-back-catalog">
            <ArrowRight className="w-3 h-3 mr-1 rotate-180" />
            Voltar ao catálogo
          </Button>
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="aspect-square bg-slate-100 rounded-md overflow-hidden">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
                data-testid="img-product-detail"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Flower2 className="w-20 h-20 text-slate-300" />
              </div>
            )}
          </div>

          <div>
            <Badge variant="outline" className="mb-3">
              {getSizeLabel(product.category)}
            </Badge>
            <h1 className="font-display text-2xl font-bold text-slate-900 mb-4" data-testid="text-product-detail-name">
              {product.name}
            </h1>

            {product.description && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Descrição</h3>
                <div
                  className="prose prose-sm prose-slate max-w-none"
                  data-testid="text-product-description"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>
            )}

            <div className="border-t border-slate-200 pt-6 mt-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Interessado neste produto?</h3>
              <a
                href={formatWhatsappLink(whatsapp, `Olá! Tenho interesse na coroa ${product.name}`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="w-full bg-green-600" data-testid="button-whatsapp-product">
                  <SiWhatsapp className="w-4 h-4 mr-2" />
                  Falar no WhatsApp
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>

      <VitrineFooter settings={settings} />
      <WhatsAppFloatingButton whatsapp={settings?.whatsapp} />
    </div>
  );
}
