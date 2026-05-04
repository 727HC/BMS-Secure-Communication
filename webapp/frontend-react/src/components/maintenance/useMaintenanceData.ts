import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { PAGE_SIZE, type Passport, type Tab } from './lib';

interface Args {
  activeTab: Tab;
  isEVManufacturer: boolean;
}

export function useMaintenanceData({ activeTab, isEVManufacturer }: Args) {
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

  const isWorkbenchItem = (p: Passport): boolean => {
    const hasHistory = (p.maintenanceLogs && p.maintenanceLogs.length > 0) ||
      (p.accidentLogs && p.accidentLogs.length > 0);
    const canRequest = isEVManufacturer && p.status === 'ACTIVE' && p.vin;
    return p.status === 'MAINTENANCE' || p.status === 'ANALYSIS' || Boolean(hasHistory) || Boolean(canRequest);
  };

  const filteredPassports = useMemo(() => {
    if (activeTab === 'maintenance') return passports.filter((p) => p.status === 'MAINTENANCE' || p.status === 'ANALYSIS');
    if (activeTab === 'accident') return passports.filter((p) => (p.accidentLogs?.length ?? 0) > 0);
    return passports.filter(isWorkbenchItem);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passports, activeTab, isEVManufacturer]);

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
    all: passports.filter(isWorkbenchItem).length,
    maintenance: passports.filter((p) => p.status === 'MAINTENANCE' || p.status === 'ANALYSIS').length,
    accident: passports.filter((p) => (p.accidentLogs?.length ?? 0) > 0).length,
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
