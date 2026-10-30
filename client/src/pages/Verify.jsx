import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ShieldCheck, ShieldX, Search } from 'lucide-react';
import Card from '../components/ui/Card';

export default function Verify() {
  const { id: routeId } = useParams();
  const [input, setInput] = useState(routeId || '');
  const [id, setId] = useState(routeId || '');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['verify', id],
    queryFn: () => api.get(`/api/v1/verify/${id}`).then((r) => r.data),
    enabled: !!id,
  });
  const d = data?.data;

  const submit = (e) => {
    e.preventDefault();
    if (input.trim()) setId(input.trim());
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="page-title">Verify a Credential</h1>
      <Card>
        <form onSubmit={submit} className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Enter verification ID (e.g. CT-2026-ABCD1234)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button className="btn-primary" type="submit">
            <Search className="w-4 h-4" /> Verify
          </button>
        </form>
      </Card>

      {isLoading && (
        <Card>
          <p className="text-gray-500">Verifying...</p>
        </Card>
      )}
      {isError && (
        <Card>
          <p className="text-red-500">Verification failed or ID not found.</p>
        </Card>
      )}

      {d && (
        <Card>
          <div className="flex items-center gap-3 mb-4">
            {d.valid ? (
              <ShieldCheck className="w-10 h-10 text-green-500" />
            ) : (
              <ShieldX className="w-10 h-10 text-red-500" />
            )}
            <div>
              <p className="text-lg font-semibold">
                {d.valid ? 'Valid credential' : 'Invalid / not approved'}
              </p>
              <p className="text-sm text-gray-500">Status: {d.status}</p>
            </div>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-500">Student</dt>
              <dd className="font-medium">{d.studentName}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Course</dt>
              <dd className="font-medium">{d.courseTitle}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Platform</dt>
              <dd className="font-medium">{d.platform || '-'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Institute</dt>
              <dd className="font-medium">{d.institute || '-'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Credits</dt>
              <dd className="font-medium">{d.credits}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Issued</dt>
              <dd className="font-medium">
                {d.issuedAt ? new Date(d.issuedAt).toLocaleDateString() : '-'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Signature valid</dt>
              <dd className="font-medium">{d.signatureValid ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Issuer</dt>
              <dd className="font-medium">{d.issuer}</dd>
            </div>
          </dl>
          {d.qrCodeDataUrl && <img src={d.qrCodeDataUrl} alt="QR" className="w-32 h-32 mt-4" />}
        </Card>
      )}
    </div>
  );
}
