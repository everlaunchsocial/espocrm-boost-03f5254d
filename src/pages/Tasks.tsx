import { useState } from 'react';
import { useCRMStore } from '@/stores/crmStore';
import { DataTable } from '@/components/crm/DataTable';
import { StatusBadge } from '@/components/crm/StatusBadge';
import { EntityForm } from '@/components/crm/EntityForm';
import { Button } from '@/components/ui/button';
import { Plus, MoreHorizontal, Pencil, Trash2, CheckCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Task } from '@/types/crm';
import { toast } from 'sonner';
import { format, isPast, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

const taskFields = [
  { name: 'name', label: 'Task Name', type: 'text' as const, required: true },
  { name: 'description', label: 'Description', type: 'textarea' as const },
  { name: 'status', label: 'Status', type: 'select' as const, required: true, options: [
    { value: 'not-started', label: 'Not Started' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'deferred', label: 'Deferred' },
  ]},
  { name: 'priority', label: 'Priority', type: 'select' as const, required: true, options: [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ]},
  { name: 'dueDate', label: 'Due Date', type: 'date' as const },
];

export default function Tasks() {
  const { tasks, addTask, updateTask, deleteTask } = useCRMStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  const columns = [
    {
      key: 'name',
      label: 'Task',
      render: (task: Task) => (
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleComplete(task);
            }}
            className={cn(
              'h-5 w-5 rounded border flex items-center justify-center transition-colors',
              task.status === 'completed'
                ? 'bg-success border-success text-success-foreground'
                : 'border-border hover:border-primary'
            )}
          >
            {task.status === 'completed' && <CheckCircle className="h-3 w-3" />}
          </button>
          <div>
            <p className={cn(
              'font-medium text-foreground',
              task.status === 'completed' && 'line-through text-muted-foreground'
            )}>
              {task.name}
            </p>
            {task.relatedTo && (
              <p className="text-sm text-muted-foreground">
                {task.relatedTo.type}: {task.relatedTo.name}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (task: Task) => <StatusBadge status={task.status} />,
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (task: Task) => <StatusBadge status={task.priority} />,
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      render: (task: Task) => {
        if (!task.dueDate) return '-';
        const date = new Date(task.dueDate);
        const overdue = isPast(date) && task.status !== 'completed';
        const today = isToday(date);
        return (
          <span className={cn(
            'text-sm',
            overdue && 'text-destructive font-medium',
            today && !overdue && 'text-warning font-medium',
            !overdue && !today && 'text-muted-foreground'
          )}>
            {format(date, 'MMM d, yyyy')}
            {today && ' (Today)'}
            {overdue && ' (Overdue)'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      render: (task: Task) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(task)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDelete(task.id)} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const handleCreate = () => {
    setEditingTask(null);
    setFormValues({ status: 'not-started', priority: 'medium' });
    setFormOpen(true);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormValues({
      name: task.name,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
    });
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteTask(id);
    toast.success('Task deleted successfully');
  };

  const handleToggleComplete = (task: Task) => {
    updateTask(task.id, {
      status: task.status === 'completed' ? 'not-started' : 'completed',
    });
    toast.success(task.status === 'completed' ? 'Task reopened' : 'Task completed');
  };

  const handleSubmit = () => {
    const taskData = {
      ...formValues,
      dueDate: formValues.dueDate ? new Date(formValues.dueDate) : undefined,
    };

    if (editingTask) {
      updateTask(editingTask.id, taskData);
      toast.success('Task updated successfully');
    } else {
      addTask(taskData as any);
      toast.success('Task created successfully');
    }
    setFormOpen(false);
  };

  // Sort tasks: incomplete first, then by priority, then by due date
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tasks</h1>
          <p className="text-muted-foreground mt-1">Manage your tasks and to-dos</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      <DataTable
        data={sortedTasks}
        columns={columns}
        searchPlaceholder="Search tasks..."
        searchKeys={['name', 'description']}
      />

      <EntityForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingTask ? 'Edit Task' : 'New Task'}
        fields={taskFields}
        values={formValues}
        onChange={(name, value) => setFormValues((prev) => ({ ...prev, [name]: value }))}
        onSubmit={handleSubmit}
        submitLabel={editingTask ? 'Update' : 'Create'}
      />
    </div>
  );
}
