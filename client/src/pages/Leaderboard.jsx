import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import Card from '../components/ui/Card';
import { Trophy } from 'lucide-react';

export default function Leaderboard() {
  const { data } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => api.get('/api/v1/analytics/leaderboard?limit=20').then((r) => r.data),
  });
  const items = data?.data?.items || [];

  return (
    <div className="space-y-4">
      <h1 className="page-title flex items-center gap-2">
        <Trophy className="w-6 h-6 text-amber-500" /> Leaderboard
      </h1>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-800">
                <th className="py-2">#</th>
                <th>Name</th>
                <th>Department</th>
                <th>Batch</th>
                <th className="text-right">Credits</th>
                <th className="text-right">Certs</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 font-bold">{i + 1}</td>
                  <td>{r.name || 'Unknown'}</td>
                  <td>{r.department || '-'}</td>
                  <td>{r.batch || '-'}</td>
                  <td className="text-right font-semibold">{r.credits}</td>
                  <td className="text-right">{r.certificates}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <p className="text-gray-500 py-4">No data yet.</p>}
        </div>
      </Card>
    </div>
  );
}
