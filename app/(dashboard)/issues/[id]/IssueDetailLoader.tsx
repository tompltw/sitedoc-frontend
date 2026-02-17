'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import type { Issue } from '@/types';
import IssueDetail from './IssueDetail';
import { Loader2, AlertCircle } from 'lucide-react';

interface Props {
  issueId: string;
}

export default function IssueDetailLoader({ issueId }: Props) {
  const router = useRouter();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<Issue>(`/api/v1/issues/${issueId}`)
      .then((res) => setIssue(res.data))
      .catch((err: unknown) => {
        const axiosErr = err as { response?: { status?: number } };
        if (axiosErr.response?.status === 404) {
          setError('Issue not found.');
        } else {
          setError('Failed to load issue. Please try again.');
        }
      })
      .finally(() => setLoading(false));
  }, [issueId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.back()}
          className="text-sm text-slate-400 hover:text-white transition"
        >
          ← Back to Issues
        </button>
        <div className="flex items-center gap-3 bg-red-900/20 border border-red-700 text-red-300 rounded-xl p-6 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error || 'Issue not found.'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.back()}
        className="text-sm text-slate-400 hover:text-white transition"
      >
        ← Back to Issues
      </button>
      <IssueDetail issue={issue} />
    </div>
  );
}
