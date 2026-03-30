import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

export interface Company {
  id: string;
  name: string;
  currency: string;
}

interface BusinessContextType {
  companies: Company[];
  activeCompany: Company | null;
  activeCompanyId: string | null;
  loading: boolean;
  switchCompany: (companyId: string) => void;
  createCompany: (name: string, currency: string) => Promise<void>;
  refreshCompanies: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCompanies = useCallback(async () => {
    if (!user) {
      setCompanies([]);
      setActiveCompanyId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from('user_companies')
      .select('company_id, is_default, companies(id, name, currency)')
      .eq('user_id', user.id);

    if (data) {
      const companyList: Company[] = data.map((uc: any) => uc.companies).filter(Boolean);
      setCompanies(companyList);

      const savedId = localStorage.getItem('activeCompanyId');
      const defaultEntry = data.find((uc: any) => uc.is_default);
      const resolved =
        companyList.find((c) => c.id === savedId)?.id ||
        defaultEntry?.company_id ||
        companyList[0]?.id ||
        null;
      setActiveCompanyId(resolved);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const switchCompany = (companyId: string) => {
    setActiveCompanyId(companyId);
    localStorage.setItem('activeCompanyId', companyId);
  };

  const createCompany = async (name: string, currency: string) => {
    if (!user) return;

    const { data: company, error } = await supabase
      .from('companies')
      .insert({ name, currency })
      .select()
      .single();

    if (error) throw error;

    if (company) {
      await supabase.from('user_companies').insert({
        user_id: user.id,
        company_id: company.id,
        role: 'owner',
        is_default: companies.length === 0,
      });

      await loadCompanies();
      switchCompany(company.id);
    }
  };

  const activeCompany = companies.find((c) => c.id === activeCompanyId) ?? null;

  return (
    <BusinessContext.Provider
      value={{
        companies,
        activeCompany,
        activeCompanyId,
        loading,
        switchCompany,
        createCompany,
        refreshCompanies: loadCompanies,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) throw new Error('useBusiness must be used within BusinessProvider');
  return context;
};
