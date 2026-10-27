/**
 * PriceSummary - Resumo da configuração e preço.
 * O preço exibido é uma prévia do frontend; o valor definitivo é calculado
 * e validado pelo backend ao salvar/orçar.
 */

import React from 'react';
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

  // Recalcula quando produto/seleções/quantidade mudam
  React.useEffect(() => {
    recalculate();
  }, [product, JSON.stringify(selections), quantity]);

  if (!product) return null;

  const base = formatBRL(product.basePriceCents);
  const total = price ? formatBRL(price.totalCents) : '—';

  return (
    <div className="border-t border-slate-200 p-4 bg-white/80 backdrop-blur backdrop-saturate-150">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase">Resumo da configuração</span>
        {price && price.warnings.length > 0 && (
          <span className="text-[10px] flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
            ⚠ {price.warnings.length} aviso(s)
          </span>
        )}
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Produto</span>
          <span className="font-medium">{base}</span>
        </div>
        {price && price.additionalCents > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">Adicionais</span>
            <span className="font-medium">+{formatBRL(price.additionalCents)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-500">Quantidade</span>
          <span className="font-medium">{quantity}x</span>
        </div>
        <div className="flex justify-between border-t border-slate-100 pt-2">
          <span className="text-slate-500">Total estimado</span>
          <span className="font-bold text-brand-900">{total}</span>
        </div>
      </div>
      <p className="text-[10px] text-slate-400 mt-2">
        Previsão do frontend. O valor definitivo é validado pelo backend ao salvar ou gerar orçamento.
      </p>
    </div>
  );
}
