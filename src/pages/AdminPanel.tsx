import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Users, Shield, BarChart3, FileText, Settings, 
  UserPlus, MoreVertical, Check, X, Clock, 
  AlertTriangle, Download, Eye, Edit, Trash2
} from 'lucide-react';
import { 
  useRoles, 
  useTeamMembers, 
  useAuditLogs, 
  useUsageLimits,
  useInviteTeamMember,
  useUpdateTeamMember,
  useRemoveTeamMember,
  useCreateRole,
  PERMISSION_GROUPS,
  ROLE_COLORS,
  STATUS_COLORS,
  type Role
} from '@/hooks/useAdminPanel';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('team');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [createRoleDialogOpen, setCreateRoleDialogOpen] = useState(false);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground">Manage your team, roles, and organization settings</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 max-w-2xl">
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Usage
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Audit
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="mt-6">
          <TeamManagement 
            inviteDialogOpen={inviteDialogOpen}
            setInviteDialogOpen={setInviteDialogOpen}
          />
        </TabsContent>

        <TabsContent value="roles" className="mt-6">
          <RolesManagement 
            createRoleDialogOpen={createRoleDialogOpen}
            setCreateRoleDialogOpen={setCreateRoleDialogOpen}
          />
        </TabsContent>

        <TabsContent value="usage" className="mt-6">
          <UsageDashboard />
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <AuditLogViewer />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <OrganizationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TeamManagement({ 
  inviteDialogOpen, 
  setInviteDialogOpen 
}: { 
  inviteDialogOpen: boolean;
  setInviteDialogOpen: (open: boolean) => void;
}) {
  const { data: teamMembers = [], isLoading } = useTeamMembers();
  const { data: roles = [] } = useRoles();
  const updateMutation = useUpdateTeamMember();
  const removeMutation = useRemoveTeamMember();

  const activeCount = teamMembers.filter(m => m.status === 'active').length;
  const invitedCount = teamMembers.filter(m => m.status === 'invited').length;

  const handleStatusChange = async (id: string, status: string) => {
    await updateMutation.mutateAsync({ id, status });
  };

  const handleRoleChange = async (id: string, roleId: string) => {
    await updateMutation.mutateAsync({ id, roleId });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Team Members</h2>
          <p className="text-sm text-muted-foreground">
            {teamMembers.length} members • {activeCount} active • {invitedCount} invited
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <InviteMemberDialog 
            open={inviteDialogOpen} 
            onOpenChange={setInviteDialogOpen}
            roles={roles}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading team members...</div>
          ) : teamMembers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No team members yet. Invite someone to get started!
            </div>
          ) : (
            <div className="divide-y">
              {teamMembers.map(member => (
                <div key={member.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{member.email || `User ${member.user_id.slice(0, 8)}`}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`${ROLE_COLORS[member.role?.name || ''] || 'bg-gray-500'} text-white`}>
                          {member.role?.name?.replace('_', ' ') || 'No role'}
                        </Badge>
                        <Badge variant="outline" className={`${STATUS_COLORS[member.status]} text-white`}>
                          {member.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {member.last_active_at 
                        ? formatDistanceToNow(new Date(member.last_active_at), { addSuffix: true })
                        : 'Never active'
                      }
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleStatusChange(member.id, 'active')}>
                          <Check className="h-4 w-4 mr-2" />
                          Activate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(member.id, 'suspended')}>
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Suspend
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => removeMutation.mutate(member.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InviteMemberDialog({ 
  open, 
  onOpenChange, 
  roles 
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: Role[];
}) {
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const inviteMutation = useInviteTeamMember();

  const handleInvite = async () => {
    if (!email || !roleId) return;
    await inviteMutation.mutateAsync({ email, roleId });
    setEmail('');
    setRoleId('');
    onOpenChange(false);
  };

  const selectedRole = roles.find(r => r.id === roleId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>Send an invitation to join your team</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map(role => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedRole && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Permissions for {selectedRole.name}:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {selectedRole.permissions.slice(0, 5).map(p => (
                  <li key={p} className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-500" />
                    {p}
                  </li>
                ))}
                {selectedRole.permissions.length > 5 && (
                  <li className="text-xs">+{selectedRole.permissions.length - 5} more</li>
                )}
              </ul>
            </div>
          )}
          <Button 
            onClick={handleInvite} 
            className="w-full"
            disabled={!email || !roleId || inviteMutation.isPending}
          >
            Send Invitation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RolesManagement({ 
  createRoleDialogOpen, 
  setCreateRoleDialogOpen 
}: { 
  createRoleDialogOpen: boolean;
  setCreateRoleDialogOpen: (open: boolean) => void;
}) {
  const { data: roles = [], isLoading } = useRoles();
  const { data: teamMembers = [] } = useTeamMembers();

  const getRoleMemberCount = (roleId: string) => 
    teamMembers.filter(m => m.role_id === roleId).length;

  const systemRoles = roles.filter(r => r.is_system_role);
  const customRoles = roles.filter(r => !r.is_system_role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Roles & Permissions</h2>
          <p className="text-sm text-muted-foreground">Manage access control for your team</p>
        </div>
        <CreateRoleDialog 
          open={createRoleDialogOpen} 
          onOpenChange={setCreateRoleDialogOpen}
        />
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Loading roles...</div>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">System Roles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {systemRoles.map(role => (
                <Card key={role.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${ROLE_COLORS[role.name] || 'bg-gray-500'}`} />
                        {role.name.replace('_', ' ')}
                      </CardTitle>
                      <Badge variant="secondary">{getRoleMemberCount(role.id)} members</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{role.description}</CardDescription>
                    <Button variant="ghost" size="sm" className="mt-2">
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {customRoles.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-4">Custom Roles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customRoles.map(role => (
                  <Card key={role.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-purple-500" />
                          {role.name}
                        </CardTitle>
                        <Badge variant="secondary">{getRoleMemberCount(role.id)} members</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{role.description}</CardDescription>
                      <div className="flex gap-2 mt-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CreateRoleDialog({ 
  open, 
  onOpenChange 
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const createMutation = useCreateRole();

  const togglePermission = (key: string) => {
    setPermissions(prev => 
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  const handleCreate = async () => {
    if (!name) return;
    await createMutation.mutateAsync({ name, description, permissions });
    setName('');
    setDescription('');
    setPermissions([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Shield className="h-4 w-4 mr-2" />
          Create Custom Role
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Create Custom Role</DialogTitle>
          <DialogDescription>Define a new role with specific permissions</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Role Name</Label>
              <Input
                placeholder="e.g., Senior Sales Rep"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Brief description of this role"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            
            {Object.entries(PERMISSION_GROUPS).map(([groupKey, group]) => (
              <div key={groupKey} className="space-y-2">
                <Label className="text-sm font-semibold">{group.label} Permissions</Label>
                <div className="space-y-2 pl-2">
                  {group.permissions.map(perm => (
                    <div key={perm.key} className="flex items-center gap-2">
                      <Checkbox
                        id={perm.key}
                        checked={permissions.includes(perm.key)}
                        onCheckedChange={() => togglePermission(perm.key)}
                      />
                      <label htmlFor={perm.key} className="text-sm cursor-pointer">
                        {perm.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <Button 
          onClick={handleCreate} 
          className="w-full mt-4"
          disabled={!name || createMutation.isPending}
        >
          Create Role
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function UsageDashboard() {
  const { data: limits = [] } = useUsageLimits();

  const usageItems = [
    { type: 'seats', label: 'Team Seats', used: 12, limit: 15, icon: Users },
    { type: 'storage', label: 'Storage', used: 4.2, limit: 50, unit: 'GB', icon: BarChart3 },
    { type: 'api_calls', label: 'API Calls', used: 8456, limit: 50000, icon: Settings },
    { type: 'emails', label: 'Emails Sent', used: 2134, limit: 10000, icon: FileText },
    { type: 'sms', label: 'SMS Sent', used: 456, limit: 1000, icon: FileText }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Usage & Limits</h2>
          <p className="text-sm text-muted-foreground">Monitor your resource consumption</p>
        </div>
        <Button variant="outline">Upgrade Plan</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {usageItems.map(item => {
          const percentage = (item.used / item.limit) * 100;
          const Icon = item.icon;
          
          return (
            <Card key={item.type}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold">
                      {item.used.toLocaleString()}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      / {item.limit.toLocaleString()} {item.unit || ''}
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {percentage.toFixed(0)}% used • {(item.limit - item.used).toLocaleString()} remaining
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function AuditLogViewer() {
  const [daysFilter, setDaysFilter] = useState(7);
  const { data: logs = [], isLoading } = useAuditLogs({ days: daysFilter });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create': return <Check className="h-4 w-4 text-green-500" />;
      case 'update': return <Edit className="h-4 w-4 text-blue-500" />;
      case 'delete': return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'invite': return <UserPlus className="h-4 w-4 text-purple-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Audit Logs</h2>
          <p className="text-sm text-muted-foreground">Track all actions in your organization</p>
        </div>
        <div className="flex gap-2">
          <Select value={String(daysFilter)} onValueChange={(v) => setDaysFilter(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No audit logs found</div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="divide-y">
                {logs.map(log => (
                  <div key={log.id} className="p-4 hover:bg-muted/50">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{getActionIcon(log.action)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{log.action}</span>
                          <Badge variant="outline">{log.resource_type}</Badge>
                        </div>
                        {log.resource_id && (
                          <p className="text-sm text-muted-foreground">
                            Resource: {log.resource_id}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(log.created_at).toLocaleString()}
                          {log.ip_address && ` • IP: ${log.ip_address}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function OrganizationSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Organization Settings</h2>
        <p className="text-sm text-muted-foreground">Configure your organization preferences</p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Organization Name</Label>
              <Input defaultValue="Acme Inc." />
            </div>
            <div className="space-y-2">
              <Label>Subdomain</Label>
              <div className="flex items-center gap-2">
                <Input defaultValue="acme" className="max-w-[200px]" />
                <span className="text-muted-foreground">.everlaunch.com</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Require 2FA for all users</p>
                <p className="text-sm text-muted-foreground">Enforce two-factor authentication</p>
              </div>
              <Checkbox />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Session timeout</p>
                <p className="text-sm text-muted-foreground">Auto-logout after inactivity</p>
              </div>
              <Select defaultValue="30">
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Button className="w-fit">Save Settings</Button>
      </div>
    </div>
  );
}
