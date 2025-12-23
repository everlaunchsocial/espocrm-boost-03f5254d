import { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  MessageSquare, Send, Pin, Eye, EyeOff, Trash2, 
  Pencil, AtSign, Users, Bell, BellOff, Check 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  useTeamNotes, 
  useTeamMessages, 
  useLeadWatchers, 
  useTeamMembers,
  parseMentions 
} from '@/hooks/useTeamCollaboration';
import { useActivities } from '@/hooks/useCRMData';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TeamCollaborationPanelProps {
  leadId: string;
  leadName: string;
}

export function TeamCollaborationPanel({ leadId, leadName }: TeamCollaborationPanelProps) {
  return (
    <Tabs defaultValue="notes" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="notes" className="text-xs">
          <MessageSquare className="h-3.5 w-3.5 mr-1" />
          Notes
        </TabsTrigger>
        <TabsTrigger value="chat" className="text-xs">
          <AtSign className="h-3.5 w-3.5 mr-1" />
          Chat
        </TabsTrigger>
        <TabsTrigger value="activity" className="text-xs">
          <Users className="h-3.5 w-3.5 mr-1" />
          Activity
        </TabsTrigger>
      </TabsList>

      <TabsContent value="notes" className="mt-3">
        <NotesTab leadId={leadId} />
      </TabsContent>

      <TabsContent value="chat" className="mt-3">
        <ChatTab leadId={leadId} />
      </TabsContent>

      <TabsContent value="activity" className="mt-3">
        <ActivityTab leadId={leadId} />
      </TabsContent>
    </Tabs>
  );
}

function NotesTab({ leadId }: { leadId: string }) {
  const { notes, isLoading, addNote, deleteNote, togglePin } = useTeamNotes(leadId);
  const { data: teamMembers = [] } = useTeamMembers();
  const { isWatching, toggleWatch } = useLeadWatchers(leadId);
  const [newNote, setNewNote] = useState('');
  const [visibility, setVisibility] = useState('team');
  const [showMentions, setShowMentions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      const mentions = parseMentions(newNote, teamMembers);
      await addNote.mutateAsync({ noteText: newNote, visibility, mentions });
      setNewNote('');
      toast.success('Note added');
    } catch (error) {
      toast.error('Failed to add note');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '@') {
      setShowMentions(true);
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleAddNote();
    }
  };

  const insertMention = (member: { user_id: string; email?: string }) => {
    const mention = `@${member.email?.split('@')[0] || member.user_id.slice(0, 8)} `;
    setNewNote(prev => prev + mention);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const getInitials = (userId: string) => userId.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-3">
      {/* Watch button */}
      <div className="flex justify-end">
        <Button
          variant={isWatching ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => toggleWatch.mutate('all')}
          disabled={toggleWatch.isPending}
        >
          {isWatching ? (
            <>
              <BellOff className="h-3.5 w-3.5 mr-1" />
              Unwatch
            </>
          ) : (
            <>
              <Bell className="h-3.5 w-3.5 mr-1" />
              Watch
            </>
          )}
        </Button>
      </div>

      {/* New note input */}
      <div className="space-y-2">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            placeholder="Add a note... Use @ to mention team members"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[80px] resize-none text-sm pr-10"
          />
          <Popover open={showMentions} onOpenChange={setShowMentions}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 h-7 w-7"
                onClick={() => setShowMentions(!showMentions)}
              >
                <AtSign className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="end">
              <div className="text-xs font-medium text-muted-foreground px-2 py-1">
                Mention team member
              </div>
              {teamMembers.map((member) => (
                <button
                  key={member.user_id}
                  className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded-sm flex items-center gap-2"
                  onClick={() => insertMention(member)}
                >
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px]">
                    {getInitials(member.user_id)}
                  </div>
                  <span className="truncate">{member.email || member.user_id.slice(0, 8)}</span>
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={visibility} onValueChange={setVisibility}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="team">Team</SelectItem>
              <SelectItem value="admin_only">Admin Only</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            size="sm"
            onClick={handleAddNote}
            disabled={addNote.isPending || !newNote.trim()}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Save
          </Button>
        </div>
      </div>

      {/* Notes list */}
      <ScrollArea className="h-[300px]">
        <div className="space-y-2 pr-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : notes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No notes yet</p>
          ) : (
            notes.map((note) => (
              <Card 
                key={note.id} 
                className={cn(
                  "p-3 bg-muted/30",
                  note.is_pinned && "border-primary/50 bg-primary/5"
                )}
              >
                <div className="flex gap-3">
                  <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-medium text-secondary-foreground">
                      {getInitials(note.created_by)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                        </span>
                        {note.is_pinned && (
                          <Badge variant="outline" className="h-4 text-[9px] px-1">
                            <Pin className="h-2.5 w-2.5 mr-0.5" />
                            Pinned
                          </Badge>
                        )}
                        {note.visibility !== 'team' && (
                          <Badge variant="secondary" className="h-4 text-[9px] px-1">
                            {note.visibility === 'private' ? (
                              <EyeOff className="h-2.5 w-2.5" />
                            ) : (
                              <Eye className="h-2.5 w-2.5" />
                            )}
                          </Badge>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => togglePin.mutate({ noteId: note.id, isPinned: !note.is_pinned })}
                          >
                            <Pin className="h-3.5 w-3.5 mr-2" />
                            {note.is_pinned ? 'Unpin' : 'Pin'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteNote.mutate(note.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{note.note_text}</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function ChatTab({ leadId }: { leadId: string }) {
  const { messages, isLoading, sendMessage, deleteMessage } = useTeamMessages(leadId);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    try {
      await sendMessage.mutateAsync({ content: newMessage });
      setNewMessage('');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getInitials = (userId: string) => userId.slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col h-[380px]">
      {/* Messages */}
      <ScrollArea className="flex-1 pr-2" ref={scrollRef}>
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No messages yet. Start the conversation!
            </p>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="flex gap-2 group">
                <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-medium text-secondary-foreground">
                    {getInitials(message.sent_by)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </span>
                    {message.is_edited && (
                      <span className="text-[9px] text-muted-foreground">(edited)</span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100"
                      onClick={() => deleteMessage.mutate(message.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm">{message.message_content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="mt-3 flex gap-2">
        <Textarea
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[40px] max-h-[80px] resize-none text-sm"
          rows={1}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={sendMessage.isPending || !newMessage.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ActivityTab({ leadId }: { leadId: string }) {
  const { data: activities = [] } = useActivities();
  
  const leadActivities = activities
    .filter(a => a.relatedTo?.type === 'lead' && a.relatedTo.id === leadId)
    .slice(0, 20);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return '📞';
      case 'email': return '📧';
      case 'meeting': return '📅';
      case 'note': return '📝';
      case 'status-change': return '🔄';
      case 'demo': return '🎬';
      default: return '📌';
    }
  };

  return (
    <ScrollArea className="h-[380px]">
      <div className="space-y-3 pr-2">
        {leadActivities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No activity recorded yet
          </p>
        ) : (
          leadActivities.map((activity) => (
            <div key={activity.id} className="flex gap-3 pb-3 border-b border-border last:border-0">
              <div className="text-lg">{getActivityIcon(activity.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{activity.subject}</p>
                {activity.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {activity.description}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
}
