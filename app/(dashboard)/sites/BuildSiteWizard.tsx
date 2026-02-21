'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { X, Rocket, Loader2, LayoutTemplate, Sparkles } from 'lucide-react';

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

interface Template {
  id: string;
  name: string;
  description: string;
  business_types: string[];
  pages: string[];
}

interface BuildSiteWizardProps {
  onClose: () => void;
  onCreated: () => void;
}

export default function BuildSiteWizard({ onClose, onCreated }: BuildSiteWizardProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ url: string; site_id: string; issue_id?: string } | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Fetch templates when entering step 2
  useEffect(() => {
    if (step === 2 && templates.length === 0) {
      setTemplatesLoading(true);
      api.get('/api/v1/templates')
        .then((resp) => {
          setTemplates(resp.data.templates || []);
          // Auto-select matching template if businessType is set
          if (businessType) {
            const match = (resp.data.templates || []).find((t: Template) =>
              t.business_types.includes(businessType)
            );
            if (match && templateId === null) {
              setTemplateId(match.id);
            }
          }
        })
        .catch(() => {})
        .finally(() => setTemplatesLoading(false));
    }
  }, [step]);

  function handleNameChange(val: string) {
    setName(val);
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
        template_id: templateId || undefined,
      });
      setResult(resp.data);
      setStep(4);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to provision site.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  }

  // Sort templates: matching business type first, then generic
  const sortedTemplates = [...templates].sort((a, b) => {
    const aMatch = businessType && a.business_types.includes(businessType) ? 0 : 1;
    const bMatch = businessType && b.business_types.includes(businessType) ? 0 : 1;
    return aMatch - bMatch;
  });

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

        {/* Step indicator */}
        <div className="px-6 pt-4 flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition ${
                step >= s + (step === 4 ? -3 : 0) // map step 4 (success) to show all complete
                  ? step > s || step === 4 ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white ring-2 ring-blue-400'
                  : 'bg-slate-700 text-slate-400'
              }`}>
                {s}
              </div>
              {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-blue-600' : 'bg-slate-700'}`} />}
            </div>
          ))}
          <span className="text-xs text-slate-500 ml-2">
            {step === 1 && 'Basics'}
            {step === 2 && 'Template'}
            {step === 3 && 'Description'}
            {step === 4 && 'Done!'}
          </span>
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

          {/* Step 2: Choose template */}
          {step === 2 && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Choose a starter template
                </label>
                <p className="text-xs text-slate-500 mb-3">
                  Pick a design to start with. Our AI will customize the content based on your description.
                </p>

                {templatesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {/* Start from scratch option */}
                    <button
                      onClick={() => setTemplateId(null)}
                      className={`w-full text-left p-3 rounded-lg border transition ${
                        templateId === null
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-slate-600 bg-slate-900 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-slate-400 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-white">Start from scratch</p>
                          <p className="text-xs text-slate-400">AI builds everything from your description — maximum flexibility.</p>
                        </div>
                      </div>
                    </button>

                    {sortedTemplates.map((tmpl) => {
                      const isMatch = businessType && tmpl.business_types.includes(businessType);
                      return (
                        <button
                          key={tmpl.id}
                          onClick={() => setTemplateId(tmpl.id)}
                          className={`w-full text-left p-3 rounded-lg border transition ${
                            templateId === tmpl.id
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-slate-600 bg-slate-900 hover:border-slate-500'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <LayoutTemplate className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-white">{tmpl.name}</p>
                                {isMatch && (
                                  <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full font-medium">
                                    Recommended
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5">{tmpl.description}</p>
                              <p className="text-[10px] text-slate-500 mt-1">
                                Pages: {tmpl.pages.join(', ')}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="text-slate-400 hover:text-white text-sm transition"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm px-5 py-2 rounded-lg transition"
                >
                  Next
                </button>
              </div>
            </>
          )}

          {/* Step 3: Description */}
          {step === 3 && (
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
                  {templateId
                    ? 'Our AI will customize the template based on this description.'
                    : 'Our AI will build your site based on this. You can always refine later.'}
                </p>
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  onClick={() => setStep(2)}
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

          {/* Step 4: Success */}
          {step === 4 && result && (
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
