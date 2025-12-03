import { useCRMStore } from '@/stores/crmStore';
import { StatCard } from '@/components/crm/StatCard';
import { ActivityTimeline } from '@/components/crm/ActivityTimeline';
import { StatusBadge } from '@/components/crm/StatusBadge';
import { Users, Building2, UserPlus, Handshake, TrendingUp, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Dashboard() {
  const { contacts, accounts, leads, deals, tasks, activities } = useCRMStore();

  const openDeals = deals.filter(d => !d.stage.includes('closed'));
  const wonDeals = deals.filter(d => d.stage === 'closed-won');
  const totalPipeline = openDeals.reduce((sum, d) => sum + d.amount, 0);
  const totalWon = wonDeals.reduce((sum, d) => sum + d.amount, 0);
  const pendingTasks = tasks.filter(t => t.status !== 'completed').length;

  const dealsByStage = [
    { name: 'Prospecting', value: deals.filter(d => d.stage === 'prospecting').length },
    { name: 'Qualification', value: deals.filter(d => d.stage === 'qualification').length },
    { name: 'Proposal', value: deals.filter(d => d.stage === 'proposal').length },
    { name: 'Negotiation', value: deals.filter(d => d.stage === 'negotiation').length },
    { name: 'Won', value: deals.filter(d => d.stage === 'closed-won').length },
    { name: 'Lost', value: deals.filter(d => d.stage === 'closed-lost').length },
  ];

  const leadsByStatus = [
    { name: 'New', value: leads.filter(l => l.status === 'new').length, color: 'hsl(217, 91%, 60%)' },
    { name: 'Contacted', value: leads.filter(l => l.status === 'contacted').length, color: 'hsl(38, 92%, 50%)' },
    { name: 'Qualified', value: leads.filter(l => l.status === 'qualified').length, color: 'hsl(142, 71%, 45%)' },
    { name: 'Converted', value: leads.filter(l => l.status === 'converted').length, color: 'hsl(280, 65%, 60%)' },
  ];

  const recentDeals = [...deals].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here's your sales overview.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Contacts"
          value={contacts.length}
          change="+12% from last month"
          changeType="positive"
          icon={Users}
          iconColor="bg-primary/10 text-primary"
        />
        <StatCard
          title="Open Deals"
          value={openDeals.length}
          change={`${pendingTasks} tasks pending`}
          changeType="neutral"
          icon={Handshake}
          iconColor="bg-chart-4/10 text-chart-4"
        />
        <StatCard
          title="Pipeline Value"
          value={`$${totalPipeline.toLocaleString()}`}
          change="+8% from last month"
          changeType="positive"
          icon={TrendingUp}
          iconColor="bg-success/10 text-success"
        />
        <StatCard
          title="Revenue Won"
          value={`$${totalWon.toLocaleString()}`}
          change="+23% from last month"
          changeType="positive"
          icon={DollarSign}
          iconColor="bg-warning/10 text-warning"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deals by Stage */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-card-foreground mb-4">Deals by Stage</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dealsByStage}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Leads by Status */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-card-foreground mb-4">Leads by Status</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={leadsByStatus}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {leadsByStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {leadsByStatus.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-muted-foreground">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Deals */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-card-foreground">Recent Deals</h2>
            <Link to="/deals" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-4">
            {recentDeals.map((deal) => (
              <div key={deal.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="font-medium text-card-foreground">{deal.name}</p>
                  <p className="text-sm text-muted-foreground">{deal.accountName}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-card-foreground">${deal.amount.toLocaleString()}</p>
                  <StatusBadge status={deal.stage} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-card-foreground">Recent Activity</h2>
          </div>
          <ActivityTimeline activities={activities} limit={5} />
        </div>
      </div>
    </div>
  );
}
