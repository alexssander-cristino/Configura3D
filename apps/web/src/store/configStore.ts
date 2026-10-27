import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product, OptionGroup, Option, PriceBreakdown } from '../types';

export type Selections = Record<string, string[]>; // optionGroupId -> optionIds[]

export interface ConfigState {
  product: Product | null;
  optionGroups: OptionGroup[];
  selections: Selections;
  quantity: number;
  price: PriceBreakdown | null;
  loading: boolean;
  error: string | null;
  configurationId: string | null;
  shareToken: string | null;

  setProduct: (p: Product | null) => void;
  setOptionGroups: (groups: OptionGroup[]) => void;
  setSelection: (groupId: string, optionIds: string[]) => void;
  setSelections: (selections: Selections) => void;
  toggleSelection: (groupId: string, optionId: string) => void;
  setQuantity: (q: number) => void;
  setPrice: (p: PriceBreakdown | null) => void;
  setLoading: (l: boolean) => void;
  setError: (e: string | null) => void;
  setConfiguration: (id: string | null, token: string | null) => void;
  reset: () => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      product: null,
      optionGroups: [],
      selections: {},
      quantity: 1,
      price: null,
      loading: false,
      error: null,
      configurationId: null,
      shareToken: null,

      setProduct: (p) => set({ product: p }),
      setOptionGroups: (groups) => set({ optionGroups: groups }),
      setSelection: (groupId, optionIds) =>
        set((state) => ({ selections: { ...state.selections, [groupId]: optionIds } })),
      setSelections: (selections) => set({ selections }),
      toggleSelection: (groupId, optionId) =>
        set((state) => {
          const current = state.selections[groupId] || [];
          const next = current.includes(optionId)
            ? current.filter((id) => id !== optionId)
            : [...current, optionId];
          return { selections: { ...state.selections, [groupId]: next } };
        }),
      setQuantity: (q) => set({ quantity: q }),
      setPrice: (p) => set({ price: p }),
      setLoading: (l) => set({ loading: l }),
      setError: (e) => set({ error: e }),
      setConfiguration: (id, token) => set({ configurationId: id, shareToken: token }),
      reset: () =>
        set({
          product: null,
          optionGroups: [],
          selections: {},
          quantity: 1,
          price: null,
          loading: false,
          error: null,
          configurationId: null,
          shareToken: null,
        }),
    }),
    {
      name: 'configura3d-config',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        selections: state.selections,
        quantity: state.quantity,
        configurationId: state.configurationId,
        shareToken: state.shareToken,
      }),
    },
  ),
);
