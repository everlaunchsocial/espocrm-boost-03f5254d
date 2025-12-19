-- Add linked_vertical_id to training_videos table for tracking which vertical_training entry the video links to
ALTER TABLE training_videos
ADD COLUMN linked_vertical_id uuid REFERENCES vertical_training(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_training_videos_linked_vertical ON training_videos(linked_vertical_id);