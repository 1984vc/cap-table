interface PlaceholderPageProps {
  title: string;
  description: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      <div className="mt-8 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
        <p className="text-gray-400 dark:text-gray-500 text-sm">
          Calculator UI coming in Sprint -1B
        </p>
      </div>
    </div>
  );
}
