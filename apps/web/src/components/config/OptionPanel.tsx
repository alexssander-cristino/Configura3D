import { SlidersHorizontal, RotateCcw, CheckCircle2 } from 'lucide-react';
import { useConfigStore } from '@/store/configStore';
import { OptionGroupCard } from './OptionGroupCard';

export function OptionPanel() {
  const { product, optionGroups, selections, setSelection, setError } = useConfigStore();
  if (!product) return null;
  const selectedCount = Object.values(selections).reduce((sum, values) => sum + values.length, 0);

  return (
    <aside className="flex h-full min-h-0 flex-col bg-white">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-violet-700"><SlidersHorizontal size={16} /><span className="eyebrow !text-violet-700">CONFIGURADOR</span></div>
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-extrabold text-violet-700">{selectedCount} selecionado(s)</span>
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">Personalize seu produto</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">{product.name} · Selecione as características abaixo e acompanhe o resultado em tempo real.</p>
        <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-emerald-700"><CheckCircle2 size={14} /> Alterações refletidas na visualização 3D</div>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
        {optionGroups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center"><SlidersHorizontal size={22} className="mx-auto mb-3 text-slate-300" /><p className="text-sm font-semibold text-slate-600">Nenhuma opção disponível</p><p className="mt-1 text-xs text-slate-400">Este produto ainda não tem opções cadastradas.</p></div>
        ) : optionGroups.map((group, index) => (
          <section key={group.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition hover:border-violet-100 hover:bg-white">
            <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-[10px] font-extrabold text-violet-700 shadow-sm ring-1 ring-slate-100">{String(index + 1).padStart(2, '0')}</span><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">ETAPA {index + 1}</span></div>
            <OptionGroupCard key={group.id} group={group} selected={selections[group.id] || []} onSelect={(optionIds) => setSelection(group.id, optionIds)} />
          </section>
        ))}
      </div>
      <div className="border-t border-slate-100 bg-white p-4 sm:p-5">
        <button onClick={() => { optionGroups.forEach((group) => setSelection(group.id, [])); setError(null); }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"><RotateCcw size={14} /> Limpar personalização</button>
      </div>
    </aside>
  );
}
