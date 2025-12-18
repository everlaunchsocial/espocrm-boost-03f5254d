// ============================================
// BACKLOG HOOK
// State management for Feature Development Backlog
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import * as backlogApi from '@/services/backlogApi';
import type {
  BacklogColumn,
  BacklogItemWithRelations,
  BacklogTag,
  BacklogStatus,
  CreateBacklogItemPayload,
  UpdateBacklogItemPayload,
  MoveBacklogItemPayload,
  AddCommentPayload,
  AddChatLinkPayload,
  BacklogFilters,
} from '@/types/backlog';

const BOARD_QUERY_KEY = ['backlog', 'board'];
const TAGS_QUERY_KEY = ['backlog', 'tags'];
const STATUSES_QUERY_KEY = ['backlog', 'statuses'];

export function useBacklog(filters?: BacklogFilters) {
  const queryClient = useQueryClient();

  // ============================================
  // QUERIES
  // ============================================

  const boardQuery = useQuery({
    queryKey: [...BOARD_QUERY_KEY, filters],
    queryFn: () => backlogApi.fetchBoard(filters),
    staleTime: 30000, // 30 seconds
  });

  const tagsQuery = useQuery({
    queryKey: TAGS_QUERY_KEY,
    queryFn: backlogApi.fetchTags,
    staleTime: 60000, // 1 minute
  });

  const statusesQuery = useQuery({
    queryKey: STATUSES_QUERY_KEY,
    queryFn: backlogApi.fetchStatuses,
    staleTime: 60000,
  });

  // ============================================
  // MUTATIONS
  // ============================================

  const createItemMutation = useMutation({
    mutationFn: backlogApi.createItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEY });
      toast({ title: 'Item created', description: 'Feature added to backlog' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateBacklogItemPayload }) =>
      backlogApi.updateItem(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEY });
      toast({ title: 'Item updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const moveItemMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MoveBacklogItemPayload }) =>
      backlogApi.moveItem(id, payload),
    onMutate: async ({ id, payload }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: BOARD_QUERY_KEY });

      // Snapshot previous value
      const previousBoard = queryClient.getQueryData<BacklogColumn[]>([...BOARD_QUERY_KEY, filters]);

      // Optimistically update
      if (previousBoard) {
        const newBoard = previousBoard.map((column) => {
          // Remove item from all columns
          const filteredItems = column.items.filter((item) => item.id !== id);
          
          if (column.id === payload.status_id) {
            // Find the item being moved
            const movedItem = previousBoard
              .flatMap((c) => c.items)
              .find((item) => item.id === id);
            
            if (movedItem) {
              // Insert at new position
              const updatedItem = { ...movedItem, status_id: payload.status_id, position: payload.position };
              filteredItems.splice(payload.position, 0, updatedItem);
            }
          }

          return { ...column, items: filteredItems };
        });

        queryClient.setQueryData([...BOARD_QUERY_KEY, filters], newBoard);
      }

      return { previousBoard };
    },
    onError: (error: Error, _, context) => {
      // Rollback on error
      if (context?.previousBoard) {
        queryClient.setQueryData([...BOARD_QUERY_KEY, filters], context.previousBoard);
      }
      toast({ title: 'Move failed', description: error.message, variant: 'destructive' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEY });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: backlogApi.deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEY });
      toast({ title: 'Item deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const abandonItemMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      backlogApi.abandonItem(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEY });
      toast({ title: 'Item archived' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const restoreItemMutation = useMutation({
    mutationFn: backlogApi.restoreItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEY });
      toast({ title: 'Item restored' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateTagsMutation = useMutation({
    mutationFn: ({ itemId, tagIds }: { itemId: string; tagIds: string[] }) =>
      backlogApi.updateItemTags(itemId, tagIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEY });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: backlogApi.addComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEY });
      toast({ title: 'Comment added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const addChatLinkMutation = useMutation({
    mutationFn: backlogApi.addChatLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEY });
      toast({ title: 'Chat linked' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const createTagMutation = useMutation({
    mutationFn: ({ name, color, description }: { name: string; color: string; description?: string }) =>
      backlogApi.createTag(name, color, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY });
      toast({ title: 'Tag created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // ============================================
  // RETURN
  // ============================================

  return {
    // Data
    board: boardQuery.data || [],
    tags: tagsQuery.data || [],
    statuses: statusesQuery.data || [],
    
    // Loading states
    isLoading: boardQuery.isLoading,
    isLoadingTags: tagsQuery.isLoading,
    isLoadingStatuses: statusesQuery.isLoading,
    
    // Error states
    error: boardQuery.error,
    
    // Mutations
    createItem: createItemMutation.mutateAsync,
    updateItem: (id: string, payload: UpdateBacklogItemPayload) =>
      updateItemMutation.mutateAsync({ id, payload }),
    moveItem: (id: string, payload: MoveBacklogItemPayload) =>
      moveItemMutation.mutateAsync({ id, payload }),
    deleteItem: deleteItemMutation.mutateAsync,
    abandonItem: (id: string, reason: string) =>
      abandonItemMutation.mutateAsync({ id, reason }),
    restoreItem: restoreItemMutation.mutateAsync,
    updateTags: (itemId: string, tagIds: string[]) =>
      updateTagsMutation.mutateAsync({ itemId, tagIds }),
    addComment: addCommentMutation.mutateAsync,
    addChatLink: addChatLinkMutation.mutateAsync,
    createTag: (name: string, color: string, description?: string) =>
      createTagMutation.mutateAsync({ name, color, description }),
    
    // Mutation states
    isCreating: createItemMutation.isPending,
    isUpdating: updateItemMutation.isPending,
    isMoving: moveItemMutation.isPending,
    isDeleting: deleteItemMutation.isPending,
    
    // Refresh
    refresh: () => queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEY }),
  };
}

// Hook for single item detail view
export function useBacklogItem(itemId: string | null) {
  const queryClient = useQueryClient();

  const itemQuery = useQuery({
    queryKey: ['backlog', 'item', itemId],
    queryFn: () => (itemId ? backlogApi.fetchItemById(itemId) : null),
    enabled: !!itemId,
  });

  const commentsQuery = useQuery({
    queryKey: ['backlog', 'comments', itemId],
    queryFn: () => (itemId ? backlogApi.fetchComments(itemId) : []),
    enabled: !!itemId,
  });

  const historyQuery = useQuery({
    queryKey: ['backlog', 'history', itemId],
    queryFn: () => (itemId ? backlogApi.fetchHistory(itemId) : []),
    enabled: !!itemId,
  });

  const chatLinksQuery = useQuery({
    queryKey: ['backlog', 'chatLinks', itemId],
    queryFn: () => (itemId ? backlogApi.fetchChatLinks(itemId) : []),
    enabled: !!itemId,
  });

  return {
    item: itemQuery.data,
    comments: commentsQuery.data || [],
    history: historyQuery.data || [],
    chatLinks: chatLinksQuery.data || [],
    isLoading: itemQuery.isLoading,
    refresh: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog', 'item', itemId] });
      queryClient.invalidateQueries({ queryKey: ['backlog', 'comments', itemId] });
      queryClient.invalidateQueries({ queryKey: ['backlog', 'history', itemId] });
      queryClient.invalidateQueries({ queryKey: ['backlog', 'chatLinks', itemId] });
    },
  };
}
