'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import type { Issue, Site, KanbanColumn } from '@/types';
import { Loader2, Plus, LayoutList, Kanban } from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────

const KANBAN_COLUMNS: { col: KanbanColumn; label: string; color: string; dot: string }[] = [
  { col: 'triage',                label: 'Triage',              color: 'border-slate-600',   dot: 'bg-slate-400' },
  { col: 'ready_for_uat_approval',label: 'Awaiting Approval',   color: 'border-amber-600',   dot: 'bg-amber-400' },
  { col: 'todo',                  label: 'Queued for Dev',       color: 'border-yellow-600',  dot: 'bg-yellow-400' },
  { col: 'in_progress',           label: 'In Progress',          color: 'border-blue-600',    dot: 'bg-blue-400' },
  { col: 'ready_for_qa',          label: 'Ready for QA',         color: 'border-purple-600',  dot: 'bg-purple-400' },
  { col: 'in_qa',                 label: 'QA in Progress',       color: 'border-purple-600',  dot: 'bg-purple-300' },
  { col: 'ready_for_uat',         label: 'Ready for Review',     color: 'border-orange-600',  dot: 'bg-orange-400' },
  { col: 'done',                  label: 'Done',                 color: 'border-green-600',   dot: 'bg-green-400' },
];

const PRIORITY_DOT: Record<Issue['priority'], string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-slate-500',
};

// ── Kanban card ────────────────────────────────────────────────────────────

function IssueCard({ issue }: { issue: Issue }) {
  return (
    <Link href={`/issues/${issue.id}`}>
      <div className="bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-lg p-3 cursor-pointer transition group">
        {/* ticket number */}
        {issue.ticket_number && (
          <div className="text-[10px] text-slate-500 font-mono mb-1">
            TKT-{String(issue.ticket_number).padStart(3, '0')}
          </div>
        )}

        {/* title */}
        <p className="text-sm text-white font-medium leading-snug group-hover:text-blue-300 transition line-clamp-2">
          {issue.title}
        </p>

        {/* meta row */}
        <div className="flex items-center gap-2 mt-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[issue.priority]}`}
            title={issue.priority} />
          <span className="text-[10px] text-slate-500 capitalize">{issue.priority}</span>
          {issue.dev_fail_count > 0 && (
            <span className="ml-auto text-[10px] text-red-400 bg-red-900/20 border border-red-700/30 px-1.5 py-0.5 rounded">
              {issue.dev_fail_count}× fail
            </span>
          )}
        </div>

        {/* site name would go here if included in response */}
        <div className="mt-2 text-[10px] text-slate-600">
          {new Date(issue.created_at).toLocaleDateString()}
        </div>
      </div>
    </Link>
  );
}

// ── Kanban board ───────────────────────────────────────────────────────────

function KanbanBoard({ issues }: { issues: Issue[] }) {
  const grouped = (col: KanbanColumn) =>
    issues.filter((i) => (i.kanban_column ?? 'triage') === col);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-[600px]">
      {KANBAN_COLUMNS.map(({ col, label, color, dot }) => {
        const cards = grouped(col);
        return (
          <div key={col} className="flex-shrink-0 w-60">
            {/* Column header */}
            <div className={`flex items-center gap-2 mb-2 pb-2 border-b ${color}`}>
              <span className={`w-2 h-2 rounded-full ${dot}`} />
              <span className="text-xs font-semibold text-slate-300">{label}</span>
              <span className="ml-auto text-xs text-slate-500 tabular-nums">{cards.length}</span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2">
              {cards.length === 0 && (
                <div className="text-center py-6 text-slate-600 text-xs">—</div>
              )}
              {cards.map((issue) => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── List view (legacy) ─────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  triage: 'bg-slate-500/10 text-slate-300 border border-slate-600/30',
  ready_for_uat_approval: 'bg-amber-500/10 text-amber-300 border border-amber-600/30',
  todo: 'bg-yellow-500/10 text-yellow-300 border border-yellow-600/30',
  in_progress: 'bg-blue-500/10 text-blue-300 border border-blue-600/30',
  ready_for_qa: 'bg-purple-500/10 text-purple-300 border border-purple-600/30',
  in_qa: 'bg-purple-400/10 text-purple-200 border border-purple-500/30',
  ready_for_uat: 'bg-orange-500/10 text-orange-300 border border-orange-600/30',
  done: 'bg-green-500/10 text-green-300 border border-green-600/30',
  dismissed: 'bg-slate-500/10 text-slate-500 border border-slate-700/30',
};

const KANBAN_LABEL: Record<string, string> = {
  triage: 'Triage',
  ready_for_uat_approval: 'Awaiting Approval',
  todo: 'Queued for Dev',
  in_progress: 'In Progress',
  ready_for_qa: 'Ready for QA',
  in_qa: 'QA in Progress',
  ready_for_uat: 'Ready for Review',
  done: 'Done',
  dismissed: 'Dismissed',
};

function ListView({ issues, sites }: { issues: Issue[]; sites: Site[] }) {
  const siteMap = Object.fromEntries(sites.map((s) => [s.id, s.name ?? s.url]));
  if (issues.length === 0) {
    return (
      <div className="text-center py-20 text-slate-500">
        No issues found.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {issues.map((issue) => {
        const col = issue.kanban_column ?? 'triage';
        return (
          <Link href={`/issues/${issue.id}`} key={issue.id}>
            <div className="bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-xl p-4 transition group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {issue.ticket_number && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        TKT-{String(issue.ticket_number).padStart(3, '0')}
                      </span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[col]}`}>
                      {KANBAN_LABEL[col]}
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[issue.priority]}`} title={issue.priority} />
                  </div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-blue-300 transition truncate">
                    {issue.title}
                  </h3>
                  {siteMap[issue.site_id] && (
                    <p className="text-[11px] text-slate-500 mt-0.5">{siteMap[issue.site_id]}</p>
                  )}
                </div>
                <div className="text-[10px] text-slate-600 flex-shrink-0">
                  {new Date(issue.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ── New issue modal ─────────────────────────────────────────────────────────

function NewIssueModal({ sites, onClose, onCreated }: {
  sites: Site[];
  onClose: () => void;
  onCreated: (issue: Issue) => void;
}) {
  const [siteId, setSiteId] = useState(sites[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Issue['priority']>('medium');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!siteId || !title.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post<Issue>('/api/v1/issues', { site_id: siteId, title, description, priority });
      onCreated(res.data);
    } catch {
      setError('Failed to create issue.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-white mb-4">New Issue</h2>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Site</label>
            <select value={siteId} onChange={e => setSiteId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
              {sites.map(s => <option key={s.id} value={s.id}>{s.name ?? s.url}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required
              placeholder="Brief description of the issue"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Details (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder="Steps to reproduce, expected vs actual behaviour..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value as Issue['priority'])}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
              {['low', 'medium', 'high', 'critical'].map(p => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition">
              Cancel
            </button>
            <button type="submit" disabled={submitting || !title.trim()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Issue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

function IssuesContent() {
  const searchParams = useSearchParams();
  const siteFilter = searchParams.get('site') ?? '';
  const router = useRouter();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [showNew, setShowNew] = useState(false);
  const [filterSite, setFilterSite] = useState(siteFilter);

  useEffect(() => {
    Promise.all([
      api.get<Issue[]>('/api/v1/issues'),
      api.get<Site[]>('/api/v1/sites'),
    ]).then(([issuesRes, sitesRes]) => {
      setIssues(issuesRes.data);
      setSites(sitesRes.data);
    }).finally(() => setLoading(false));
  }, []);

  // Poll for new issues every 5 seconds (catches PM-created tickets)
  useEffect(() => {
    const interval = setInterval(() => {
      api.get<Issue[]>('/api/v1/issues').then((res) => {
        setIssues(res.data);
      }).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filterSite
    ? issues.filter(i => i.site_id === filterSite)
    : issues;

  // Exclude dismissed from kanban (show in list only)
  const activeIssues = filtered.filter(i => (i.kanban_column ?? 'triage') !== 'dismissed');
  const allIssues = filtered;

  function handleCreated(issue: Issue) {
    setIssues(prev => [issue, ...prev]);
    setShowNew(false);
    router.push(`/issues/${issue.id}`);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <>
      {showNew && sites.length > 0 && (
        <NewIssueModal sites={sites} onClose={() => setShowNew(false)} onCreated={handleCreated} />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Issues</h1>
          <p className="text-slate-400 text-sm mt-1">{filtered.length} total</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Site filter */}
          {sites.length > 1 && (
            <select value={filterSite} onChange={e => setFilterSite(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
              <option value="">All sites</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name ?? s.url}</option>)}
            </select>
          )}

          {/* View toggle */}
          <div className="flex bg-slate-800 border border-slate-700 rounded-lg p-1">
            <button onClick={() => setView('kanban')}
              className={`p-1.5 rounded transition ${view === 'kanban' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-white'}`}
              title="Kanban view">
              <Kanban className="w-4 h-4" />
            </button>
            <button onClick={() => setView('list')}
              className={`p-1.5 rounded transition ${view === 'list' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-white'}`}
              title="List view">
              <LayoutList className="w-4 h-4" />
            </button>
          </div>

          {/* New issue */}
          <button onClick={() => setShowNew(true)}
            disabled={sites.length === 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
            <Plus className="w-4 h-4" />
            New Issue
          </button>
        </div>
      </div>

      {/* No sites notice */}
      {sites.length === 0 && (
        <div className="text-center py-20">
          <p className="text-slate-400 mb-3">No sites yet. Add a site to start tracking issues.</p>
          <Link href="/sites" className="text-blue-400 hover:text-blue-300 text-sm underline">
            Go to Sites →
          </Link>
        </div>
      )}

      {/* Board / list */}
      {sites.length > 0 && (
        view === 'kanban'
          ? <KanbanBoard issues={activeIssues} />
          : <ListView issues={allIssues} sites={sites} />
      )}
    </>
  );
}

export default function IssuesPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
      </div>
    }>
      <IssuesContent />
    </Suspense>
  );
}
