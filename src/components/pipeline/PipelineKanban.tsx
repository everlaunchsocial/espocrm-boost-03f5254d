import { useState, useMemo } from 'react';
import { Lead } from '@/types/crm';
import { PipelineStatus, PIPELINE_STATUS_CONFIG, KANBAN_STAGES } from '@/lib/pipelineStatus';
import { useUpdateLeadPipelineStatus } from '@/hooks/usePipelineLeads';
import { PipelineColumn } from './PipelineColumn';
import { PipelineLeadCard } from './PipelineLeadCard';
import { LeadDetail } from '@/components/crm/LeadDetail';
import { ClosedLeadModal } from './ClosedLeadModal';
import { toast } from 'sonner';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';

interface PipelineKanbanProps {
  leads: Lead[];
  onEditLead?: (lead: Lead) => void;
}

export function PipelineKanban({ leads, onEditLead }: PipelineKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [closedModal, setClosedModal] = useState<{ open: boolean; leadId: string; type: 'won' | 'lost' } | null>(null);
  
  const updatePipelineStatus = useUpdateLeadPipelineStatus();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Group leads by stage
  const leadsByStage = useMemo(() => {
    const grouped: Record<PipelineStatus, Lead[]> = {
      new_lead: [],
      contacted: [],
      demo_requested: [],
      demo_completed: [],
      hot_lead: [],
      negotiating: [],
      ready_to_sign: [],
      closed_won: [],
      closed_lost: [],
    };

    leads.forEach((lead) => {
      const stage = (lead.pipelineStatus || 'new_lead') as PipelineStatus;
      if (grouped[stage]) {
        grouped[stage].push(lead);
      } else {
        grouped.new_lead.push(lead);
      }
    });

    return grouped;
  }, [leads]);

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const leadId = active.id as string;
    const newStatus = over.id as PipelineStatus;

    // Find the lead
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    // Don't do anything if dropped on the same column
    if (lead.pipelineStatus === newStatus) return;

    // Handle closed states with modal
    if (newStatus === 'closed_won' || newStatus === 'closed_lost') {
      setClosedModal({ open: true, leadId, type: newStatus === 'closed_won' ? 'won' : 'lost' });
      return;
    }

    // Update pipeline status
    try {
      await updatePipelineStatus.mutateAsync({ leadId, newStatus });
      toast.success(`Moved to ${PIPELINE_STATUS_CONFIG[newStatus].label}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailOpen(true);
  };

  const handleClosedConfirm = async (notes?: string, lostReason?: string) => {
    if (!closedModal) return;

    const newStatus = closedModal.type === 'won' ? 'closed_won' : 'closed_lost';

    try {
      await updatePipelineStatus.mutateAsync({
        leadId: closedModal.leadId,
        newStatus,
        notes,
        lostReason,
      });
      toast.success(closedModal.type === 'won' ? '🎉 Deal closed!' : 'Lead marked as lost');
      setClosedModal(null);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
          {KANBAN_STAGES.map((stage) => (
            <PipelineColumn
              key={stage}
              stage={stage}
              leads={leadsByStage[stage]}
              onLeadClick={handleLeadClick}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead ? (
            <PipelineLeadCard lead={activeLead} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Closed Status Quick Actions */}
      <div className="flex gap-4 mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium">Closed:</span>
          <span className="px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
            {leadsByStage.closed_won.length} Won
          </span>
          <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400">
            {leadsByStage.closed_lost.length} Lost
          </span>
        </div>
      </div>

      <LeadDetail
        lead={selectedLead}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEdit={onEditLead}
      />

      {closedModal && (
        <ClosedLeadModal
          open={closedModal.open}
          type={closedModal.type}
          onClose={() => setClosedModal(null)}
          onConfirm={handleClosedConfirm}
        />
      )}
    </>
  );
}
