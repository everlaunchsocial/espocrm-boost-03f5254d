import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBulkImportLeads, useRollbackLeadImport } from '@/hooks/useCRMData';
import { toast } from 'sonner';
import { Upload, AlertTriangle, CheckCircle, Trash2, Copy } from 'lucide-react';
import { Lead } from '@/types/crm';

interface ParsedLead {
  fullName: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  serviceCategory: string;
  website: string;
  googleRating: string;
  googleReviewCount: string;
  facebookUrl: string;
  instagramHandle: string;
  hasWebsite: string;
  source: string;
  notes: string;
}

// Parse name into first/last
function parseName(fullName: string, company: string): { firstName: string; lastName: string } {
  if (fullName && fullName.trim()) {
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
    }
    return { firstName: parts[0], lastName: '' };
  }
  // Use company name if no person name
  return { firstName: company || 'Unknown', lastName: '' };
}

// Clean phone number
function cleanPhone(phone: string): string | undefined {
  if (!phone || phone.includes('???')) return undefined;
  return phone.trim();
}

// Parse source to valid enum
function parseSource(source: string): Lead['source'] {
  const s = source?.toLowerCase() || '';
  if (s.includes('web')) return 'web';
  if (s.includes('referral')) return 'referral';
  if (s.includes('campaign')) return 'campaign';
  if (s.includes('social')) return 'social';
  return 'other';
}

export default function LeadImport() {
  const [rawData, setRawData] = useState('');
  const [parsedLeads, setParsedLeads] = useState<Array<Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>>>([]);
  const [lastBatchId, setLastBatchId] = useState<string | null>(null);
  const [importCount, setImportCount] = useState(0);
  
  const bulkImport = useBulkImportLeads();
  const rollback = useRollbackLeadImport();

  const parseData = () => {
    try {
      const lines = rawData.trim().split('\n');
      if (lines.length < 2) {
        toast.error('No data to parse. Make sure you include headers.');
        return;
      }

      // Skip header row
      const dataLines = lines.slice(1);
      
      const leads: Array<Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>> = [];
      
      for (const line of dataLines) {
        // Split by tab (from spreadsheet copy) or pipe (from markdown)
        const cells = line.includes('\t') 
          ? line.split('\t') 
          : line.split('|').map(c => c.trim()).filter(c => c);
        
        if (cells.length < 5) continue; // Skip incomplete rows
        
        const parsed: ParsedLead = {
          fullName: cells[0]?.trim() || '',
          company: cells[1]?.trim() || '',
          email: cells[2]?.trim() || '',
          phone: cells[3]?.trim() || '',
          address: cells[4]?.trim() || '',
          city: cells[5]?.trim() || '',
          state: cells[6]?.trim() || '',
          zipCode: cells[7]?.trim() || '',
          serviceCategory: cells[8]?.trim() || '',
          website: cells[9]?.trim() || '',
          googleRating: cells[10]?.trim() || '',
          googleReviewCount: cells[11]?.trim() || '',
          facebookUrl: cells[12]?.trim() || '',
          instagramHandle: cells[13]?.trim() || '',
          hasWebsite: cells[14]?.trim() || '',
          source: cells[15]?.trim() || '',
          notes: cells[16]?.trim() || '',
        };

        const { firstName, lastName } = parseName(parsed.fullName, parsed.company);
        
        leads.push({
          firstName,
          lastName,
          email: parsed.email || undefined,
          phone: cleanPhone(parsed.phone),
          company: parsed.company || undefined,
          title: undefined,
          source: parseSource(parsed.source),
          status: 'new',
          address: parsed.address || undefined,
          city: parsed.city || undefined,
          state: parsed.state || undefined,
          zipCode: parsed.zipCode || undefined,
          website: parsed.website || undefined,
          serviceCategory: parsed.serviceCategory || undefined,
          industry: 'home-improvement',
          facebookUrl: parsed.facebookUrl || undefined,
          instagramHandle: parsed.instagramHandle || undefined,
          googleRating: parsed.googleRating ? parseFloat(parsed.googleRating) : undefined,
          googleReviewCount: parsed.googleReviewCount ? parseInt(parsed.googleReviewCount) : undefined,
          hasWebsite: parsed.hasWebsite === '✔' || parsed.hasWebsite?.toLowerCase() === 'true',
          notes: parsed.notes || undefined,
        });
      }

      setParsedLeads(leads);
      toast.success(`Parsed ${leads.length} leads. Review and click Import to proceed.`);
    } catch (error) {
      toast.error('Failed to parse data. Check format.');
      console.error(error);
    }
  };

  const handleImport = async () => {
    if (parsedLeads.length === 0) {
      toast.error('No leads to import. Parse data first.');
      return;
    }

    try {
      const result = await bulkImport.mutateAsync(parsedLeads);
      setLastBatchId(result.batchId);
      setImportCount(result.count);
      setParsedLeads([]);
      setRawData('');
      toast.success(`Imported ${result.count} leads. Batch ID: ${result.batchId.slice(0, 8)}...`);
    } catch (error: any) {
      toast.error(`Import failed: ${error.message}`);
    }
  };

  const handleRollback = async () => {
    if (!lastBatchId) {
      toast.error('No batch to rollback');
      return;
    }

    try {
      const result = await rollback.mutateAsync(lastBatchId);
      toast.success(`Rolled back ${result.deletedCount} leads`);
      setLastBatchId(null);
      setImportCount(0);
    } catch (error: any) {
      toast.error(`Rollback failed: ${error.message}`);
    }
  };

  const copyBatchId = () => {
    if (lastBatchId) {
      navigator.clipboard.writeText(lastBatchId);
      toast.success('Batch ID copied to clipboard');
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Import Leads</h1>
            <p className="text-muted-foreground">Bulk import leads from spreadsheet data</p>
          </div>
        </div>

        {lastBatchId && (
          <Card className="border-amber-500/50 bg-amber-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Last Import: {importCount} leads</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      Batch ID: {lastBatchId.slice(0, 8)}...
                      <Button variant="ghost" size="sm" className="h-6 px-2" onClick={copyBatchId}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </p>
                  </div>
                </div>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleRollback}
                  disabled={rollback.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Rollback Import
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Paste Spreadsheet Data</CardTitle>
              <CardDescription>
                Copy data from Google Sheets (including headers) and paste below
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Paste your spreadsheet data here (tab-separated or pipe-separated)..."
                value={rawData}
                onChange={(e) => setRawData(e.target.value)}
                className="min-h-[300px] font-mono text-xs"
              />
              <div className="flex gap-2">
                <Button onClick={parseData} disabled={!rawData.trim()}>
                  Parse Data
                </Button>
                <Button variant="outline" onClick={() => { setRawData(''); setParsedLeads([]); }}>
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Preview ({parsedLeads.length} leads)</span>
                {parsedLeads.length > 0 && (
                  <Button 
                    onClick={handleImport} 
                    disabled={bulkImport.isPending}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {bulkImport.isPending ? 'Importing...' : 'Import All'}
                  </Button>
                )}
              </CardTitle>
              <CardDescription>
                Review parsed leads before importing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {parsedLeads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No leads parsed yet</p>
                  <p className="text-sm">Paste data and click Parse</p>
                </div>
              ) : (
                <div className="max-h-[400px] overflow-auto space-y-2">
                  {parsedLeads.slice(0, 50).map((lead, i) => (
                    <div key={i} className="p-3 border rounded-lg text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{lead.company || `${lead.firstName} ${lead.lastName}`}</span>
                        <Badge variant="outline">{lead.serviceCategory || 'No category'}</Badge>
                      </div>
                      <div className="text-muted-foreground text-xs space-y-0.5">
                        {lead.phone && <p>📞 {lead.phone}</p>}
                        {lead.email && <p>✉️ {lead.email}</p>}
                        {lead.city && <p>📍 {lead.city}, {lead.state}</p>}
                        {lead.website && <p>🌐 {lead.website}</p>}
                      </div>
                    </div>
                  ))}
                  {parsedLeads.length > 50 && (
                    <p className="text-center text-muted-foreground text-sm py-2">
                      ...and {parsedLeads.length - 50} more
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Expected Column Order</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 text-xs">
              {['full_name', 'company', 'email', 'phone', 'address', 'city', 'state', 'zip_code', 
                'service_category', 'website', 'google_rating', 'google_review_count', 
                'facebook_url', 'instagram_handle', 'has_website', 'source', 'notes'].map((col, i) => (
                <Badge key={col} variant="secondary">{i + 1}. {col}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
