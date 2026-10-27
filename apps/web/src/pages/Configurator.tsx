/**
 * Configurator - Página principal do configurador 3D.
 */

import React, { useEffect, useState } from 'react';
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
  const [saving, setSaving] = useState(false);
  const [quoting, setQuoting] = useState(false);

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

  const modelUrl = product.modelAsset?.fileUrl || '/models/demo-organizador.glb';

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex-1 relative bg-slate-100 min-w-0">
        <div className="absolute inset-0 z-0">
          <Canvas shadows>
            <ViewerActionsProvider>
              <OrbitControls makeDefault enablePan={false} />
            </ViewerActionsProvider>
            {viewerError ? null : (
              <ProductViewer modelUrl={modelUrl} componentMaterials={componentMaterials} />
            )}
            <ViewerLoading />
          </Canvas>
        </div>
        <ViewerControls />
      </div>

      <div className="hidden lg:flex flex-col w-[420px] border-l border-slate-200 bg-white">
        <OptionPanel />
        <PriceSummary />
      </div>

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
    </div>
  );
}
