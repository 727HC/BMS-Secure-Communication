import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { PAGE_SIZE, isRecyclingRelated, type Passport, type Tab } from './lib';

interface Args {
  activeTab: Tab;
}

export function useRecyclingData({ activeTab }: Args) {
  const [passports, setPassports] = useState<Passport[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchPassports = async () => {
    setLoading(true);
    try {
      const data = await api.get<Passport[] | { records?: Passport[] }>('/passports');
      const list = Array.isArray(data) ? data : data.records || [];
      setPassports(list);
    } catch {
      setPassports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPassports();
  }, []);

  const filteredPassports = useMemo(() => {
    if (activeTab === 'recyclable') return passports.filter((p) => p.recycleAvailable === true);
    if (activeTab === 'recycling') return passports.filter((p) => p.status === 'RECYCLING');
    if (activeTab === 'disposed') return passports.filter((p) => p.status === 'DISPOSED');
    return passports.filter(isRecyclingRelated);
  }, [passports, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredPassports.length / PAGE_SIZE));
  const pagedPassports = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredPassports.slice(start, start + PAGE_SIZE);
  }, [filteredPassports, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const showingFrom = filteredPassports.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const showingTo = Math.min(currentPage * PAGE_SIZE, filteredPassports.length);

  const tabCounts = {
    all: passports.filter(isRecyclingRelated).length,
    recyclable: passports.filter((p) => p.recycleAvailable === true).length,
    recycling: passports.filter((p) => p.status === 'RECYCLING').length,
    disposed: passports.filter((p) => p.status === 'DISPOSED').length,
  };

  return {
    passports,
    filteredPassports,
    pagedPassports,
    loading,
    currentPage,
    setCurrentPage,
    totalPages,
    showingFrom,
    showingTo,
    tabCounts,
    fetchPassports,
  };
}
