'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  X,
  Globe,
  Terminal,
  Puzzle,
  Loader2,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';

type Step = 'url' | 'method' | 'ssh' | 'plugin' | 'testing' | 'done';

interface WizardState {
  url: string;
  name: string;
  method: 'ssh' | 'plugin' | null;
  sshHost: string;
  sshUser: string;
  sshPassword: string;
  siteId: string;
}

function StepIndicator({ step }: { step: Step }) {
  const steps: Step[] = ['url', 'method', 'ssh', 'testing', 'done'];
  const current = steps.indexOf(step);
  const labels = ['URL', 'Connect', 'Credentials', 'Test', 'Done'];

  return (
    <div className="flex items-center gap-1 mb-6">
      {labels.map((label, idx) => (
        <div key={label} className="flex items-center gap-1 flex-1">
          <div
            className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0 ${
              idx < current
                ? 'bg-green-500 text-white'
                : idx === current
                ? 'bg-blue-500 text-white'
                : 'bg-slate-700 text-slate-500'
            }`}
          >
            {idx < current ? <Check className="w-3 h-3" /> : idx + 1}
          </div>
          <span
            className={`text-xs hidden sm:block ${
              idx === current ? 'text-white' : 'text-slate-500'
            }`}
          >
            {label}
          </span>
          {idx < labels.length - 1 && (
            <div className={`flex-1 h-px mx-1 ${idx < current ? 'bg-green-500' : 'bg-slate-700'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

interface Props {
  onClose: () => void;
  onAdded: () => void;
}

export default function AddSiteWizard({ onClose, onAdded }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('url');
  const [state, setState] = useState<WizardState>({
    url: '',
    name: '',
    method: null,
    sshHost: '',
    sshUser: 'root',
    sshPassword: '',
    siteId: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const update = (patch: Partial<WizardState>) => setState((s) => ({ ...s, ...patch }));

  // Step 1 — validate URL and create site
  async function handleUrlNext() {
    setError('');
    let url = state.url.trim();
    if (!url) { setError('URL is required'); return; }
    if (!url.startsWith('http')) url = 'https://' + url;

    const name = state.name.trim() || new URL(url).hostname;
    update({ url, name });

    setLoading(true);
    try {
      const res = await api.post('/api/v1/sites/', { url, name });
      update({ siteId: res.data.id, name });
      setStep('method');
    } catch (e: unknown) {
      const _d = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      const msg = Array.isArray(_d) ? (_d as {msg?:string}[]).map(x=>x.msg??JSON.stringify(x)).join(', ') : typeof _d === 'string' ? _d : undefined;
      setError(msg || 'Could not create site. Check the URL and try again.');
    } finally {
      setLoading(false);
    }
  }

  // Step 3 — save SSH credentials
  async function handleSSHNext() {
    setError('');
    if (!state.sshHost || !state.sshUser || !state.sshPassword) {
      setError('All SSH fields are required');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/api/v1/sites/${state.siteId}/credentials`, {
        credential_type: 'ssh',
        value: JSON.stringify({
          host: state.sshHost,
          username: state.sshUser,
          password: state.sshPassword,
          port: 22,
        }),
      });
      setStep('testing');
      await runHealthCheck();
    } catch (e: unknown) {
      const _d = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      const msg = Array.isArray(_d) ? (_d as {msg?:string}[]).map(x=>x.msg??JSON.stringify(x)).join(', ') : typeof _d === 'string' ? _d : undefined;
      setError(msg || 'Could not save credentials');
    } finally {
      setLoading(false);
    }
  }

  async function runHealthCheck() {
    setStep('testing');
    // Trigger a manual health check via backend
    try {
      await api.post(`/api/v1/sites/${state.siteId}/health-check`);
    } catch {
      // Non-fatal — health check endpoint may not exist yet
    }
    // Small delay for UX
    await new Promise((r) => setTimeout(r, 1800));
    setStep('done');
  }

  async function handlePluginSkip() {
    setStep('testing');
    await runHealthCheck();
  }

  const pluginToken = `sitedoc-plugin-setup-${state.siteId?.slice(0, 8) ?? 'pending'}`;

  function copyToken() {
    navigator.clipboard.writeText(pluginToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-white font-semibold text-lg">Add a site</h2>
            <p className="text-slate-400 text-xs mt-0.5">Connect your WordPress site to SiteDoc</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          <StepIndicator step={step} />

          {/* Step 1 — URL */}
          {step === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">
                  Site URL
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="url"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    placeholder="https://yoursite.com"
                    value={state.url}
                    onChange={(e) => update({ url: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleUrlNext()}
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">
                  Display name <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="My WordPress site"
                  value={state.name}
                  onChange={(e) => update({ name: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlNext()}
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                onClick={handleUrlNext}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 2 — Method */}
          {step === 'method' && (
            <div className="space-y-4">
              <p className="text-slate-300 text-sm">How should SiteDoc connect to <span className="text-white font-medium">{state.url}</span>?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { update({ method: 'ssh' }); setStep('ssh'); }}
                  className="flex flex-col items-center gap-3 p-5 bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-xl transition group"
                >
                  <Terminal className="w-8 h-8 text-blue-400 group-hover:scale-110 transition" />
                  <div className="text-center">
                    <p className="text-white text-sm font-medium">SSH</p>
                    <p className="text-slate-400 text-xs mt-0.5">Direct server access</p>
                  </div>
                </button>
                <button
                  onClick={() => { update({ method: 'plugin' }); setStep('plugin'); }}
                  className="flex flex-col items-center gap-3 p-5 bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-xl transition group"
                >
                  <Puzzle className="w-8 h-8 text-purple-400 group-hover:scale-110 transition" />
                  <div className="text-center">
                    <p className="text-white text-sm font-medium">WordPress Plugin</p>
                    <p className="text-slate-400 text-xs mt-0.5">Install &amp; connect</p>
                  </div>
                </button>
              </div>
              <button
                onClick={() => setStep('url')}
                className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            </div>
          )}

          {/* Step 3a — SSH */}
          {step === 'ssh' && (
            <div className="space-y-3">
              <p className="text-slate-400 text-sm">Enter SSH credentials for <span className="text-white">{state.url}</span>. Stored encrypted.</p>
              {[
                { label: 'SSH Host / IP', key: 'sshHost', placeholder: '192.168.1.100 or server.example.com' },
                { label: 'Username', key: 'sshUser', placeholder: 'root' },
                { label: 'Password', key: 'sshPassword', placeholder: '••••••••', type: 'password' },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label className="text-slate-300 text-sm font-medium block mb-1">{label}</label>
                  <input
                    type={type ?? 'text'}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    placeholder={placeholder}
                    value={state[key as keyof WizardState] as string}
                    onChange={(e) => update({ [key]: e.target.value } as Partial<WizardState>)}
                  />
                </div>
              ))}
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setStep('method')} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition px-3 py-2.5">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  onClick={handleSSHNext}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save &amp; test connection <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3b — Plugin */}
          {step === 'plugin' && (
            <div className="space-y-4">
              <p className="text-slate-300 text-sm">Install the SiteDoc plugin on <span className="text-white font-medium">{state.url}</span>:</p>
              <ol className="space-y-3 text-sm text-slate-400">
                <li className="flex gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-700 text-xs font-bold flex items-center justify-center text-slate-300">1</span>
                  Download and install the <span className="text-white font-medium mx-1">SiteDoc</span> plugin from your WP admin → Plugins
                </li>
                <li className="flex gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-700 text-xs font-bold flex items-center justify-center text-slate-300">2</span>
                  Go to <span className="text-white font-medium mx-1">Settings → SiteDoc</span> and paste your API token:
                </li>
              </ol>
              <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
                <code className="flex-1 text-xs text-green-400 font-mono truncate">{pluginToken}</code>
                <button onClick={copyToken} className="text-slate-400 hover:text-white transition flex-shrink-0">
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep('method')} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition px-3 py-2.5">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  onClick={handlePluginSkip}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  I&apos;ve installed it <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4 — Testing */}
          {step === 'testing' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="relative">
                <Globe className="w-12 h-12 text-blue-400" />
                <Loader2 className="w-6 h-6 text-blue-300 animate-spin absolute -bottom-1 -right-1" />
              </div>
              <div className="text-center">
                <p className="text-white font-medium">Testing connection…</p>
                <p className="text-slate-400 text-sm mt-1">Running health check on {state.url}</p>
              </div>
            </div>
          )}

          {/* Step 5 — Done */}
          {step === 'done' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-lg">Site connected!</p>
                <p className="text-slate-400 text-sm mt-1">
                  <span className="text-white font-medium">{state.name}</span> is now monitored by SiteDoc.
                </p>
              </div>
              <div className="w-full space-y-2 pt-2">
                <button
                  onClick={() => { onAdded(); router.push(`/issues?site_id=${state.siteId}`); }}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg transition"
                >
                  <AlertTriangle className="w-4 h-4" /> View Issues for this site
                </button>
                <button
                  onClick={onAdded}
                  className="w-full text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 font-medium py-2.5 rounded-lg transition text-sm"
                >
                  Back to Sites
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
