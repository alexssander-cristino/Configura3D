import React from 'react';
import { Box } from 'lucide-react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useConfigStore } from '@/store/configStore';
import Login from '@/pages/Login';
import Configurator from '@/pages/Configurator';
import SharedConfig from '@/pages/SharedConfig';
import Admin from '@/pages/Admin';
import Quotes from '@/pages/Quotes';
import { api } from '@/lib/api';

function RequireAuth() {
  const [checking, setChecking] = React.useState(true);
  const [authed, setAuthed] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        await api.get('/auth/me');
        setAuthed(true);
      } catch {
        setAuthed(false);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  if (checking) return <div className="flex min-h-screen items-center justify-center bg-[#f5f6fb]"><div className="flex flex-col items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-700 text-white shadow-lg shadow-violet-700/20"><Box size={23} /></div><div className="h-1.5 w-32 overflow-hidden rounded-full bg-violet-100"><div className="h-full w-1/2 animate-pulse rounded-full bg-violet-600" /></div><p className="text-xs font-semibold text-slate-500">Preparando seu espaço…</p></div></div>;
  if (!authed) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/configurator" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/configurator" element={<Configurator />} />
        <Route path="/configurator/share/:shareToken" element={<SharedConfig />} />
        <Route element={<RequireAuth />}>
          <Route path="admin" element={<Admin />} />
          <Route path="quotes" element={<Quotes />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
