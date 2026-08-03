// DB Types - basierend auf kabai Schema

export interface Project {
	id: number;
	slug: string;
	name: string;
	description: string | null;
	// Projekt-Archivierung (Codeberg kbai-ui#7, Kanban AI #502) — nur der
	// Mensch archiviert/reaktiviert per UI, nie ein MCP-Tool.
	archived: boolean;
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

// Unifizierte Projektübersicht (Ticket #494) — ersetzt Dashboard + Projekte
export interface ProjectOverviewStatus {
	id: number;
	name: string;
	display_name: string;
	position: number;
	special_type: SpecialStatusType;
	ticket_count: number;
}

export interface ProjectOverview extends Project {
	statuses: ProjectOverviewStatus[];
	last_activity: string;
	waiting_on_human: number;
	throughput_7d: number;
	oldest_open_created_at: string | null;
	notes_count: number;
	// Summe über effort_estimate/effort_actual aller Tickets des Projekts (Codeberg kbai-ui#16)
	effort_estimate_sum: number;
	effort_actual_sum: number;
}

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
	// Nur bei type 'epic' gesetzt (via ticket_relations parent_of): Fortschritt der Kind-Tickets
	epic_children_total?: number;
	epic_children_done?: number;
	// Generisches Aufwandsfeld (Codeberg kbai-ui#16) — Einheit frei wählbar (Tage, Punkte, Tokens, ...)
	effort_estimate: number | null;
	effort_actual: number | null;
	effort_unit: string | null;
	// Nur bei type 'epic' gesetzt: Summe des Aufwands aller Kind-Tickets
	epic_effort_estimate_sum?: number;
	epic_effort_actual_sum?: number;
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

// Canvas, der per Ref-Element (V12) auf dieses Ticket/diese Note verweist
// (Ticket #539 — Rückrichtung von #528, DB-Index existiert bereits)
export interface CanvasRef {
	canvas_id: number;
	canvas_name: string;
}

export interface TicketDetailed extends Ticket {
	tasks: TicketTask[];
	comments: TicketComment[];
	status: BoardStatus;
	relations: TicketRelation[];
	linked_notes: TicketLinkedNote[];
	attachments: TicketAttachment[];
	referenced_by_canvases: CanvasRef[];
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
	// Anzahl per "contains"-Link referenzierter Notes (nur für Hubs relevant,
	// nur von /api/notes geliefert — bei /api/notes/[slug] (NoteDetail) nicht gesetzt)
	contained_count?: number;
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
	referenced_by_canvases: CanvasRef[];
}

export interface NotesListResponse {
	notes: NoteSummary[];
	// Alle bekannten Tags für den Filter-Dropdown
	tags: string[];
	// true wenn die FTS-Suche leer war und der pg_trgm-Titel-Fallback griff
	fuzzy_fallback: boolean;
}

// Canvas (V12__Canvas_Schema.sql, Ticket #526) — projektübergreifende
// Planungsfläche. Ein Canvas gehört zu keinem Projekt fest, sondern wird
// n:m über canvas_projects verknüpft (gleiches Muster wie notes/note_projects).
export interface Canvas {
	id: number;
	name: string;
	created_at: string;
	updated_at: string;
	project_ids: number[];
	element_count: number;
}

// Form Types
export interface CreateCanvasForm {
	name: string;
	project_ids?: number[];
}

export interface UpdateCanvasForm {
	name?: string;
}

// Canvas-Elemente (Ticket #527 Editor, Ticket #528 Referenz-Karten, Ticket
// #529 Bild-Elemente, Ticket #530 Skizzen-Elemente).
export type CanvasElementType = 'text' | 'frame' | 'ref' | 'image' | 'sketch';

export interface CanvasElement {
	id: number;
	canvas_id: number;
	type: CanvasElementType;
	position_x: number;
	position_y: number;
	width: number | null;
	height: number | null;
	z_order: number;
	content: {
		text?: string;
		title?: string;
		target_type?: 'ticket' | 'note';
		target_id?: number;
		attachment_id?: number;
		// Ticket #530: Freihand-Striche, jeweils lokal zum Node (0,0 = Node-
		// Ecke oben links zum Zeitpunkt des Zeichnens), NICHT Canvas-Weltkoordinaten.
		strokes?: [number, number, number][][];
	};
	description: string | null;
	parent_frame_id: number | null;
	created_at: string;
	updated_at: string;
}

export interface CanvasEdge {
	id: number;
	canvas_id: number;
	from_element_id: number;
	to_element_id: number;
	label: string | null;
	created_at: string;
}

// Form Types
export interface CreateCanvasElementForm {
	type: CanvasElementType;
	content: {
		text?: string;
		title?: string;
		target_type?: 'ticket' | 'note';
		target_id?: number;
		attachment_id?: number;
		strokes?: [number, number, number][][];
	};
	position_x: number;
	position_y: number;
	width?: number | null;
	height?: number | null;
	z_order?: number;
	parent_frame_id?: number | null;
}

export interface UpdateCanvasElementForm {
	position_x?: number;
	position_y?: number;
	width?: number | null;
	height?: number | null;
	z_order?: number;
	content?: {
		text?: string;
		title?: string;
		target_type?: 'ticket' | 'note';
		target_id?: number;
		attachment_id?: number;
		strokes?: [number, number, number][][];
	};
	description?: string | null;
	// explizit optional+nullable: fehlt der Key -> unverändert, null -> Frame lösen.
	parent_frame_id?: number | null;
}

// Referenz-Karten (Ticket #528): Suche über Tickets/Epics projektübergreifend
// für den RefPickerDialog.
export interface TicketSearchResult {
	id: number;
	title: string;
	type: TicketType;
	project_id: number;
	project_name: string;
	status_id: number;
	status_name: string;
}

// Auflösung eines 'ref'-Elements (GET /api/refs/[type]/[id]) — degradiert
// bewusst zu { exists: false } statt eines Fehlers, wenn das Ziel gelöscht
// wurde (RefNode rendert dann eine "nicht gefunden"-Karte statt abzustürzen).
export interface RefResolveTicketResult {
	exists: true;
	id: number;
	title: string;
	type: TicketType;
	project_id: number;
	project_name: string;
	status_name: string;
}

export interface RefResolveNoteResult {
	exists: true;
	id: number;
	slug: string;
	title: string;
	kind: NoteKind;
	project_names: string[];
}

export type RefResolveResult =
	| { exists: false }
	| RefResolveTicketResult
	| RefResolveNoteResult;

export interface CreateCanvasEdgeForm {
	from_element_id: number;
	to_element_id: number;
	label?: string | null;
}

export interface UpdateCanvasEdgeForm {
	label?: string | null;
}

// Attachments (V13__Attachments.sql, Ticket #529 Canvas-Bilder) — Antwort von
// POST /api/attachments. Die Bytes selbst werden nie ans Frontend
// zurückgegeben, nur über GET /api/attachments/[id] direkt als <img src>
// ausgeliefert (siehe ImageNode.svelte).
export interface AttachmentUploadResult {
	id: number;
	filename: string;
	mime_type: string;
	size_bytes: number;
}

// Ticket-Bild-Anhang (Codeberg kbai-ui#4, kabai-Ticket #469) — Antwort von
// GET/POST /api/tickets/[id]/attachments
export interface TicketAttachment {
	id: number;
	filename: string;
	mime_type: string;
	size_bytes: number;
	description: string | null;
	uploaded_by: string | null;
	created_at: string;
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
