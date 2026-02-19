'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  Loader2,
  Save,
  RefreshCw,
  CheckCircle,
  XCircle,
  Bot,
  Server,
  AlertCircle,
} from 'lucide-react';

interface AgentConfig {
  config: {
    AGENT_MODEL_DEV: string;
    AGENT_MODEL_QA: string;
    AGENT_MODEL_PM: string;
    AGENT_MODEL_TECH_LEAD: string;
  };
}

interface CeleryStatus {
  ok: boolean;
  error?: string;
  workers: string[];
  active_tasks: Record<string, number>;
  reserved_tasks: Record<string, number>;
  raw?: Record<string, unknown>;
}

const MODEL_OPTIONS = [
  'claude-haiku-4-5',
  'claude-sonnet-4-5',
  'claude-opus-4-5',
  'claude-3-5-haiku-20241022',
  'claude-3-5-sonnet-20241022',
  'claude-3-opus-20240229',
  'gpt-4o',
  'gpt-4o-mini',
];

const AGENT_LABELS: Record<string, string> = {
  AGENT_MODEL_DEV: '🔧 Dev Agent',
  AGENT_MODEL_QA: '🧪 QA Agent',
  AGENT_MODEL_PM: '🤖 PM Agent',
  AGENT_MODEL_TECH_LEAD: '👨‍💼 Tech Lead Agent',
};

export default function AdminAgentsPage() {
  const [config, setConfig] = useState<AgentConfig['config'] | null>(null);
  const [draftConfig, setDraftConfig] = useState<AgentConfig['config'] | null>(null);
  const [celery, setCelery] = useState<CeleryStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [celeryLoading, setCeleryLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [restartMsg, setRestartMsg] = useState('');

  useEffect(() => {
    api
      .get<AgentConfig>('/api/v1/internal/admin/agent-config')
      .then((res) => {
        setConfig(res.data.config);
        setDraftConfig({ ...res.data.config });
      })
      .catch(() => setSaveMsg('Failed to load agent config.'))
      .finally(() => setLoading(false));

    loadCeleryStatus();
  }, []);

  function loadCeleryStatus() {
    setCeleryLoading(true);
    api
      .get<CeleryStatus>('/api/v1/internal/admin/celery-status')
      .then((res) => setCelery(res.data))
      .catch(() => setCelery({ ok: false, error: 'Request failed', workers: [], active_tasks: {}, reserved_tasks: {} }))
      .finally(() => setCeleryLoading(false));
  }

  async function saveConfig() {
    if (!draftConfig) return;
    setSaving(true);
    setSaveMsg('');
    try {
      await api.post('/api/v1/internal/admin/agent-config', draftConfig);
      setConfig({ ...draftConfig });
      setSaveMsg('Configuration saved successfully.');
    } catch {
      setSaveMsg('Failed to save config. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function restartWorkers() {
    setRestarting(true);
    setRestartMsg('');
    try {
      const res = await api.post<{ ok: boolean; method?: string; error?: string }>(
        '/api/v1/internal/admin/restart-workers'
      );
      if (res.data.ok) {
        setRestartMsg(`Workers restarted (${res.data.method ?? 'ok'}).`);
        setTimeout(() => loadCeleryStatus(), 3000);
      } else {
        setRestartMsg(`Restart failed: ${res.data.error}`);
      }
    } catch {
      setRestartMsg('Failed to restart workers.');
    } finally {
      setRestarting(false);
    }
  }

  const hasChanges = config && draftConfig &&
    JSON.stringify(config) !== JSON.stringify(draftConfig);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Agent Configuration</h1>
        <p className="text-slate-400 text-sm mt-1">Manage AI model assignments and Celery workers</p>
      </div>

      {/* Agent Models */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <Bot className="w-5 h-5 text-blue-400" />
          <h2 className="text-white font-semibold">Model Configuration</h2>
          <span className="text-xs text-slate-500 ml-auto">Changes take effect on next task run</span>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading config…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              {draftConfig && Object.entries(draftConfig).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    {AGENT_LABELS[key] ?? key}
                    <span className="ml-2 text-xs text-slate-500 font-mono">{key}</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={value}
                      onChange={(e) => setDraftConfig((prev) => prev ? { ...prev, [key]: e.target.value } : prev)}
                      className="flex-1 bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      {MODEL_OPTIONS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  {/* Custom model input */}
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setDraftConfig((prev) => prev ? { ...prev, [key]: e.target.value } : prev)}
                    placeholder="Or type custom model name…"
                    className="mt-1.5 w-full bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 placeholder-slate-600"
                  />
                </div>
              ))}
            </div>

            {saveMsg && (
              <div className={`flex items-center gap-2 text-sm rounded-lg px-4 py-2.5 mb-4 ${
                saveMsg.includes('success')
                  ? 'bg-green-900/20 border border-green-700 text-green-300'
                  : 'bg-red-900/20 border border-red-700 text-red-300'
              }`}>
                {saveMsg.includes('success') ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                {saveMsg}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={saveConfig}
                disabled={saving || !hasChanges}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving…' : 'Save Config'}
              </button>
              {!hasChanges && config && (
                <span className="text-xs text-slate-500">No changes</span>
              )}
              {hasChanges && (
                <span className="text-xs text-amber-400">Unsaved changes</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Celery Workers */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-green-400" />
            <h2 className="text-white font-semibold">Celery Workers</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadCeleryStatus}
              disabled={celeryLoading}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${celeryLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={restartWorkers}
              disabled={restarting}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/40 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
            >
              {restarting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {restarting ? 'Restarting…' : 'Restart Workers'}
            </button>
          </div>
        </div>

        {restartMsg && (
          <div className={`flex items-center gap-2 text-sm rounded-lg px-4 py-2.5 mb-4 ${
            restartMsg.includes('restart')
              ? 'bg-green-900/20 border border-green-700 text-green-300'
              : 'bg-red-900/20 border border-red-700 text-red-300'
          }`}>
            {restartMsg}
          </div>
        )}

        {celeryLoading ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Checking workers…
          </div>
        ) : celery ? (
          <div className="space-y-3">
            {/* Status indicator */}
            <div className="flex items-center gap-2">
              {celery.ok ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400 font-medium">
                    {celery.workers.length} worker{celery.workers.length !== 1 ? 's' : ''} connected
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-400 font-medium">Workers unavailable</span>
                  {celery.error && (
                    <span className="text-xs text-slate-500 ml-1">— {celery.error}</span>
                  )}
                </>
              )}
            </div>

            {/* Worker list */}
            {celery.workers.length > 0 && (
              <div className="space-y-2">
                {celery.workers.map((worker) => (
                  <div
                    key={worker}
                    className="bg-slate-700/50 rounded-lg px-4 py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                      <span className="text-sm text-slate-200 font-mono">{worker}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>Active: <span className="text-white font-medium">{celery.active_tasks[worker] ?? 0}</span></span>
                      <span>Queued: <span className="text-white font-medium">{celery.reserved_tasks[worker] ?? 0}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {celery.ok && celery.workers.length === 0 && (
              <div className="text-sm text-slate-500">
                No workers found. Make sure Celery is running.
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
