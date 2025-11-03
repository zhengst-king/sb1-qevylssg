// Extend the existing Tag type
export interface AssignedTagMetadata {
  start_time?: string | null;  // Format: HH:MM:SS
  end_time?: string | null;    // Format: HH:MM:SS
  notes?: string | null;
}

export interface AssignedTag extends Tag {
  content_tag_id: string;  // The ID from content_tags table
  start_time?: string | null;
  end_time?: string | null;
  notes?: string | null;
}