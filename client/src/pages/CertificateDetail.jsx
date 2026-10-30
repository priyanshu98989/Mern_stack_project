import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { certApi } from '../services/certificates';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';

export default function CertificateDetail() {
  const { id } = useParams();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['cert', id], queryFn: () => certApi.get(id) });
  const { data: hist } = useQuery({
    queryKey: ['certHist', id],
    queryFn: () => certApi.history(id),
  });
  const cert = data?.data?.certificate;
  const [remarks, setRemarks] = useState('');
  const [proofBusy, setProofBusy] = useState(false);

  const isOwner = String(cert?.student?._id || cert?.student) === user?.id;
  const canVerify = ['faculty', 'hod', 'admin'].includes(user?.role);
  const canEdit = isOwner && ['DRAFT', 'NEEDS_CHANGES', 'REJECTED'].includes(cert?.status);
  const canDelete =
    (user?.role === 'admin' || isOwner) &&
    ['DRAFT', 'NEEDS_CHANGES', 'REJECTED'].includes(cert?.status);
  const canRevoke = ['hod', 'admin'].includes(user?.role) && cert?.status === 'APPROVED';

  const resubmitMut = useMutation({
    mutationFn: () => certApi.submit(id),
    onSuccess: () => {
      toast.success('Resubmitted for review');
      qc.invalidateQueries({ queryKey: ['cert', id] });
      qc.invalidateQueries({ queryKey: ['certHist', id] });
      qc.invalidateQueries({ queryKey: ['certs'] });
    },
    onError: (e) => toast.error(e.response?.data?.error?.message || 'Failed'),
  });

  const openProof = async () => {
    const popup = window.open('', '_blank');
    setProofBusy(true);
    try {
      const blob = await certApi.proof(id);
      const url = URL.createObjectURL(blob);
      if (popup) popup.location.href = url;
      else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      if (popup) popup.close();
      toast.error(e.response?.data?.error?.message || 'Could not open proof document');
    } finally {
      setProofBusy(false);
    }
  };

  const transMut = useMutation({
    mutationFn: (to) => certApi.transition(id, { to, remarks, version: cert?.version }),
    onSuccess: () => {
      toast.success('Updated');
      qc.invalidateQueries({ queryKey: ['cert', id] });
      qc.invalidateQueries({ queryKey: ['certHist', id] });
      qc.invalidateQueries({ queryKey: ['certs'] });
      qc.invalidateQueries({ queryKey: ['q-submitted'] });
      qc.invalidateQueries({ queryKey: ['q-review'] });
    },
    onError: (e) => toast.error(e.response?.data?.error?.message || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: () => certApi.remove(id),
    onSuccess: () => {
      toast.success('Deleted');
      navigate('/certificates');
    },
    onError: (e) => toast.error(e.response?.data?.error?.message || 'Failed'),
  });

  const handleDelete = () => {
    if (window.confirm('Delete this certificate?')) deleteMut.mutate();
  };

  if (!cert) return <p>Loading...</p>;

  return (
    <div>
      <Link to="/certificates" className="text-sm text-gray-500">
        ← Back
      </Link>
      <h1 className="text-2xl font-bold mt-2">{cert.title}</h1>
      <div className="card mt-4 space-y-2">
        <p>
          Status: <b>{cert.status}</b>
        </p>
        <p>Institute: {cert.institute || '-'}</p>
        <p>Trust score: {cert.trustScore}</p>
        {cert.duplicateFlags?.length > 0 && (
          <p className="text-red-500">Flags: {cert.duplicateFlags.join(', ')}</p>
        )}
        {cert.proof?.url && (
          <p>
            Proof:{' '}
            <button
              type="button"
              className="text-brand-600"
              onClick={openProof}
              disabled={proofBusy}
            >
              {proofBusy ? 'Opening…' : 'view'}
            </button>
            {cert.proof.filename ? (
              <span className="text-gray-500 text-sm"> ({cert.proof.filename})</span>
            ) : null}
          </p>
        )}
        {cert.status === 'APPROVED' && (
          <>
            <p>
              Credits awarded: <b>{cert.creditsAwarded}</b> (rule v{cert.creditRuleVersion})
            </p>
            {cert.creditBreakdown && (
              <p className="text-sm text-gray-500">
                Breakdown:{' '}
                {typeof cert.creditBreakdown === 'string'
                  ? cert.creditBreakdown
                  : JSON.stringify(cert.creditBreakdown)}
              </p>
            )}
            <p>
              Verified by: {cert.verifiedBy?.name || cert.verifiedBy} on{' '}
              {cert.verifiedAt ? new Date(cert.verifiedAt).toLocaleString() : '-'}
            </p>
            {cert.remarks && <p>Remarks: {cert.remarks}</p>}
            {cert.verificationId && (
              <p>
                Verification ID: <b>{cert.verificationId}</b>
              </p>
            )}
            {cert.qrCodeDataUrl && (
              <img src={cert.qrCodeDataUrl} alt="QR" className="w-32 h-32 mt-2" />
            )}
          </>
        )}
      </div>

      {(canEdit || canDelete) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {canEdit && (
            <Link to={`/certificates/${id}/edit`} className="btn-primary">
              Edit certificate
            </Link>
          )}
          {canEdit && (
            <button
              className="btn-primary bg-green-600 hover:bg-green-700"
              disabled={resubmitMut.isPending}
              onClick={() => resubmitMut.mutate()}
            >
              {resubmitMut.isPending ? 'Submitting…' : 'Submit for review'}
            </button>
          )}
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={deleteMut.isPending}
              className="btn-primary bg-red-600 hover:bg-red-700"
            >
              {deleteMut.isPending ? 'Deleting...' : 'Delete certificate'}
            </button>
          )}
        </div>
      )}

      {canVerify && ['SUBMITTED', 'UNDER_REVIEW'].includes(cert.status) && (
        <div className="card mt-4 space-y-3">
          <h2 className="font-semibold">Verifier actions</h2>
          {!cert.proof?.url && (
            <p className="text-sm text-amber-600">A proof document is required before approval.</p>
          )}
          <textarea
            className="input"
            placeholder="Remarks (required for reject / needs changes)"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {cert.status === 'SUBMITTED' && (
              <button className="btn-primary" onClick={() => transMut.mutate('UNDER_REVIEW')}>
                Start review
              </button>
            )}
            <button
              className="btn-primary bg-green-600 hover:bg-green-700"
              disabled={!cert.proof?.url}
              onClick={() => transMut.mutate('APPROVED')}
            >
              Approve
            </button>
            <button
              className="btn-primary bg-red-600 hover:bg-red-700"
              onClick={() => transMut.mutate('REJECTED')}
            >
              Reject
            </button>
            <button
              className="btn-primary bg-yellow-600 hover:bg-yellow-700"
              onClick={() => transMut.mutate('NEEDS_CHANGES')}
            >
              Needs changes
            </button>
          </div>
        </div>
      )}

      {canRevoke && (
        <div className="card mt-4 space-y-3">
          <h2 className="font-semibold">Revoke approval</h2>
          <p className="text-sm text-gray-500">
            Revoking reverses the awarded credits and returns the certificate to the student.
          </p>
          <textarea
            className="input"
            placeholder="Reason for revoking (required)"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
          <button
            className="btn-primary bg-red-600 hover:bg-red-700"
            onClick={() => transMut.mutate('REJECTED')}
          >
            Revoke approval
          </button>
        </div>
      )}

      <div className="card mt-4">
        <h2 className="font-semibold mb-2">Status history</h2>
        <ul className="space-y-2 text-sm">
          {(hist?.data?.items || []).map((h) => (
            <li key={h._id}>
              {h.from} → {h.to} by {h.by?.name} {h.remarks && `— ${h.remarks}`}{' '}
              <span className="text-gray-400">({new Date(h.at).toLocaleString()})</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
