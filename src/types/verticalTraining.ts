// Types for the Vertical Training Library feature

export interface VerticalTrainingRow {
  id: string;
  rank: number;
  industry_name: string;
  parent_archetype: string | null;
  video_path: string | null;
  why_priority: string[];
  pain_points: string[];
  why_phone_ai_fits: string[];
  where_to_find: string[];
  updated_at: string;
}
