// DB Types - basierend auf kb.ai Schema

export interface Project {
	id: number;
	slug: string;
	name: string;
	description: string | null;
	created_at: string;
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
	created_at: string;
	updated_at: string;
}

export interface TicketDetailed extends Ticket {
	tasks: TicketTask[];
	comments: TicketComment[];
	status: BoardStatus;
	relations: TicketRelation[];
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
