import { useEffect, useState } from 'react';
import { listQuotes, updateQuoteStatus } from '@/services/configura3d';
import { formatBRL } from '@/lib/format';
import { Button } from '@/components/ui/Button';

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-50 text-blue-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  expired: 'bg-orange-50 text-orange-700',
};

export default function Quotes() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listQuotes().then((d: any) => setQuotes(d.items || [])).finally(() => setLoading(false));
  }, []);

  const handleStatus = async (id: string, status: string) => {
    await updateQuoteStatus(id, status as any);
    setQuotes(quotes.map((q) => (q.id === id ? { ...q, status } : q)));
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-500">Carregando…</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-brand-900">Orçamentos</h1>
        <p className="text-slate-500 text-sm">Solicitações de orçamento (não são compras concluídas)</p>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-xs font-semibold text-slate-500">Número</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500">Cliente</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500">Valor</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500">Válido até</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {quotes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">
                  Nenhum orçamento ainda.
                </td>
              </tr>
            ) : (
              quotes.map((q) => (
                <tr key={q.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium">{q.quoteNumber}</td>
                  <td className="px-4 py-3 text-sm">{q.customerName}</td>
                  <td className="px-4 py-3 text-sm">{formatBRL(Number(q.estimatedValueCents))}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-[10px] font-semibold ${STATUS_BADGE[q.status] || 'bg-slate-100 text-slate-600'}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{q.validUntil ? new Date(q.validUntil).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {q.status === 'draft' && (
                      <Button onClick={() => handleStatus(q.id, 'sent')} variant="primary" className="text-[10px] px-2 py-1.5">
                        Enviar
                      </Button>
                    )}
                    <Button
                      onClick={() => handleStatus(q.id, q.status === 'approved' ? 'rejected' : 'approved')}
                      variant="ghost"
                      className="text-[10px] px-2 py-1.5"
                    >
                      {q.status === 'approved' ? 'Recusar' : 'Aprovar'}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
