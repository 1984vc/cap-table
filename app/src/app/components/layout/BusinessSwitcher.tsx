import { useState } from 'react';
import { useBusiness } from '../../contexts/BusinessContext';
import { Button } from '../ui/button';

export function BusinessSwitcher() {
  const { companies, activeCompany, switchCompany, createCompany } = useBusiness();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCurrency, setNewCurrency] = useState('KES');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      await createCompany(newName.trim(), newCurrency);
      setNewName('');
      setShowCreate(false);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {companies.length > 0 ? (
        <select
          value={activeCompany?.id ?? ''}
          onChange={(e) => switchCompany(e.target.value)}
          className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name} ({company.currency})
            </option>
          ))}
        </select>
      ) : (
        <span className="text-sm text-gray-500 dark:text-gray-400">No business yet</span>
      )}

      {!showCreate ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowCreate(true)}
        >
          + New Business
        </Button>
      ) : (
        <form onSubmit={handleCreate} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Business name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            autoFocus
          />
          <select
            value={newCurrency}
            onChange={(e) => setNewCurrency(e.target.value)}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="KES">KES</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="NGN">NGN</option>
            <option value="ZAR">ZAR</option>
            <option value="GHS">GHS</option>
            <option value="TZS">TZS</option>
            <option value="UGX">UGX</option>
          </select>
          <Button type="submit" size="sm" disabled={isCreating}>
            {isCreating ? 'Creating…' : 'Create'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowCreate(false)}
          >
            Cancel
          </Button>
        </form>
      )}
    </div>
  );
}
