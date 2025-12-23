import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, CheckCircle, Clock, AlertTriangle, Sparkles, Calendar, 
  MoreHorizontal, Pencil, Trash2, Play, Pause, ChevronRight, Bot
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { 
  useSmartTasks, useTaskStats, useCreateTask, useUpdateTask, useDeleteTask,
  useSnoozeTask, useGenerateSmartTasks, SmartTask, getTaskTypeIcon, 
  getPriorityBadgeVariant, isTaskOverdue, isTaskDueToday, groupTasksByPriority
} from '@/hooks/useSmartTasks';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Tasks() {
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'all'>('today');
  const [selectedTask, setSelectedTask] = useState<SmartTask | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    name: '',
    description: '',
    task_type: 'custom',
    priority: 'medium',
    due_date: '',
  });

  const { data: allTasks = [], isLoading } = useSmartTasks();
  const { data: stats } = useTaskStats();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const snoozeTask = useSnoozeTask();
  const generateSmartTasks = useGenerateSmartTasks();

  // Filter tasks based on active tab
  const filteredTasks = allTasks.filter(task => {
    if (task.status === 'completed') return false;
    if (activeTab === 'today') {
      return isTaskDueToday(task) || isTaskOverdue(task);
    }
    if (activeTab === 'week') {
      if (!task.due_date) return true;
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return new Date(task.due_date) <= weekFromNow;
    }
    return true;
  });

  const groupedTasks = groupTasksByPriority(filteredTasks);
  const completedToday = allTasks.filter(t => 
    t.status === 'completed' && 
    t.completed_at && 
    new Date(t.completed_at).toDateString() === new Date().toDateString()
  );

  const handleComplete = async (task: SmartTask) => {
    await updateTask.mutateAsync({ id: task.id, updates: { status: 'completed' } });
    toast.success('Task completed!');
  };

  const handleSnooze = async (task: SmartTask, hours: number) => {
    await snoozeTask.mutateAsync({ id: task.id, hours });
    toast.success(`Task snoozed for ${hours} hour${hours > 1 ? 's' : ''}`);
  };

  const handleDelete = async (id: string) => {
    await deleteTask.mutateAsync(id);
    toast.success('Task deleted');
  };

  const handleCreateTask = async () => {
    if (!newTask.name.trim()) {
      toast.error('Task name is required');
      return;
    }
    await createTask.mutateAsync({
      name: newTask.name,
      description: newTask.description || null,
      task_type: newTask.task_type,
      priority: newTask.priority,
      due_date: newTask.due_date || null,
    });
    toast.success('Task created');
    setIsCreateOpen(false);
    setNewTask({ name: '', description: '', task_type: 'custom', priority: 'medium', due_date: '' });
  };

  const handleGenerateTasks = async () => {
    const toastId = toast.loading('Generating smart tasks...');
    try {
      const result = await generateSmartTasks.mutateAsync(undefined);
      toast.dismiss(toastId);
      toast.success(`Generated ${result.tasksCreated} smart tasks`);
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to generate tasks');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading tasks...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <CheckCircle className="w-6 h-6" />
            Tasks & Reminders
          </h1>
          <p className="text-muted-foreground mt-1">AI-powered task management</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleGenerateTasks} disabled={generateSmartTasks.isPending}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Smart Tasks
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.overdue}</p>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.byPriority.urgent + stats.byPriority.high}</p>
                  <p className="text-sm text-muted-foreground">High Priority</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Bot className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.aiGenerated}</p>
                  <p className="text-sm text-muted-foreground">AI Generated</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tasks List */}
      <Card>
        <CardHeader className="pb-3">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="week">This Week</TabsTrigger>
              <TabsTrigger value="all">All Tasks</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No tasks for this period</p>
              <p className="text-sm">Click "Generate Smart Tasks" to create AI-recommended tasks</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Urgent Tasks */}
              {groupedTasks.urgent.length > 0 && (
                <TaskGroup 
                  title="🔴 URGENT" 
                  tasks={groupedTasks.urgent}
                  onComplete={handleComplete}
                  onSnooze={handleSnooze}
                  onDelete={handleDelete}
                  onSelect={setSelectedTask}
                />
              )}

              {/* High Priority */}
              {groupedTasks.high.length > 0 && (
                <TaskGroup 
                  title="🟠 HIGH PRIORITY" 
                  tasks={groupedTasks.high}
                  onComplete={handleComplete}
                  onSnooze={handleSnooze}
                  onDelete={handleDelete}
                  onSelect={setSelectedTask}
                />
              )}

              {/* Medium Priority */}
              {groupedTasks.medium.length > 0 && (
                <TaskGroup 
                  title="🟡 MEDIUM PRIORITY" 
                  tasks={groupedTasks.medium}
                  onComplete={handleComplete}
                  onSnooze={handleSnooze}
                  onDelete={handleDelete}
                  onSelect={setSelectedTask}
                />
              )}

              {/* Low Priority */}
              {groupedTasks.low.length > 0 && (
                <TaskGroup 
                  title="🟢 LOW PRIORITY" 
                  tasks={groupedTasks.low}
                  onComplete={handleComplete}
                  onSnooze={handleSnooze}
                  onDelete={handleDelete}
                  onSelect={setSelectedTask}
                />
              )}
            </div>
          )}

          {/* Completed Today */}
          {completedToday.length > 0 && (
            <div className="mt-8 pt-6 border-t">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                ✅ COMPLETED TODAY ({completedToday.length})
              </h3>
              <div className="space-y-2">
                {completedToday.slice(0, 5).map(task => (
                  <div key={task.id} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="line-through">{task.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Detail Modal */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-w-lg">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-2xl">{getTaskTypeIcon(selectedTask.task_type)}</span>
                  {selectedTask.name}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <p className="font-medium capitalize">{selectedTask.task_type || 'Custom'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Priority</p>
                    <Badge variant={getPriorityBadgeVariant(selectedTask.priority)}>
                      {selectedTask.priority}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Due</p>
                    <p className={cn(
                      "font-medium",
                      isTaskOverdue(selectedTask) && "text-red-500"
                    )}>
                      {selectedTask.due_date 
                        ? format(new Date(selectedTask.due_date), 'MMM d, yyyy h:mm a')
                        : 'No due date'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Duration</p>
                    <p className="font-medium">
                      {selectedTask.estimated_duration_minutes 
                        ? `${selectedTask.estimated_duration_minutes} min`
                        : 'Not set'}
                    </p>
                  </div>
                </div>

                {selectedTask.description && (
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">Description</p>
                    <p className="text-sm">{selectedTask.description}</p>
                  </div>
                )}

                {selectedTask.related_to_name && (
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">Related To</p>
                    <p className="text-sm font-medium">
                      {selectedTask.related_to_type}: {selectedTask.related_to_name}
                    </p>
                  </div>
                )}

                {selectedTask.is_auto_generated && selectedTask.ai_reasoning && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <p className="text-sm font-medium text-blue-500 flex items-center gap-2 mb-1">
                      <Bot className="w-4 h-4" />
                      AI Recommendation
                    </p>
                    <p className="text-sm">{selectedTask.ai_reasoning}</p>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => handleSnooze(selectedTask, 1)}>
                  <Clock className="w-4 h-4 mr-1" /> Snooze 1h
                </Button>
                <Button variant="outline" onClick={() => handleSnooze(selectedTask, 24)}>
                  <Calendar className="w-4 h-4 mr-1" /> Tomorrow
                </Button>
                <Button onClick={() => {
                  handleComplete(selectedTask);
                  setSelectedTask(null);
                }}>
                  <CheckCircle className="w-4 h-4 mr-1" /> Complete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Task Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Task Name</label>
              <Input 
                value={newTask.name}
                onChange={(e) => setNewTask(p => ({ ...p, name: e.target.value }))}
                placeholder="Enter task name..."
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea 
                value={newTask.description}
                onChange={(e) => setNewTask(p => ({ ...p, description: e.target.value }))}
                placeholder="Optional description..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={newTask.task_type} onValueChange={(v) => setNewTask(p => ({ ...p, task_type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">📞 Call</SelectItem>
                    <SelectItem value="email">📧 Email</SelectItem>
                    <SelectItem value="meeting">📅 Meeting</SelectItem>
                    <SelectItem value="follow_up">🔄 Follow-up</SelectItem>
                    <SelectItem value="demo">🎥 Demo</SelectItem>
                    <SelectItem value="administrative">📋 Administrative</SelectItem>
                    <SelectItem value="custom">✏️ Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select value={newTask.priority} onValueChange={(v) => setNewTask(p => ({ ...p, priority: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">🔴 Urgent</SelectItem>
                    <SelectItem value="high">🟠 High</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="low">🟢 Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Due Date</label>
              <Input 
                type="datetime-local"
                value={newTask.due_date}
                onChange={(e) => setNewTask(p => ({ ...p, due_date: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTask} disabled={createTask.isPending}>
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskGroup({ 
  title, 
  tasks, 
  onComplete, 
  onSnooze, 
  onDelete,
  onSelect 
}: { 
  title: string;
  tasks: SmartTask[];
  onComplete: (task: SmartTask) => void;
  onSnooze: (task: SmartTask, hours: number) => void;
  onDelete: (id: string) => void;
  onSelect: (task: SmartTask) => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-3">{title} ({tasks.length})</h3>
      <div className="space-y-2">
        {tasks.map(task => (
          <TaskCard 
            key={task.id} 
            task={task}
            onComplete={() => onComplete(task)}
            onSnooze={(hours) => onSnooze(task, hours)}
            onDelete={() => onDelete(task.id)}
            onClick={() => onSelect(task)}
          />
        ))}
      </div>
    </div>
  );
}

function TaskCard({ 
  task, 
  onComplete, 
  onSnooze, 
  onDelete,
  onClick 
}: { 
  task: SmartTask;
  onComplete: () => void;
  onSnooze: (hours: number) => void;
  onDelete: () => void;
  onClick: () => void;
}) {
  const overdue = isTaskOverdue(task);

  return (
    <div 
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50",
        overdue && "border-red-500/50 bg-red-500/5"
      )}
      onClick={onClick}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onComplete();
        }}
        className="mt-0.5 h-5 w-5 rounded border border-border hover:border-primary flex items-center justify-center transition-colors"
      >
        {task.status === 'completed' && <CheckCircle className="h-3 w-3 text-green-500" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getTaskTypeIcon(task.task_type)}</span>
          <span className="font-medium truncate">{task.name}</span>
          {task.is_auto_generated && (
            <Bot className="w-4 h-4 text-blue-500 flex-shrink-0" />
          )}
        </div>
        
        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
          {task.due_date && (
            <span className={cn(overdue && "text-red-500 font-medium")}>
              {overdue ? 'Overdue' : format(new Date(task.due_date), 'MMM d, h:mm a')}
            </span>
          )}
          {task.related_to_name && (
            <span className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3" />
              {task.related_to_name}
            </span>
          )}
        </div>

        {task.ai_reasoning && (
          <p className="text-xs text-blue-500 mt-1 truncate">
            💡 {task.ai_reasoning}
          </p>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onComplete(); }}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Complete
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSnooze(1); }}>
            <Clock className="h-4 w-4 mr-2" />
            Snooze 1 hour
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSnooze(3); }}>
            <Clock className="h-4 w-4 mr-2" />
            Snooze 3 hours
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSnooze(24); }}>
            <Calendar className="h-4 w-4 mr-2" />
            Tomorrow
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
