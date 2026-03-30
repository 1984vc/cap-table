import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface Company {
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

  const loadCompanies = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('user_companies')
      .select('company_id, is_default, companies(id, name, currency)')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error loading companies:', error);
      setLoading(false);
      return;
    }

    if (data) {
      const companyList = data.map((uc: any) => uc.companies).filter(Boolean);
      setCompanies(companyList);
      
      const defaultCompany = data.find((uc: any) => uc.is_default);
      const savedCompanyId = localStorage.getItem('activeCompanyId');
      
      const initialCompanyId = 
        savedCompanyId && companyList.find((c: Company) => c.id === savedCompanyId)
          ? savedCompanyId
          : defaultCompany?.company_id || companyList[0]?.id;
      
      setActiveCompanyId(initialCompanyId || null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCompanies();
  }, [user]);

  const switchCompany = (companyId: string) => {
    setActiveCompanyId(companyId);
    localStorage.setItem('activeCompanyId', companyId);
  };

  const createCompany = async (name: string, currency: string) => {
    if (!user) throw new Error('No user logged in');

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({ name, currency })
      .select()
      .single();

    if (companyError) throw companyError;

    if (company) {
      const { error: linkError } = await supabase
        .from('user_companies')
        .insert({
          user_id: user.id,
          company_id: company.id,
          role: 'owner',
          is_default: companies.length === 0,
        });
      
      if (linkError) throw linkError;
      
      await loadCompanies();
      switchCompany(company.id);
    }
  };

  const activeCompany = companies.find((c) => c.id === activeCompanyId) || null;

  return (
    <BusinessContext.Provider value={{
      companies,
      activeCompany,
      activeCompanyId,
      loading,
      switchCompany,
      createCompany,
      refreshCompanies: loadCompanies,
    }}>
      {children}
    </BusinessContext.Provider>
  );
}

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) throw new Error('useBusiness must be used within BusinessProvider');
  return context;
};