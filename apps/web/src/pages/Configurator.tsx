/**
 * Configurator - Página principal do configurador 3D.
 */

import React, { useEffect, useState } from 'react';
import { Box, SlidersHorizontal, X, Menu, ArrowUpRight, Sparkles } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useConfigStore } from '@/store/configStore';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { getPublicProductBySlug, saveConfiguration } from '@/services/configura3d';
import { ProductViewer } from '@/components/viewer/ProductViewer';
import { ViewerControls } from '@/components/viewer/ViewerControls';
import { ViewerActionsProvider } from '@/components/viewer/ViewerActions';
import { ViewerLoading } from '@/components/viewer/ViewerLoading';
import { OptionPanel } from '@/components/config/OptionPanel';
import { PriceSummary } from '@/components/summary/PriceSummary';
import { Button } from '@/components/ui/Button';

// Mapeamento de grupo de opção -> nome do mesh no GLB (configurável pelo admin).
const GROUP_TO_MESH: Record<string, string> = {
  'Cor da Base': 'base',
  'Material da Gaveta': 'gaveta',
  'Acabamento da Prateleira': 'prateleira',
};

export default function Configurator() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const {
    product,
    optionGroups,
    selections,
    quantity,
    price,
    error,
    setProduct,
    setOptionGroups,
    setSelections,
    setLoading,
    setError,
    setConfiguration,
    configurationId,
  } = useConfigStore();

  const [viewerError, setViewerError] = useState<unknown>(null);
  const [viewerLoaded, setViewerLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [mobileOptionsOpen, setMobileOptionsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getPublicProductBySlug(slug || 'organizador-de-mesa-demo');
        const prod = result.product;
        if (!prod || cancelled) return;
        setProduct(prod);
        const groups = result.optionGroups || [];
        setOptionGroups(groups);
        const defaults: Record<string, string[]> = {};
        groups.forEach((g: any) => {
          if (g.options && g.options.length > 0) {
            defaults[g.id] = g.isRequired ? [g.options[0].id] : [];
          }
        });
        setSelections(defaults);
      } catch (err: any) {
        const status = err?.response?.status;
        const apiMessage = err?.response?.data?.message;
        setError(
          status === 502
            ? 'A API retornou 502 (gateway). Confira se o backend está rodando e se a conexão com o banco está ativa.'
            : apiMessage || 'Não foi possível carregar o produto. Verifique a API e tente novamente.',
        );
        console.error('[Configura3D] Falha ao carregar produto:', {
          status,
          url: err?.config?.url,
          baseURL: err?.config?.baseURL,
          response: err?.response?.data,
          error: err,
        });
      } finally {
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug, setLoading, setError, setProduct, setOptionGroups, setSelections]);

  const componentMaterials = React.useMemo(() => {
    const map: Record<string, { color?: string; metalness?: number; roughness?: number }> = {};
    Object.entries(selections).forEach(([groupId, optionIds]) => {
      const group = optionGroups.find((g) => g.id === groupId);
      if (!group) return;
      const meshName = GROUP_TO_MESH[group.name as string];
      if (!meshName || optionIds.length === 0) return;
      const option = group.options.find((o: any) => o.id === optionIds[0]);
      if (!option) return;
      const meta = (option.metadata || {}) as any;
      map[meshName] = {
        color: meta.color,
        metalness: meta.metalness,
        roughness: meta.roughness,
      };
    });
    return map;
  }, [selections, optionGroups]);

  if (!product) return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f5fb] px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="text-base font-extrabold text-slate-900">
          {error ? 'Não foi possível carregar o produto' : 'Carregando produto…'}
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {error || 'Estamos buscando os dados do configurador.'}
        </p>
        {error && (
          <Button onClick={() => window.location.reload()} variant="primary" className="mt-5 w-full">
            Tentar novamente
          </Button>
        )}
      </div>
    </div>
  );

  const handleSave = async () => {
    if (!product) return;
    setSaving(true);
    setError(null);
    try {
      const data = await saveConfiguration({
        productId: product.id,
        quantity,
        selections,
        name: `Configuração ${new Date().toLocaleDateString('pt-BR')}`,
        isPublic: true,
      });
      setConfiguration(data.id, data.shareToken);
    } catch (err: any) {
      setError('Não foi possível salvar a configuração.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleRequestQuote = async () => {
    if (!product) return;
    setQuoting(true);
    setError(null);
    try {
      const { createQuote } = await import('@/services/configura3d');
      await createQuote({
        configurationId: configurationId || undefined,
        productId: product.id,
        quantity,
        customerName: '',
        customerEmail: '',
        selections,
      });
      navigate(`/quotes/new?product=${product.id}`);
    } catch (err: any) {
      setError('Não foi possível iniciar o orçamento.');
      console.error(err);
    } finally {
      setQuoting(false);
    }
  };

  // URLs iniciadas com "/" apontam para o servidor do frontend, onde os
  // modelos públicos ficam em apps/web/public/models. URLs absolutas são preservadas.
  const configuredModelUrl = product.modelAsset?.fileUrl || '/models/demo-organizador.gltf';
  // O GLB antigo de demonstração está inválido; usa a versão GLTF válida gerada no projeto.
  const rawModelUrl = configuredModelUrl.endsWith('/demo-organizador.glb')
    ? configuredModelUrl.replace(/demo-organizador\.glb$/, 'demo-organizador.gltf')
    : configuredModelUrl;
  const modelUrl = rawModelUrl.startsWith('/')
    ? `${window.location.origin}${rawModelUrl}`
    : rawModelUrl;

  const handleViewerError = (err: unknown) => {
    console.error('[Configura3D] Erro ao carregar modelo 3D:', err);
    setViewerError(err);
    setViewerLoaded(true);
  };

  return (
    <main className="configurator-shell relative flex h-[100dvh] overflow-hidden bg-[#f4f5fb]">
      <section className="configurator-stage relative min-w-0 flex-1 bg-[#f4f5fb]">
        <div className="absolute inset-0 z-0">
          <Canvas shadows>
            <ViewerActionsProvider>
              <OrbitControls makeDefault enablePan={false} />
            </ViewerActionsProvider>
            {viewerError ? null : (
              <ProductViewer
                modelUrl={modelUrl}
                componentMaterials={componentMaterials}
                onLoad={() => setViewerLoaded(true)}
                onError={handleViewerError}
              />
            )}
            <ViewerLoading visible={!viewerLoaded && !viewerError} />
          </Canvas>
        </div>
        <header className="configurator-topbar absolute inset-x-4 top-4 z-20 flex items-center justify-between gap-3 sm:inset-x-6 sm:top-6">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setMenuOpen(true)} aria-label="Abrir menu" className="configurator-icon-button"><Menu size={19} /></button>
            <div className="configurator-brand flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d8ff3e] text-[#171a13]"><Box size={20} /></span>
              <div className="min-w-0"><div className="text-[10px] font-extrabold uppercase tracking-[.18em] text-slate-500">CONFIGURA3D / STUDIO</div><div className="max-w-[40vw] truncate text-sm font-extrabold text-slate-900 sm:max-w-xs">{product.name}</div></div>
            </div>
          </div>
          <button onClick={() => setMobileOptionsOpen(true)} className="configurator-customize-button lg:hidden"><SlidersHorizontal size={16} /> Personalizar</button>
          <div className="hidden items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 backdrop-blur lg:flex"><span className="h-2 w-2 animate-pulse rounded-full bg-lime-500" /> Studio ao vivo</div>
        </header>
        <div className="configurator-stage-caption absolute bottom-24 right-5 z-10 hidden max-w-[220px] text-right sm:block">
          <div className="mb-1 text-[10px] font-extrabold uppercase tracking-[.2em] text-slate-400">VISUALIZAÇÃO INTERATIVA</div>
          <div className="text-sm font-semibold text-slate-600">Arraste para girar · Role para aproximar</div>
        </div>
        <ViewerControls />
      </section>

      <aside className="configurator-sidebar hidden w-[390px] shrink-0 flex-col border-l border-slate-200 bg-white lg:flex xl:w-[430px]">
        <OptionPanel />
        <PriceSummary />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-[70]">
          <button aria-label="Fechar menu" className="absolute inset-0 bg-[#10110d]/55 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <aside className="configurator-drawer absolute inset-y-0 left-0 flex w-[min(88vw,380px)] flex-col p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d8ff3e] text-[#171a13]"><Box size={20} /></span><div><div className="font-black tracking-tight">CONFIGURA3D</div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-black/45">Product studio</div></div></div>
              <button onClick={() => setMenuOpen(false)} className="configurator-icon-button" aria-label="Fechar"><X size={18} /></button>
            </div>
            <div className="my-10 border-t border-black/10" />
            <p className="mb-4 text-[10px] font-extrabold uppercase tracking-[.2em] text-black/45">NAVEGAÇÃO</p>
            <button onClick={() => setMenuOpen(false)} className="configurator-drawer-link"><span>01</span><span>Configurador</span><ArrowUpRight size={18} /></button>
            <button onClick={() => { setMenuOpen(false); navigate('/quotes'); }} className="configurator-drawer-link"><span>02</span><span>Orçamentos</span><ArrowUpRight size={18} /></button>
            <button onClick={() => { setMenuOpen(false); navigate('/admin'); }} className="configurator-drawer-link"><span>03</span><span>Área de gestão</span><ArrowUpRight size={18} /></button>
            <div className="mt-auto rounded-2xl bg-[#e9eddf] p-5"><Sparkles size={19} className="mb-4" /><div className="text-lg font-black leading-tight">Do conceito à configuração.</div><p className="mt-2 text-sm leading-6 text-black/60">Personalize, visualize e prepare seu produto em um só espaço.</p><div className="mt-5 text-[10px] font-extrabold uppercase tracking-[.18em] text-black/40">CONFIGURA3D · STUDIO</div></div>
          </aside>
        </div>
      )}

      {mobileOptionsOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Fechar personalização" className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setMobileOptionsOpen(false)} />
          <aside className="absolute bottom-0 left-0 right-0 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><div className="font-extrabold text-slate-900">Personalizar produto</div><div className="mt-0.5 text-xs text-slate-500">Suas escolhas atualizam a visualização</div></div><button onClick={() => setMobileOptionsOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600" aria-label="Fechar"><X size={18} /></button></div>
            <div className="min-h-0 flex-1 overflow-y-auto"><OptionPanel /></div>
            <div className="border-t border-slate-100 bg-white p-3"><PriceSummary /><Button onClick={() => setMobileOptionsOpen(false)} variant="primary" className="mt-2 w-full">Concluir personalização</Button></div>
          </aside>
        </div>
      )}

      <div className="configurator-actions absolute bottom-4 right-4 z-20 flex flex-col gap-2 sm:bottom-6 sm:right-6 sm:flex-row">
        <Button onClick={handleSave} loading={saving} variant="primary" className="w-full sm:w-auto">
          Salvar configuração
        </Button>
        <Button
          onClick={handleRequestQuote}
          loading={quoting}
          variant="ghost"
          className="w-full sm:w-auto"
        >
          Solicitar orçamento
        </Button>
      </div>

      {price && price.warnings.length > 0 && (
        <div className="absolute bottom-4 left-4 z-20 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 text-xs text-orange-700 max-w-xs">
          {price.warnings.map((w, i) => (
            <div key={i} className="mb-1 last:mb-0">⚠ {w}</div>
          ))}
        </div>
      )}
      {error && (
        <div className="absolute bottom-4 left-4 z-20 bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-xs text-red-700 max-w-xs">
          {error}
        </div>
      )}
    </main>
  );
}