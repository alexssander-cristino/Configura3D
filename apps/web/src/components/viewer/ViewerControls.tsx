/**
 * ViewerControls - Controles acessíveis do visualizador (rotação, zoom, reset).
 * Funciona com teclado e toque; não depende de hover/mouse.
 */

import React from 'react';
import { useViewerActions } from './ViewerActions';

interface ViewerControlsProps {}

export function ViewerControls(_props: ViewerControlsProps) {
  const { rotateLeft, rotateRight, zoomIn, zoomOut, resetView } = useViewerActions();

  const handleKey = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft': e.preventDefault(); rotateLeft(); break;
      case 'ArrowRight': e.preventDefault(); rotateRight(); break;
      case 'ArrowUp': e.preventDefault(); zoomIn(); break;
      case 'ArrowDown': e.preventDefault(); zoomOut(); break;
      case 'Home': e.preventDefault(); resetView(); break;
    }
  };

  return (
    <div
      className="absolute bottom-4 left-4 flex flex-col gap-2"
      aria-label="Controles do visualizador 3D"
      onKeyDown={handleKey}
    >
      <div className="flex gap-1.5">
        <button
          onClick={rotateLeft}
          className="w-10 h-10 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 active:scale-95 transition"
          aria-label="Rodar para a esquerda"
          title="Rodar esquerda (seta ←)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button
          onClick={rotateRight}
          className="w-10 h-10 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 active:scale-95 transition"
          aria-label="Rodar para a direita"
          title="Rodar direita (seta →)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={zoomIn}
          className="w-10 h-10 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 active:scale-95 transition"
          aria-label="Aproximar"
          title="Aproximar (seta ↑)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
        </button>
        <button
          onClick={zoomOut}
          className="w-10 h-10 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 active:scale-95 transition"
          aria-label="Afastar"
          title="Afastar (seta ↓)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7 7 7" /></svg>
        </button>
      </div>
      <button
        onClick={resetView}
        className="w-full rounded-lg border border-slate-200 bg-white flex items-center justify-center gap-2 px-3 text-sm text-slate-600 hover:bg-slate-50 active:scale-95 transition"
        aria-label="Reiniciar visualização"
        title="Reiniciar (tecla Home)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        Reiniciar visão
      </button>
    </div>
  );
}
