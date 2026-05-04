import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import type { Material } from '../modals/materials';

const CATEGORY_KEYWORDS: { label: string; keywords: string[] }[] = [
  { label: '리튬', keywords: ['리튬', 'lithium', 'li'] },
  { label: '니켈', keywords: ['니켈', 'nickel', 'ni'] },
  { label: '코발트', keywords: ['코발트', 'cobalt', 'co'] },
  { label: '망간', keywords: ['망간', 'manganese', 'mn'] },
];

function categorize(name: string): string {
  const lower = name.toLowerCase();
  for (const cat of CATEGORY_KEYWORDS) {
    if (cat.keywords.some((k) => lower.includes(k))) return cat.label;
  }
  return '기타';
}

interface Args {
  pageSize: number;
  searchQuery: string;
}

export function useMaterialsData({ pageSize, searchQuery }: Args) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const data = await api.get<Material[] | { records?: Material[]; materials?: Material[] }>('/materials');
      const list = Array.isArray(data) ? data : data.records || data.materials || [];
      setMaterials(list);
    } catch {
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const filteredMaterials = useMemo(() => {
    if (!searchQuery) return materials;
    const q = searchQuery.toLowerCase();
    return materials.filter((m) =>
      (m.materialId || '').toLowerCase().includes(q) ||
      (m.name || '').toLowerCase().includes(q) ||
      (m.origin || '').toLowerCase().includes(q) ||
      (m.supplier || '').toLowerCase().includes(q) ||
      (m.certificationId || '').toLowerCase().includes(q)
    );
  }, [materials, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredMaterials.length / pageSize));
  const paginatedMaterials = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMaterials.slice(start, start + pageSize);
  }, [filteredMaterials, currentPage, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const certifiedCount = filteredMaterials.filter((m) => m.certificationId).length;

  const originUniqueCount = useMemo(() => {
    const origins = filteredMaterials.map((m) => m.origin).filter(Boolean);
    return new Set(origins).size;
  }, [filteredMaterials]);

  const categoryDist = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of materials) {
      const cat = categorize(m.name || '');
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [materials]);

  return {
    materials,
    filteredMaterials,
    paginatedMaterials,
    loading,
    currentPage,
    setCurrentPage,
    totalPages,
    certifiedCount,
    originUniqueCount,
    categoryDist,
    fetchMaterials,
  };
}
