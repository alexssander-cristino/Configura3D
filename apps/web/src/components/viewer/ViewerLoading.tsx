import { Html, useProgress } from '@react-three/drei';

interface ViewerLoadingProps {
  visible?: boolean;
}

export function ViewerLoading({ visible = true }: ViewerLoadingProps) {
  const { progress } = useProgress();

  if (!visible) return null;

  return (
    <Html center>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, borderRadius: 12, background: 'rgba(255,255,255,0.92)', color: '#475569', minWidth: 180 }}>
        <div style={{ width: 28, height: 28, border: '2px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', marginBottom: 12 }} />
        <span style={{ fontSize: 14, fontWeight: 600 }}>Carregando modelo 3D…</span>
        <span style={{ fontSize: 12, marginTop: 4 }}>{Math.round(progress)}%</span>
      </div>
    </Html>
  );
}
