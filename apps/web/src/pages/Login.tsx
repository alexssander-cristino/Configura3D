import React, { useState } from 'react';
import { ArrowRight, Box, CheckCircle2, Layers3, ShieldCheck, Sparkles } from 'lucide-react';
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
      } else {
        await register({
          email,
          password,
          name,
          role: 'owner',
          company: { name: companyName || 'Minha Empresa', slug: companySlug || 'minha-empresa' },
        });
        await login(email, password);
      }
      navigate('/configurator');
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Não foi possível autenticar. Confira os dados e tente novamente.';
      setErr(msg);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f6fb] lg:grid lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#171633] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute inset-0 soft-grid opacity-30" />
        <div className="absolute -right-36 top-24 h-96 w-96 rounded-full bg-violet-600/30 blur-3xl" />
        <div className="absolute -bottom-36 -left-24 h-96 w-96 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-violet-700 shadow-lg"><Box size={23} /></div>
          <div><div className="font-extrabold tracking-tight text-xl">Configura3D</div><div className="text-xs text-white/55">PRODUCT STUDIO</div></div>
        </div>
        <div className="relative z-10 max-w-xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-violet-200"><Sparkles size={14} /> Personalização em outra dimensão</div>
          <h1 className="mb-6 text-5xl font-extrabold leading-[1.08] tracking-[-.055em] xl:text-6xl">Seu produto.<br /><span className="text-violet-300">Do seu jeito.</span></h1>
          <p className="max-w-md text-base leading-7 text-white/65">Transforme escolhas em experiências visuais. Configure produtos em 3D, organize opções e acompanhe solicitações de orçamento em um só lugar.</p>
          <div className="mt-9 grid max-w-lg grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4"><Layers3 size={19} className="mb-3 text-violet-300" /><div className="font-bold">Configuração 3D</div><div className="mt-1 text-xs text-white/50">Visualização interativa</div></div>
            <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4"><ShieldCheck size={19} className="mb-3 text-violet-300" /><div className="font-bold">Gestão simples</div><div className="mt-1 text-xs text-white/50">Produtos e orçamentos</div></div>
          </div>
        </div>
        <div className="relative z-10 text-xs text-white/35">Configura3D · Plataforma de personalização de produtos</div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[430px] fade-up">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-700 text-white"><Box size={23} /></div>
            <div><div className="text-xl font-extrabold tracking-tight text-slate-900">Configura3D</div><div className="text-xs text-slate-500">Product Studio</div></div>
          </div>
          <div className="mb-8">
            <div className="eyebrow mb-3">{mode === 'login' ? 'BEM-VINDO DE VOLTA' : 'COMECE AGORA'}</div>
            <h2 className="page-heading text-3xl sm:text-4xl">{mode === 'login' ? 'Acesse sua conta' : 'Crie seu espaço'}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">{mode === 'login' ? 'Entre para continuar gerenciando seus produtos.' : 'Cadastre sua empresa e comece a configurar produtos em 3D.'}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-1 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_55px_rgba(35,36,78,.07)] sm:p-8">
            {mode === 'register' && <>
              <Input label="Seu nome" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" placeholder="Como podemos te chamar?" />
              <Input label="Nome da empresa" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Sua empresa" />
              <Input label="Identificador da empresa" value={companySlug} onChange={(e) => setCompanySlug(e.target.value)} placeholder="minha-empresa" />
            </>}
            <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="voce@empresa.com" />
            <Input label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Sua senha" />
            {err && <div role="alert" className="my-3 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{err}</div>}
            <Button type="submit" variant="primary" className="mt-3 w-full !rounded-xl !py-3.5" loading={submitting}>
              {mode === 'login' ? 'Entrar na plataforma' : 'Criar minha conta'} {!submitting && <ArrowRight size={16} />}
            </Button>
            <div className="pt-4 text-center text-sm text-slate-500">
              {mode === 'login' ? 'Ainda não tem uma conta?' : 'Já possui uma conta?'}{' '}
              <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }} className="font-bold text-violet-700 transition hover:text-violet-900">
                {mode === 'login' ? 'Criar conta' : 'Fazer login'}
              </button>
            </div>
          </form>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400"><CheckCircle2 size={14} /> Acesso seguro à sua área de trabalho</div>
        </div>
      </section>
    </main>
  );
}
