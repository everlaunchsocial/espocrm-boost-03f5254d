import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, Phone, Clock, BarChart3, Play, FileText, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useCallRecordings, useCallRecordingDetail, useCoachingStats, formatDuration, getQualityColor, getOutcomeLabel, getMomentIcon, getMomentColor, CallRecording } from '@/hooks/useCallRecordings';

export default function CallRecordings() {
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);
  
  const { data: recordings = [], isLoading } = useCallRecordings();
  const { data: recordingDetail } = useCallRecordingDetail(selectedRecordingId);
  const { data: coachingStats } = useCoachingStats();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mic className="w-6 h-6" />
            Call Recordings
          </h1>
          <p className="text-muted-foreground">AI-powered call analysis and coaching insights</p>
        </div>
      </div>

      {/* Stats Overview */}
      {coachingStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Phone className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{coachingStats.totalCalls}</p>
                  <p className="text-sm text-muted-foreground">Total Calls (30d)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <BarChart3 className={`w-8 h-8 ${getQualityColor(coachingStats.avgQualityScore)}`} />
                <div>
                  <p className="text-2xl font-bold">{coachingStats.avgQualityScore}/100</p>
                  <p className="text-sm text-muted-foreground">Avg Quality Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {coachingStats.avgTalkRatio.rep}/{coachingStats.avgTalkRatio.prospect}
                  </p>
                  <p className="text-sm text-muted-foreground">Avg Talk Ratio</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {coachingStats.avgQualityScore >= 75 ? (
                  <TrendingUp className="w-8 h-8 text-green-500" />
                ) : coachingStats.avgQualityScore < 60 ? (
                  <TrendingDown className="w-8 h-8 text-red-500" />
                ) : (
                  <Minus className="w-8 h-8 text-yellow-500" />
                )}
                <div>
                  <p className="text-2xl font-bold">
                    {coachingStats.avgQualityScore >= 75 ? 'Strong' : coachingStats.avgQualityScore >= 60 ? 'Improving' : 'Needs Work'}
                  </p>
                  <p className="text-sm text-muted-foreground">Performance Trend</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recordings List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Calls</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading recordings...</div>
          ) : recordings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mic className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No call recordings yet</p>
              <p className="text-sm">Recordings will appear here after calls are logged</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recordings.map((recording) => (
                <RecordingCard
                  key={recording.id}
                  recording={recording}
                  onClick={() => setSelectedRecordingId(recording.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recording Detail Modal */}
      <Dialog open={!!selectedRecordingId} onOpenChange={() => setSelectedRecordingId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5" />
              Call Analysis
              {recordingDetail?.recording.lead && (
                <span className="text-muted-foreground font-normal">
                  - {recordingDetail.recording.lead.first_name} {recordingDetail.recording.lead.last_name}
                  {recordingDetail.recording.lead.company && ` (${recordingDetail.recording.lead.company})`}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {recordingDetail && (
            <RecordingDetailContent
              recording={recordingDetail.recording}
              moments={recordingDetail.moments}
              insights={recordingDetail.insights}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RecordingCard({ recording, onClick }: { recording: CallRecording; onClick: () => void }) {
  const analysis = recording.ai_analysis;
  const leadName = recording.lead 
    ? `${recording.lead.first_name} ${recording.lead.last_name}`
    : 'Unknown Lead';
  
  return (
    <div 
      className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{leadName}</h3>
            {recording.lead?.company && (
              <span className="text-sm text-muted-foreground">- {recording.lead.company}</span>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(recording.duration_seconds)}
            </span>
            <span>{new Date(recording.started_at).toLocaleDateString()}</span>
            <Badge variant="outline">{recording.call_direction}</Badge>
          </div>

          {analysis && (
            <div className="flex items-center gap-2 mt-2">
              <Badge 
                variant={analysis.call_outcome === 'closed_won' ? 'default' : 'secondary'}
                className={
                  analysis.call_outcome === 'closed_won' ? 'bg-green-500' :
                  analysis.call_outcome === 'closed_lost' ? 'bg-red-500' :
                  analysis.call_outcome === 'follow_up_scheduled' ? 'bg-blue-500' : ''
                }
              >
                {getOutcomeLabel(analysis.call_outcome)}
              </Badge>
              
              {analysis.buying_signals?.length > 0 && (
                <Badge variant="outline" className="text-orange-500 border-orange-500">
                  🔥 {analysis.buying_signals.length} buying signal{analysis.buying_signals.length > 1 ? 's' : ''}
                </Badge>
              )}
              
              {analysis.objections_raised?.length > 0 && (
                <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                  ⚠️ {analysis.objections_raised.length} objection{analysis.objections_raised.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="text-right">
          {recording.call_quality_score !== null && (
            <div className={`text-2xl font-bold ${getQualityColor(recording.call_quality_score)}`}>
              {recording.call_quality_score}/100
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Button size="sm" variant="outline">
              <Play className="w-3 h-3 mr-1" /> Listen
            </Button>
            <Button size="sm" variant="outline">
              <FileText className="w-3 h-3 mr-1" /> Transcript
            </Button>
            <Button size="sm" variant="outline">
              <Target className="w-3 h-3 mr-1" /> Analysis
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecordingDetailContent({ 
  recording, 
  moments, 
  insights 
}: { 
  recording: CallRecording;
  moments: any[];
  insights: any[];
}) {
  const analysis = recording.ai_analysis;

  return (
    <ScrollArea className="h-[70vh]">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="moments">Key Moments ({moments.length})</TabsTrigger>
          <TabsTrigger value="coaching">Coaching ({insights.length})</TabsTrigger>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className={`text-3xl font-bold ${getQualityColor(recording.call_quality_score)}`}>
                  {recording.call_quality_score || '-'}/100
                </p>
                <p className="text-sm text-muted-foreground">Quality Score</p>
              </CardContent>
            </Card>
            
            {analysis?.talk_ratio && (
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">
                    {analysis.talk_ratio.rep}/{analysis.talk_ratio.prospect}
                  </p>
                  <p className="text-sm text-muted-foreground">Talk Ratio (Rep/Prospect)</p>
                  <p className="text-xs text-muted-foreground">Ideal: {analysis.talk_ratio.ideal}</p>
                </CardContent>
              </Card>
            )}
            
            {analysis?.questions_asked && (
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">{analysis.questions_asked.rep}</p>
                  <p className="text-sm text-muted-foreground">Questions Asked</p>
                  <p className="text-xs text-muted-foreground">
                    Quality: {analysis.questions_asked.quality_score}/100
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* AI Summary */}
          {analysis?.summary && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">AI Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{analysis.summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Key Topics */}
          {analysis?.key_topics && analysis.key_topics.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Key Topics Discussed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysis.key_topics.map((topic, i) => (
                    <Badge key={i} variant="secondary">{topic}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Next Steps */}
          {analysis?.next_steps_discussed && analysis.next_steps_discussed.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Next Steps Discussed</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1">
                  {analysis.next_steps_discussed.map((step, i) => (
                    <li key={i} className="text-sm">{step}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-2 gap-4">
            {analysis?.strengths && analysis.strengths.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-green-500">💪 Strengths</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {analysis.strengths.map((s, i) => (
                      <li key={i} className="text-sm">• {s}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            
            {analysis?.weaknesses && analysis.weaknesses.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-orange-500">🎯 Opportunities</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {analysis.weaknesses.map((w, i) => (
                      <li key={i} className="text-sm">• {w}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="moments" className="space-y-3">
          {moments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No key moments detected</p>
          ) : (
            moments.map((moment) => (
              <Card key={moment.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`text-2xl ${getMomentColor(moment.importance_level)} rounded-lg p-2`}>
                      {getMomentIcon(moment.moment_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{moment.moment_type.replace('_', ' ')}</Badge>
                        <span className="text-xs text-muted-foreground">
                          at {formatDuration(moment.timestamp_seconds)}
                        </span>
                        <Badge 
                          variant={moment.importance_level === 'critical' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {moment.importance_level}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">"{moment.transcript_excerpt}"</p>
                      {moment.ai_commentary && (
                        <p className="text-sm text-muted-foreground mt-1">
                          💡 {moment.ai_commentary}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="coaching" className="space-y-3">
          {insights.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No coaching insights available</p>
          ) : (
            insights.map((insight) => (
              <Card key={insight.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`text-xl p-2 rounded-lg ${
                      insight.strength_or_weakness === 'strength' 
                        ? 'bg-green-500/10 text-green-500' 
                        : insight.strength_or_weakness === 'weakness'
                        ? 'bg-red-500/10 text-red-500'
                        : 'bg-blue-500/10 text-blue-500'
                    }`}>
                      {insight.strength_or_weakness === 'strength' ? '💪' : 
                       insight.strength_or_weakness === 'weakness' ? '⚠️' : '💡'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{insight.insight_category.replace('_', ' ')}</Badge>
                        <Badge 
                          variant={insight.strength_or_weakness === 'strength' ? 'default' : 'secondary'}
                          className={insight.strength_or_weakness === 'strength' ? 'bg-green-500' : ''}
                        >
                          {insight.strength_or_weakness}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{insight.insight_text}</p>
                      {insight.specific_example && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Example: {insight.specific_example}
                        </p>
                      )}
                      {insight.recommendation && (
                        <p className="text-sm text-blue-500 mt-1">
                          💡 {insight.recommendation}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="transcript">
          <Card>
            <CardContent className="p-4">
              {recording.transcription_text ? (
                <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-lg">
                  {recording.transcription_text}
                </pre>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No transcript available for this recording
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </ScrollArea>
  );
}
