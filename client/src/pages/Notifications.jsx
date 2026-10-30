import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { toast } from 'react-hot-toast';
import Card from '../components/ui/Card';
import { Bell, Check, Trash2 } from 'lucide-react';

export default function Notifications() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['notifs'],
    queryFn: () => api.get('/api/v1/notifications').then((r) => r.data),
  });
  const items = data?.data?.items || [];
  const unreadCount = data?.data?.unreadCount || 0;

  const markRead = useMutation({
    mutationFn: (id) => api.patch(`/api/v1/notifications/${id}/read`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifs'] }),
  });
  const markAll = useMutation({
    mutationFn: () => api.patch('/api/v1/notifications/read-all').then((r) => r.data),
    onSuccess: () => {
      toast.success('All marked read');
      qc.invalidateQueries({ queryKey: ['notifs'] });
    },
  });
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/api/v1/notifications/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifs'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title flex items-center gap-2">
          <Bell className="w-6 h-6" /> Notifications
        </h1>
        <div className="flex gap-2">
          <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
            {unreadCount} unread
          </span>
          <button
            className="btn-secondary"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
          >
            Mark all read
          </button>
        </div>
      </div>
      <Card>
        {isLoading && <p className="text-gray-500">Loading...</p>}
        {!isLoading && items.length === 0 && <p className="text-gray-500">No notifications yet.</p>}
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {items.map((n) => (
            <li key={n._id} className={`py-3 flex items-start gap-3 ${n.read ? 'opacity-70' : ''}`}>
              <div
                className={`mt-1 w-2 h-2 rounded-full ${n.read ? 'bg-gray-300' : 'bg-brand-500'}`}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{n.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{n.body}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-1">
                {!n.read && (
                  <button
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => markRead.mutate(n._id)}
                    title="Mark read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-red-500"
                  onClick={() => remove.mutate(n._id)}
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
