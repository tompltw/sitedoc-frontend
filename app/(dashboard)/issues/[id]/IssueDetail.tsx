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

// ActionStatusIcon kept for potential future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // Agent activity tracking
  const [agentStatus, setAgentStatus] = useState<{
    active: boolean;
    role: 'pm' | 'dev' | 'qa' | 'tech_lead' | null;
    sessionKey: string | null;
    lastActivity: Date | null;
    status: 'idle' | 'working' | 'stalled';
  }>({
    active: false,
    role: null,
    sessionKey: null,
    lastActivity: null,
    status: 'idle',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Periodic agent stall check (every 60s)
  useEffect(() => {
    const interval = setInterval(() => {
      if (agentStatus.active && agentStatus.lastActivity) {
        const elapsed = Date.now() - agentStatus.lastActivity.getTime();
        const STALL_THRESHOLD_MS = 45 * 60 * 1000; // 45 minutes
        if (elapsed > STALL_THRESHOLD_MS) {
          setAgentStatus((prev) => ({ ...prev, status: 'stalled' }));
        }
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [agentStatus.active, agentStatus.lastActivity]);

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

        // Check if an agent is currently working (scan recent messages)
        const recentAgentMsgs = msgsRes.data
          .filter((m) => m.sender_type === 'agent' && m.agent_role)
          .slice(-5); // last 5 agent messages

        for (let i = recentAgentMsgs.length - 1; i >= 0; i--) {
          const msg = recentAgentMsgs[i];
          const sessionMatch = msg.content.match(/session: `([^`]+)`/);
          
          // If we find a "session:" message, agent started working
          if (sessionMatch) {
            setAgentStatus({
              active: true,
              role: msg.agent_role as 'pm' | 'dev' | 'qa' | 'tech_lead',
              sessionKey: sessionMatch[1],
              lastActivity: new Date(msg.created_at),
              status: 'working',
            });
            break;
          }
          // If we hit a completion message first, agent is done
          if (msg.content.includes('✅') || msg.content.includes('❌') || msg.content.match(/QA (PASSED|FAILED)/)) {
            break;
          }
        }
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
        formData
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

          // Track agent activity from chat messages
          if (msg.sender_type === 'agent' && msg.agent_role) {
            const role = msg.agent_role as 'pm' | 'dev' | 'qa' | 'tech_lead';
            const sessionMatch = msg.content.match(/session: `([^`]+)`/);
            
            // Agent starting work (has session key in message)
            if (sessionMatch) {
              setAgentStatus({
                active: true,
                role,
                sessionKey: sessionMatch[1],
                lastActivity: new Date(),
                status: 'working',
              });
            }
            // Agent completed (success/failure indicators)
            else if (msg.content.includes('✅') || msg.content.includes('❌') || msg.content.match(/QA (PASSED|FAILED)/)) {
              setAgentStatus((prev) => ({
                ...prev,
                active: false,
                status: 'idle',
                lastActivity: new Date(),
              }));
              // Fetch fresh issue state — the ticket status changes at the same time
              // the agent sends its completion message. This covers cases where the
              // issue_updated WebSocket event is delayed or missed.
              api.get<Issue>(`/api/v1/issues/${id}`)
                .then((res) => setIssue(res.data))
                .catch(() => {});
            }
            // Any other agent message = update activity timestamp
            else if (agentStatus.active) {
              setAgentStatus((prev) => ({
                ...prev,
                lastActivity: new Date(),
              }));
            }
          }
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

  // WebSocket connection with auto-reconnect
  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
    const wsBase = apiBase.replace(/^http/, 'ws');

    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelay = 1000; // start at 1s, back off to 30s
    let destroyed = false;

    function startPolling() {
      if (pollInterval) return;
      pollInterval = setInterval(async () => {
        try {
          const res = await api.get<ChatMessage[]>(`/api/v1/issues/${issue.id}/messages`);
          setMessages(res.data);
          setLoadingInitial(false);
          const issueRes = await api.get(`/api/v1/issues/${issue.id}`);
          setIssue(issueRes.data);
        } catch { /* silent */ }
      }, 3000); // 3s poll while WS is down
    }

    function stopPolling() {
      if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
    }

    function connect() {
      if (destroyed) return;
      const token = getToken();
      if (!token) { startPolling(); return; }

      const wsUrl = `${wsBase}/ws/issues/${issue.id}?token=${token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        stopPolling();
        reconnectDelay = 1000; // reset backoff on successful connect
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const data: WsEvent = JSON.parse(event.data as string);
          handleWsEvent(data);
        } catch {
          // Ignore parse errors
        }
      };

      ws.onerror = () => { startPolling(); };

      ws.onclose = () => {
        wsRef.current = null;
        if (destroyed) return;
        startPolling();
        // Reconnect with exponential backoff (max 30s)
        reconnectTimeout = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, 30000);
          connect();
        }, reconnectDelay);
      };
    }

    // Start polling immediately, WS will stop it on connect
    startPolling();
    connect();

    return () => {
      destroyed = true;
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
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

  // (Fix Progress panel removed — actions data still tracked for WS updates)

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
    <div className="space-y-4">
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

      {/* Two-column layout: left = details, right = conversation */}
      <div className="flex gap-6 items-start">

        {/* ── LEFT COLUMN: Ticket Details ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Agent Activity Status */}
          {agentStatus.active && (
            <div className={`border rounded-xl p-4 ${
              agentStatus.status === 'stalled' 
                ? 'bg-orange-900/10 border-orange-600/30'
                : 'bg-slate-800 border-blue-600/30'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {agentStatus.status === 'stalled' ? (
                      <AlertCircle className="w-4 h-4 text-orange-400" />
                    ) : (
                      <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    )}
                    <span className="text-sm font-semibold text-white">
                      {agentStatus.role === 'pm' && '🤖 PM Agent'}
                      {agentStatus.role === 'dev' && '🔧 Dev Agent'}
                      {agentStatus.role === 'qa' && '🧪 QA Agent'}
                      {agentStatus.role === 'tech_lead' && '👨‍💼 Tech Lead'}
                    </span>
                  </div>
                  {agentStatus.status === 'stalled' ? (
                    <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-1 rounded">No activity detected</span>
                  ) : (
                    <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded">Working</span>
                  )}
                </div>
                {agentStatus.lastActivity && (
                  <span className="text-xs text-slate-500">
                    Last activity: {new Date(agentStatus.lastActivity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              
              {/* Current action */}
              {(() => {
                const inProgress = actions.filter((a) => a.status === 'in_progress');
                const latest = inProgress.length > 0 ? inProgress[inProgress.length - 1] : actions[actions.length - 1];
                return latest ? (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-slate-300 mb-1">{latest.action_type}</div>
                        <div className="text-xs text-slate-400 leading-relaxed">{latest.description}</div>
                      </div>
                      {latest.status === 'in_progress' && (
                        <Loader2 className="w-3 h-3 text-blue-400 animate-spin flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                  </div>
                ) : null;
              })()}

              {agentStatus.sessionKey && (
                <div className="mt-2 text-xs text-slate-400 font-mono">
                  Session: {agentStatus.sessionKey.slice(-12)}
                </div>
              )}
            </div>
          )}

          {/* Ticket header */}
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
                <h1 className="text-xl font-bold text-white">{issue.title}</h1>
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

          {/* Attachments panel */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl">
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

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              accept="*/*"
            />

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
                          <a
                            href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'}${att.download_url}`}
                            download={att.filename}
                            className="p-1.5 text-slate-400 hover:text-white rounded transition"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </a>
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
            <dl className="grid grid-cols-2 gap-4">
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

        {/* ── RIGHT COLUMN: Conversation ── */}
        <div className="w-[420px] flex-shrink-0 bg-slate-800 border border-slate-700 rounded-xl flex flex-col sticky top-4" style={{ height: 'calc(100vh - 120px)', minHeight: '560px' }}>
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
              (kanban === 'done' || kanban === 'dismissed') ? (
                <p className="text-slate-500 text-sm text-center py-8">No messages recorded.</p>
              ) : (
                <div className="flex flex-col items-start gap-1 px-1">
                  <AgentRoleBadge role="pm" />
                  <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm bg-slate-700 text-slate-200 rounded-bl-sm leading-relaxed">
                    <p>👋 Hi! I&apos;m your SiteDoc AI assistant. Here&apos;s what I can help you with:</p>
                    <ul className="mt-2 space-y-1 text-slate-300">
                      <li>🐛 <span className="font-medium">Bug fixes</span> — diagnose and fix errors, broken pages, or plugin conflicts</li>
                      <li>⚡ <span className="font-medium">Performance</span> — speed up slow pages, optimise assets, fix Core Web Vitals</li>
                      <li>🔒 <span className="font-medium">Security</span> — patch vulnerabilities, harden configs, clean malware</li>
                      <li>🛠️ <span className="font-medium">New features</span> — build or modify functionality on your WordPress site</li>
                      <li>⚙️ <span className="font-medium">Configuration</span> — server settings, caching, redirects, SSL, DNS</li>
                    </ul>
                    <p className="mt-2 text-slate-400">What can I help you with today?</p>
                    <p className="text-[10px] mt-1 text-slate-500">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
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

      </div>
    </div>
  );
}
