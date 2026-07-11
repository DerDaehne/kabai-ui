// DB Types - basierend auf kabai Schema

export interface Project {
	id: number;
	slug: string;
	name: string;
	description: string | null;
	created_at: string;
}

export interface ProjectStats extends Project {
	ticket_count: number;
	done_count: number;
	inbox_count: number;
}

export interface RecentTicket {
	id: number;
	title: string;
	project_id: number;
	project_name: string;
	status_name: string | null;
	updated_at: string;
}

export interface DashboardData {
	totals: { projects: number; tickets: number; done: number; inbox: number };
	projects: ProjectStats[];
	recentTickets: RecentTicket[];
}

export type SpecialStatusType = 'human_intervention' | 'human_answered' | null;

export interface BoardStatus {
	id: number;
	project_id: number;
	name: string;
	display_name: string;
	position: number;
	agent_role_instruction: string | null;
	special_type: SpecialStatusType;
	created_at: string;
}

export interface StatusTransition {
	project_id: number;
	from_status_id: number;
	to_status_id: number;
}

export type TicketType = 'ticket' | 'epic';

export interface Ticket {
	id: number;
	project_id: number;
	title: string;
	description: string | null;
	status_id: number;
	assignee: string | null;
	model: string | null;
	type: TicketType;
	// Opt-in Doku-Pflicht (V8): done-Move erfordert eine verlinkte Note
	docs_required?: boolean;
	// Nur in Listen-Antworten gesetzt (für Board-Icons)
	linked_notes_count?: number;
	created_at: string;
	updated_at: string;
}

// Knowledge-Base-Note, die über note_ticket_links an einem Ticket hängt
export interface TicketLinkedNote {
	note_id: number;
	slug: string;
	title: string;
	kind: 'note' | 'adr' | 'hub';
	relation: 'documents' | 'created_by' | 'verified_by' | 'references';
	archived: boolean;
}

export interface TicketDetailed extends Ticket {
	tasks: TicketTask[];
	comments: TicketComment[];
	status: BoardStatus;
	relations: TicketRelation[];
	linked_notes: TicketLinkedNote[];
}

export interface TicketTask {
	id: number;
	ticket_id: number;
	title: string;
	is_completed: boolean;
	created_at: string;
}

export interface TicketComment {
	id: number;
	ticket_id: number;
	author: string;
	comment_text: string;
	created_at: string;
}

export interface TicketDependency {
	ticket_id: number;
	blocked_by_ticket_id: number;
}

export type RelationType = 'parent_of' | 'blocks' | 'duplicate_of' | 'relates_to';

export interface TicketRelation {
	id: number;
	from_ticket_id: number;
	to_ticket_id: number;
	relation_type: RelationType;
	created_at: string;
	// Angereichert vom Server für Anzeige
	other_ticket_id: number;
	other_ticket_title: string;
	direction: 'outgoing' | 'incoming';
}

// Knowledge Base (kabai-docs Zettelkasten, V7)
export type NoteKind = 'note' | 'adr' | 'hub';

export interface NoteProjectRef {
	id: number;
	name: string;
}

export interface NoteSummary {
	id: number;
	slug: string;
	title: string;
	kind: NoteKind;
	tags: string[];
	archived: boolean;
	created_at: string;
	updated_at: string;
	last_verified_at: string | null;
	last_verified_ticket_id: number | null;
	projects: NoteProjectRef[];
	// Nur bei Suchtreffern gesetzt
	snippet?: string;
	rank?: number;
}

export type NoteLinkType = 'references' | 'contains' | 'supersedes' | 'contradicts';

export interface NoteLinkRef {
	direction: 'outgoing' | 'incoming';
	link_type: NoteLinkType;
	note_id: number;
	slug: string;
	title: string;
	kind: NoteKind;
	archived: boolean;
}

export type NoteTicketRelation = 'documents' | 'created_by' | 'verified_by' | 'references';

export interface NoteTicketLink {
	ticket_id: number;
	relation: NoteTicketRelation;
	ticket_title: string;
	project_id: number;
}

export interface NoteDetail extends NoteSummary {
	body: string;
	links: NoteLinkRef[];
	ticket_links: NoteTicketLink[];
}

export interface NotesListResponse {
	notes: NoteSummary[];
	// Alle bekannten Tags für den Filter-Dropdown
	tags: string[];
	// true wenn die FTS-Suche leer war und der pg_trgm-Titel-Fallback griff
	fuzzy_fallback: boolean;
}

// API Response Types
export interface ApiResponse<T> {
	ok: boolean;
	data?: T;
	error?: string;
}

export interface SessionInfo {
	username: string;
	db_host: string;
	db_port: string;
	db_name: string;
}

// Form Types
export interface CreateProjectForm {
	slug: string;
	name: string;
	description?: string;
}

export interface UpdateProjectForm {
	name?: string;
	description?: string;
}

export interface CreateStatusForm {
	name: string;
	display_name: string;
	position: number;
	agent_role_instruction?: string;
}

export interface CreateRelationForm {
	to_ticket_id: number;
	relation_type: RelationType;
}

export interface UpdateStatusForm {
	display_name?: string;
	position?: number;
	agent_role_instruction?: string;
}

export interface CreateTicketForm {
	title: string;
	description?: string;
	status_id: number;
	assignee?: string;
	type?: TicketType;
}

export interface UpdateTicketForm {
	title?: string;
	description?: string;
	assignee?: string;
	model?: string | null;
	status_id?: number;
	type?: TicketType;
}

export interface CreateTaskForm {
	title: string;
}

export interface UpdateTaskForm {
	is_completed: boolean;
}

export interface CreateCommentForm {
	author: string;
	comment_text: string;
}

export interface CreateTransitionForm {
	from_status_id: number;
	to_status_id: number;
}

// UI State Types
export interface ToastMessage {
	id: string;
	type: 'success' | 'error' | 'warning' | 'info';
	message: string;
	title?: string;
}

export interface DragItem {
	type: string;
	id: number | string;
	data?: any;
}
