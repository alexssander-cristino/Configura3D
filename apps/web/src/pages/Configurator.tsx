/**
 * Configura3D — configurador público de produto.
 */
import React, { useEffect, useState } from 'react';
import { Box, SlidersHorizontal, X, Menu, ArrowUpRight, Sparkles, RotateCcw } from 'lucide-react';
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

const GROUP_TO_MESH: Record<string, string> = {
  'Cor da Base': 'base',
  'Material da Gaveta': 'gaveta',
  'Acabamento da Prateleira': 'prateleira',
};

export default function Configurator() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const {
    product, optionGroups, selections, quantity, price, error,
    setProduct, setOptionGroups, setSelections, setLoading, setError,
    setConfiguration, configurationId,
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
        if (!result.product || cancelled) return;
        setProduct(result.product);
        const groups = result.optionGroups || [];
        setOptionGroups(groups);
        const defaults: Record<string, string[]> = {};
        groups.forEach((group: any) => {
          if (group.options?.length) defaults[group.id] = group.isRequired ? [group.options[0].id] : [];
        });
        setSelections(defaults);
      } catch (err: any) {
        const status = err?.response?.status;
        const apiMessage = err?.response?.data?.message;
        setError(status === 502
          ? 'A API retornou 502. Verifique a conexão entre o frontend e o backend.'
          : apiMessage || 'Não foi possível carregar o produto. Tente novamente.');
        console.error('[Configura3D] Falha ao carregar produto:', {
          status, url: err?.config?.url, baseURL: err?.config?.baseURL,
          response: err?.response?.data, error: err,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug, setLoading, setError, setProduct, setOptionGroups, setSelections]);

  const componentMaterials = React.useMemo(() => {
    const map: Record<string, { color?: string; metalness?: number; roughness?: number }> = {};
    Object.entries(selections).forEach(([groupId, optionIds]) => {
      const group = optionGroups.find((item) => item.id === groupId);
      if (!group || !optionIds.length) return;
      const meshName = GROUP_TO_MESH[group.name as string];
      const option = group.options.find((item: any) => item.id === optionIds[0]);
      if (!meshName || !option) return;
      const meta = (option.metadata || {}) as any;
      map[meshName] = { color: meta.color, metalness: meta.metalness, roughness: meta.roughness };
    });
    return map;
  }, [selections, optionGroups]);

  const handleSave = async () => {
    if (!product) return;
    setSaving(true);
    setError(null);
    try {
      const data = await saveConfiguration({
        productId: product.id, quantity, selections,
        name: `Configuração ${new Date().toLocaleDateString('pt-BR')}`, isPublic: true,
      });
      setConfiguration(data.id, data.shareToken);
    } catch (err) {
      setError('Não foi possível salvar a configuração.');
      console.error(err);
    } finally { setSaving(false); }
  };

  const handleRequestQuote = async () => {
    if (!product) return;
    setQuoting(true);
    setError(null);
    try {
      const { createQuote } = await import('@/services/configura3d');
      await createQuote({
        configurationId: configurationId || undefined, productId: product.id, quantity,
        customerName: '', customerEmail: '', selections,
      });
      navigate(`/quotes/new?product=${product.id}`);
    } catch (err) {
      setError('Não foi possível iniciar o orçamento.');
      console.error(err);
    } finally { setQuoting(false); }
  };

  if (!product) return (
    <div className="configurator-loading-page">
      <div className="configurator-load-card">
        <span className="configurator-load-mark"><Box size={22} /></span>
        <p className="configurator-kicker">CONFIGURA3D STUDIO</p>
        <h1>{error ? 'Não foi possível abrir o produto' : 'Preparando seu configurador'}</h1>
        <p className="configurator-load-copy">{error || 'Estamos carregando o modelo e as opções disponíveis.'}</p>
        {error && <Button onClick={() => window.location.reload()} variant="primary" className="mt-5 w-full">Tentar novamente</Button>}
      </div>
    </div>
  );

  const configuredModelUrl = product.modelAsset?.fileUrl || '/models/demo-organizador.gltf';
  const rawModelUrl = configuredModelUrl.endsWith('/demo-organizador.glb')
    ? configuredModelUrl.replace(/demo-organizador\.glb$/, 'demo-organizador.gltf')
    : configuredModelUrl;
  const modelUrl = rawModelUrl.startsWith('/') ? `${window.location.origin}${rawModelUrl}` : rawModelUrl;

  const handleViewerError = (err: unknown) => {
    console.error('[Configura3D] Erro ao carregar modelo 3D:', err);
    setViewerError(err);
    setViewerLoaded(true);
  };

  const actions = (mobile = false) => (
    <div className={mobile ? 'configurator-mobile-actions' : 'configurator-sidebar-actions'}>
      <Button onClick={handleSave} loading={saving} variant="primary" className="w-full">
        Salvar configuração
      </Button>
      <Button onClick={handleRequestQuote} loading={quoting} variant="ghost" className="w-full">
        Solicitar orçamento
      </Button>
    </div>
  );

  return (
    <main className="configurator-shell">
      <section className="configurator-stage">
        <div className="configurator-canvas">
          <Canvas shadows dpr={[1, 1.75]} camera={{ position: [0, 0, 5], fov: 42 }}>
            <ViewerActionsProvider>
              <OrbitControls makeDefault enablePan={false} />
            </ViewerActionsProvider>
            {!viewerError && (
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

        <header className="configurator-topbar">
          <div className="configurator-topbar-left">
            <button onClick={() => setMenuOpen(true)} aria-label="Abrir menu" className="configurator-icon-button"><Menu size={19} /></button>
            <span className="configurator-brand-mark"><Box size={21} /></span>
            <div className="configurator-product-title">
              <span className="configurator-kicker">CONFIGURA3D <i>/</i> STUDIO</span>
              <strong title={product.name}>{product.name}</strong>
            </div>
          </div>
          <div className="configurator-live-pill"><span /> Modelo interativo</div>
          <button onClick={() => setMobileOptionsOpen(true)} className="configurator-customize-button lg:hidden">
            <SlidersHorizontal size={16} /> Personalizar
          </button>
        </header>

        <div className="configurator-viewer-hint">
          <span className="configurator-hint-dot" />
          <div><strong>Visualização 3D</strong><span>Arraste para girar · Scroll para zoom</span></div>
        </div>
        <ViewerControls />
        {viewerError && <div className="configurator-viewer-error">Não foi possível carregar o modelo 3D. Verifique o arquivo do produto.</div>}
        {price?.warnings?.length ? <div className="configurator-notice">{price.warnings[0]}</div> : null}
      </section>

      <aside className="configurator-sidebar">
        <div className="configurator-sidebar-heading">
          <div><span className="configurator-kicker">CONFIGURAÇÃO DO PRODUTO</span><h1>Monte do seu jeito.</h1><p>Escolha os detalhes e veja o resultado em tempo real.</p></div>
          <span className="configurator-heading-icon"><Sparkles size={18} /></span>
        </div>
        <div className="configurator-options-scroll"><OptionPanel /></div>
        <div className="configurator-summary-scroll"><PriceSummary /></div>
        {actions()}
      </aside>

      {menuOpen && (
        <div className="configurator-overlay configurator-menu-overlay">
          <button aria-label="Fechar menu" className="configurator-backdrop" onClick={() => setMenuOpen(false)} />
          <aside className="configurator-drawer">
            <div className="configurator-drawer-head">
              <span className="configurator-brand-mark"><Box size={21} /></span>
              <div><strong>CONFIGURA3D</strong><span>PRODUCT STUDIO</span></div>
              <button onClick={() => setMenuOpen(false)} className="configurator-icon-button" aria-label="Fechar"><X size={18} /></button>
            </div>
            <p className="configurator-kicker configurator-menu-label">NAVEGAÇÃO</p>
            <button onClick={() => setMenuOpen(false)} className="configurator-drawer-link"><span>01</span>Configurador<ArrowUpRight size={17} /></button>
            <button onClick={() => { setMenuOpen(false); navigate('/quotes'); }} className="configurator-drawer-link"><span>02</span>Orçamentos<ArrowUpRight size={17} /></button>
            <button onClick={() => { setMenuOpen(false); navigate('/admin'); }} className="configurator-drawer-link"><span>03</span>Área de gestão<ArrowUpRight size={17} /></button>
            <div className="configurator-drawer-promo"><Sparkles size={19} /><strong>Do conceito à configuração.</strong><p>Personalize, visualize e prepare seu produto em um só espaço.</p></div>
          </aside>
        </div>
      )}

      {mobileOptionsOpen && (
        <div className="configurator-overlay configurator-mobile-overlay">
          <button aria-label="Fechar personalização" className="configurator-backdrop" onClick={() => setMobileOptionsOpen(false)} />
          <section className="configurator-mobile-sheet">
            <div className="configurator-sheet-head">
              <div><span className="configurator-kicker">PERSONALIZAÇÃO</span><h2>Detalhes do produto</h2></div>
              <button onClick={() => setMobileOptionsOpen(false)} className="configurator-icon-button" aria-label="Fechar"><X size={18} /></button>
            </div>
            <div className="configurator-sheet-options"><OptionPanel /></div>
            <div className="configurator-sheet-footer">
              <PriceSummary />
              <Button onClick={() => setMobileOptionsOpen(false)} variant="primary" className="w-full mt-3">Concluir personalização</Button>
            </div>
          </section>
        </div>
      )}

      <div className="configurator-mobile-bottom">
        <div className="configurator-mobile-price"><span>Preço estimado</span><strong>{price ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price.totalCents / 100) : 'Calculando…'}</strong></div>
        <button onClick={() => setMobileOptionsOpen(true)} className="configurator-mobile-edit"><SlidersHorizontal size={16} /> Editar</button>
      </div>
      {error && product && <div role="alert" className="configurator-toast"><span>{error}</span><button onClick={() => setError(null)} aria-label="Fechar aviso"><X size={16} /></button></div>}
      <div className="configurator-mobile-cta">{actions(true)}</div>
    </main>
  );
}
