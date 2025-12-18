// ============================================
// BACKLOG API SERVICE
// Supabase operations for Feature Development Backlog
// ============================================

import { supabase } from '@/integrations/supabase/client';
import type {
  BacklogStatus,
  BacklogTag,
  BacklogItem,
  BacklogItemWithRelations,
  BacklogColumn,
  BacklogComment,
  BacklogHistory,
  BacklogAttachment,
  BacklogChatLink,
  CreateBacklogItemPayload,
  UpdateBacklogItemPayload,
  MoveBacklogItemPayload,
  AddCommentPayload,
  AddChatLinkPayload,
  BacklogFilters,
} from '@/types/backlog';

// ============================================
// STATUSES
// ============================================

export async function fetchStatuses(): Promise<BacklogStatus[]> {
  const { data, error } = await supabase
    .from('backlog_statuses')
    .select('*')
    .order('position', { ascending: true });

  if (error) throw error;
  return data || [];
}

// ============================================
// TAGS
// ============================================

export async function fetchTags(): Promise<BacklogTag[]> {
  const { data, error } = await supabase
    .from('backlog_tags')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createTag(name: string, color: string, description?: string): Promise<BacklogTag> {
  const { data, error } = await supabase
    .from('backlog_tags')
    .insert({ name, color, description })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// ITEMS
// ============================================

export async function fetchItems(filters?: BacklogFilters): Promise<BacklogItemWithRelations[]> {
  let query = supabase
    .from('backlog_items')
    .select(`
      *,
      backlog_item_tags(tag_id, backlog_tags(*)),
      backlog_comments(count),
      backlog_attachments(count)
    `)
    .is('deleted_at', null)
    .order('position', { ascending: true });

  // Apply filters
  if (filters?.is_abandoned !== undefined) {
    query = query.eq('is_abandoned', filters.is_abandoned);
  }

  if (filters?.priority?.length) {
    query = query.in('priority', filters.priority);
  }

  if (filters?.status_ids?.length) {
    query = query.in('status_id', filters.status_ids);
  }

  if (filters?.search) {
    query = query.textSearch('search_vector', filters.search, { type: 'websearch' });
  }

  const { data, error } = await query;

  if (error) throw error;

  // Transform the nested data
  return (data || []).map((item: any) => ({
    ...item,
    tags: item.backlog_item_tags?.map((it: any) => it.backlog_tags).filter(Boolean) || [],
    comment_count: item.backlog_comments?.[0]?.count || 0,
    attachment_count: item.backlog_attachments?.[0]?.count || 0,
  }));
}

export async function fetchItemById(id: string): Promise<BacklogItemWithRelations> {
  const { data, error } = await supabase
    .from('backlog_items')
    .select(`
      *,
      backlog_item_tags(tag_id, backlog_tags(*)),
      backlog_comments(*),
      backlog_history(*),
      backlog_attachments(*),
      backlog_assignees(*),
      backlog_chat_links(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;

  return {
    ...data,
    tags: data.backlog_item_tags?.map((it: any) => it.backlog_tags).filter(Boolean) || [],
    comments: data.backlog_comments || [],
    history: data.backlog_history || [],
    attachments: data.backlog_attachments || [],
    assignees: data.backlog_assignees || [],
    chat_links: data.backlog_chat_links || [],
  };
}

export async function createItem(payload: CreateBacklogItemPayload): Promise<BacklogItem> {
  // Get default status if not provided
  let statusId = payload.status_id;
  if (!statusId) {
    const { data: defaultStatus } = await supabase
      .from('backlog_statuses')
      .select('id')
      .eq('is_default', true)
      .single();
    statusId = defaultStatus?.id;
  }

  // Get max position for the status
  const { data: maxPosData } = await supabase
    .from('backlog_items')
    .select('position')
    .eq('status_id', statusId)
    .is('deleted_at', null)
    .order('position', { ascending: false })
    .limit(1)
    .single();

  const position = (maxPosData?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from('backlog_items')
    .insert({
      title: payload.title,
      description: payload.description,
      status_id: statusId,
      priority: payload.priority || 'medium',
      position,
      story_points: payload.story_points,
      estimated_hours: payload.estimated_hours,
      conversation_context: payload.conversation_context,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    })
    .select()
    .single();

  if (error) throw error;

  // Add tags if provided
  if (payload.tag_ids?.length) {
    await supabase.from('backlog_item_tags').insert(
      payload.tag_ids.map((tag_id) => ({ item_id: data.id, tag_id }))
    );
  }

  return data;
}

export async function updateItem(id: string, payload: UpdateBacklogItemPayload): Promise<BacklogItem> {
  const updateData: any = { ...payload };
  
  // Handle abandonment
  if (payload.is_abandoned === true) {
    updateData.abandoned_at = new Date().toISOString();
  } else if (payload.is_abandoned === false) {
    updateData.abandoned_at = null;
    updateData.abandoned_reason = null;
  }

  const { data, error } = await supabase
    .from('backlog_items')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function moveItem(id: string, payload: MoveBacklogItemPayload): Promise<BacklogItem> {
  const { data, error } = await supabase
    .from('backlog_items')
    .update({
      status_id: payload.status_id,
      position: payload.position,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteItem(id: string): Promise<void> {
  // Soft delete
  const { error } = await supabase
    .from('backlog_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function abandonItem(id: string, reason: string): Promise<BacklogItem> {
  return updateItem(id, {
    is_abandoned: true,
    abandoned_reason: reason,
  });
}

export async function restoreItem(id: string): Promise<BacklogItem> {
  return updateItem(id, {
    is_abandoned: false,
  });
}

// ============================================
// ITEM TAGS
// ============================================

export async function updateItemTags(itemId: string, tagIds: string[]): Promise<void> {
  // Remove existing tags
  await supabase.from('backlog_item_tags').delete().eq('item_id', itemId);

  // Add new tags
  if (tagIds.length > 0) {
    const { error } = await supabase.from('backlog_item_tags').insert(
      tagIds.map((tag_id) => ({ item_id: itemId, tag_id }))
    );
    if (error) throw error;
  }
}

// ============================================
// COMMENTS
// ============================================

export async function fetchComments(itemId: string): Promise<BacklogComment[]> {
  const { data, error } = await supabase
    .from('backlog_comments')
    .select('*')
    .eq('item_id', itemId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function addComment(payload: AddCommentPayload): Promise<BacklogComment> {
  const { data, error } = await supabase
    .from('backlog_comments')
    .insert({
      item_id: payload.item_id,
      body: payload.body,
      is_resolution: payload.is_resolution || false,
      parent_id: payload.parent_id,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase
    .from('backlog_comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// HISTORY
// ============================================

export async function fetchHistory(itemId: string): Promise<BacklogHistory[]> {
  const { data, error } = await supabase
    .from('backlog_history')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================
// ATTACHMENTS
// ============================================

export async function fetchAttachments(itemId: string): Promise<BacklogAttachment[]> {
  const { data, error } = await supabase
    .from('backlog_attachments')
    .select('*')
    .eq('item_id', itemId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addAttachment(
  itemId: string,
  file: File
): Promise<BacklogAttachment> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  const storagePath = `backlog/${itemId}/${Date.now()}_${file.name}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('assets')
    .upload(storagePath, file);

  if (uploadError) throw uploadError;

  // Create record
  const { data, error } = await supabase
    .from('backlog_attachments')
    .insert({
      item_id: itemId,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      storage_path: storagePath,
      uploaded_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAttachment(id: string, storagePath: string): Promise<void> {
  // Soft delete record
  await supabase
    .from('backlog_attachments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  // Delete from storage
  await supabase.storage.from('assets').remove([storagePath]);
}

// ============================================
// CHAT LINKS
// ============================================

export async function fetchChatLinks(itemId: string): Promise<BacklogChatLink[]> {
  const { data, error } = await supabase
    .from('backlog_chat_links')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addChatLink(payload: AddChatLinkPayload): Promise<BacklogChatLink> {
  const { data, error } = await supabase
    .from('backlog_chat_links')
    .insert({
      item_id: payload.item_id,
      chat_session_id: payload.chat_session_id,
      chat_platform: payload.chat_platform || 'lovable',
      chat_snapshot: payload.chat_snapshot,
      summary: payload.summary,
      linked_by: (await supabase.auth.getUser()).data.user?.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// BOARD VIEW
// ============================================

export async function fetchBoard(filters?: BacklogFilters): Promise<BacklogColumn[]> {
  const [statuses, items] = await Promise.all([
    fetchStatuses(),
    fetchItems(filters),
  ]);

  // Group items by status
  return statuses.map((status) => ({
    ...status,
    items: items.filter((item) => item.status_id === status.id),
  }));
}
