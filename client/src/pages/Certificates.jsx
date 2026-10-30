import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { certApi } from '../services/certificates';
import { useAuthStore } from '../store/authStore';
import DataTable from '../components/ui/DataTable';
import Card from '../components/ui/Card';

const STATUSES = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_CHANGES'];

export default function Certificates() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['certs', status, search, page],
    queryFn: () =>
      certApi.list({ page, limit: 20, status: status || undefined, search: search || undefined }),
  });
  const items = data?.data?.items || [];
  const meta = data?.meta || { page: 1, total: 0, totalPages: 1 };
  const isStaff = user?.role !== 'student';

  const columns = [
    { key: 'title', label: 'Title' },
    ...(isStaff
      ? [{ key: 'student', label: 'Student', render: (r) => r.student?.name || '-' }]
      : []),
    { key: 'platformName', label: 'Platform' },
    {
      key: 'status',
      label: 'Status',
      render: (r) => (
        <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-xs">{r.status}</span>
      ),
    },
    { key: 'creditsAwarded', label: 'Credits' },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">{isStaff ? 'Certificates' : 'My Certificates'}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setSearch(searchInput.trim());
            }}
          >
            <input
              className="input"
              placeholder="Search title or ID"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button className="btn-primary" type="submit">
              Search
            </button>
          </form>
          <select
            className="input"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
          {!isStaff && (
            <Link to="/certificates/new" className="btn-primary">
              New
            </Link>
          )}
        </div>
      </div>
      <Card>
        {isLoading && <p>Loading...</p>}
        {isError && <p className="text-red-500">Failed to load certificates.</p>}
        {!isLoading && !isError && (
          <>
            <DataTable
              columns={columns}
              rows={items}
              empty="No certificates found."
              onRowClick={(r) => navigate(`/certificates/${r._id}`)}
            />
            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-gray-500">
                {meta.total} total · page {meta.page} of {meta.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  className="btn-secondary"
                  disabled={meta.page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <button
                  className="btn-secondary"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
