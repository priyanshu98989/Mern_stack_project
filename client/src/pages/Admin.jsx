import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import Card from '../components/ui/Card';
import { Users } from 'lucide-react';

export default function Admin() {
  const user = useAuthStore((s) => s.user);
  const { data: overview } = useQuery({
    queryKey: ['adminOverview'],
    queryFn: () => api.get('/api/v1/analytics/overview').then((r) => r.data),
    enabled: user?.role === 'admin',
  });
  const { data: users } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => api.get('/api/v1/admin/users?limit=20').then((r) => r.data),
    enabled: user?.role === 'admin',
  });
  const o = overview?.data;
  const list = users?.data?.items || users?.data || [];

  if (user?.role !== 'admin') {
    return (
      <Card>
        <p className="text-red-500">Admin access required.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="page-title">Admin Console</h1>
      {o && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="stat-card">
            <p className="text-sm text-gray-500">Users</p>
            <p className="text-2xl font-bold">
              {Object.values(o.users || {}).reduce((a, b) => a + b, 0)}
            </p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-gray-500">Certificates</p>
            <p className="text-2xl font-bold">{o.certificates?.total || 0}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-gray-500">Approved</p>
            <p className="text-2xl font-bold text-green-600">{o.certificates?.approved || 0}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-gray-500">Credits</p>
            <p className="text-2xl font-bold">{o.certificates?.credits || 0}</p>
          </div>
        </div>
      )}
      <Card>
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Users className="w-5 h-5" /> Users
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-800">
                <th className="py-2">Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(list) ? list : []).slice(0, 20).map((u) => (
                <tr key={u._id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2">{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.department}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
