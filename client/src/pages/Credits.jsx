import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import Card from '../components/ui/Card';
import { Coins, TrendingUp } from 'lucide-react';

export default function Credits() {
  const user = useAuthStore((s) => s.user);
  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/api/v1/auth/me').then((r) => r.data),
  });
  const me = data?.data?.user;
  const credits = me?.credits ?? 0;

  const { data: analytics } = useQuery({
    queryKey: ['analytics-student'],
    queryFn: () => api.get(`/api/v1/analytics/student/${user?.id}`).then((r) => r.data),
    enabled: !!user?.id,
  });
  const d = analytics?.data;

  return (
    <div className="space-y-4">
      <h1 className="page-title flex items-center gap-2">
        <Coins className="w-6 h-6 text-amber-500" /> Credits
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="stat-card">
          <p className="text-sm text-gray-500">Earned</p>
          <p className="text-3xl font-bold">{credits}</p>
        </Card>
        <Card className="stat-card">
          <p className="text-sm text-gray-500">Required</p>
          <p className="text-3xl font-bold">{d?.progress?.required ?? 20}</p>
        </Card>
        <Card className="stat-card">
          <p className="text-sm text-gray-500">Progress</p>
          <p className="text-3xl font-bold">{d?.progress?.percent ?? 0}%</p>
        </Card>
      </div>
      {d?.platformSplit && (
        <Card>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> By platform
          </h2>
          <ul className="space-y-2">
            {d.platformSplit.map((p, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span>{p.name}</span>
                <span className="font-medium">
                  {p.credits} credits · {p.count} certs
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {d?.semesterCredits && (
        <Card>
          <h2 className="font-semibold mb-3">By semester</h2>
          <ul className="space-y-2">
            {d.semesterCredits.map((s, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span>{s.semester}</span>
                <span className="font-medium">
                  {s.credits} credits · {s.certificates} certs
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
