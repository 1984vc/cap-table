import { Button } from '@/components/ui/button';

interface CalculatorPageProps {
  title: string;
  description: string;
  onCalculate: () => void;
  calculating: boolean;
  saving: boolean;
  lastSaved?: string | null;
  children: React.ReactNode;
}

export function CalculatorPage({
  title,
  description,
  onCalculate,
  calculating,
  saving,
  lastSaved,
  children,
}: CalculatorPageProps) {
  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {saving && (
            <span className="text-xs text-gray-400 dark:text-gray-500">Saving…</span>
          )}
          {lastSaved && !saving && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Saved {new Date(lastSaved).toLocaleTimeString()}
            </span>
          )}
          <Button onClick={onCalculate} disabled={calculating || saving}>
            {calculating ? 'Calculating…' : 'Calculate'}
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}
