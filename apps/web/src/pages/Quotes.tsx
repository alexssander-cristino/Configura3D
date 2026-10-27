import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, Check, Clock3, FileText, Search, Send, X } from 'lucide-react';
import { listQuotes, updateQuoteStatus } from '@/services/configura3d';
import { formatBRL } from '@/lib/format';
import { Button } from '@/components/ui/Button';

const STATUS: Record<string, { label: string; style: string }> = {
  draft: { label: 'Rascunho', style: 'bg-slate-100 text-slate-600 ring-slate-200' },
  sent: { label: 'Enviado', style: 'bg-blue-50 text-blue-700 ring-blue-100' },
  approved: { label: 'Aprovado', style: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  rejected: { label: 'Recusado', style: 'bg-rose-50 text-rose-700 ring-rose-100' },
  expired: { label: 'Expirado', style: 'bg-amber-50 text-amber-700 ring-amber-100' },
};

export default function Quotes() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pageError, setPageError] = useState('');

  const refresh = async () => {
    setPageError('');
    try {
      const d: any = await listQuotes();
      setQuotes(d.items || []);
    } catch (error: any) {
      setPageError(error?.response?.data?.message || 'Não foi possível carregar os orçamentos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => quotes.filter((q) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [q.quoteNumber, q.customerName, q.customerEmail].some((v) => String(v || '').toLowerCase().includes(term));
    return matchesSearch && (filter === 'all' || q.status === filter);
  }), [quotes, search, filter]);

  const stats = useMemo(() => ({
    total: quotes.length,
    pending: quotes.filter((q) => ['draft', 'sent'].includes(q.status)).length,
    approved: quotes.filter((q) => q.status === 'approved').length,
    value: quotes.filter((q) => q.status === 'approved').reduce((sum, q) => sum + Number(q.estimatedValueCents || 0), 0),
  }), [quotes]);

  const handleStatus = async (id: string, status: string) => {
    setBusyId(id);
    setPageError('');
    try {
      await updateQuoteStatus(id, status as any);
      setQuotes((current) => current.map((q) => q.id === id ? { ...q, status } : q));
    } catch (error: any) {
      setPageError(error?.response?.data?.message || 'Não foi possível atualizar o status.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="app-shell min-h-screen p-4 sm:p-6 lg:p-10">
      <div className="mx-auto max-w-[1440px] fade-up">
        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="eyebrow mb-2">COMERCIAL / ACOMPANHAMENTO</div>
            <h1 className="page-heading text-3xl sm:text-4xl">Orçamentos</h1>
            <p className="mt-2 text-sm text-slate-500">Acompanhe solicitações, aprove propostas e mantenha tudo organizado.</p>
          </div>
          <Button variant="ghost" onClick={refresh} loading={loading}><ArrowDownToLine size={16} /> Atualizar dados</Button>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat title="Total de propostas" value={String(stats.total)} caption="Todos os orçamentos" icon={<FileText size={18} />} />
          <Stat title="Em andamento" value={String(stats.pending)} caption="Aguardando decisão" icon={<Clock3 size={18} />} />
          <Stat title="Aprovados" value={String(stats.approved)} caption="Propostas convertidas" icon={<Check size={18} />} />
          <Stat title="Valor aprovado" value={formatBRL(stats.value)} caption="Soma das propostas aprovadas" icon={<span className="text-sm font-extrabold">R$</span>} />
        </section>

        {pageError && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{pageError}</div>}

        <section className="surface overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div><h2 className="font-extrabold text-slate-800">Todas as propostas</h2><p className="mt-1 text-xs text-slate-500">{filtered.length} resultado(s)</p></div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative block sm:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente ou número" className="input !pl-9 !py-2.5" />
              </label>
              <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input sm:w-44 !py-2.5">
                <option value="all">Todos os status</option>
                <option value="draft">Rascunho</option><option value="sent">Enviado</option><option value="approved">Aprovado</option><option value="rejected">Recusado</option><option value="expired">Expirado</option>
              </select>
            </div>
          </div>
          {loading ? <div className="p-16 text-center text-sm text-slate-500">Carregando orçamentos…</div> : filtered.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center"><div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><FileText size={24} /></div><h3 className="font-bold text-slate-800">Nenhum orçamento encontrado</h3><p className="mt-1 max-w-sm text-sm text-slate-500">Tente mudar a busca ou o filtro para encontrar uma proposta.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left">
                <thead><tr className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500"><th className="px-5 py-4 font-bold">Proposta</th><th className="px-5 py-4 font-bold">Cliente</th><th className="px-5 py-4 font-bold">Valor estimado</th><th className="px-5 py-4 font-bold">Status</th><th className="px-5 py-4 font-bold">Validade</th><th className="px-5 py-4 text-right font-bold">Ações</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((q) => {
                    const status = STATUS[q.status] || STATUS.draft;
                    return <tr key={q.id} className="transition hover:bg-violet-50/30">
                      <td className="px-5 py-4"><div className="font-bold text-slate-800">{q.quoteNumber || 'Sem número'}</div><div className="mt-1 text-[11px] text-slate-400">ID {String(q.id).slice(0, 8)}</div></td>
                      <td className="px-5 py-4"><div className="text-sm font-semibold text-slate-700">{q.customerName || 'Cliente não informado'}</div><div className="mt-1 text-xs text-slate-400">{q.customerEmail || 'Sem e-mail'}</div></td>
                      <td className="px-5 py-4 text-sm font-extrabold tabular-nums text-slate-800">{formatBRL(Number(q.estimatedValueCents || 0))}</td>
                      <td className="px-5 py-4"><span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${status.style}`}>{status.label}</span></td>
                      <td className="px-5 py-4 text-sm text-slate-500">{q.validUntil ? new Date(q.validUntil).toLocaleDateString('pt-BR') : '—'}</td>
                      <td className="px-5 py-4"><div className="flex justify-end gap-2">
                        {q.status === 'draft' && <Button loading={busyId === q.id} onClick={() => handleStatus(q.id, 'sent')} variant="primary" className="!px-3 !py-2 text-xs"><Send size={13} /> Enviar</Button>}
                        {['draft', 'sent'].includes(q.status) && <Button loading={busyId === q.id} onClick={() => handleStatus(q.id, 'approved')} variant="ghost" className="!px-3 !py-2 text-xs"><Check size={13} /> Aprovar</Button>}
                        {q.status === 'approved' && <Button loading={busyId === q.id} onClick={() => handleStatus(q.id, 'rejected')} variant="ghost" className="!px-3 !py-2 text-xs text-rose-600"><X size={13} /> Recusar</Button>}
                      </div></td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-400">Os valores são estimativas e podem depender da validação final da proposta.</div>
        </section>
      </div>
    </main>
  );
}

function Stat({ title, value, caption, icon }: { title: string; value: string; caption: string; icon: React.ReactNode }) {
  return <div className="surface p-5"><div className="flex items-start justify-between"><span className="text-sm font-semibold text-slate-500">{title}</span><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700">{icon}</span></div><div className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">{value}</div><div className="mt-1 text-xs text-slate-400">{caption}</div></div>;
}
