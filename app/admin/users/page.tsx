'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { Loader2, Search, X, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  plan: string;
  created_at: string | null;
  site_count: number;
}

interface UserDetail {
  id: string;
  email: string;
  plan: string;
  created_at: string | null;
  sites: { id: string; name: string; url: string; status: string; created_at: string | null }[];
  recent_issues: {
    id: string;
    title: string;
    status: string;
    kanban_column: string | null;
    priority: string;
    created_at: string | null;
  }[];
}

const PLAN_OPTIONS = ['free', 'starter', 'pro', 'enterprise'];
const PLAN_COLORS: Record<string, string> = {
  free: 'text-slate-400 bg-slate-700',
  starter: 'text-blue-400 bg-blue-900/30',
  pro: 'text-purple-400 bg-purple-900/30',
  enterprise: 'text-amber-400 bg-amber-900/30',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  function loadUsers(q?: string) {
    setLoading(true);
    const params = q ? `?search=${encodeURIComponent(q)}` : '';
    api
      .get<AdminUser[]>(`/api/v1/internal/admin/users${params}`)
      .then((res) => setUsers(res.data))
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadUsers(); }, []);

  const handleSearch = useCallback(() => {
    loadUsers(search);
  }, [search]);

  async function loadUserDetail(userId: string) {
    setDetailLoading(true);
    setSelectedUser(null);
    try {
      const res = await api.get<UserDetail>(`/api/v1/internal/admin/users/${userId}`);
      setSelectedUser(res.data);
    } catch {
      setActionMsg('Failed to load user details.');
    } finally {
      setDetailLoading(false);
    }
  }

  async function changePlan(userId: string, plan: string) {
    setActionMsg('');
    try {
      await api.patch(`/api/v1/internal/admin/users/${userId}/plan`, { plan });
      setActionMsg(`Plan updated to ${plan}`);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, plan } : u)));
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) => prev ? { ...prev, plan } : prev);
      }
    } catch {
      setActionMsg('Failed to update plan.');
    }
  }

  async function toggleStatus(userId: string, active: boolean) {
    setActionMsg('');
    try {
      await api.patch(`/api/v1/internal/admin/users/${userId}/status`, { active });
      setActionMsg(active ? 'User reactivated.' : 'User deactivated.');
    } catch {
      setActionMsg('Failed to update status.');
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">User Management</h1>
        <p className="text-slate-400 text-sm mt-1">{users.length} customers</p>
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
            placeholder="Search by email…"
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
            onClick={() => { setSearch(''); loadUsers(); }}
            className="text-slate-400 hover:text-white bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Table */}
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
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Email</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Plan</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Sites</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Joined</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No users found.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <>
                    <tr
                      key={user.id}
                      className="hover:bg-slate-700/30 transition cursor-pointer"
                      onClick={() => {
                        if (selectedUser?.id === user.id) {
                          setSelectedUser(null);
                        } else {
                          loadUserDetail(user.id);
                        }
                      }}
                    >
                      <td className="px-4 py-3 text-slate-200 font-medium">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[user.plan] ?? 'text-slate-400 bg-slate-700'}`}>
                          {user.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{user.site_count}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={user.plan}
                            onChange={(e) => changePlan(user.id, e.target.value)}
                            className="bg-slate-700 border border-slate-600 text-slate-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500"
                          >
                            {PLAN_OPTIONS.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => toggleStatus(user.id, false)}
                            className="text-xs text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/40 px-2 py-1 rounded-lg transition"
                          >
                            Deactivate
                          </button>
                          {selectedUser?.id === user.id ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {selectedUser?.id === user.id && (
                      <tr key={`${user.id}-detail`}>
                        <td colSpan={5} className="bg-slate-900/50 px-6 py-4">
                          {detailLoading ? (
                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Sites */}
                              <div>
                                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                  Sites ({selectedUser.sites.length})
                                </h3>
                                {selectedUser.sites.length === 0 ? (
                                  <p className="text-slate-500 text-xs">No sites.</p>
                                ) : (
                                  <ul className="space-y-1.5">
                                    {selectedUser.sites.map((s) => (
                                      <li key={s.id} className="flex items-center gap-2 text-xs">
                                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.status === 'active' ? 'bg-green-400' : 'bg-red-400'}`} />
                                        <span className="text-slate-300 font-medium">{s.name}</span>
                                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-blue-400">
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>

                              {/* Recent issues */}
                              <div>
                                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                  Recent Issues ({selectedUser.recent_issues.length})
                                </h3>
                                {selectedUser.recent_issues.length === 0 ? (
                                  <p className="text-slate-500 text-xs">No issues.</p>
                                ) : (
                                  <ul className="space-y-1.5">
                                    {selectedUser.recent_issues.map((i) => (
                                      <li key={i.id} className="text-xs flex items-center gap-2">
                                        <span className="text-slate-300 truncate flex-1">{i.title}</span>
                                        <span className="text-slate-500 flex-shrink-0">{i.kanban_column?.replace(/_/g, ' ')}</span>
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
