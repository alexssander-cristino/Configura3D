export function ViewerError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-3">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M60 12V9c0-2.2-1.79-4-4-4H9c-2.21 0-4 1.79-4 4v12c0 2.21 1.79 4 4 4h47c2.21 0 4-1.79 4-4V9h-1z" /></svg>
      </div>
      <h3 className="text-sm font-semibold mb-1">Não foi possível carregar o modelo 3D</h3>
      <p className="text-xs text-slate-500 mb-4">O produto ainda pode ser configurado, mas a visualização 3D está indisponível.</p>
      <button
        onClick={onRetry}
        className="btn-primary rounded-lg text-xs px-3 py-1.5"
      >
        Tentar novamente
      </button>
    </div>
  );
}
