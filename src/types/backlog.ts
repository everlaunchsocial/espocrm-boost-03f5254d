// ============================================
// FEATURE DEVELOPMENT BACKLOG - TYPE DEFINITIONS
// ============================================

export type BacklogPriority = 'low' | 'medium' | 'high' | 'critical';
export type BacklogAction = 'create' | 'update' | 'delete' | 'comment' | 'attach' | 'move' | 'assign' | 'tag' | 'link_chat' | 'archive' | 'restore';

// Database row types
export interface BacklogStatus {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  icon: string;
  position: number;
  is_default: boolean;
  is_done_state: boolean;
  is_archived_state: boolean;
  created_at: string;
  updated_at: string;
}

export interface BacklogTag {
  id: string;
  name: string;
  color: string;
  description: string | null;
  created_at: string;
}

export interface BacklogItem {
  id: string;
  title: string;
  description: string | null;
  status_id: string;
  priority: BacklogPriority;
  position: number;
  story_points: number | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  is_abandoned: boolean;
  abandoned_at: string | null;
  abandoned_reason: string | null;
  deleted_at: string | null;
  conversation_context: string | null;
  research_notes: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface BacklogComment {
  id: string;
  item_id: string;
  body: string;
  is_resolution: boolean;
  parent_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface BacklogHistory {
  id: string;
  item_id: string;
  action: BacklogAction;
  actor_id: string | null;
  actor_email: string | null;
  changed_fields: unknown;
  before_values: unknown;
  after_values: unknown;
  reason: string | null;
  created_at: string;
}

export interface BacklogAttachment {
  id: string;
  item_id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
  metadata: unknown;
  uploaded_by: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface BacklogAssignee {
  id: string;
  item_id: string;
  user_id: string | null;
  assigned_by: string | null;
  assigned_at: string;
}

export interface BacklogChatLink {
  id: string;
  item_id: string;
  chat_session_id: string | null;
  chat_platform: string;
  chat_snapshot: unknown;
  summary: string | null;
  linked_by: string | null;
  created_at: string;
}

// Extended types with relations
export interface BacklogItemWithRelations extends BacklogItem {
  status?: BacklogStatus;
  tags?: BacklogTag[];
  comments?: BacklogComment[];
  history?: BacklogHistory[];
  attachments?: BacklogAttachment[];
  assignees?: BacklogAssignee[];
  chat_links?: BacklogChatLink[];
  comment_count?: number;
  attachment_count?: number;
}

// Board view type - statuses with their items
export interface BacklogColumn extends BacklogStatus {
  items: BacklogItemWithRelations[];
}

// API payload types
export interface CreateBacklogItemPayload {
  title: string;
  description?: string;
  status_id?: string;
  priority?: BacklogPriority;
  story_points?: number;
  estimated_hours?: number;
  conversation_context?: string;
  tag_ids?: string[];
}

export interface UpdateBacklogItemPayload {
  title?: string;
  description?: string;
  status_id?: string;
  priority?: BacklogPriority;
  position?: number;
  story_points?: number;
  estimated_hours?: number;
  actual_hours?: number;
  is_abandoned?: boolean;
  abandoned_reason?: string;
  conversation_context?: string;
  research_notes?: string;
}

export interface MoveBacklogItemPayload {
  status_id: string;
  position: number;
}

export interface AddCommentPayload {
  item_id: string;
  body: string;
  is_resolution?: boolean;
  parent_id?: string;
}

export interface AddChatLinkPayload {
  item_id: string;
  chat_session_id?: string;
  chat_platform?: string;
  chat_snapshot: Array<{ role: string; content: string; timestamp?: string }>;
  summary?: string;
}

// Filter types
export interface BacklogFilters {
  search?: string;
  priority?: BacklogPriority[];
  tag_ids?: string[];
  is_abandoned?: boolean;
  status_ids?: string[];
}

// Priority config
export const PRIORITY_CONFIG: Record<BacklogPriority, { label: string; color: string; icon: string }> = {
  low: { label: 'Low', color: '#6b7280', icon: 'minus' },
  medium: { label: 'Medium', color: '#3b82f6', icon: 'equal' },
  high: { label: 'High', color: '#f59e0b', icon: 'arrow-up' },
  critical: { label: 'Critical', color: '#ef4444', icon: 'alert-triangle' },
};

// Action labels for history display
export const ACTION_LABELS: Record<BacklogAction, string> = {
  create: 'Created item',
  update: 'Updated item',
  delete: 'Deleted item',
  comment: 'Added comment',
  attach: 'Added attachment',
  move: 'Moved item',
  assign: 'Changed assignment',
  tag: 'Updated tags',
  link_chat: 'Linked chat session',
  archive: 'Archived item',
  restore: 'Restored item',
};
