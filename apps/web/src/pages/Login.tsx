import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register, login } from '@/services/configura3d';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useConfigStore } from '@/store/configStore';

export default function Login() {
  const navigate = useNavigate();
  const { setError } = useConfigStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companySlug, setCompanySlug] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        navigate('/configurator');
      } else {
        await register({
          email,
          password,
          name,
          role: 'owner',
          company: { name: companyName || 'Minha Empresa', slug: companySlug || 'minha-empresa' },
        });
        await login(email, password);
        navigate('/configurator');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao autenticar';
      setErr(msg);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-100">
      <div className="w-full max-w-md p-6">
        <div className="card p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-brand-900">Configura3D</h1>
            <p className="text-slate-500 text-sm">Configurador 3D de produtos e orçamentos</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            {mode === 'register' && (
              <>
                <Input
                  label="Nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  label="Nome da empresa"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
                <Input
                  label="Slug da empresa"
                  value={companySlug}
                  onChange={(e) => setCompanySlug(e.target.value)}
                  placeholder="minha-empresa"
                />
              </>
            )}
            {err && (
              <div className="p-3 rounded-lg bg-red-50 text-[11px] text-red-700">{err}</div>
            )}
            <Button type="submit" variant="primary" className="w-full" loading={submitting}>
              {mode === 'login' ? 'Entrar' : 'Criar conta'}
            </Button>
            <p className="text-center text-xs text-slate-500">
              {mode === 'login'
                ? 'Não tem uma conta? '
                : 'Já tem uma conta? '}
              <button
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="text-brand-600 font-semibold underline underline-offset-4 hover:text-brand-800"
              >
                {mode === 'login' ? 'Cadastre-se' : 'Faça login'}
              </button>
            </p>
          </form>
        </div>
        <p className="text-center text-[11px] text-slate-400 mt-4">
          Credenciais de demonstração: demo@configura3d.com / demo1234 (após criar a empresa demo via seed)
        </p>
      </div>
    </div>
  );
}
