/**
 * SharedConfig - Visualização pública de uma configuração via link compartilhável.
 * Não requer autenticação.
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { getSharedConfiguration, getProduct } from '@/services/configura3d';
import { ProductViewer } from '@/components/viewer/ProductViewer';
import { ViewerActionsProvider } from '@/components/viewer/ViewerActions';
import { ViewerLoading } from '@/components/viewer/ViewerLoading';
import { Button } from '@/components/ui/Button';
import { formatBRL } from '@/lib/format';

const GROUP_TO_MESH: Record<string, string> = {
  'Cor da Base': 'base',
  'Material da Gaveta': 'gaveta',
  'Acabamento da Prateleira': 'prateleira',
};

export default function SharedConfig() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [config, setConfig] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewerLoaded, setViewerLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getSharedConfiguration(shareToken!);
        setConfig(data);
        const prod = await getProduct(data.productId);
        setProduct(prod);
      } catch (err: any) {
        setError('Não foi possível carregar esta configuração. O link pode estar expirado.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [shareToken]);

  const componentMaterials = React.useMemo(() => {
    const map: Record<string, { color?: string; metalness?: number; roughness?: number }> = {};
    const selections = (config?.selections || {}) as Record<string, string[]>;
    const groups = (product?.optionGroups || []) as any[];
    Object.entries(selections).forEach(([groupId, optionIds]) => {
      const group = groups.find((g) => g.id === groupId);
      if (!group) return;
      const meshName = GROUP_TO_MESH[String(group.name)];
      if (!meshName || optionIds.length === 0) return;
      const option = group.options.find((o: any) => o.id === optionIds[0]);
      if (!option) return;
      const meta = (option.metadata || {}) as any;
      map[meshName] = { color: meta.color, metalness: meta.metalness, roughness: meta.roughness };
    });
    return map;
  }, [config, product]);

  const totalCents = (config?.priceSnapshot?.totalCents ??
    config?.priceSnapshot?.subtotalCents ??
    0) as number;

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-500">Carregando…</div>;
  if (error || !config) return (
    <div className="flex h-screen flex-col items-center justify-center p-6 text-center">
      <h2 className="text-brand-900 font-semibold mb-2">{error || 'Configuração não encontrada'}</h2>
      <p className="text-slate-500 text-sm mb-6">Este link de configuração não está disponível.</p>
      <Button variant="primary" onClick={() => (window.location.href = '/')}>
        Voltar ao início
      </Button>
    </div>
  );

  const configuredModelUrl = product?.modelAsset?.fileUrl || '/models/demo-organizador.gltf';
  const rawModelUrl = configuredModelUrl.endsWith('/demo-organizador.glb')
    ? configuredModelUrl.replace(/demo-organizador\.glb$/, 'demo-organizador.gltf')
    : configuredModelUrl;
  const modelUrl = rawModelUrl.startsWith('/') ? window.location.origin + rawModelUrl : rawModelUrl;

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#f4f5fb] lg:h-screen lg:flex-row">
      <section className="relative min-h-[62vh] min-w-0 flex-1 bg-[#f4f5fb] lg:min-h-0">
        <div className="absolute inset-0 z-0">
          <Canvas>
            <ViewerActionsProvider>
              <OrbitControls makeDefault enablePan={false} />
            </ViewerActionsProvider>
            <ProductViewer modelUrl={modelUrl} componentMaterials={componentMaterials} onLoad={() => setViewerLoaded(true)} onError={() => setViewerLoaded(true)} />
            <ViewerLoading visible={!viewerLoaded} />
          </Canvas>
        </div>
        <div className="absolute bottom-4 left-4 flex gap-2">
          <a href="/" className="btn-ghost px-3 py-2 text-xs rounded-lg text-slate-600 hover:bg-slate-100">
            Novo produto
          </a>
        </div>
      </section>
      <aside className="w-full shrink-0 overflow-y-auto border-t border-slate-200 bg-white p-5 sm:p-6 lg:w-[390px] lg:border-l lg:border-t-0 xl:w-[420px]">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Configuração compartilhada</h2>
        <p className="text-xs text-slate-500 mb-4">{product?.name || 'Produto'}</p>
        <div className="space-y-3 text-sm mb-6">
          <div className="flex justify-between">
            <span className="text-slate-500">Seleções</span>
            <span className="text-slate-700">{Object.values(config.selections || {}).flat().length} itens</span>
          </div>
          <div className="flex justify-between border-t border-slate-100 pt-2">
            <span className="text-slate-500">Total salvo</span>
            <span className="font-bold text-brand-900">{formatBRL(totalCents)}</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-400">
          Visualização pública. Os preços foram registrados no orçamento vinculado.
        </p>
      </aside>
    </main>
  );
}
