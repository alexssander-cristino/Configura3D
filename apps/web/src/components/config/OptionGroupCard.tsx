import { Option } from '@/types';
import { formatBRL } from '@/lib/format';

interface OptionGroupCardProps {
  group: any;
  selected: string[];
  onSelect: (optionIds: string[]) => void;
}

export function OptionGroupCard({ group, selected, onSelect }: OptionGroupCardProps) {
  const isMulti = group.maxSelections > 1;
  const required = group.isRequired ? ' (obrigatório)' : '';
  const typeLabel = {
    color: 'Cor',
    material: 'Material',
    finish: 'Acabamento',
    component: 'Componente',
    accessory: 'Acessório',
    dimension: 'Dimensão',
    quantity: 'Quantidade',
  }[String((group as any).type)] || String((group as any).type);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">{group.name}{required}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 font-semibold">{String((group as any).type)}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {group.options.map((opt: Option) => (
          <OptionButton
            key={opt.id}
            option={opt}
            active={selected.includes(opt.id)}
            onToggle={(id: string) => {
              const next = selected.includes(id)
                ? selected.filter((x) => x !== id)
                : [...selected, id];
              // grupos de seleção única substituem
              const final = isMulti ? next : [id];
              onSelect(final);
            }}
          />
        ))}
      </div>
      <p className="text-[10px] text-slate-400">
        {group.minSelections}–{group.maxSelections} seleção{group.maxSelections > 1 ? 'ões' : ''}
      </p>
    </div>
  );
}

interface OptionButtonProps {
  option: Option;
  active: boolean;
  onToggle: (id: string) => void;
}

function OptionButton({ option, active, onToggle }: OptionButtonProps) {
  const disabled = !option.isAvailable || option.isDiscontinued;
  const meta = (option.metadata || {}) as any;
  const isColor = !!meta.color;
  const swatchColor = isColor ? String(meta.color || '#ffffff') : '#ffffff';
  return (
    <button
      onClick={() => { if (!disabled) onToggle(option.id); }}
      disabled={disabled}
      className={`
        relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 text-center transition-all
        ${active
          ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-[0_0_0_2px_#2563eb]'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'}
        ${disabled ? 'opacity-50 pointer-events-none ring-1 ring-slate-200' : ''}
      `}
      title={option.isDiscontinued ? 'Item descontinuado' : !option.isAvailable ? 'Indisponível' : undefined}
    >
      {isColor && !active ? (
        <div className="w-8 h-8 rounded-full border border-slate-200" style={{ backgroundColor: swatchColor }} />
      ) : null}
      <div className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-[10px] font-semibold overflow-hidden"
           style={{ backgroundColor: swatchColor }}>
        {isColor ? null : option.value.length > 8 ? option.value.slice(0, 7) + '…' : option.value.charAt(0).toUpperCase()}
      </div>
      <span className="text-[10px] font-medium text-slate-600 truncate">{option.name}</span>
      {option.priceAdditionalCents > 0 && (
        <span className="text-[10px] text-slate-500">+{formatBRL(Number(option.priceAdditionalCents))}</span>
      )}
      {disabled && (
        <span className="absolute -inset-px rounded-xl border border-red-200 bg-red-50/40 pointer-events-none" />
      )}
      {active && (
        <svg className="absolute top-1 right-1 w-4 h-4 text-brand-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
      )}
    </button>
  );
}
