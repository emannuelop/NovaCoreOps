export type PriorityType = 'Baixa' | 'Média' | 'Alta' | 'Crítica';

export type StatusType = 
  | 'Em aberto' 
  | 'Em execução' 
  | 'Concluída' 
  | 'Cancelada';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role?: string;
  status?: 'Aprovado' | 'Pendente' | 'Bloqueado';
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  inactive?: boolean;
}

export interface Sector {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  inactive?: boolean;
}

export interface Professional {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  inactive?: boolean;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedByUid?: string | null;
  completedByName?: string | null;
  completedAt?: string | null;
}

export interface Demand {
  id: string; // e.g. DEM-204
  title: string;
  description: string;
  requester: string; // e.g. Mariana Silveira / Setor Financeiro
  priority: PriorityType;
  category: string; // e.g. TI, RH, Infraestrutura
  status: StatusType;
  assignedTo: string | null; // uid of collaborator or null
  assignedToName: string | null; // name of collaborator
  involvedUids: string[]; // list of additional people involved
  involvedNames: string[]; // list of names of additional people involved
  openedAt: string; // ISO timestamp
  assignedAt: string | null; // ISO timestamp
  startedAt?: string | null; // ISO timestamp when transitioned to 'Em execução'
  completedAt?: string | null; // ISO timestamp when transitioned to 'Concluída'
  lastStatusChangedAt: string; // ISO timestamp
  elapsedTimes: Record<StatusType, number>; // state -> elapsed seconds key-value store
  updatedAt: string; // ISO timestamp
  createdByUid?: string; // UID of user who created this demand
  createdByEmail?: string; // Email of user who created this demand
  dueDate?: string | null; // ISO date string (YYYY-MM-DD)
  checklist?: ChecklistItem[]; // Checklist of tasks remaining/done
  observation?: string; // Observation/Comment by the executor
}

export interface MovementLog {
  id: string;
  type: 'status_change' | 'assignee_change' | 'involved_change' | 'creation' | 'observation_change';
  from: string; // previous value or blank
  to: string; // target value
  changedByUid: string;
  changedByName: string;
  createdAt: string; // ISO timestamp
  duration?: number; // seconds spent in previous status (relevant for type='status_change')
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}
