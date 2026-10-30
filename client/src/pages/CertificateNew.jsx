import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { certApi } from '../services/certificates';
import { toast } from 'react-hot-toast';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';

const schema = z.object({
  title: z.string().min(3, 'Title too short'),
  platform: z.string().min(1, 'Select a platform'),
  institute: z.string().optional(),
  certificateId: z.string().optional(),
});

export default function CertificateNew() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const { data: plats } = useQuery({ queryKey: ['platforms'], queryFn: certApi.platforms });
  const platforms = plats?.data?.items || [];
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });
  const [file, setFile] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const createMut = useMutation({
    mutationFn: certApi.create,
    onSuccess: async (res) => {
      const id = res.data.certificate._id;
      try {
        if (file) await certApi.uploadProof(id, file);
        await certApi.submit(id);
        toast.success('Submitted for review');
      } catch (e) {
        toast.error(e.response?.data?.error?.message || 'Saved as draft, but could not submit');
      } finally {
        qc.invalidateQueries({ queryKey: ['certs'] });
        navigate(`/certificates/${id}`);
      }
    },
    onError: (e) => toast.error(e.response?.data?.error?.message || 'Could not create certificate'),
  });

  const onSubmit = (data) => {
    if (!file) {
      toast.error('Attach a proof document before submitting');
      return;
    }
    createMut.mutate(data);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">New Certificate</h1>
      <Card>
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-200 text-xs font-medium">
          <span aria-hidden="true">✓</span> A per-account submission limit may apply. Your
          institution configures it.
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input className="input" {...register('title')} />
            {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
          </div>
          <div>
            <label className="label">Platform</label>
            <select className="input" {...register('platform')}>
              <option value="">Select</option>
              {platforms.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.platform && <p className="text-red-500 text-sm">{errors.platform.message}</p>}
          </div>
          <div>
            <label className="label">Institute</label>
            <input className="input" {...register('institute')} />
          </div>
          <div>
            <label className="label">Certificate ID</label>
            <input className="input" {...register('certificateId')} />
          </div>
          <div>
            <label className="label">Proof (PDF/JPG/PNG, max 5MB)</label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0])}
            />
            {file && (
              <button
                type="button"
                className="text-sm text-brand-600 mt-1"
                onClick={() => setPreviewOpen(true)}
              >
                Preview selected file
              </button>
            )}
          </div>
          <button disabled={createMut.isPending} className="btn-primary">
            {createMut.isPending ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </Card>
      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Selected file">
        <p className="text-sm">
          {file?.name} ({Math.round((file?.size || 0) / 1024)} KB)
        </p>
      </Modal>
    </div>
  );
}
