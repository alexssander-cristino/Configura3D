import React from 'react';
import { BadgeCheck, CircleAlert, Package, Sparkles } from 'lucide-react';
import { useConfigStore } from '@/store/configStore';
import { formatBRL } from '@/lib/format';
import { calculatePrice } from '@/services/configura3d';

export function PriceSummary() {
  const { product, selections, quantity, price, setPrice, setError, setLoading } = useConfigStore();

  const recalculate = async () => {
    if (!product) return;
    setLoading(true);
    setError(null);
    try {
      const data = await calculatePrice({ productId: product.id, quantity, selections });
      setPrice(data);
    } catch (err: any) {
      setError('Não foi possível calcular o preço. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { recalculate(); }, [product, JSON.stringify(selections), quantity]);
  if (!product) return null;

  const base = formatBRL(product.basePriceCents);
  const total = price ? formatBRL(price.totalCents) : 'Calculando…';
  const selectedCount = Object.values(selections).reduce((sum, values) => sum + values.length, 0);

  return (
    <section className="border-t border-slate-100 bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div><div className="eyebrow mb-1">SEU RESUMO</div><h3 className="font-extrabold text-slate-900">Estimativa de preço</h3></div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Sparkles size={18} /></div>
      </div>
      <div className="mb-4 rounded-2xl bg-slate-50 p-4">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm"><Package size={18} /></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold text-slate-800">{product.name}</div><div className="mt-0.5 text-xs text-slate-500">{selectedCount} personalização(ões) · {quantity} unidade(s)</div></div></div>
      </div>
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between"><span className="text-slate-500">Preço base</span><span className="font-semibold text-slate-700">{base}</span></div>
        {price && price.additionalCents > 0 && <div className="flex items-center justify-between"><span className="text-slate-500">Personalizações</span><span className="font-semibold text-slate-700">+{formatBRL(price.additionalCents)}</span></div>}
        <div className="flex items-center justify-between"><span className="text-slate-500">Quantidade</span><span className="font-semibold text-slate-700">{quantity}x</span></div>
      </div>
      <div className="my-4 border-t border-dashed border-slate-200" />
      <div className="flex items-end justify-between gap-3"><div><div className="text-xs font-semibold text-slate-500">Total estimado</div><div className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{total}</div></div><div className="mb-1 flex items-center gap-1 text-[10px] font-bold text-emerald-700"><BadgeCheck size={14} /> Prévia</div></div>
      {price && price.warnings.length > 0 && <div className="mt-4 space-y-1 rounded-xl border border-amber-100 bg-amber-50 p-3">{price.warnings.map((w, i) => <p key={i} className="flex gap-2 text-xs leading-5 text-amber-800"><CircleAlert size={14} className="mt-0.5 shrink-0" />{w}</p>)}</div>}
      <p className="mt-3 text-[10px] leading-4 text-slate-400">O valor final é validado pelo sistema ao salvar a configuração ou solicitar o orçamento.</p>
    </section>
  );
}
