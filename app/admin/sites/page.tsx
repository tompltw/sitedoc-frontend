'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { Loader2, Search, X, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface AdminSite {
  id: string;
  name: string;
  url: string;
  customer_email: string;
  status: string;
  credential_types: string[];
  created_at: string | null;
  last_health_check: string | null;
}

interface SiteDetail {
  id: string;
  name: string;
  url: string;
  customer_email: string;
  status: string;
  credential_types: string[];
  last_health_check: string | null;
  created_at: string | null;
  issues: {
    id: string;
    title: string;
    status: string;
    kanban_column: string | null;
    priority: string;
    created_at: string | null;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  active: 'text-green-400 bg-green-900/20',
  inactive: 'text-slate-400 bg-slate-700',
  error: 'text-red-400 bg-red-900/20',
};

const CRED_COLORS: Record<string, string> = {
  ssh: 'text-blue-400 bg-blue-900/20',
  ftp: 'text-cyan-400 bg-cyan-900/20',
  wp_admin: 'text-purple-400 bg-purple-900/20',
  wp_app_password: 'text-violet-400 bg-violet-900/20',
  database: 'text-amber-400 bg-amber-900/20',
  cpanel: 'text-orange-400 bg-orange-900/20',
  api_key: 'text-green-400 bg-green-900/20',
};

export default function AdminSitesPage() {
  const [sites, setSites] = useState<AdminSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedSite, setSelectedSite] = useState<SiteDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  function loadSites(q?: string) {
    setLoading(true);
    const params = q ? `?search=${encodeURIComponent(q)}` : '';
    api
      .get<AdminSite[]>(`/api/v1/internal/admin/sites${params}`)
      .then((res) => setSites(res.data))
      .catch(() => setError('Failed to load sites.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadSites(); }, []);

  const handleSearch = useCallback(() => { loadSites(search); }, [search]);

  async function loadSiteDetail(siteId: string) {
    setDetailLoading(true);
    setSelectedSite(null);
    try {
      const res = await api.get<SiteDetail>(`/api/v1/internal/admin/sites/${siteId}`);
      setSelectedSite(res.data);
    } catch {
      setActionMsg('Failed to load site details.');
    } finally {
      setDetailLoading(false);
    }
  }

  async function toggleSiteStatus(siteId: string, active: boolean) {
    setActionMsg('');
    try {
      await api.patch(`/api/v1/internal/admin/sites/${siteId}/status`, { active });
      const newStatus = active ? 'active' : 'inactive';
      setSites((prev) => prev.map((s) => (s.id === siteId ? { ...s, status: newStatus } : s)));
      if (selectedSite?.id === siteId) {
        setSelectedSite((prev) => prev ? { ...prev, status: newStatus } : prev);
      }
      setActionMsg(`Site marked as ${newStatus}.`);
    } catch {
      setActionMsg('Failed to update site status.');
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">All Sites</h1>
        <p className="text-slate-400 text-sm mt-1">{sites.length} sites</p>
      </div>

      {actionMsg && (
        <div className="bg-blue-900/20 border border-blue-700 text-blue-300 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by name, URL, or email…"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={handleSearch}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          Search
        </button>
        {search && (
          <button
            onClick={() => { setSearch(''); loadSites(); }}
            className="text-slate-400 hover:text-white bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-48">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-700 text-red-300 rounded-xl p-6 text-sm">{error}</div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left">
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Name / URL</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Customer</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Credentials</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {sites.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No sites found.</td>
                </tr>
              ) : (
                sites.map((site) => (
                  <>
                    <tr
                      key={site.id}
                      className="hover:bg-slate-700/30 transition cursor-pointer"
                      onClick={() => {
                        if (selectedSite?.id === site.id) {
                          setSelectedSite(null);
                        } else {
                          loadSiteDetail(site.id);
                        }
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-200">{site.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          {site.url.slice(0, 40)}{site.url.length > 40 ? '…' : ''}
                          <a
                            href={site.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-600 hover:text-blue-400 flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{site.customer_email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[site.status] ?? 'text-slate-400 bg-slate-700'}`}>
                          {site.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {site.credential_types.length === 0 ? (
                            <span className="text-xs text-slate-600">None</span>
                          ) : (
                            site.credential_types.map((ct) => (
                              <span
                                key={ct}
                                className={`text-xs px-1.5 py-0.5 rounded font-medium ${CRED_COLORS[ct] ?? 'text-slate-400 bg-slate-700'}`}
                              >
                                {ct}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {site.status === 'active' ? (
                            <button
                              onClick={() => toggleSiteStatus(site.id, false)}
                              className="text-xs text-yellow-400 hover:text-yellow-300 bg-yellow-900/20 hover:bg-yellow-900/40 px-2 py-1 rounded-lg transition"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleSiteStatus(site.id, true)}
                              className="text-xs text-green-400 hover:text-green-300 bg-green-900/20 hover:bg-green-900/40 px-2 py-1 rounded-lg transition"
                            >
                              Activate
                            </button>
                          )}
                          {selectedSite?.id === site.id ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded detail */}
                    {selectedSite?.id === site.id && (
                      <tr key={`${site.id}-detail`}>
                        <td colSpan={5} className="bg-slate-900/50 px-6 py-4">
                          {detailLoading ? (
                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex gap-6 text-xs text-slate-400">
                                <span>Last check: {selectedSite.last_health_check ? new Date(selectedSite.last_health_check).toLocaleString() : 'Never'}</span>
                                <span>Added: {selectedSite.created_at ? new Date(selectedSite.created_at).toLocaleDateString() : '—'}</span>
                              </div>

                              <div>
                                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                  Credential Types ({selectedSite.credential_types.length})
                                </h3>
                                <div className="flex flex-wrap gap-1.5">
                                  {selectedSite.credential_types.length === 0 ? (
                                    <span className="text-xs text-slate-600">No credentials stored</span>
                                  ) : (
                                    selectedSite.credential_types.map((ct) => (
                                      <span key={ct} className={`text-xs px-2 py-1 rounded font-medium ${CRED_COLORS[ct] ?? 'text-slate-400 bg-slate-700'}`}>
                                        {ct}
                                      </span>
                                    ))
                                  )}
                                </div>
                              </div>

                              <div>
                                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                  Recent Issues ({selectedSite.issues.length})
                                </h3>
                                {selectedSite.issues.length === 0 ? (
                                  <p className="text-xs text-slate-600">No issues.</p>
                                ) : (
                                  <ul className="space-y-1.5">
                                    {selectedSite.issues.slice(0, 5).map((i) => (
                                      <li key={i.id} className="flex items-center gap-2 text-xs">
                                        <span className="text-slate-300 flex-1 truncate">{i.title}</span>
                                        <span className="text-slate-500 capitalize">{i.priority}</span>
                                        <span className="text-slate-600">{i.kanban_column?.replace(/_/g, ' ')}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
