'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import type { Site } from '@/types';
import { Loader2, Globe, ExternalLink } from 'lucide-react';

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

  useEffect(() => {
    api
      .get<Site[]>('/api/v1/sites/')
      .then((res) => setSites(res.data))
      .catch(() => setError('Failed to load sites.'))
      .finally(() => setLoading(false));
  }, []);

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
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Sites</h1>
        <p className="text-slate-400 text-sm mt-1">
          {sites.length} site{sites.length !== 1 ? 's' : ''} monitored
        </p>
      </div>

      {sites.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-10 text-center">
          <Globe className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No sites configured yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {sites.map((site) => (
            <div
              key={site.id}
              className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <StatusDot status={site.status} />
                  <h2 className="text-white font-semibold text-sm truncate">{site.name}</h2>
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
                      ['healthy', 'online', 'up'].includes(site.status.toLowerCase())
                        ? 'text-green-400'
                        : ['degraded', 'warning'].includes(site.status.toLowerCase())
                        ? 'text-yellow-400'
                        : ['down', 'offline', 'error'].includes(site.status.toLowerCase())
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
              <p className="text-[10px] text-slate-600 mt-3">
                Added {new Date(site.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
