export interface Entry {
  id: string;
  ref: string;
  date: string;
  time: string;
  decision: string;
  justification: string;
  tags: string[];
  attachments: string[];
  edited: boolean;
  editedAt: string;
}

export interface Project {
  name: string;
  ref: string;
  initial: string;
  entries: Entry[];
}

export interface ComposerState {
  decision: string;
  justification: string;
  tags: string[];
  tagInput: string;
  attachments: string[];
  editingId: string | null;
}
