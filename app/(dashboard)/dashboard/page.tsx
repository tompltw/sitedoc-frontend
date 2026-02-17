'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import type { Issue, Site } from '@/types';
import { AlertTriangle, CheckCircle, Globe, Loader2, TrendingUp } from 'lucide-react';

interface Stats {
  totalIssues: number;
  openIssues: number;
  resolvedIssues: number;
  totalSites: number;
}

const STATUS_COLORS: Record<Issue['status'], string> = {
  open: 'bg-yellow-500/10 text-yellow-400 border border-yellow-600/30',
  in_progress: 'bg-blue-500/10 text-blue-400 border border-blue-600/30',
  resolved: 'bg-green-500/10 text-green-400 border border-green-600/30',
  dismissed: 'bg-slate-500/10 text-slate-400 border border-slate-600/30',
};

const PRIORITY_COLORS: Record<Issue['priority'], string> = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-yellow-400',
  low: 'text-slate-400',
};

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-slate-400 text-sm">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentIssues, setRecentIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [issuesRes, sitesRes] = await Promise.all([
          api.get<Issue[]>('/api/v1/issues/', { params: { limit: 10 } }),
          api.get<Site[]>('/api/v1/sites/'),
        ]);

        const issues = issuesRes.data;
        const sites = sitesRes.data;

        setStats({
          totalIssues: issues.length,
          openIssues: issues.filter((i) => i.status === 'open').length,
          resolvedIssues: issues.filter((i) => i.status === 'resolved').length,
          totalSites: sites.length,
        });

        setRecentIssues(issues.slice(0, 8));
      } catch {
        setError('Failed to load dashboard data. Is the API running?');
      } finally {
        setLoading(false);
      }
    }

    load();
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Overview of your monitored sites and issues</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Issues"
          value={stats?.totalIssues ?? 0}
          icon={<TrendingUp className="w-5 h-5" />}
          color="bg-blue-500/10 text-blue-400"
        />
        <StatCard
          label="Open Issues"
          value={stats?.openIssues ?? 0}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="bg-yellow-500/10 text-yellow-400"
        />
        <StatCard
          label="Resolved"
          value={stats?.resolvedIssues ?? 0}
          icon={<CheckCircle className="w-5 h-5" />}
          color="bg-green-500/10 text-green-400"
        />
        <StatCard
          label="Sites Monitored"
          value={stats?.totalSites ?? 0}
          icon={<Globe className="w-5 h-5" />}
          color="bg-purple-500/10 text-purple-400"
        />
      </div>

      {/* Recent Issues */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h2 className="text-white font-semibold">Recent Issues</h2>
          <Link href="/issues" className="text-blue-400 hover:text-blue-300 text-sm transition">
            View all →
          </Link>
        </div>

        {recentIssues.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-500 text-sm">No issues found.</div>
        ) : (
          <ul className="divide-y divide-slate-700">
            {recentIssues.map((issue) => (
              <li key={issue.id}>
                <Link
                  href={`/issues/${issue.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-700/50 transition"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{issue.title}</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {new Date(issue.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-medium ${PRIORITY_COLORS[issue.priority]}`}>
                      {issue.priority.toUpperCase()}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[issue.status]}`}
                    >
                      {issue.status.replace('_', ' ')}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
