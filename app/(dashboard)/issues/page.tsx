'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import type { Issue } from '@/types';
import { Loader2, ExternalLink } from 'lucide-react';

const STATUS_BADGE: Record<Issue['status'], string> = {
  open: 'bg-yellow-500/10 text-yellow-400 border border-yellow-600/30',
  pending_approval: 'bg-amber-500/10 text-amber-400',
    in_progress: 'bg-blue-500/10 text-blue-400 border border-blue-600/30',
  resolved: 'bg-green-500/10 text-green-400 border border-green-600/30',
  dismissed: 'bg-slate-500/10 text-slate-400 border border-slate-600/30',
};

const PRIORITY_BADGE: Record<Issue['priority'], string> = {
  critical: 'bg-red-500/10 text-red-400 border border-red-600/30',
  high: 'bg-orange-500/10 text-orange-400 border border-orange-600/30',
  medium: 'bg-yellow-500/10 text-yellow-400 border border-yellow-600/30',
  low: 'bg-slate-500/10 text-slate-400 border border-slate-600/30',
};

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];

export default function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filtered, setFiltered] = useState<Issue[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<Issue[]>('/api/v1/issues/')
      .then((res) => {
        setIssues(res.data);
        setFiltered(res.data);
      })
      .catch(() => setError('Failed to load issues.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!statusFilter) {
      setFiltered(issues);
    } else {
      setFiltered(issues.filter((i) => i.status === statusFilter));
    }
  }, [statusFilter, issues]);

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Issues</h1>
          <p className="text-slate-400 text-sm mt-1">{filtered.length} issue{filtered.length !== 1 ? 's' : ''} found</p>
        </div>

        {/* Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-left">
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Site</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Priority</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Confidence</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Created</th>
                <th className="px-4 py-3 font-medium w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                    No issues match this filter.
                  </td>
                </tr>
              ) : (
                filtered.map((issue) => (
                  <tr key={issue.id} className="hover:bg-slate-700/40 transition group">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/issues/${issue.id}`}
                        className="text-white font-medium hover:text-blue-400 transition line-clamp-1"
                      >
                        {issue.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 hidden md:table-cell truncate max-w-[140px]">
                      {issue.site_id}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_BADGE[issue.status]}`}
                      >
                        {issue.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <span
                        className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${PRIORITY_BADGE[issue.priority]}`}
                      >
                        {issue.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 hidden lg:table-cell">
                      {issue.confidence_score !== null
                        ? `${(issue.confidence_score * 100).toFixed(0)}%`
                        : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs hidden lg:table-cell whitespace-nowrap">
                      {new Date(issue.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/issues/${issue.id}`}
                        className="text-slate-600 group-hover:text-blue-400 transition"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
