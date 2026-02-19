'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import {
  Users,
  Globe,
  AlertTriangle,
  Bot,
  Loader2,
  ArrowRight,
  Activity,
  CheckCircle,
  Clock,
} from 'lucide-react';

interface Stats {
  total_users: number;
  total_sites: number;
  total_issues: number;
  open_issues: number;
  resolved_issues: number;
  issues_by_status: Record<string, number>;
  agents_running: number;
  recent_transitions: RecentTransition[];
  agent_config: Record<string, string>;
}

interface RecentTransition {
  id: string;
  issue_id: string;
  from_col: string | null;
  to_col: string;
  actor_type: string;
  note: string | null;
  created_at: string | null;
}

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

function StatCard({
  label,
  value,
  icon: Icon,
  href,
  color = 'blue',
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  href: string;
  color?: string;
}) {
  const colors: Record<string, string> = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
  };
  return (
    <Link
      href={href}
      className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition flex items-center gap-4"
    >
      <div className={`${colors[color] ?? colors.blue} flex-shrink-0`}>
        <Icon className="w-8 h-8" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-slate-400">{label}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-slate-600 ml-auto" />
    </Link>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<Stats>('/api/v1/internal/admin/stats')
      .then((res) => setStats(res.data))
      .catch(() => setError('Failed to load admin stats.'))
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

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Overview</h1>
        <p className="text-slate-400 text-sm mt-1">SiteDoc super-admin console</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats.total_users} icon={Users} href="/admin/users" color="blue" />
        <StatCard label="Total Sites" value={stats.total_sites} icon={Globe} href="/admin/sites" color="green" />
        <StatCard label="Open Issues" value={stats.open_issues} icon={AlertTriangle} href="/admin/issues" color="yellow" />
        <StatCard label="Resolved Issues" value={stats.resolved_issues} icon={CheckCircle} href="/admin/issues" color="purple" />
      </div>

      {/* Agent config summary */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Bot className="w-4 h-4 text-blue-400" />
            Agent Models
          </h2>
          <Link
            href="/admin/agents"
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
          >
            Configure <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(stats.agent_config).map(([key, value]) => (
            <div key={key} className="bg-slate-700/50 rounded-lg px-3 py-2">
              <p className="text-xs text-slate-500 mb-1">{key.replace('AGENT_MODEL_', '')}</p>
              <p className="text-sm text-slate-200 font-mono truncate">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/admin/users', label: 'Manage Users', icon: Users },
          { href: '/admin/sites', label: 'Manage Sites', icon: Globe },
          { href: '/admin/issues', label: 'All Issues', icon: AlertTriangle },
          { href: '/admin/agents', label: 'Agent Config', icon: Bot },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl p-4 text-center flex flex-col items-center gap-2 transition"
          >
            <Icon className="w-6 h-6 text-slate-400" />
            <span className="text-sm text-slate-300 font-medium">{label}</span>
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl">
        <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-400" />
          <h2 className="text-white font-semibold">Recent Ticket Transitions</h2>
          <span className="text-xs text-slate-500 ml-auto">Last 20</span>
        </div>
        <div className="divide-y divide-slate-700/50">
          {stats.recent_transitions.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No transitions yet.</p>
          ) : (
            stats.recent_transitions.map((t) => (
              <div key={t.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-700/20 transition">
                <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-400 font-mono truncate">
                      Issue {t.issue_id.slice(0, 8)}…
                    </span>
                    {t.from_col && (
                      <>
                        <span className="text-xs text-slate-500">{KANBAN_LABELS[t.from_col] ?? t.from_col}</span>
                        <ArrowRight className="w-3 h-3 text-slate-600" />
                      </>
                    )}
                    <span className="text-xs text-blue-400 font-medium">
                      {KANBAN_LABELS[t.to_col] ?? t.to_col}
                    </span>
                    <span className="text-xs text-slate-600">via {t.actor_type}</span>
                  </div>
                  {t.note && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{t.note}</p>
                  )}
                </div>
                <Link
                  href={`/issues/${t.issue_id}`}
                  className="text-xs text-slate-500 hover:text-blue-400 flex-shrink-0 transition"
                >
                  View
                </Link>
                <span className="text-xs text-slate-600 flex-shrink-0">
                  {t.created_at ? new Date(t.created_at).toLocaleString() : '—'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
