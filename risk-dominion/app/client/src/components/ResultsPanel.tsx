import type { QueryResult } from "../types";

interface Props {
  result: QueryResult;
  onClose: () => void;
}

export function ResultsPanel({ result, onClose }: Props) {
  const { summary, dataTable } = result;
  const hasTable = dataTable.columns.length > 0 && dataTable.rows.length > 0;

  return (
    <div className="mx-4 mt-2 rounded border border-[#334455] bg-bg-surface/95">
      <div className="flex items-start justify-between border-b border-[#334455] px-3 py-2">
        <p className="font-ui text-[14px] text-text-primary">{summary}</p>
        <button
          onClick={onClose}
          className="ml-3 font-ui text-[16px] text-text-secondary hover:text-text-primary"
          aria-label="Close results"
        >
          ×
        </button>
      </div>
      {hasTable && (
        <div className="max-h-48 overflow-auto p-2">
          <table className="w-full border-collapse font-data text-[12px]">
            <thead>
              <tr>
                {dataTable.columns.map((c, i) => (
                  <th key={i} className="px-3 py-1 text-left font-ui text-[11px] text-text-accent">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataTable.rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? "bg-bg-surface" : "bg-bg-surface-alt"}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-1 text-text-primary">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
