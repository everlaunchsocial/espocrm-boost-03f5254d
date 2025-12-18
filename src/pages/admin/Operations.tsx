import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, FolderKanban, Brain, Receipt, ClipboardCheck, Search, X } from 'lucide-react';
import { DocumentsTab } from '@/components/operations/DocumentsTab';
import { ProjectsTab } from '@/components/operations/ProjectsTab';
import { BrainNotesTab } from '@/components/operations/BrainNotesTab';
import { ExpensesTab } from '@/components/operations/ExpensesTab';
import { TestingTab } from '@/components/operations/TestingTab';
import { BrainNotesWidget } from '@/components/backlog/BrainNotesWidget';
import { useOperationsSearch, SearchScope, SearchResult } from '@/hooks/useOperationsSearch';
import { cn } from '@/lib/utils';

export default function Operations() {
  const [activeTab, setActiveTab] = useState('documents');
  const { query, scope, setScope, results, isSearching, search, clearSearch } = useOperationsSearch();

  const handleResultClick = (result: SearchResult) => {
    clearSearch();
    if (result.result_type === 'document') setActiveTab('documents');
    else if (result.result_type === 'brain_note') setActiveTab('brain');
    else if (result.result_type === 'project') setActiveTab('projects');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col gap-4 pb-4 border-b mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Operations</h1>
            <p className="text-sm text-muted-foreground">Documents, projects, notes, expenses & testing</p>
          </div>
        </div>

        {/* Universal Search */}
        <div className="flex gap-2 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search everything..."
              value={query}
              onChange={(e) => search(e.target.value)}
              className="pl-9 pr-9"
            />
            {query && (
              <button 
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select value={scope} onValueChange={(v) => setScope(v as SearchScope)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Search All</SelectItem>
              <SelectItem value="documents">Documents</SelectItem>
              <SelectItem value="brain_notes">Brain Notes</SelectItem>
              <SelectItem value="projects">Projects</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search Results */}
        {isSearching && results.length > 0 && (
          <Card className="max-w-2xl">
            <CardContent className="p-2 space-y-1 max-h-64 overflow-y-auto">
              {results.map((result) => (
                <button
                  key={`${result.result_type}-${result.result_id}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full text-left p-2 rounded hover:bg-muted flex items-start gap-3"
                >
                  <div className={cn(
                    "mt-0.5 p-1 rounded",
                    result.result_type === 'document' && "bg-blue-500/20 text-blue-400",
                    result.result_type === 'brain_note' && "bg-purple-500/20 text-purple-400",
                    result.result_type === 'project' && "bg-green-500/20 text-green-400"
                  )}>
                    {result.result_type === 'document' && <FileText className="h-3 w-3" />}
                    {result.result_type === 'brain_note' && <Brain className="h-3 w-3" />}
                    {result.result_type === 'project' && <FolderKanban className="h-3 w-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{result.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{result.snippet}</p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}
        {isSearching && results.length === 0 && query.length >= 2 && (
          <p className="text-sm text-muted-foreground">No results found</p>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-fit">
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />Documents
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-2">
            <FolderKanban className="h-4 w-4" />Projects
          </TabsTrigger>
          <TabsTrigger value="brain" className="gap-2">
            <Brain className="h-4 w-4" />Brain Notes
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2">
            <Receipt className="h-4 w-4" />Expenses
          </TabsTrigger>
          <TabsTrigger value="testing" className="gap-2">
            <ClipboardCheck className="h-4 w-4" />Testing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="flex-1 mt-6">
          <DocumentsTab />
        </TabsContent>
        <TabsContent value="projects" className="flex-1 mt-6 overflow-hidden">
          <ProjectsTab />
        </TabsContent>
        <TabsContent value="brain" className="flex-1 mt-6">
          <BrainNotesTab />
        </TabsContent>
        <TabsContent value="expenses" className="flex-1 mt-6">
          <ExpensesTab />
        </TabsContent>
        <TabsContent value="testing" className="flex-1 mt-6">
          <TestingTab />
        </TabsContent>
      </Tabs>

      {/* Floating Brain Notes Widget */}
      <BrainNotesWidget />
    </div>
  );
}
