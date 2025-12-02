

export enum Urgency {
  CRITICAL = 'Critical',
  URGENT = 'Urgent',
  NORMAL = 'Normal'
}

// Removed hardcoded Status Enum
// Replaced with dynamic strings identifiers

export enum ClientType {
  NEW = 'New',
  EXISTING = 'Existing'
}

export enum PrintingType {
  OFFSET = 'Offset',
  DIGITAL = 'Digital'
}

export type ColorTheme = 'slate' | 'red' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green' | 'emerald' | 'teal' | 'cyan' | 'sky' | 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia' | 'pink' | 'rose';

export interface TaskStatus {
  id: string;
  label: string;
  color: ColorTheme;
  icon: string;
  orderIndex: number;
  isFinished: boolean; // Marks the final state
  isDefault?: boolean; // Marks the starting state
  isCancelled?: boolean; // Marks cancelled/terminated states
  allowedNextStatuses?: string[]; // IDs of allowed next statuses (empty = allow all non-finished)
  previousStatusId?: string; // For tracking previous status (useful for "On Hold" state)
}

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  number: string;
  notes?: string; 
}

export interface Product {
  id: string;
  name: string;
  isVip: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
}

export interface Comment {
  id: string;
  text: string;
  createdAt: number;
  isResolved?: boolean;
  parentCommentId?: string;
  replies?: Comment[];
}

export enum ActivityType {
  STATUS_CHANGE = 'statusChange',
  COMMENT_ADDED = 'commentAdded',
  COMMENT_RESOLVED = 'commentResolved',
  REPLY_ADDED = 'replyAdded',
  ATTACHMENT_ADDED = 'attachmentAdded',
  ATTACHMENT_DELETED = 'attachmentDeleted',
  TASK_CREATED = 'taskCreated',
  TASK_UPDATED = 'taskUpdated',
  DEADLINE_SET = 'deadlineSet',
  DEADLINE_CHANGED = 'deadlineChanged'
}

export interface ActivityLogEntry {
  id: string;
  timestamp: number;
  type: ActivityType;
  description: string;
  details?: Record<string, any>;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  urgency: Urgency;
  status: string; // Changed from enum to string (dynamic ID)
  clientId: string; 
  client: Client; 
  parentId?: string; 
  attachments: Attachment[];
  comments: Comment[];
  orderIndex: number;
  createdAt: number;
  printingType?: PrintingType;
  size?: string;
  isVip?: boolean;
  deadline?: number; // موعد التسليم (timestamp)
  activityLog?: ActivityLogEntry[]; // سجل النشاط
}

export interface CreateTaskDTO {
    title: string;
    description: string;
    urgency: Urgency;
    status: string;
    clientId: string;
    attachments: Attachment[];
    printingType?: PrintingType;
    size?: string;
    isVip?: boolean;
    deadline?: number;
}

export type CreateClientDTO = Omit<Client, 'id'>;

export enum WhatsAppType {
    MANAGEMENT = 'Management',
    PRINT_MANAGER = 'PrintManager',
    DESIGNER = 'Designer'
}

export interface WhatsAppNumber {
    id: string;
    name: string;
    type: WhatsAppType;
    number: string;
    apiKey: string;
    enabled: boolean;
    role?: 'admin' | 'designer' | 'print_manager'; // Role for smart notification filtering
    userId?: string; // User ID for action creator tracking
    preferences?: NotificationPreferences; // Custom notification preferences
}

export interface NotificationPreferences {
    NEW_PROJECT?: boolean;
    NEW_SUBTASK?: boolean;
    SUBTASK_UPDATE?: boolean;
    SUBTASK_SPECS_UPDATE?: boolean;
    STATUS_CHANGE?: boolean; // Legacy - kept for backward compatibility
    COMMENT_ADDED?: boolean;
    REPLY_ADDED?: boolean;
    COMMENT_RESOLVED?: boolean;
    ATTACHMENT_ADDED?: boolean;
    // Dynamic status-specific notifications
    [key: `STATUS_${string}`]: boolean | undefined;
}

export enum NotificationTemplateType {
  NEW_PROJECT = 'NEW_PROJECT',
  NEW_SUBTASK = 'NEW_SUBTASK',
  SUBTASK_UPDATE = 'SUBTASK_UPDATE',
  SUBTASK_SPECS_UPDATE = 'SUBTASK_SPECS_UPDATE',
  STATUS_CHANGE = 'STATUS_CHANGE',
  COMMENT_ADDED = 'COMMENT_ADDED',
  REPLY_ADDED = 'REPLY_ADDED',
  COMMENT_RESOLVED = 'COMMENT_RESOLVED',
  ATTACHMENT_ADDED = 'ATTACHMENT_ADDED'
}

export interface TemplateVariable {
  key: string;
  description: string;
  example: string;
  required: boolean;
}

export interface NotificationTemplate {
  id: NotificationTemplateType;
  name: string;
  description: string;
  defaultTemplate: string;
  customTemplate?: string;
  requiredVariables: string[];
  availableVariables: TemplateVariable[];
  category: 'task' | 'comment' | 'status';
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missingRequired: string[];
}

export interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
}

export interface ExportData {
  version: string;
  exportDate: string;
  templates: Record<NotificationTemplateType, string>;
}

export interface AppSettings {
  whatsappNumbers: WhatsAppNumber[];
  notificationsEnabled: boolean; // Deprecated global toggle, kept for interface compat
  notificationTemplates?: Record<NotificationTemplateType, string>; // Custom templates
}