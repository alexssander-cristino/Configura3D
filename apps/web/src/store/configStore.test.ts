import { describe, it, expect, beforeEach } from 'vitest';
import { useConfigStore } from './configStore';

describe('store de configuração', () => {
  beforeEach(() => {
    useConfigStore.setState({
      product: null,
      optionGroups: [],
      selections: {},
      quantity: 1,
      price: null,
      loading: false,
      error: null,
      configurationId: null,
      shareToken: null,
    });
  });

  it('alterna seleção de opção', () => {
    const { toggleSelection } = useConfigStore.getState();
    toggleSelection('g1', 'opt-a');
    expect(useConfigStore.getState().selections['g1']).toEqual(['opt-a']);
    toggleSelection('g1', 'opt-a');
    expect(useConfigStore.getState().selections['g1']).toEqual([]);
  });

  it('define seleções em lote', () => {
    const { setSelections } = useConfigStore.getState();
    setSelections({ g1: ['a'], g2: ['b', 'c'] });
    expect(useConfigStore.getState().selections).toEqual({ g1: ['a'], g2: ['b', 'c'] });
  });
});
