export interface EvolutionAttachment {
  id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size_kb: number;
  caption: string | null;
}

export interface EvolutionEntry {
  id: string;
  date: string;
  created_at: string;
  evolution_text: string;
  professional_id: string | null;
  profiles: { full_name: string; specialty: string | null } | null;
  evolution_attachments: EvolutionAttachment[];
}
