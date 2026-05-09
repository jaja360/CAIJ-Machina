// ── Core enums ──────────────────────────────────────────────────────────────
export type Language = 'en' | 'fr';
export type Domain   = 'agri' | 'pest' | 'sante' | 'env' | 'comm';
export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type ChipVariant = 'critical' | 'high' | 'success' | 'info' | 'pest' | 'sante' | 'agri' | 'neutral';

// ── User ────────────────────────────────────────────────────────────────────
export interface AppUser {
  name: string;
  initials: string;
  role: string;
  firstName: string;
}

// ── Alerts ──────────────────────────────────────────────────────────────────
export interface ModificationContract {
  name: string;
  urgent: boolean;
}

export interface Modification {
  impact: 'high' | 'medium';
  title: string;
  subtitle: string;
  before: string;
  after: string;
  contractsCount: number;
  contracts: ModificationContract[];
}

export interface AlertItem {
  id: string;
  severity: Severity;
  domain: Domain;
  domainLabel: string;
  title: string;
  source: string;
  sourceFull?: string;
  clients: number;
  contracts: number;
  time: string;
  deadline: string;
  modCount: number;
  modifications?: Modification[];
}

// ── Contracts ────────────────────────────────────────────────────────────────
export interface ContractClause {
  id: string;
  urgent: boolean;
  title: string;
  current: string;
  problem: string;
  next: string;
  addition?: string;
}

export interface ContractAction {
  n: number;
  t: string;
  d: string;
}

export interface Contract {
  id: string;
  title: string;
  client: string;
  email: string;
  signedOn: string;
  deadline: string;
  domain: Domain;
  clausesToModify: number;
  clauses: ContractClause[];
  actions: ContractAction[];
  note: string;
}

// ── Email ────────────────────────────────────────────────────────────────────
export interface DraftEmail {
  to: string;
  cc: string;
  subject: string;
  body: string;
}

// ── Settings ─────────────────────────────────────────────────────────────────
export interface DomainConfig {
  id: string;
  name: string;
  sub: string;
  dotCls: string;
  on: boolean;
}

export interface WatchSource {
  name: string;
  url: string;
  on: boolean;
  icon: string;
}

export interface Client {
  code: string;
  name: string;
  detail: string;
  count: number;
  color: string;
}

// ── Agent panel ──────────────────────────────────────────────────────────────
export interface AgentResult {
  chip: string;
  chipVariant: ChipVariant;
  name: string;
  sub: string;
}

export interface AgentSuggestion {
  label: string;
  icon: string;
  target?: string;
  onClick?: () => void;
}

export interface QuickAction {
  label: string;
  icon: string;
  onClick?: () => void;
}

export interface AgentMessage {
  role: 'agent' | 'user';
  time: string;
  // HTML allowed in agent messages (controlled data only — sanitize before accepting user content)
  content: string;
  results?: AgentResult[];
  suggestion?: AgentSuggestion;
}

export interface AgentTranscript {
  status: string;
  messages: AgentMessage[];
  quickActions?: QuickAction[];
  /** When true the agent panel shows no transcript for this route */
  hidden?: boolean;
}

// ── Legacy API types (from original scaffold) ────────────────────────────────
export type UrgencyLevel     = Severity;
export type UpdateCategory   = 'legislation' | 'regulation' | 'compliance' | 'platform' | 'jurisprudence';

export interface LegalUpdate {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  category: UpdateCategory;
  urgency: UrgencyLevel;
  affectedSectors: string[];
  publishedAt: string;
  detectedAt: string;
  jurisdiction?: string;
  keyChanges: string[];
}

export interface MonitoredSource {
  id: string;
  name: string;
  url: string;
  category: UpdateCategory;
  isActive: boolean;
  lastCheckedAt: string;
}

export interface FilterOptions {
  categories: UpdateCategory[];
  urgency: UrgencyLevel[];
  sources: string[];
  dateFrom?: string;
  dateTo?: string;
}

export interface ApiResponse<T> {
  data: T;
  total: number;
  page: number;
  pageSize: number;
}
