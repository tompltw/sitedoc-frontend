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

export interface Issue {
  id: string;
  site_id: string;
  customer_id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence_score: number | null;
  created_at: string;
  resolved_at: string | null;
}

export interface ChatMessage {
  id: string;
  issue_id: string;
  sender_type: 'user' | 'agent' | 'system';
  content: string;
  created_at: string;
}

export interface AgentAction {
  id: string;
  issue_id: string;
  action_type: string;
  description: string;
  status: string;
}

export interface WsEvent {
  type: string;
  [key: string]: unknown;
}
