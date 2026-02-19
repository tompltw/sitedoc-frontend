'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  ArrowLeft,
  Globe,
  Terminal,
  KeyRound,
  Puzzle,
  Loader2,
  Trash2,
  Plus,
  CheckCircle,
  X,
  AlertTriangle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Site {
  id: string;
  url: string;
  name: string;
  status: string;
  last_health_check: string | null;
  created_at: string;
}

interface Credential {
  id: string;
  site_id: string;
  credential_type: string;
  created_at: string;
}

type CredentialType = 'ssh' | 'ftp' | 'wp_admin' | 'database' | 'cpanel' | 'wp_app_password' | 'api_key';

// ---------------------------------------------------------------------------
// Credential type metadata
// ---------------------------------------------------------------------------

const CRED_META: Record<CredentialType, {
  label: string;
  icon: React.ReactNode;
  fields: { key: string; label: string; placeholder: string; type?: string }[];
}> = {
  ssh: {
    label: 'SSH',
    icon: <Terminal className="w-4 h-4" />,
    fields: [
      { key: 'host', label: 'Host / IP', placeholder: '192.168.1.100' },
      { key: 'user', label: 'Username', placeholder: 'root' },
      { key: 'password', label: 'Password', placeholder: '••••••••', type: 'password' },
      { key: 'port', label: 'Port', placeholder: '22' },
    ],
  },
  ftp: {
    label: 'FTP',
    icon: <Terminal className="w-4 h-4" />,
    fields: [
      { key: 'host', label: 'Host', placeholder: 'ftp.yoursite.com' },
      { key: 'user', label: 'Username', placeholder: 'ftpuser' },
      { key: 'password', label: 'Password', placeholder: '••••••••', type: 'password' },
      { key: 'port', label: 'Port', placeholder: '21' },
    ],
  },
  wp_admin: {
    label: 'WordPress Admin',
    icon: <Globe className="w-4 h-4" />,
    fields: [
      { key: 'url', label: 'WP Admin URL', placeholder: 'https://yoursite.com/wp-admin' },
      { key: 'username', label: 'Username', placeholder: 'admin' },
      { key: 'password', label: 'Password', placeholder: '••••••••', type: 'password' },
    ],
  },
  database: {
    label: 'Database',
    icon: <KeyRound className="w-4 h-4" />,
    fields: [
      { key: 'host', label: 'Host', placeholder: 'localhost' },
      { key: 'user', label: 'Username', placeholder: 'dbuser' },
      { key: 'password', label: 'Password', placeholder: '••••••••', type: 'password' },
      { key: 'name', label: 'Database Name', placeholder: 'wordpress_db' },
      { key: 'port', label: 'Port', placeholder: '3306' },
    ],
  },
  cpanel: {
    label: 'cPanel',
    icon: <Puzzle className="w-4 h-4" />,
    fields: [
      { key: 'url', label: 'cPanel URL', placeholder: 'https://yoursite.com:2083' },
      { key: 'username', label: 'Username', placeholder: 'cpaneluser' },
      { key: 'password', label: 'Password', placeholder: '••••••••', type: 'password' },
    ],
  },
  wp_app_password: {
    label: 'WP Application Password',
    icon: <KeyRound className="w-4 h-4" />,
    fields: [
      { key: 'username', label: 'WP Username', placeholder: 'admin' },
      { key: 'app_password', label: 'Application Password', placeholder: 'xxxx xxxx xxxx xxxx xxxx xxxx', type: 'password' },
    ],
  },
  api_key: {
    label: 'API Key',
    icon: <KeyRound className="w-4 h-4" />,
    fields: [
      { key: 'key', label: 'API Key', placeholder: 'sk-...', type: 'password' },
    ],
  },
};

const CRED_TYPE_ORDER: CredentialType[] = ['ssh', 'wp_admin', 'ftp', 'database', 'cpanel', 'wp_app_password', 'api_key'];

// ---------------------------------------------------------------------------
// Add Credential Modal
// ---------------------------------------------------------------------------

interface AddCredModalProps {
  siteId: string;
  siteUrl: string;
  existingTypes: string[];
  onClose: () => void;
  onAdded: () => void;
}

function AddCredModal({ siteId, siteUrl, existingTypes, onClose, onAdded }: AddCredModalProps) {
  const [selectedType, setSelectedType] = useState<CredentialType>('ssh');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const meta = CRED_META[selectedType];

  async function handleSave() {
    setError('');
    setLoading(true);
    try {
      await api.post(`/api/v1/sites/${siteId}/credentials`, {
        credential_type: selectedType,
        value: fields,
      });
      onAdded();
    } catch (e: unknown) {
      const _d = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      const msg = typeof _d === 'string' ? _d : 'Could not save credential';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-800">
          <h3 className="text-white font-semibold">Add Credential</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Type selector */}
          <div>
            <label className="text-slate-300 text-sm font-medium block mb-1.5">Credential Type</label>
            <select
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              value={selectedType}
              onChange={(e) => { setSelectedType(e.target.value as CredentialType); setFields({}); }}
            >
              {CRED_TYPE_ORDER.map((t) => (
                <option key={t} value={t}>
                  {CRED_META[t].label}
                  {existingTypes.includes(t) ? ' (already saved)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic fields */}
          {meta.fields.map((f) => (
            <div key={f.key}>
              <label className="text-slate-300 text-sm font-medium block mb-1">{f.label}</label>
              <input
                type={f.type ?? 'text'}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
                placeholder={f.placeholder}
                value={fields[f.key] ?? (f.key === 'url' ? siteUrl : '')}
                onChange={(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
              />
            </div>
          ))}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="px-4 py-2.5 text-slate-400 hover:text-white text-sm transition">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition text-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Save credential
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SiteSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [site, setSite] = useState<Site | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [siteRes, credsRes] = await Promise.all([
        api.get<Site>(`/api/v1/sites/${id}`),
        api.get<Credential[]>(`/api/v1/sites/${id}/credentials`),
      ]);
      setSite(siteRes.data);
      setCredentials(credsRes.data);
    } catch {
      setError('Failed to load site data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [id]);

  async function handleDelete(credId: string) {
    if (!confirm('Delete this credential? This cannot be undone.')) return;
    setDeletingId(credId);
    try {
      await api.delete(`/api/v1/sites/${id}/credentials/${credId}`);
      setCredentials((prev) => prev.filter((c) => c.id !== credId));
    } catch {
      alert('Failed to delete credential.');
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="bg-red-900/20 border border-red-700 text-red-300 rounded-xl p-6 text-sm">
        {error || 'Site not found.'}
      </div>
    );
  }

  const existingTypes = credentials.map((c) => c.credential_type);

  return (
    <>
      {showAddModal && (
        <AddCredModal
          siteId={id}
          siteUrl={site.url}
          existingTypes={existingTypes}
          onClose={() => setShowAddModal(false)}
          onAdded={() => { setShowAddModal(false); loadData(); }}
        />
      )}

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back + header */}
        <div>
          <button
            onClick={() => router.push('/sites')}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Sites
          </button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{site.name}</h1>
              <a
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-blue-400 text-sm mt-1 inline-flex items-center gap-1 transition"
              >
                {site.url}
              </a>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => router.push(`/issues?site_id=${site.id}`)}
                className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg transition"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Issues
              </button>
            </div>
          </div>
        </div>

        {/* Credentials section */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
            <div>
              <h2 className="text-white font-semibold">Credentials</h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Stored encrypted. Values are never shown — only types are listed.
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-lg transition"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          {credentials.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <KeyRound className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No credentials saved yet.</p>
              <p className="text-slate-500 text-xs mt-1">
                Add SSH, WP Admin, FTP, or other credentials so SiteDoc can fix issues automatically.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                <Plus className="w-4 h-4" /> Add first credential
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-700">
              {credentials.map((cred) => {
                const meta = CRED_META[cred.credential_type as CredentialType];
                return (
                  <li key={cred.id} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">
                        {meta?.icon ?? <KeyRound className="w-4 h-4" />}
                      </span>
                      <div>
                        <p className="text-white text-sm font-medium">
                          {meta?.label ?? cred.credential_type}
                        </p>
                        <p className="text-slate-500 text-xs mt-0.5">
                          Added {new Date(cred.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(cred.id)}
                      disabled={deletingId === cred.id}
                      className="text-slate-500 hover:text-red-400 transition p-1.5 rounded-lg hover:bg-red-900/20 disabled:opacity-40"
                      title="Delete credential"
                    >
                      {deletingId === cred.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Site info section */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4">
          <h2 className="text-white font-semibold mb-3">Site Info</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-400">Status</dt>
              <dd className="text-white capitalize">{site.status}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Last health check</dt>
              <dd className="text-white">
                {site.last_health_check
                  ? new Date(site.last_health_check).toLocaleString()
                  : 'Never'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Added</dt>
              <dd className="text-white">{new Date(site.created_at).toLocaleString()}</dd>
            </div>
          </dl>
        </div>
      </div>
    </>
  );
}
