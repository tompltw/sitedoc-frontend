export interface Customer {
  id: string;
  email: string;
  plan: string;
  created_at: string;
}

export interface Site {
  id: string;
  customer_id: string;
  url: string;
  name: string;
  status: string;
  last_health_check: string | null;
  created_at: string;
}

export type KanbanColumn =
  | 'triage'
  | 'ready_for_uat_approval'
  | 'todo'
  | 'in_progress'
  | 'ready_for_qa'
  | 'in_qa'
  | 'ready_for_uat'
  | 'done'
  | 'dismissed';

export interface Issue {
  id: string;
  site_id: string;
  customer_id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'pending_approval' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence_score: number | null;
  kanban_column: KanbanColumn;
  dev_fail_count: number;
  ticket_number: number | null;
  created_at: string;
  resolved_at: string | null;
}

export interface TicketTransition {
  id: string;
  issue_id: string;
  from_col: KanbanColumn | null;
  to_col: KanbanColumn;
  actor_type: string;
  actor_id: string | null;
  note: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  issue_id: string;
  sender_type: 'user' | 'agent' | 'system';
  content: string;
  agent_role: 'pm' | 'dev' | 'qa' | 'tech_lead' | null;
  created_at: string;
}

export interface AgentAction {
  id: string;
  issue_id: string;
  action_type: string;
  description: string;
  status: string;
  error_detail?: string;
}

export interface WsEvent {
  type: string;
  [key: string]: unknown;
}
