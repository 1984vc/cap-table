import { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

/**
 * Generic hook that handles load-on-mount + save-on-calculate for any calculator.
 * T = inputs type, U = outputs/result type
 */
export function useCalculatorPage<T, U>(
  calculatorType: string,
  defaultInputs: T
) {
  const { activeCompanyId } = useBusiness();
  const { user } = useAuth();

  const [inputs, setInputs] = useState<T>(defaultInputs);
  const [outputs, setOutputs] = useState<U | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPrevious = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    setError(null);
    const { data } = await supabase
      .from('calculator_results')
      .select('inputs, outputs, created_at')
      .eq('company_id', activeCompanyId)
      .eq('calculator_type', calculatorType)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setInputs(data.inputs as T);
      setOutputs(data.outputs as U);
      setLastSaved(data.created_at);
    } else {
      setInputs(defaultInputs);
      setOutputs(null);
    }
    setLoading(false);
  }, [activeCompanyId, calculatorType]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadPrevious();
  }, [loadPrevious]);

  const saveResult = useCallback(
    async (currentInputs: T, result: U) => {
      if (!activeCompanyId || !user) return;
      setSaving(true);
      const { error: saveError } = await supabase.from('calculator_results').insert({
        company_id: activeCompanyId,
        calculator_type: calculatorType,
        inputs: currentInputs as object,
        outputs: result as object,
        created_by: user.id,
      });
      if (!saveError) setLastSaved(new Date().toISOString());
      setSaving(false);
    },
    [activeCompanyId, user, calculatorType]
  );

  const setField = useCallback((field: keyof T, value: T[keyof T]) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  }, []);

  return {
    inputs,
    setInputs,
    setField,
    outputs,
    setOutputs,
    loading,
    saving,
    lastSaved,
    error,
    setError,
    saveResult,
  };
}
