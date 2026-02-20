'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { X, Rocket, Loader2 } from 'lucide-react';

const BUSINESS_TYPES = [
  'Restaurant',
  'Salon / Spa',
  'Consulting',
  'E-commerce',
  'Portfolio',
  'Real Estate',
  'Medical / Dental',
  'Fitness / Gym',
  'Photography',
  'Non-profit',
  'Other',
];

interface BuildSiteWizardProps {
  onClose: () => void;
  onCreated: () => void;
}

export default function BuildSiteWizard({ onClose, onCreated }: BuildSiteWizardProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ url: string; site_id: string; issue_id?: string } | null>(null);

  function handleNameChange(val: string) {
    setName(val);
    // Auto-generate slug from name
    const generated = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 63);
    setSlug(generated);
  }

  async function handleSubmit() {
    if (!name.trim() || !slug.trim()) {
      setError('Name and slug are required.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const resp = await api.post('/api/v1/sites/provision', {
        name: name.trim(),
        slug: slug.trim(),
        business_type: businessType || undefined,
        description: description.trim() || undefined,
      });
      setResult(resp.data);
      setStep(3);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to provision site.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div>
            <div className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Build a new site</h2>
            </div>
            <p className="text-slate-400 text-xs mt-1">AI builds and hosts your WordPress site at slug.nkcreator.com</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-900/20 border border-red-700 text-red-300 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Basic info */}
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Site name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="My Restaurant"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Site URL
                </label>
                <div className="flex items-center gap-0">
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="my-restaurant"
                    className="flex-1 bg-slate-900 border border-slate-600 rounded-l-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <span className="bg-slate-700 border border-l-0 border-slate-600 rounded-r-lg px-3 py-2 text-slate-400 text-sm">
                    .nkcreator.com
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Business type
                </label>
                <div className="flex flex-wrap gap-2">
                  {BUSINESS_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => setBusinessType(type)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                        businessType === type
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!name.trim() || !slug.trim()}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:text-slate-400 text-white font-medium text-sm px-5 py-2 rounded-lg transition"
                >
                  Next
                </button>
              </div>
            </>
          )}

          {/* Step 2: Description */}
          {step === 2 && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Describe what you want
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={`Tell us about your ${businessType || 'business'} and what you'd like on your website.\n\nFor example:\n- What pages do you need? (Home, About, Services, Contact...)\n- Do you have a logo or brand colors?\n- Any reference sites you like?\n- Special features? (booking, gallery, menu...)`}
                  rows={7}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Our AI will build your site based on this. You can always refine later.
                </p>
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="text-slate-400 hover:text-white text-sm transition"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white font-medium text-sm px-5 py-2 rounded-lg transition"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Building...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4" />
                      Build my site
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {/* Step 3: Success */}
          {step === 3 && result && (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Rocket className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Your site is being built!
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                WordPress is being set up at{' '}
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  {result.url}
                </a>
              </p>
              {result.issue_id && (
                <p className="text-slate-500 text-xs mb-4">
                  Our AI team is reviewing your requirements and will start building shortly.
                </p>
              )}
              <button
                onClick={() => { onCreated(); onClose(); }}
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm px-6 py-2 rounded-lg transition"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
