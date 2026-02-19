'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Loader2, X, Filter } from 'lucide-react';
import type { KanbanColumn } from '@/types';

interface AdminIssue {
  id: string;
  title: string;
  site_id: string;
  site_name: string;
  customer_email: string;
  status: string;
  kanban_column: KanbanColumn | null;
  priority: string;
  ticket_number: number | null;
  created_at: string | null;
  resolved_at: string | null;
}

const KANBAN_COLUMNS: KanbanColumn[] = [
  'triage', 'ready_for_uat_approval', 'todo', 'in_progress',
  'ready_for_qa', 'in_qa', 'ready_for_uat', 'done', 'dismissed',
];

const KANBAN_LABELS: Record<string, string> = {
  triage: 'Triage',
  ready_for_uat_approval: 'Ready for Approval',
  todo: 'Queued for Dev',
  in_progress: 'In Progress',
  ready_for_qa: 'Ready for QA',
  in_qa: 'QA in Progress',
  ready_for_uat: 'Ready for UAT',
  done: 'Done',
  dismissed: 'Dismissed',
};

const KANBAN_COLORS: Record<string, string> = {
  triage: 'text-slate-400 bg-slate-700/50 border-slate-600/30',
  ready_for_uat_approval: 'text-amber-300 bg-amber-500/10 border-amber-600/30',
  todo: 'text-yellow-300 bg-yellow-500/10 border-yellow-600/30',
  in_progress: 'text-blue-300 bg-blue-500/10 border-blue-600/30',
  ready_for_qa: 'text-purple-300 bg-purple-500/10 border-purple-600/30',
  in_qa: 'text-purple-300 bg-purple-500/10 border-purple-600/30',
  ready_for_uat: 'text-orange-300 bg-orange-500/10 border-orange-600/30',
  done: 'text-green-300 bg-green-500/10 border-green-600/30',
  dismissed: 'text-slate-400 bg-slate-700/50 border-slate-600/30',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-yellow-400',
  low: 'text-slate-400',
};

export default function AdminIssuesPage() {
  const [issues, setIssues] = useState<AdminIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterCol, setFilterCol] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [transitioning, setTransitioning] = useState<string | null>(null);

  function loadIssues(col?: string) {
    setLoading(true);
    const params = col ? `?kanban_column=${encodeURIComponent(col)}` : '';
    api
      .get<AdminIssue[]>(`/api/v1/internal/admin/issues${params}`)
      .then((res) => setIssues(res.data))
      .catch(() => setError('Failed to load issues.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadIssues(); }, []);

  async function transitionIssue(issueId: string, toCol: string) {
    setTransitioning(issueId);
    setActionMsg('');
    try {
      await api.post(`/api/v1/internal/admin/issues/${issueId}/transition`, {
        to_col: toCol,
        note: 'Admin manual transition',
      });
      setIssues((prev) =>
        prev.map((i) => (i.id === issueId ? { ...i, kanban_column: toCol as KanbanColumn } : i))
      );
      setActionMsg(`Issue moved to ${KANBAN_LABELS[toCol] ?? toCol}`);
    } catch {
      setActionMsg('Failed to transition issue.');
    } finally {
      setTransitioning(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">All Issues</h1>
        <p className="text-slate-400 text-sm mt-1">{issues.length} issues</p>
      </div>

      {actionMsg && (
        <div className="bg-blue-900/20 border border-blue-700 text-blue-300 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-slate-500" />
        <select
          value={filterCol}
          onChange={(e) => {
            setFilterCol(e.target.value);
            loadIssues(e.target.value || undefined);
          }}
          className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Stages</option>
          {KANBAN_COLUMNS.map((col) => (
            <option key={col} value={col}>{KANBAN_LABELS[col]}</option>
          ))}
        </select>
        {filterCol && (
          <button
            onClick={() => { setFilterCol(''); loadIssues(); }}
            className="text-slate-400 hover:text-white text-xs flex items-center gap-1 transition"
          >
            <X className="w-3.5 h-3.5" /> Clear
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
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">#</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Title</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Site</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Customer</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Stage</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Priority</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Created</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Move to</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {issues.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">No issues found.</td>
                </tr>
              ) : (
                issues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-slate-700/30 transition">
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                      {issue.ticket_number ? `#${String(issue.ticket_number).padStart(3, '0')}` : '—'}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <Link
                        href={`/issues/${issue.id}`}
                        className="text-slate-200 hover:text-blue-400 font-medium line-clamp-2 transition"
                      >
                        {issue.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{issue.site_name}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{issue.customer_email}</td>
                    <td className="px-4 py-3">
                      {issue.kanban_column && (
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium ${KANBAN_COLORS[issue.kanban_column] ?? ''}`}>
                          {KANBAN_LABELS[issue.kanban_column]}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium capitalize ${PRIORITY_COLORS[issue.priority] ?? 'text-slate-400'}`}>
                        {issue.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {issue.created_at ? new Date(issue.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {transitioning === issue.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                      ) : (
                        <select
                          value={issue.kanban_column ?? ''}
                          onChange={(e) => transitionIssue(issue.id, e.target.value)}
                          className="bg-slate-700 border border-slate-600 text-slate-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500"
                        >
                          {KANBAN_COLUMNS.map((col) => (
                            <option key={col} value={col}>{KANBAN_LABELS[col]}</option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
