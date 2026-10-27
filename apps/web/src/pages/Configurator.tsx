/**
 * Configurator - Página principal do configurador 3D.
 */

import React, { useEffect, useState } from 'react';
import { Box, SlidersHorizontal, X } from 'lucide-react';
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
        setError('Não foi possível carregar o produto.');
        console.error(err);
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

  if (!product) return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-slate-500">Carregando produto…</div>
    </div>
  );

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
    <main className="relative flex h-[100dvh] overflow-hidden bg-[#f4f5fb]">
      <section className="relative min-w-0 flex-1 bg-[#f4f5fb]">
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
        <div className="absolute left-4 top-4 z-20 flex items-center gap-3 rounded-2xl border border-white/80 bg-white/90 px-3 py-2.5 shadow-lg shadow-slate-900/5 backdrop-blur-xl sm:left-6 sm:top-6 sm:px-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-700 text-white"><Box size={19} /></span>
          <div className="min-w-0"><div className="text-[10px] font-extrabold uppercase tracking-[.14em] text-violet-700">Configura3D Studio</div><div className="max-w-[40vw] truncate text-sm font-extrabold text-slate-800 sm:max-w-xs">{product.name}</div></div>
        </div>
        <button onClick={() => setMobileOptionsOpen(true)} className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-xl bg-violet-700 px-3 py-3 text-sm font-bold text-white shadow-lg shadow-violet-900/20 lg:hidden"><SlidersHorizontal size={17} /> Personalizar</button>
        <ViewerControls />
      </section>

      <aside className="hidden w-[390px] shrink-0 flex-col border-l border-slate-200 bg-white shadow-[-12px_0_40px_rgba(31,41,75,.04)] lg:flex xl:w-[420px]">
        <OptionPanel />
        <PriceSummary />
      </aside>

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

      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2 sm:flex-row">
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