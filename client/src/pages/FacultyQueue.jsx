import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { certApi } from '../services/certificates';
import Card from '../components/ui/Card';
import { ClipboardCheck, Clock } from 'lucide-react';

export default function FacultyQueue() {
  const navigate = useNavigate();
  const { data: sub } = useQuery({
    queryKey: ['q-submitted'],
    queryFn: () => certApi.list({ status: 'SUBMITTED', limit: 50 }),
  });
  const { data: rev } = useQuery({
    queryKey: ['q-review'],
    queryFn: () => certApi.list({ status: 'UNDER_REVIEW', limit: 50 }),
  });
  const submitted = sub?.data?.items || [];
  const review = rev?.data?.items || [];
  const all = [...submitted, ...review];

  return (
    <div className="space-y-4">
      <h1 className="page-title flex items-center gap-2">
        <ClipboardCheck className="w-6 h-6" /> Verification Queue
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-semibold mb-2">Submitted ({submitted.length})</h2>
          {submitted.length === 0 && <p className="text-gray-500 text-sm">None.</p>}
          <ul className="space-y-2">
            {submitted.map((c) => (
              <li
                key={c._id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                onClick={() => navigate(`/certificates/${c._id}`)}
              >
                <div>
                  <p className="font-medium text-sm">{c.title}</p>
                  <p className="text-xs text-gray-500">
                    {c.student?.name || 'Student'} · {c.platformName}
                  </p>
                </div>
                <span className="badge bg-blue-100 text-blue-700">SUBMITTED</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="font-semibold mb-2">In Review ({review.length})</h2>
          {review.length === 0 && <p className="text-gray-500 text-sm">None.</p>}
          <ul className="space-y-2">
            {review.map((c) => (
              <li
                key={c._id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                onClick={() => navigate(`/certificates/${c._id}`)}
              >
                <div>
                  <p className="font-medium text-sm">{c.title}</p>
                  <p className="text-xs text-gray-500">
                    {c.student?.name || 'Student'} · {c.platformName}
                  </p>
                </div>
                <span className="badge bg-amber-100 text-amber-700">REVIEW</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card>
        <h2 className="font-semibold mb-2 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Total pending: {all.length}
        </h2>
      </Card>
    </div>
  );
}
