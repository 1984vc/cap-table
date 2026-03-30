interface ResultRowProps {
  label: string;
  value: string | number;
  highlight?: boolean;
  positive?: boolean;   // green tint
  negative?: boolean;   // red tint
  indent?: boolean;
}

export function ResultRow({ label, value, highlight, positive, negative, indent }: ResultRowProps) {
  return (
    <div
      className={[
        'flex justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0',
        highlight ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300',
        positive ? 'text-green-700 dark:text-green-400' : '',
        negative ? 'text-red-600 dark:text-red-400' : '',
        indent ? 'pl-4 text-sm' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
