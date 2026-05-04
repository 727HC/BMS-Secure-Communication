import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { PAGE_SIZE, getGbaPct, type GbaFilter, type ListResponse, type Passport } from './lib';

interface Args {
  searchQuery: string;
  filterStatus: string;
  gbaFilter: GbaFilter;
  sortBy: 'latest' | 'gba';
}

export function usePassportsData({ searchQuery, filterStatus, gbaFilter, sortBy }: Args) {
  const [passports, setPassports] = useState<Passport[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<ListResponse<Passport> | Passport[]>('/passports');
        const list = Array.isArray(data) ? data : data.records || [];
        if (!cancelled) setPassports(list);
      } catch {
        if (!cancelled) setPassports([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredPassports = useMemo(() => {
    let list = passports;
    if (filterStatus) list = list.filter((p) => p.status === filterStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) =>
        (p.serialNumber || '').toLowerCase().includes(q) ||
        (p.passportId || '').toLowerCase().includes(q) ||
        (p.batteryId || '').toLowerCase().includes(q) ||
        (p.did || '').toLowerCase().includes(q) ||
        (p.model || '').toLowerCase().includes(q) ||
        (p.manufacturerName || '').toLowerCase().includes(q) ||
        (p.vin || '').toLowerCase().includes(q)
      );
    }
    if (gbaFilter === 'complete') list = list.filter((p) => getGbaPct(p) === 100);
    if (gbaFilter === 'incomplete') list = list.filter((p) => getGbaPct(p) < 100);
    if (sortBy === 'latest') {
      list = [...list].sort((a, b) =>
        String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''))
      );
    } else if (sortBy === 'gba') {
      list = [...list].sort((a, b) => getGbaPct(a) - getGbaPct(b));
    }
    return list;
  }, [passports, filterStatus, searchQuery, sortBy, gbaFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPassports.length / PAGE_SIZE));
  const paginatedPassports = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredPassports.slice(start, start + PAGE_SIZE);
  }, [filteredPassports, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, sortBy, gbaFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  return {
    passports,
    setPassports,
    filteredPassports,
    paginatedPassports,
    loading,
    currentPage,
    setCurrentPage,
    totalPages,
  };
}
