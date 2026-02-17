'use client';

import { useEffect, useRef, useState, useCallback, UIEvent } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { getToken } from '@/lib/auth';
import type { Issue, ChatMessage, AgentAction, WsEvent, KanbanColumn } from '@/types';
import {
  AlertCircle,
  ArrowDown,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Loader2,
  Paperclip,
  Send,
  Trash2,
  Upload,
  X,
  XCircle,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';

// ── Attachment types ──────────────────────────────────────────────────────

interface Attachment {
  id: string;
  issue_id: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string;
  created_at: string;
  download_url: string;
}

function formatBytes(bytes: number | null): string {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Kanban stage display ──────────────────────────────────────────────────

const KANBAN_LABELS: Record<KanbanColumn, string> = {
  triage: 'Triage',
  ready_for_uat_approval: 'Ready for Approval',
  todo: 'Queued for Dev',
  in_progress: 'In Progress',
  ready_for_qa: 'Ready for QA',
  in_qa: 'QA in Progress',
  ready_for_uat: 'Ready for Your Review',
  done: 'Done',
  dismissed: 'Dismissed',
};

const KANBAN_COLORS: Record<KanbanColumn, string> = {
  triage: 'bg-slate-500/10 text-slate-300 border border-slate-600/30',
  ready_for_uat_approval: 'bg-amber-500/10 text-amber-300 border border-amber-600/30',
  todo: 'bg-yellow-500/10 text-yellow-300 border border-yellow-600/30',
  in_progress: 'bg-blue-500/10 text-blue-300 border border-blue-600/30',
  ready_for_qa: 'bg-purple-500/10 text-purple-300 border border-purple-600/30',
  in_qa: 'bg-purple-500/10 text-purple-300 border border-purple-600/30',
  ready_for_uat: 'bg-orange-500/10 text-orange-300 border border-orange-600/30',
  done: 'bg-green-500/10 text-green-300 border border-green-600/30',
  dismissed: 'bg-slate-500/10 text-slate-400 border border-slate-600/30',
};

const PIPELINE_STAGES: KanbanColumn[] = [
  'triage', 'ready_for_uat_approval', 'todo', 'in_progress',
  'ready_for_qa', 'in_qa', 'ready_for_uat', 'done',
];

function KanbanBadge({ col }: { col: KanbanColumn }) {
  return (
    <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${KANBAN_COLORS[col]}`}>
      {KANBAN_LABELS[col]}
    </span>
  );
}

function PipelineProgress({ col }: { col: KanbanColumn }) {
  const current = PIPELINE_STAGES.indexOf(col);
  if (current === -1) return null;
  return (
    <div className="flex items-center gap-1 mt-3 flex-wrap">
      {PIPELINE_STAGES.map((stage, idx) => (
        <div key={stage} className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
            idx < current ? 'bg-green-400' :
            idx === current ? 'bg-blue-400' :
            'bg-slate-700'
          }`} title={KANBAN_LABELS[stage]} />
          {idx < PIPELINE_STAGES.length - 1 && (
            <div className={`h-px w-4 ${idx < current ? 'bg-green-700' : 'bg-slate-700'}`} />
          )}
        </div>
      ))}
      <span className="text-xs text-slate-500 ml-1">{KANBAN_LABELS[col]}</span>
    </div>
  );
}

// ── Agent role badges ─────────────────────────────────────────────────────

const AGENT_ROLE_LABEL: Record<string, string> = {
  pm: '🤖 PM',
  dev: '🔧 Dev',
  qa: '🧪 QA',
  tech_lead: '👨‍💼 Tech Lead',
};

function AgentRoleBadge({ role }: { role: string }) {
  return (
    <span className="text-[10px] text-slate-500 font-medium">
      {AGENT_ROLE_LABEL[role] ?? role}
    </span>
  );
}

// ── Agent status indicator for Conversation header ────────────────────────

const KANBAN_AGENT: Partial<Record<KanbanColumn, 'pm' | 'dev' | 'qa' | 'tech_lead'>> = {
  triage: 'pm',
  in_progress: 'dev',
  in_qa: 'qa',
};

const AGENT_LABEL: Record<string, string> = {
  pm: 'PM Agent',
  dev: 'Dev Agent',
  qa: 'QA Agent',
  tech_lead: 'Tech Lead Agent',
};

function AgentStatusIndicator({
  issue,
  actions,
}: {
  issue: Issue;
  actions: AgentAction[];
}) {
  const isWorking = actions.some((a) => a.status === 'in_progress');
  const role = issue.kanban_column ? KANBAN_AGENT[issue.kanban_column] ?? null : null;
  const isDone = issue.kanban_column === 'done' || issue.kanban_column === 'dismissed';

  if (!role || isDone) return null;

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${
          isWorking ? 'bg-green-400 animate-pulse' : 'bg-slate-500'
        }`}
      />
      <span className="text-xs text-slate-400">
        {AGENT_LABEL[role] ?? role}
        <span className={`ml-1 ${isWorking ? 'text-green-400' : 'text-slate-500'}`}>
          {isWorking ? '· working' : '· idle'}
        </span>
      </span>
    </div>
  );
}

interface Props {
  issue: Issue;
}

function PriorityBadge({ priority }: { priority: Issue['priority'] }) {
  const styles: Record<Issue['priority'], string> = {
    critical: 'bg-red-500/10 text-red-400 border border-red-600/30',
    high: 'bg-orange-500/10 text-orange-400 border border-orange-600/30',
    medium: 'bg-yellow-500/10 text-yellow-400 border border-yellow-600/30',
    low: 'bg-slate-500/10 text-slate-400 border border-slate-600/30',
  };
  return (
    <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${styles[priority]}`}>
      {priority}
    </span>
  );
}

function ActionStatusIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />;
  if (status === 'failed') return <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />;
  if (status === 'in_progress') return <Loader2 className="w-4 h-4 text-blue-400 flex-shrink-0 animate-spin" />;
  return <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0 animate-pulse" />;
}

export default function IssueDetail({ issue: initialIssue }: Props) {
  const [issue, setIssue] = useState<Issue>(initialIssue);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [approvingFix, setApprovingFix] = useState(false);
  const [rejectingFix, setRejectingFix] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [actionError, setActionError] = useState('');
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Banners
  const [diagnosisBanner, setDiagnosisBanner] = useState<string | null>(null);
  const [fixBanner, setFixBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const issueIdRef = useRef(initialIssue.id);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  // Attachments state
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentsOpen, setAttachmentsOpen] = useState(true);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [deletingAttachment, setDeletingAttachment] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch initial data — only clear loading on success so the spinner
  // keeps showing until polling or WS delivers data on failure.
  useEffect(() => {
    async function load() {
      try {
        const [msgsRes, actionsRes, attsRes] = await Promise.all([
          api.get<ChatMessage[]>(`/api/v1/issues/${issue.id}/messages`),
          api.get<AgentAction[]>(`/api/v1/issues/${issue.id}/actions`),
          api.get<Attachment[]>(`/api/v1/issues/${issue.id}/attachments`),
        ]);
        setMessages(msgsRes.data);
        setActions(actionsRes.data);
        setAttachments(attsRes.data);
        setLoadingInitial(false);
      } catch {
        // Keep loadingInitial=true — polling or WS will deliver updates
      }
    }
    load();
  }, [issue.id]);

  // Attachment handlers
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    setAttachmentError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<Attachment>(
        `/api/v1/issues/${issue.id}/attachments`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setAttachments((prev) => [...prev, res.data]);
    } catch {
      setAttachmentError('Upload failed. Please try again.');
    } finally {
      setUploadingFile(false);
      // Reset file input so same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDeleteAttachment(attachmentId: string) {
    setDeletingAttachment(attachmentId);
    setAttachmentError('');
    try {
      await api.delete(`/api/v1/issues/${issue.id}/attachments/${attachmentId}`);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch {
      setAttachmentError('Delete failed. Please try again.');
    } finally {
      setDeletingAttachment(null);
    }
  }

  const handleWsEvent = useCallback((event: WsEvent) => {
    const id = issueIdRef.current;
    switch (event.type) {
      case 'message':
      case 'chat_message': {
        const msg = event.message as ChatMessage | undefined;
        if (msg) {
          setLoadingInitial(false);
          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
        break;
      }
      case 'action':
      case 'agent_action': {
        const action = event.action as AgentAction | undefined;
        if (action) {
          setActions((prev) => {
            const idx = prev.findIndex((a) => a.id === action.id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = action;
              return updated;
            }
            return [...prev, action];
          });
        }
        break;
      }
      case 'issue_updated':
      case 'status_update': {
        const updated = event.issue as Issue | undefined;
        if (updated) setIssue(updated);
        break;
      }

      // ── New event types ──────────────────────────────────────────────
      case 'diagnosis_ready': {
        const confidence = event.confidence_score as number | undefined;
        const pct = confidence != null ? ` — confidence ${(confidence * 100).toFixed(0)}%` : '';
        setDiagnosisBanner(`Diagnosis complete${pct}`);
        api.get<Issue>(`/api/v1/issues/${id}`)
          .then((res) => setIssue(res.data))
          .catch(() => {});
        break;
      }
      case 'action_started': {
        const actionId = event.action_id as string | undefined;
        if (actionId) {
          setActions((prev) =>
            prev.map((a) => (a.id === actionId ? { ...a, status: 'in_progress' } : a))
          );
        }
        break;
      }
      case 'action_completed': {
        const actionId = event.action_id as string | undefined;
        if (actionId) {
          setActions((prev) =>
            prev.map((a) => (a.id === actionId ? { ...a, status: 'completed' } : a))
          );
        }
        break;
      }
      case 'action_failed': {
        const actionId = event.action_id as string | undefined;
        const errDetail = event.error as string | undefined;
        if (actionId) {
          setActions((prev) =>
            prev.map((a) =>
              a.id === actionId
                ? { ...a, status: 'failed', error_detail: errDetail }
                : a
            )
          );
        }
        break;
      }
      case 'fix_complete': {
        setFixBanner({ type: 'success', message: 'Fix applied successfully!' });
        api.get<Issue>(`/api/v1/issues/${id}`)
          .then((res) => setIssue(res.data))
          .catch(() => {});
        break;
      }
      case 'fix_failed': {
        const errMsg = event.error as string | undefined;
        setFixBanner({
          type: 'error',
          message: errMsg ?? 'Fix failed. Please check the action log.',
        });
        break;
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // WebSocket connection
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    // Build WS URL from the API base URL (swap http → ws)
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
    const wsBase = apiBase.replace(/^http/, 'ws');
    const wsUrl = `${wsBase}/ws/issues/${issue.id}?token=${token}`;

    let pollInterval: ReturnType<typeof setInterval> | null = null;

    function startPolling() {
      if (pollInterval) return;
      pollInterval = setInterval(async () => {
        try {
          const res = await api.get<ChatMessage[]>(`/api/v1/issues/${issue.id}/messages`);
          setMessages(res.data);
          setLoadingInitial(false);
          // Also refresh issue state
          const issueRes = await api.get(`/api/v1/issues/${issue.id}`);
          setIssue(issueRes.data);
        } catch { /* silent */ }
      }, 5000);
    }

    function stopPolling() {
      if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => { stopPolling(); };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data: WsEvent = JSON.parse(event.data as string);
        handleWsEvent(data);
      } catch {
        // Ignore parse errors
      }
    };

    ws.onerror = () => { startPolling(); };
    ws.onclose = () => { wsRef.current = null; startPolling(); };

    // Start polling immediately as fallback (WS will stop it if it connects)
    startPolling();

    return () => {
      ws.close();
      stopPolling();
    };
  }, [issue.id, handleWsEvent]);

  // Track whether the user is scrolled near the bottom of the chat
  function handleChatScroll(e: UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const threshold = 80; // px from bottom
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setIsNearBottom(atBottom);
    if (atBottom) setHasNewMessages(false);
  }

  function scrollToBottom() {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setHasNewMessages(false);
  }

  // Auto-scroll chat only if the user is near the bottom
  useEffect(() => {
    if (isNearBottom) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (messages.length > 0) {
      setHasNewMessages(true);
    }
  }, [messages, isNearBottom]);

  // Progress bar derived values
  const completedActions = actions.filter((a) => a.status === 'completed').length;
  const failedActions = actions.filter((a) => a.status === 'failed').length;
  const totalActions = actions.length;
  const showProgress = totalActions > 0 && (issue.status === 'in_progress' || completedActions > 0);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || sendingMsg) return;
    setSendingMsg(true);
    try {
      const res = await api.post<ChatMessage>(`/api/v1/issues/${issue.id}/messages`, {
        content: newMessage.trim(),
      });
      setMessages((prev) => {
        if (prev.find((m) => m.id === res.data.id)) return prev;
        return [...prev, res.data];
      });
      setNewMessage('');
    } catch {
      // Show nothing — message failed silently
    } finally {
      setSendingMsg(false);
    }
  }

  async function approveFix() {
    setApprovingFix(true);
    setActionError('');
    try {
      const res = await api.post<Issue>(`/api/v1/issues/${issue.id}/approve`);
      setIssue(res.data);
    } catch {
      setActionError('Failed to approve fix. Please try again.');
    } finally {
      setApprovingFix(false);
    }
  }

  async function rejectFix() {
    setRejectingFix(true);
    setActionError('');
    try {
      const res = await api.post<Issue>(`/api/v1/issues/${issue.id}/reject`);
      setIssue(res.data);
    } catch {
      setActionError('Failed to reject fix. Please try again.');
    } finally {
      setRejectingFix(false);
    }
  }

  async function transition(toCol: KanbanColumn, note?: string) {
    setTransitioning(true);
    setActionError('');
    try {
      const res = await api.post<Issue>(`/api/v1/issues/${issue.id}/transition`, {
        to_col: toCol,
        note,
      });
      setIssue(res.data);
    } catch (e: unknown) {
      const d = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setActionError(typeof d === 'string' ? d : 'Action failed. Please try again.');
    } finally {
      setTransitioning(false);
    }
  }

  const showApproveReject = issue.status === 'pending_approval';
  const kanban = issue.kanban_column ?? 'triage';

  return (
    <div className="space-y-6">
      {/* Diagnosis banner */}
      {diagnosisBanner && (
        <div className="flex items-center justify-between gap-3 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-xl px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{diagnosisBanner}</span>
          </div>
          <button
            onClick={() => setDiagnosisBanner(null)}
            className="text-blue-400 hover:text-blue-200 flex-shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Fix result banner */}
      {fixBanner && (
        <div
          className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm border ${
            fixBanner.type === 'success'
              ? 'bg-green-500/10 border-green-500/30 text-green-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {fixBanner.type === 'success' ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{fixBanner.message}</span>
          </div>
          <button
            onClick={() => setFixBanner(null)}
            className={`flex-shrink-0 ${
              fixBanner.type === 'success' ? 'text-green-400 hover:text-green-200' : 'text-red-400 hover:text-red-200'
            }`}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        {/* Back + ticket number */}
        <div className="flex items-center justify-between mb-3">
          <Link href="/issues" className="text-slate-500 hover:text-white text-xs transition flex items-center gap-1">
            ← Back to Issues
          </Link>
          {issue.ticket_number && (
            <span className="text-xs text-slate-500 font-mono bg-slate-700 px-2 py-1 rounded">
              TKT-{String(issue.ticket_number).padStart(3, '0')}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white truncate">{issue.title}</h1>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">{issue.description}</p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <KanbanBadge col={kanban} />
              <PriorityBadge priority={issue.priority} />
              {issue.confidence_score !== null && (
                <span className="text-xs text-slate-400 bg-slate-700 border border-slate-600 px-2.5 py-1 rounded-full">
                  Confidence: {(issue.confidence_score * 100).toFixed(0)}%
                </span>
              )}
              {issue.dev_fail_count > 0 && (
                <span className="text-xs text-red-400 bg-red-900/20 border border-red-600/30 px-2.5 py-1 rounded-full">
                  {issue.dev_fail_count} fail{issue.dev_fail_count !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Pipeline progress bar */}
            <PipelineProgress col={kanban} />
          </div>

          {/* Contextual customer action buttons */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            {kanban === 'ready_for_uat_approval' && (
              <button
                onClick={() => transition('todo')}
                disabled={transitioning}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
              >
                {transitioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Approve &amp; Start Work
              </button>
            )}
            {kanban === 'ready_for_uat' && (
              <>
                <button
                  onClick={() => transition('done')}
                  disabled={transitioning}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
                >
                  {transitioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                  UAT Pass — Looks Good
                </button>
                <button
                  onClick={() => transition('todo', 'UAT failed — customer rejected')}
                  disabled={transitioning}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
                >
                  {transitioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsDown className="w-4 h-4" />}
                  UAT Fail — Still Broken
                </button>
              </>
            )}
            {/* Legacy approve/reject (pending_approval status) */}
            {showApproveReject && kanban !== 'ready_for_uat' && (
              <div className="flex gap-2">
                <button
                  onClick={approveFix}
                  disabled={approvingFix || rejectingFix}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
                >
                  {approvingFix && <Loader2 className="w-4 h-4 animate-spin" />}
                  Approve Fix
                </button>
                <button
                  onClick={rejectFix}
                  disabled={approvingFix || rejectingFix}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
                >
                  {rejectingFix && <Loader2 className="w-4 h-4 animate-spin" />}
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>

        {actionError && (
          <div className="mt-3 text-sm text-red-400 bg-red-900/20 border border-red-700 rounded-lg px-4 py-2">
            {actionError}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chat */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl flex flex-col h-[520px]">
          <div className="px-5 py-3.5 border-b border-slate-700 flex-shrink-0 flex items-center justify-between">
            <h2 className="text-white font-semibold text-sm">Conversation</h2>
            <AgentStatusIndicator issue={issue} actions={actions} />
          </div>

          {/* Messages */}
          <div
            ref={chatContainerRef}
            onScroll={handleChatScroll}
            className="flex-1 overflow-y-auto p-4 space-y-3 relative"
          >
            {loadingInitial ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                <span className="text-slate-400 text-sm">Loading messages…</span>
              </div>
            ) : messages.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No messages yet.</p>
            ) : (
              messages.map((msg) => {
                if (msg.sender_type === 'system') {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <span className="text-xs text-slate-500 bg-slate-700/50 px-3 py-1 rounded-full">
                        {msg.content}
                      </span>
                    </div>
                  );
                }
                const isUser = msg.sender_type === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    {!isUser && msg.agent_role && (
                      <div className="mb-1 ml-1">
                        <AgentRoleBadge role={msg.agent_role} />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isUser
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-slate-700 text-slate-200 rounded-bl-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <p
                        className={`text-[10px] mt-1 ${
                          isUser ? 'text-blue-200' : 'text-slate-500'
                        }`}
                      >
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* New messages indicator */}
          {hasNewMessages && (
            <div className="flex-shrink-0 flex justify-center py-1 border-t border-slate-700/50">
              <button
                onClick={scrollToBottom}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg transition"
              >
                <ArrowDown className="w-3 h-3" />
                New messages
              </button>
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={sendMessage}
            className="border-t border-slate-700 p-3 flex gap-2 flex-shrink-0"
          >
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sendingMsg}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg px-3 py-2 transition"
            >
              {sendingMsg ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>

        {/* Agent Actions */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl flex flex-col h-[520px]">
          <div className="px-5 py-3.5 border-b border-slate-700 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold text-sm">Fix Progress</h2>
              {totalActions > 0 && (
                <span className="text-xs text-slate-400">
                  {completedActions}/{totalActions} steps
                  {failedActions > 0 && (
                    <span className="text-red-400 ml-1">({failedActions} failed)</span>
                  )}
                </span>
              )}
            </div>

            {/* Progress bar */}
            {showProgress && (
              <div className="mt-2.5">
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      failedActions > 0 ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                    style={{
                      width: `${totalActions > 0 ? (completedActions / totalActions) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {loadingInitial ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : actions.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">
                No agent actions yet. The AI agent will act here once analysis begins.
              </p>
            ) : (
              <ul className="space-y-3">
                {actions.map((action, idx) => (
                  <li
                    key={action.id}
                    className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${
                      action.status === 'in_progress'
                        ? 'bg-blue-500/10 border border-blue-600/20'
                        : action.status === 'completed'
                        ? 'bg-green-500/5 border border-green-600/10'
                        : action.status === 'failed'
                        ? 'bg-red-500/10 border border-red-600/20'
                        : 'bg-slate-700/40'
                    }`}
                  >
                    {/* Step number */}
                    <span className="text-xs text-slate-500 font-mono w-5 flex-shrink-0 mt-0.5">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <ActionStatusIcon status={action.status} />
                        <span className="text-xs font-medium text-slate-300 truncate">
                          {action.action_type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {action.description}
                      </p>
                      {action.status === 'failed' && action.error_detail && (
                        <p className="text-xs text-red-400 mt-1 leading-relaxed">
                          {action.error_detail}
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-medium flex-shrink-0 ${
                        action.status === 'completed'
                          ? 'text-green-400'
                          : action.status === 'failed'
                          ? 'text-red-400'
                          : action.status === 'in_progress'
                          ? 'text-blue-400'
                          : 'text-yellow-400'
                      }`}
                    >
                      {action.status.replace('_', ' ')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Attachments panel */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl">
        {/* Header */}
        <button
          onClick={() => setAttachmentsOpen((v) => !v)}
          className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-700/30 rounded-xl transition"
        >
          <div className="flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-slate-400" />
            <h2 className="text-white font-semibold text-sm">Attachments</h2>
            {attachments.length > 0 && (
              <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {attachments.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Upload button inside header */}
            <button
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              disabled={uploadingFile}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 px-2.5 py-1 rounded-lg transition disabled:opacity-50"
              title="Upload file"
            >
              {uploadingFile ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              {uploadingFile ? 'Uploading…' : 'Upload'}
            </button>
            {attachmentsOpen ? (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-500" />
            )}
          </div>
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileUpload}
          accept="*/*"
        />

        {/* Body */}
        {attachmentsOpen && (
          <div className="px-5 pb-4 border-t border-slate-700">
            {attachmentError && (
              <div className="mt-3 text-xs text-red-400 bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-2">
                {attachmentError}
              </div>
            )}

            {attachments.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">
                No attachments yet.{' '}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-400 hover:text-blue-300 underline transition"
                >
                  Upload a file
                </button>
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {attachments.map((att) => (
                  <li
                    key={att.id}
                    className="flex items-center gap-3 bg-slate-700/40 rounded-lg px-3 py-2.5 group"
                  >
                    <Paperclip className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">{att.filename}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatBytes(att.size_bytes)}
                        {att.mime_type ? ` · ${att.mime_type}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Download */}
                      <a
                        href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'}${att.download_url}`}
                        download={att.filename}
                        className="p-1.5 text-slate-400 hover:text-white rounded transition"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteAttachment(att.id)}
                        disabled={deletingAttachment === att.id}
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded transition disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingAttachment === att.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 text-sm">
        <h3 className="text-slate-400 font-medium text-xs uppercase tracking-wide mb-3">
          Details
        </h3>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <dt className="text-slate-500 text-xs">Issue ID</dt>
            <dd className="text-slate-200 font-mono text-xs mt-0.5 truncate">{issue.id}</dd>
          </div>
          <div>
            <dt className="text-slate-500 text-xs">Site ID</dt>
            <dd className="text-slate-200 font-mono text-xs mt-0.5 truncate">{issue.site_id}</dd>
          </div>
          <div>
            <dt className="text-slate-500 text-xs">Created</dt>
            <dd className="text-slate-200 text-xs mt-0.5">
              {new Date(issue.created_at).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 text-xs">Resolved</dt>
            <dd className="text-slate-200 text-xs mt-0.5">
              {issue.resolved_at ? new Date(issue.resolved_at).toLocaleString() : '—'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
