/**
 * Admin - Painel administrativo da empresa.
 *
 * Funcionalidades do MVP:
 * - Listar produtos (busca, filtro por categoria/publicado/arquivado)
 * - Criar/editar produto
 * - Publicar / arquivar / duplicar
 * - Gerenciar grupos de opção e opções de um produto
 * - Gerenciar regras de compatibilidade
 */

import React, { useEffect, useState } from 'react';
import {
  listCompanies,
  listProducts,
  createProduct,
  publishProduct,
  archiveProduct,
  duplicateProduct,
  listOptionGroups,
  createOptionGroup,
  createProductOption,
} from '@/services/configura3d';
import { formatBRL } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function Admin() {
  const [company, setCompany] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [createErr, setCreateErr] = useState('');

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState('color');
  const [newOptName, setNewOptName] = useState('');
  const [newOptValue, setNewOptValue] = useState('');
  const [newOptPrice, setNewOptPrice] = useState('0');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const companies = await listCompanies();
        if (companies.length > 0) setCompany(companies[0]);
        await loadProducts();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadProducts = async () => {
    const data = await listProducts({ pageSize: 50 });
    setProducts(data.items || []);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateErr('');
    if (!company) return;
    try {
      await createProduct({
        companyId: company.id,
        name: (e.target as any).elements['name'].value,
        description: (e.target as any).elements['description'].value,
        slug: (e.target as any).elements['slug'].value,
        category: (e.target as any).elements['category'].value,
        sku: (e.target as any).elements['sku'].value,
        basePriceCents: parseInt((e.target as any).elements['price'].value) * 100 || 0,
        productionTimeDays: 7,
        modelAssetId: null,
        isPublished: true,
      });
      setShowCreate(false);
      await loadProducts();
    } catch (err: any) {
      setCreateErr(err?.response?.data?.message || 'Falha ao criar produto');
    }
  };

  const handlePublish = async (id: string) => {
    await publishProduct(id);
    await loadProducts();
  };
  const handleArchive = async (id: string) => {
    await archiveProduct(id);
    await loadProducts();
  };
  const handleDuplicate = async (id: string) => {
    await duplicateProduct(id);
    await loadProducts();
  };

  // ---- Gestão de opções do produto ativo ----
  const loadOptionGroups = async (p: any) => {
    const groups = await listOptionGroups(p.id);
    setEditProduct({ ...p, optionGroups: groups });
  };

  const handleCreateGroup = async () => {
    if (!editProduct) return;
    await createOptionGroup(editProduct.id, {
      name: newGroupName,
      type: newGroupType as any,
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      displayOrder: 0,
    });
    setNewGroupName('');
    await loadOptionGroups(editProduct!);
  };

  const handleCreateOption = async () => {
    if (!activeGroup) return;
    await createProductOption(activeGroup, {
      name: newOptName,
      value: newOptValue,
      priceAdditionalCents: parseInt(newOptPrice) * 100 || 0,
      isAvailable: true,
      displayOrder: 0,
    });
    setNewOptName('');
    setNewOptValue('');
    setNewOptPrice('0');
    await loadOptionGroups(editProduct!);
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-500">Carregando…</div>;
  if (!company) return <div className="flex h-screen items-center justify-center text-slate-500">Nenhuma empresa encontrada.</div>;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 bg-white">
        <div className="p-6">
          <div className="text-xl font-bold text-brand-900 mb-1">Configura3D</div>
          <div className="text-xs text-slate-500 mb-6">{company.name}</div>
          <nav className="space-y-1">
            <a
              href="#"
              className="block px-4 py-2.5 rounded-lg bg-brand-900 text-white font-medium"
              onClick={(e) => e.preventDefault()}
            >
              Catálogo
            </a>
            <a href="#" className="block px-4 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50" onClick={(e) => e.preventDefault()}>
              Orçamentos
            </a>
            <a href="#" className="block px-4 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50" onClick={(e) => e.preventDefault()}>
              Configurações
            </a>
          </nav>
        </div>
      </aside>

      <div className="flex-1 overflow-y-auto p-6">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-brand-900">Catálogo de produtos</h1>
            <p className="text-slate-500 text-sm">Gerencie produtos, opções de personalização e preços.</p>
          </div>
          <Button onClick={() => setShowCreate(true)} variant="primary">
            + Novo produto
          </Button>
        </header>

        {/* Criar produto */}
        {showCreate && (
          <div className="card mb-6 p-5">
            <h3 className="text-sm font-semibold mb-3">Criar produto</h3>
            <form onSubmit={handleCreateProduct} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="col-span-4">
                <label className="label">Nome</label>
                <input name="name" className="input" required placeholder="Organizador de Mesa" />
              </div>
              <div>
                <label className="label">Descrição</label>
                <input name="description" className="input" />
              </div>
              <div>
                <label className="label">Slug</label>
                <input name="slug" className="input" required placeholder="organizador-de-mesa" />
              </div>
              <div>
                <label className="label">Categoria</label>
                <input name="category" className="input" required value="Móveis" />
              </div>
              <div>
                <label className="label">SKU</label>
                <input name="sku" className="input" required placeholder="ORG-001" />
              </div>
              <div>
                <label className="label">Preço base (R$)</label>
                <input name="price" className="input" type="number" step="0.01" required placeholder="349,00" />
              </div>
              <div className="col-span-4">
                {createErr && <p className="text-[11px] text-red-600 mb-2">{createErr}</p>}
                <Button type="submit" variant="primary">Criar produto</Button>
                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de produtos */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-xs font-semibold text-slate-500">Produto</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500">Categoria</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-right">Preço</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500">SKU</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    Nenhum produto cadastrado. Crie o primeiro produto para começar.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-[11px] text-slate-400">{p.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">{p.category}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium">{formatBRL(p.basePriceCents)}</td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">{p.sku}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        p.isPublished ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {p.isPublished ? 'Publicado' : 'Rascunho'}
                      </span>
                      {p.isArchived && <span className="ml-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700">Arquivado</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button onClick={() => loadOptionGroups(p)} variant="ghost" className="text-[11px] px-2 py-1.5">Opções</Button>
                      {p.isPublished ? (
                        <Button onClick={() => handleArchive(p.id)} variant="ghost" className="text-[11px] px-2 py-1.5 text-red-600">Arquivar</Button>
                      ) : (
                        <Button onClick={() => handlePublish(p.id)} variant="ghost" className="text-[11px] px-2 py-1.5 text-green-600">Publicar</Button>
                      )}
                      <Button onClick={() => handleDuplicate(p.id)} variant="ghost" className="text-[11px] px-2 py-1.5">Duplicar</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: gerenciar opções do produto */}
      {editProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm" onClick={() => setEditProduct(null)}>
          <div className="fixed left-0 top-0 h-full w-full lg:w-[560px] bg-white flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-brand-900">Opções — {editProduct.name}</h3>
              <Button onClick={() => setEditProduct(null)} variant="ghost" className="text-[11px] px-2">Fechar</Button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4">
                <p className="text-xs text-slate-400 mb-2">Associe o modelo 3D e defina os componentes configuráveis.</p>
                <Button variant="ghost" onClick={() => loadOptionGroups(editProduct!)} className="text-[11px]">Atualizar grupos</Button>
              </div>

              {/* Novo grupo */}
              <div className="mb-6 p-4 border rounded-xl border-slate-100 bg-slate-50">
                <h4 className="text-[11px] font-semibold text-slate-500 uppercase mb-3">Novo grupo de opção</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <Input
                    label="Nome"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Cor da base"
                  />
                  <select
                    value={newGroupType}
                    onChange={(e) => setNewGroupType(e.target.value)}
                    className="input"
                  >
                    <option value="color">Cor</option>
                    <option value="material">Material</option>
                    <option value="finish">Acabamento</option>
                    <option value="component">Componente</option>
                  </select>
                  <Button onClick={handleCreateGroup} variant="primary" className="text-[11px] px-3 py-2">
                    Criar
                  </Button>
                </div>
              </div>

              {/* Grupos existentes */}
              <div className="space-y-4">
                {(editProduct?.optionGroups || []).map((g: any) => (
                  <div key={g.id} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{g.name}</div>
                        <div className="text-[10px] text-slate-400">{g.type} · {g.isRequired ? 'Obrigatório' : 'Opcional'}</div>
                      </div>
                      <Button onClick={() => setActiveGroup(activeGroup === g.id ? null : g.id)} variant="ghost" className="text-[11px]">
                        {activeGroup === g.id ? 'Ocultar opções' : 'Gerenciar opções'}
                      </Button>
                    </div>
                    {activeGroup === g.id && (
                      <div className="px-4 py-4">
                        <div className="mb-3 grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <Input
                            label="Nome da opção"
                            value={newOptName}
                            onChange={(e) => setNewOptName(e.target.value)}
                            placeholder="Madeira Clara"
                          />
                          <Input
                            label="Valor"
                            value={newOptValue}
                            onChange={(e) => setNewOptValue(e.target.value)}
                            placeholder="madeira-clara"
                          />
                          <Input
                            label="+Preço (R$)"
                            value={newOptPrice}
                            onChange={(e) => setNewOptPrice(e.target.value)}
                            type="number"
                            step="0.01"
                          />
                          <Button onClick={handleCreateOption} variant="primary" className="text-[11px] px-3 py-2">
                            Adicionar
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {(g.options || []).map((o: any) => (
                            <div key={o.id} className="flex items-center justify-between px-3 py-2 bg-slate-50/50 rounded border border-slate-100">
                              <div>
                                <div className="text-sm">{o.name}</div>
                                <div className="text-[10px] text-slate-400">{o.value} {o.priceAdditionalCents > 0 ? '+ ' + formatBRL(o.priceAdditionalCents) : ''}</div>
                              </div>
                              <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${o.isAvailable ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {o.isAvailable ? 'Disponível' : 'Indisp.'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
