// Types for the Training Library feature

export type TrainingType = 'core' | 'advanced' | 'bridge_play' | 'product' | 'process' | 'objection' | 'generic';

export interface TrainingLibraryEntry {
  id: string;
  title: string;
  slug: string;
  training_type: TrainingType;
  vertical_key: string | null;
  script: string;
  why_priority: string[];
  pain_points: string[];
  why_phone_ai_fits: string[];
  where_to_find: string[];
  script_version: number;
  is_active: boolean;
  latest_video_path: string | null;
  created_at: string;
  updated_at: string;
}

export const TRAINING_TYPE_LABELS: Record<TrainingType, string> = {
  core: 'Core Training',
  advanced: 'Advanced Training',
  bridge_play: 'Bridge Play',
  product: 'Product Training',
  process: 'Process Training',
  objection: 'Objection Handling',
  generic: 'Generic Training',
};

export const TRAINING_TYPE_COLORS: Record<TrainingType, string> = {
  core: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  advanced: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  bridge_play: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  product: 'bg-green-500/20 text-green-400 border-green-500/30',
  process: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  objection: 'bg-red-500/20 text-red-400 border-red-500/30',
  generic: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};
