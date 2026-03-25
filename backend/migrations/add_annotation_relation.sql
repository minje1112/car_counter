-- Add annotation_id relation to rtsp_streams table
-- This links RTSP streams to their car counting annotation rules

-- Add annotation_id column to rtsp_streams
ALTER TABLE rtsp_streams 
ADD COLUMN annotation_id INT NULL COMMENT 'Reference to annotation rules for car counting' AFTER location,
ADD INDEX idx_annotation_id (annotation_id);

-- Add foreign key constraint (optional - allows NULL if no annotation assigned)
ALTER TABLE rtsp_streams
ADD CONSTRAINT fk_rtsp_annotation 
FOREIGN KEY (annotation_id) REFERENCES annotations(id) ON DELETE SET NULL;

-- Note: The annotation_id can be NULL if no counting rule is assigned to the stream
-- When AI processes the stream, it will fetch the annotation rules from this relation
