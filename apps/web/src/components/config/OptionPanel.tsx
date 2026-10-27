/**
 * OptionPanel - Painel lateral de personalização (desktop) / drawer (mobile).
 * Exibe grupos de opção do produto e permite selecionar cada uma.
 */

import { useConfigStore } from '@/store/configStore';
import { OptionGroupCard } from './OptionGroupCard';

export function OptionPanel() {
  const { product, optionGroups, selections, setSelection, setError } = useConfigStore();

  if (!product) return null;

  return (
    <aside className="flex flex-col h-full border-l border-slate-200 bg-white/80 backdrop-blur backdrop-saturate-150">
      <div className="p-5 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-700">Personalizar</h2>
        <p className="text-xs text-slate-500 mt-0.5">{product.name}</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {optionGroups.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">Sem opções de personalização cadastradas.</p>
        ) : (
          optionGroups.map((group) => (
            <OptionGroupCard
              key={group.id}
              group={group}
              selected={selections[group.id] || []}
              onSelect={(optionIds) => setSelection(group.id, optionIds)}
            />
          ))
        )}
      </div>
      <div className="p-4 border-t border-slate-200 bg-slate-50/50">
        <button
          onClick={() => setError(null)}
          className="w-full btn-ghost text-xs font-medium"
        >
          Limpar seleções
        </button>
      </div>
    </aside>
  );
}
