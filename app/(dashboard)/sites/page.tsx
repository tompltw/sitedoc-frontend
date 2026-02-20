'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import type { Site } from '@/types';
import { Loader2, ExternalLink, Plus, Rocket, AlertTriangle, Settings, Link2, ArrowRight } from 'lucide-react';
import AddSiteWizard from './AddSiteWizard';
import BuildSiteWizard from './BuildSiteWizard';

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    healthy: 'bg-green-400',
    online: 'bg-green-400',
    up: 'bg-green-400',
    degraded: 'bg-yellow-400',
    warning: 'bg-yellow-400',
    down: 'bg-red-400',
    offline: 'bg-red-400',
    error: 'bg-red-400',
  };
  const color = colors[status.toLowerCase()] ?? 'bg-slate-500';

  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`}
      title={status}
    />
  );
}

function formatLastCheck(ts: string | null): string {
  if (!ts) return 'Never';
  const date = new Date(ts);
  const now = Date.now();
  const diff = Math.floor((now - date.getTime()) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [showBuildWizard, setShowBuildWizard] = useState(false);

  function loadSites() {
    setLoading(true);
    api
      .get<Site[]>('/api/v1/sites/')
      .then((res) => setSites(res.data))
      .catch(() => setError('Failed to load sites.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadSites(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 text-red-300 rounded-xl p-6 text-sm">
        {error}
      </div>
    );
  }

  return (
    <>
    {showWizard && (
      <AddSiteWizard
        onClose={() => setShowWizard(false)}
        onAdded={() => { setShowWizard(false); loadSites(); }}
      />
    )}
    {showBuildWizard && (
      <BuildSiteWizard
        onClose={() => setShowBuildWizard(false)}
        onCreated={() => { setShowBuildWizard(false); loadSites(); }}
      />
    )}
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sites</h1>
          <p className="text-slate-400 text-sm mt-1">
            {sites.length} site{sites.length !== 1 ? 's' : ''} monitored
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBuildWizard(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm px-4 py-2 rounded-lg transition"
          >
            <Rocket className="w-4 h-4" /> Build new site
          </button>
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white font-medium text-sm px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" /> Add existing site
          </button>
        </div>
      </div>

      {sites.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Build new site card */}
          <button
            onClick={() => setShowBuildWizard(true)}
            className="bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-xl p-6 text-left transition group"
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Rocket className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-white font-semibold">Build a new site</h3>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              AI builds your WordPress site from scratch. We host it for you.
            </p>
            <ul className="space-y-1.5 text-sm text-slate-500 mb-5">
              <li className="flex items-center gap-2"><span className="text-slate-600">•</span> Describe what you want</li>
              <li className="flex items-center gap-2"><span className="text-slate-600">•</span> AI builds it in minutes</li>
              <li className="flex items-center gap-2"><span className="text-slate-600">•</span> Hosted at slug.nkcreator.com</li>
            </ul>
            <span className="inline-flex items-center gap-1.5 text-blue-400 text-sm font-medium group-hover:gap-2.5 transition-all">
              Get started <ArrowRight className="w-4 h-4" />
            </span>
          </button>

          {/* Connect existing site card */}
          <button
            onClick={() => setShowWizard(true)}
            className="bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-xl p-6 text-left transition group"
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Link2 className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-white font-semibold">Connect existing site</h3>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              Already have a WordPress site? Connect it and let AI maintain &amp; fix it.
            </p>
            <ul className="space-y-1.5 text-sm text-slate-500 mb-5">
              <li className="flex items-center gap-2"><span className="text-slate-600">•</span> Provide your site URL</li>
              <li className="flex items-center gap-2"><span className="text-slate-600">•</span> Add SSH or plugin access</li>
              <li className="flex items-center gap-2"><span className="text-slate-600">•</span> AI monitors &amp; fixes issues</li>
            </ul>
            <span className="inline-flex items-center gap-1.5 text-purple-400 text-sm font-medium group-hover:gap-2.5 transition-all">
              Connect site <ArrowRight className="w-4 h-4" />
            </span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {sites.map((site) => (
            <div
              key={site.id}
              className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition flex flex-col"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <StatusDot status={site.status} />
                  <h2 className="text-white font-semibold text-sm truncate">{site.name}</h2>
                  {site.is_managed && (
                    <span className="flex-shrink-0 bg-blue-500/20 text-blue-400 text-[10px] font-medium px-1.5 py-0.5 rounded">
                      Managed
                    </span>
                  )}
                </div>
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-blue-400 transition flex-shrink-0"
                  title="Open site"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* URL */}
              <p className="text-slate-400 text-xs truncate mb-4">{site.url}</p>

              {/* Status row */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <p
                    className={`text-xs font-medium mt-0.5 capitalize ${
                      ['healthy', 'online', 'up', 'active'].includes(site.status.toLowerCase())
                        ? 'text-green-400'
                        : ['degraded', 'warning'].includes(site.status.toLowerCase())
                        ? 'text-yellow-400'
                        : ['down', 'offline', 'error', 'inactive'].includes(site.status.toLowerCase())
                        ? 'text-red-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {site.status}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Last check</p>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {formatLastCheck(site.last_health_check)}
                  </p>
                </div>
              </div>

              {/* Created */}
              <p className="text-[10px] text-slate-600 mt-3 mb-4">
                Added {new Date(site.created_at).toLocaleDateString()}
              </p>

              {/* Actions */}
              <div className="mt-auto pt-3 border-t border-slate-700 space-y-1.5">
                <Link
                  href={`/issues?site_id=${site.id}`}
                  className="flex items-center justify-center gap-2 w-full text-xs font-medium text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg px-3 py-2 transition"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  View Issues
                </Link>
                <Link
                  href={`/sites/${site.id}`}
                  className="flex items-center justify-center gap-2 w-full text-xs font-medium text-slate-500 hover:text-slate-300 hover:bg-slate-700 rounded-lg px-3 py-1.5 transition"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Settings &amp; Credentials
                </Link>
              </div>
            </div>
          ))}

          {/* Add site card at end of grid */}
          <div className="bg-slate-800/50 border border-dashed border-slate-700 rounded-xl p-5 flex flex-col items-center justify-center gap-3 min-h-[200px]">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Add a site</p>
            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={() => setShowBuildWizard(true)}
                className="flex items-center gap-2 justify-center w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3 py-2 rounded-lg transition"
              >
                <Rocket className="w-3.5 h-3.5" /> Build new site
              </button>
              <button
                onClick={() => setShowWizard(true)}
                className="flex items-center gap-2 justify-center w-full bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white text-xs font-medium px-3 py-2 rounded-lg transition"
              >
                <Link2 className="w-3.5 h-3.5" /> Connect existing site
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
