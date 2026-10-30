import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShieldCheck, Award, Users, Lock, FileCheck, Zap } from 'lucide-react';
import Card from '../components/ui/Card';

const features = [
  {
    icon: ShieldCheck,
    title: 'Verified Credentials',
    desc: 'Cryptographically signed certificates with Ed25519 and public JWKS verification.',
  },
  {
    icon: Award,
    title: 'Credit Ledger',
    desc: 'Automatic credit calculation with versioned rules and full audit trail.',
  },
  {
    icon: Users,
    title: 'Role-Based Access',
    desc: 'Student, Faculty, HOD and Admin roles with scoped permissions.',
  },
  {
    icon: Lock,
    title: 'Secure by Design',
    desc: 'JWT rotation, CSRF protection, rate limiting, upload hardening.',
  },
  {
    icon: FileCheck,
    title: 'OCR & Fraud Detection',
    desc: 'Assistive OCR extraction and duplicate/fraud flagging.',
  },
  {
    icon: Zap,
    title: 'Real-time',
    desc: 'Socket.IO notifications and SLA reminders for verifiers.',
  },
];

const certTypes = [
  { name: 'NPTEL', desc: 'IIT/IISc online courses', color: 'from-blue-500 to-indigo-600' },
  { name: 'Coursera', desc: 'University-backed programs', color: 'from-cyan-500 to-blue-600' },
  { name: 'edX', desc: 'MIT/Harvard courses', color: 'from-red-500 to-rose-600' },
  { name: 'Udemy', desc: 'Skill-based training', color: 'from-purple-500 to-violet-600' },
  { name: 'Google', desc: 'Professional certificates', color: 'from-amber-500 to-orange-600' },
  { name: 'Custom', desc: 'Institution-issued certs', color: 'from-emerald-500 to-teal-600' },
];

export default function Home() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center py-12"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-200 text-sm font-medium mb-6"
        >
          <ShieldCheck className="w-4 h-4" /> Officially Authorized Credential Platform
        </motion.div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-brand-600 to-cyan-500 bg-clip-text text-transparent">
          CertTrack
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          The institutional platform for certificate submission, faculty verification, credit
          calculation, and cryptographically verifiable credentials.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/register" className="btn-primary px-6 py-3 text-base">
            Get Started
          </Link>
          <Link to="/login" className="btn-secondary px-6 py-3 text-base">
            Sign In
          </Link>
          <Link to="/verify" className="btn-secondary px-6 py-3 text-base">
            Verify a Credential
          </Link>
        </div>
      </motion.section>

      {/* Certificate types */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-2xl font-bold text-center mb-2">Supported Certificate Types</h2>
        <p className="text-center text-gray-500 mb-6">
          Track and verify certifications from leading platforms.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {certTypes.map((c, i) => (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              whileHover={{ y: -4, scale: 1.02 }}
            >
              <Card className="card-hover text-center">
                <div
                  className={`mx-auto w-12 h-12 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center text-white font-bold mb-3`}
                >
                  {c.name[0]}
                </div>
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-gray-500 mt-1">{c.desc}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Features */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-2xl font-bold text-center mb-2">Platform Capabilities</h2>
        <p className="text-center text-gray-500 mb-6">
          Everything you need for institutional credential management.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
            >
              <Card className="card-hover h-full">
                <f.icon className="w-8 h-8 text-brand-600 mb-3" />
                <p className="font-semibold">{f.title}</p>
                <p className="text-sm text-gray-500 mt-1">{f.desc}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Trust badge */}
      <motion.section
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="card text-center bg-gradient-to-br from-brand-50 to-cyan-50 dark:from-brand-900/20 dark:to-cyan-900/20"
      >
        <ShieldCheck className="w-12 h-12 text-brand-600 mx-auto mb-3" />
        <h3 className="text-xl font-bold">Officially Authorized & Verified</h3>
        <p className="text-gray-500 mt-2 max-w-xl mx-auto">
          All credentials are signed with Ed25519 and verifiable via public JWKS. Audit logs, RBAC,
          and CSRF protection ensure institutional-grade security.
        </p>
      </motion.section>
    </div>
  );
}
