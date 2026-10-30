export default function DataTable({ columns, rows, empty = 'No records found', onRowClick }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-800">
            {columns.map((c) => (
              <th key={c.key} className="py-2 pr-4 font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="py-6 text-center text-gray-400">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr
              key={r._id || i}
              onClick={() => onRowClick && onRowClick(r)}
              className={`border-b border-gray-100 dark:border-gray-800 ${onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' : ''}`}
            >
              {columns.map((c) => (
                <td key={c.key} className="py-2 pr-4">
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
