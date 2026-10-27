import React from 'react';
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

  if (checking) return null;
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
