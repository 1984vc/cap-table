import { useState } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import { Button } from '@/components/ui/button';

export function BusinessSwitcher() {
  const { companies, activeCompany, switchCompany, createCompany } = useBusiness();
  const [isCreating, setIsCreating] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyCurrency, setNewCompanyCurrency] = useState('KES');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await createCompany(newCompanyName, newCompanyCurrency);
      setIsCreating(false);
      setNewCompanyName('');
      setNewCompanyCurrency('KES');
    } catch (err: any) {
      console.error('Create company error:', err);
      setError(err.message || 'Failed to create company');
    } finally {
      setLoading(false);
    }
  };

  // No companies yet - show inline create form
  if (companies.length === 0) {
    return (
      <div className="rounded border bg-yellow-50 p-4 dark:bg-yellow-900/20 dark:border-yellow-700">
        <p className="mb-3 text-sm font-medium">No companies yet. Create one to get started:</p>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Company Name</label>
            <input
              type="text"
              placeholder="e.g., Syndikiza"
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
              required
              disabled={loading}
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium mb-1">Currency</label>
            <select
              value={newCompanyCurrency}
              onChange={(e) => setNewCompanyCurrency(e.target.value)}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
              disabled={loading}
            >
              <option value="KES">KES - Kenyan Shilling</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="NGN">NGN - Nigerian Naira</option>
              <option value="ZAR">ZAR - South African Rand</option>
            </select>
          </div>
          
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Company'}
          </Button>
        </form>
      </div>
    );
  }

  // Has companies - show switcher + new button
  return (
    <div className="flex items-center gap-2">
      <select
        value={activeCompany?.id || ''}
        onChange={(e) => switchCompany(e.target.value)}
        className="rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
      >
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.name} ({company.currency})
          </option>
        ))}
      </select>
      
      <Button 
        onClick={() => setIsCreating(true)} 
        variant="outline" 
        size="sm"
        className="whitespace-nowrap"
      >
        + New
      </Button>
      
      {/* Modal for creating new company */}
      {isCreating && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setIsCreating(false)}
        >
          <div 
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-semibold">Create New Company</h3>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Company Name</label>
                <input
                  type="text"
                  placeholder="e.g., My Second Company"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
                  required
                  autoFocus
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Currency</label>
                <select
                  value={newCompanyCurrency}
                  onChange={(e) => setNewCompanyCurrency(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
                  disabled={loading}
                >
                  <option value="KES">KES - Kenyan Shilling</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="NGN">NGN - Nigerian Naira</option>
                  <option value="ZAR">ZAR - South African Rand</option>
                </select>
              </div>
              
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
              
              <div className="flex gap-3">
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsCreating(false);
                    setError('');
                    setNewCompanyName('');
                    setNewCompanyCurrency('KES');
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}