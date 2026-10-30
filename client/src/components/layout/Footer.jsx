import { ShieldCheck } from 'lucide-react';

const YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          <span>CertTrack — Officially Authorized Credential Platform</span>
        </div>
        <div className="flex gap-4">
          <a href="/verify" className="hover:text-brand-600">
            Verify
          </a>
          <a href="/api-docs" target="_blank" rel="noreferrer" className="hover:text-brand-600">
            API Docs
          </a>
        </div>
        <span>© {YEAR} CertTrack. All rights reserved.</span>
      </div>
    </footer>
  );
}
