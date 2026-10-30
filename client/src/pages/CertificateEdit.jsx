import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { certApi } from '../services/certificates';
import { toast } from 'react-hot-toast';
import Card from '../components/ui/Card';

function toDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

export default function CertificateEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['cert', id],
    queryFn: () => certApi.get(id),
  });
  const { data: plats } = useQuery({ queryKey: ['platforms'], queryFn: certApi.platforms });
  const cert = data?.data?.certificate;
  const platforms = plats?.data?.items || [];
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    if (!cert) return;
    reset({
      title: cert.title || '',
      platform: String(cert.platform?._id || cert.platform || ''),
      platformName: cert.platformName || '',
      institute: cert.institute || '',
      certificateId: cert.certificateId || '',
      certificateUrl: cert.certificateUrl || '',
      semester: cert.semester || '',
      instructor: cert.instructor || '',
      durationWeeks: cert.durationWeeks ?? '',
      durationHours: cert.durationHours ?? '',
      startDate: toDateInput(cert.startDate),
      endDate: toDateInput(cert.endDate),
      grade: cert.grade || '',
      score: cert.score ?? '',
      skillTags: (cert.skillTags || []).join(', '),
    });
  }, [cert, reset]);

  const saveMut = useMutation({
    mutationFn: async ({ values, submitAfter }) => {
      const payload = {
        ...values,
        platformName: values.platform ? undefined : values.platformName,
        durationWeeks: values.durationWeeks === '' ? undefined : Number(values.durationWeeks),
        durationHours: values.durationHours === '' ? undefined : Number(values.durationHours),
        score: values.score === '' ? undefined : Number(values.score),
        skillTags: values.skillTags
          ? values.skillTags
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
      };
      await certApi.update(id, payload);
      if (file) await certApi.uploadProof(id, file);
      if (submitAfter) await certApi.submit(id);
    },
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['cert', id] });
      qc.invalidateQueries({ queryKey: ['certs'] });
      toast.success(vars.submitAfter ? 'Changes saved and resubmitted' : 'Changes saved');
      navigate(`/certificates/${id}`);
    },
    onError: (e) => toast.error(e.response?.data?.error?.message || 'Could not save changes'),
  });

  if (isLoading) return <p className="text-gray-500">Loading…</p>;
  if (isError || !cert) return <p className="text-red-500">Certificate not found.</p>;

  if (!['DRAFT', 'NEEDS_CHANGES', 'REJECTED'].includes(cert.status)) {
    return (
      <Card>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          This certificate is in <b>{cert.status}</b> state and can no longer be edited.
        </p>
        <Link to={`/certificates/${id}`} className="text-brand-600 text-sm mt-3 inline-block">
          Back to certificate
        </Link>
      </Card>
    );
  }

  const onSave = handleSubmit((values) => saveMut.mutate({ values, submitAfter: false }));
  const onSaveAndResubmit = handleSubmit((values) => saveMut.mutate({ values, submitAfter: true }));

  return (
    <div className="max-w-2xl mx-auto">
      <Link to={`/certificates/${id}`} className="text-sm text-gray-500">
        ← Back
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-4">Edit certificate</h1>
      <Card>
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="label">Title</label>
            <input className="input" {...register('title', { required: 'Title is required' })} />
            {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Platform</label>
              <select className="input" {...register('platform')}>
                <option value="">Other / not listed</option>
                {platforms.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Platform name (if not listed)</label>
              <input className="input" {...register('platformName')} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Institute</label>
              <input className="input" {...register('institute')} />
            </div>
            <div>
              <label className="label">Instructor</label>
              <input className="input" {...register('instructor')} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Certificate ID</label>
              <input className="input" {...register('certificateId')} />
            </div>
            <div>
              <label className="label">Semester</label>
              <input className="input" placeholder="e.g. 2026-ODD" {...register('semester')} />
            </div>
          </div>
          <div>
            <label className="label">Certificate URL</label>
            <input
              className="input"
              type="url"
              placeholder="https://"
              {...register('certificateUrl')}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="label">Start date</label>
              <input className="input" type="date" {...register('startDate')} />
            </div>
            <div>
              <label className="label">End date</label>
              <input className="input" type="date" {...register('endDate')} />
            </div>
            <div>
              <label className="label">Weeks</label>
              <input className="input" type="number" min="0" {...register('durationWeeks')} />
            </div>
            <div>
              <label className="label">Hours</label>
              <input className="input" type="number" min="0" {...register('durationHours')} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Grade</label>
              <input className="input" {...register('grade')} />
            </div>
            <div>
              <label className="label">Score (%)</label>
              <input className="input" type="number" min="0" max="100" {...register('score')} />
            </div>
            <div>
              <label className="label">Skills (comma separated)</label>
              <input className="input" {...register('skillTags')} />
            </div>
          </div>
          <div>
            <label className="label">Replace proof (optional)</label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file && <p className="text-xs text-gray-500 mt-1">{file.name}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={saveMut.isPending}
              onClick={onSave}
            >
              {saveMut.isPending ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              className="btn-primary bg-green-600 hover:bg-green-700"
              disabled={saveMut.isPending}
              onClick={onSaveAndResubmit}
            >
              Save and resubmit
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
