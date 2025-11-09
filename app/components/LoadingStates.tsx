'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export function LoadingSpinner({ size = 'md', className = '', text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600 ${sizeClasses[size]}`}></div>
      {text && <span className="ml-2 text-sm text-gray-600">{text}</span>}
    </div>
  );
}

interface LoadingPageProps {
  text?: string;
  subtext?: string;
}

export function LoadingPage({ text = 'Loading...', subtext }: LoadingPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-lg font-medium text-gray-900">{text}</p>
        {subtext && <p className="text-sm text-gray-600 mt-2">{subtext}</p>}
      </div>
    </div>
  );
}

interface LoadingCardProps {
  title?: string;
  lines?: number;
  className?: string;
}

export function LoadingCard({ title, lines = 3, className = '' }: LoadingCardProps) {
  return (
    <div className={`card p-6 ${className}`}>
      {title && (
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4 animate-pulse"></div>
      )}
      <div className="space-y-3">
        {[...Array(lines)].map((_, i) => (
          <div
            key={i}
            className="bg-gray-200 rounded animate-pulse"
            style={{
              width: `${Math.random() * 40 + 60}%}`,
              height: '16px'
            }}
          ></div>
        ))}
      </div>
    </div>
  );
}

interface LoadingTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function LoadingTable({ rows = 5, columns = 4, className = '' }: LoadingTableProps) {
  return (
    <div className={`card overflow-auto ${className}`}>
      <table className="min-w-full text-sm">
        <thead className="bg-black/5">
          <tr>
            {[...Array(columns)].map((_, i) => (
              <th key={i} className="p-2 text-left">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(rows)].map((_, i) => (
            <tr key={i} className="border-b">
              {[...Array(columns)].map((_, j) => (
                <td key={j} className="p-2">
                  <div
                    className="h-4 bg-gray-200 rounded animate-pulse"
                    style={{
                      width: `${Math.random() * 40 + 60}%}`
                    }}
                  ></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}