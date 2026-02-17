'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import api from '@/lib/api';
import { getToken } from '@/lib/auth';
import type { Issue, ChatMessage, AgentAction, WsEvent } from '@/types';
import { Loader2, Send, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Props {
  issue: Issue;
}

function StatusBadge({ status }: { status: Issue['status'] }) {
  const styles: Record<Issue['status'], string> = {
    open: 'bg-yellow-500/10 text-yellow-400 border border-yellow-600/30',
    in_progress: 'bg-blue-500/10 text-blue-400 border border-blue-600/30',
    resolved: 'bg-green-500/10 text-green-400 border border-green-600/30',
    dismissed: 'bg-slate-500/10 text-slate-400 border border-slate-600/30',
  };
  return (
    <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
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
  const [actionError, setActionError] = useState('');
  const [loadingInitial, setLoadingInitial] = useState(true);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch initial data
  useEffect(() => {
    async function load() {
      try {
        const [msgsRes, actionsRes] = await Promise.all([
          api.get<ChatMessage[]>(`/api/v1/issues/${issue.id}/messages`),
          api.get<AgentAction[]>(`/api/v1/issues/${issue.id}/actions`),
        ]);
        setMessages(msgsRes.data);
        setActions(actionsRes.data);
      } catch {
        // Continue even if these fail — WS will deliver live updates
      } finally {
        setLoadingInitial(false);
      }
    }
    load();
  }, [issue.id]);

  // WebSocket connection
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const wsUrl = `ws://localhost:5000/ws/issues/${issue.id}?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data: WsEvent = JSON.parse(event.data as string);
        handleWsEvent(data);
      } catch {
        // Ignore parse errors
      }
    };

    ws.onerror = () => {
      // Silent — degraded to polling
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    return () => {
      ws.close();
    };
  }, [issue.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleWsEvent = useCallback((event: WsEvent) => {
    switch (event.type) {
      case 'message':
      case 'chat_message': {
        const msg = event.message as ChatMessage | undefined;
        if (msg) {
          setMessages((prev) => {
            // Deduplicate
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
    }
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      // Show nothing — message failed silently (could add toast)
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

  const showApproveReject =
    issue.status === 'in_progress' && (issue.confidence_score ?? 1) < 0.8;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white truncate">{issue.title}</h1>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">{issue.description}</p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <StatusBadge status={issue.status} />
              <PriorityBadge priority={issue.priority} />
              {issue.confidence_score !== null && (
                <span className="text-xs text-slate-400 bg-slate-700 border border-slate-600 px-2.5 py-1 rounded-full">
                  Confidence: {(issue.confidence_score * 100).toFixed(0)}%
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          {showApproveReject && (
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={approveFix}
                disabled={approvingFix || rejectingFix}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
              >
                {approvingFix && <Loader2 className="w-4 h-4 animate-spin" />}
                Approve Fix
              </button>
              <button
                onClick={rejectFix}
                disabled={approvingFix || rejectingFix}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-red-900 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
              >
                {rejectingFix && <Loader2 className="w-4 h-4 animate-spin" />}
                Reject
              </button>
            </div>
          )}
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
          <div className="px-5 py-3.5 border-b border-slate-700 flex-shrink-0">
            <h2 className="text-white font-semibold text-sm">Conversation</h2>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingInitial ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
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
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
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
            <h2 className="text-white font-semibold text-sm">Fix Progress</h2>
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
                    className="flex items-start gap-3 bg-slate-700/40 rounded-lg p-3"
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
                    </div>
                    <span
                      className={`text-[10px] font-medium flex-shrink-0 ${
                        action.status === 'completed'
                          ? 'text-green-400'
                          : action.status === 'failed'
                          ? 'text-red-400'
                          : 'text-yellow-400'
                      }`}
                    >
                      {action.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
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
