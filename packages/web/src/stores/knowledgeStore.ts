import { create } from 'zustand';

export interface KnowledgeItem {
  id: string;
  content: string;
  source: 'manual' | 'import' | 'ai_generated';
  tags: string[];
  industry: string;
  weight: number;
  createdAt: string;
  updatedAt: string;
}

export type KnowledgeFilter = 'all' | string;

interface KnowledgeState {
  items: KnowledgeItem[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  activeFilter: KnowledgeFilter;
  editingItem: KnowledgeItem | null;
  isFormOpen: boolean;
  isImportOpen: boolean;

  setItems: (items: KnowledgeItem[]) => void;
  addItem: (item: KnowledgeItem) => void;
  updateItem: (id: string, data: Partial<KnowledgeItem>) => void;
  deleteItem: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setActiveFilter: (filter: KnowledgeFilter) => void;
  setEditingItem: (item: KnowledgeItem | null) => void;
  setIsFormOpen: (open: boolean) => void;
  setIsImportOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useKnowledgeStore = create<KnowledgeState>((set) => ({
  items: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  activeFilter: 'all',
  editingItem: null,
  isFormOpen: false,
  isImportOpen: false,

  setItems: (items) => set({ items }),
  addItem: (item) => set((state) => ({ items: [item, ...state.items] })),
  updateItem: (id, data) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...data, updatedAt: new Date().toISOString() } : item,
      ),
    })),
  deleteItem: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveFilter: (filter) => set({ activeFilter: filter }),
  setEditingItem: (item) => set({ editingItem: item }),
  setIsFormOpen: (open) => set({ isFormOpen: open }),
  setIsImportOpen: (open) => set({ isImportOpen: open }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
