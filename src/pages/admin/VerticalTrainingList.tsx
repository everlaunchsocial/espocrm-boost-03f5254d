import { useState } from 'react';
import { useVerticalTraining } from '@/hooks/useVerticalTraining';
import { VerticalTrainingRow } from '@/types/verticalTraining';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Loader2, 
  Search, 
  Video, 
  VideoOff, 
  Target, 
  AlertCircle, 
  Lightbulb, 
  Users,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function VerticalTrainingList() {
  const { verticals, isLoading, error, refetch } = useVerticalTraining();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVertical, setSelectedVertical] = useState<VerticalTrainingRow | null>(null);

  const filteredVerticals = verticals.filter((v) => {
    if (!searchQuery) return true;
    return v.industry_name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
            <p className="text-destructive">{error}</p>
            <Button variant="outline" className="mt-4" onClick={refetch}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Top 20 Verticals</h1>
          <p className="text-muted-foreground">
            Priority industries for AI phone training ({verticals.length} verticals)
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/admin/training-library">
              <FileText className="h-4 w-4 mr-2" />
              Training Library
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/training-videos">
              <Video className="h-4 w-4 mr-2" />
              Generate Videos
            </Link>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search industries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="text-2xl font-bold">{verticals.length}</div>
            <div className="text-sm text-muted-foreground">Total Verticals</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-2xl font-bold text-green-600">
              {verticals.filter(v => v.video_path).length}
            </div>
            <div className="text-sm text-muted-foreground">With Videos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-2xl font-bold text-amber-600">
              {verticals.filter(v => !v.video_path).length}
            </div>
            <div className="text-sm text-muted-foreground">Pending Videos</div>
          </CardContent>
        </Card>
      </div>

      {/* Verticals Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Verticals</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead className="w-24 text-center">Video</TableHead>
                <TableHead className="w-32 text-center">Pain Points</TableHead>
                <TableHead className="w-32 text-center">Lead Sources</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVerticals.map((vertical) => (
                <TableRow 
                  key={vertical.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedVertical(vertical)}
                >
                  <TableCell>
                    <Badge variant="secondary" className="font-bold">
                      #{vertical.rank}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{vertical.industry_name}</TableCell>
                  <TableCell className="text-center">
                    {vertical.video_path ? (
                      <Badge variant="default" className="bg-green-600">
                        <Video className="h-3 w-3 mr-1" />
                        Ready
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        <VideoOff className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-muted-foreground">{vertical.pain_points.length}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-muted-foreground">{vertical.where_to_find.length}</span>
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selectedVertical} onOpenChange={() => setSelectedVertical(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedVertical && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-lg font-bold">
                    #{selectedVertical.rank}
                  </Badge>
                  <DialogTitle className="text-xl">{selectedVertical.industry_name}</DialogTitle>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Video Status */}
                <div className="flex items-center gap-2">
                  {selectedVertical.video_path ? (
                    <Badge variant="default" className="bg-green-600">
                      <Video className="h-3 w-3 mr-1" />
                      Video Ready
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <VideoOff className="h-3 w-3 mr-1" />
                      Video Pending
                    </Badge>
                  )}
                </div>

                {/* Why Priority */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Why Priority?</h3>
                  </div>
                  {selectedVertical.why_priority.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {selectedVertical.why_priority.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No content yet</p>
                  )}
                </div>

                {/* Pain Points */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <h3 className="font-semibold">Pain Points</h3>
                  </div>
                  {selectedVertical.pain_points.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {selectedVertical.pain_points.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No content yet</p>
                  )}
                </div>

                {/* Why AI Fits */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <h3 className="font-semibold">Why Phone AI Fits</h3>
                  </div>
                  {selectedVertical.why_phone_ai_fits.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {selectedVertical.why_phone_ai_fits.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No content yet</p>
                  )}
                </div>

                {/* Where to Find */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <h3 className="font-semibold">Where to Find Leads</h3>
                  </div>
                  {selectedVertical.where_to_find.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {selectedVertical.where_to_find.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No content yet</p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
