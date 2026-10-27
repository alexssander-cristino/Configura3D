import { Progress } from '@react-three/drei';

export function ViewerLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-slate-500">
      <Progress />
      <p className="mt-3 text-sm">Carregando modelo 3D…</p>
    </div>
  );
}
