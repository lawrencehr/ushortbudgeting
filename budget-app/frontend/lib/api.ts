export interface FringeSettings {
  superannuation: number;
  holiday_pay: number;
  payroll_tax: number;
  workers_comp: number;
  contingency: number;
}

export interface LaborAllowance {
  name: string;
  amount: number;
  frequency: 'day' | 'week';
}

export interface ShiftInput {
  hours: number;
  type: string; // "Standard", "Saturday", "Sunday", "PublicHoliday"
  count: number;
}

export interface FringeBreakdown {
  super: number;
  payroll_tax: number;
  workers_comp: number;
  holiday_pay: number;
  total_fringes: number;
}

export interface BudgetLineItem {
  id: string;
  code?: string;
  description: string;
  rate: number;
  unit: string;
  prep_qty: number;
  shoot_qty: number;
  post_qty: number;
  total: number;
  is_labor: boolean;
  apply_fringes: boolean;
  grouping_id: string;
  notes?: string;

  // Enhanced Labor Fields
  base_hourly_rate: number;
  daily_hours: number;
  days_per_week: number;
  is_casual: boolean;
  crew_member_id?: string;
  allowances?: LaborAllowance[];
  ot_threshold_15?: number;
  ot_threshold_20?: number;
  labor_phases_json?: string; // JSON of active phases ["prep", "shoot"]
  fringes_json?: string; // Stores FringeBreakdown
  breakdown_json?: string; // Stores Breakdown Detail
  shifts_json?: string; // Stores ShiftInput[]

  // Labor V2 Fields
  calendar_mode?: 'inherit' | 'custom';
  phase_details?: Record<string, any>; // JSON structure for overrides
  award_classification_id?: string;
  role_history_id?: string;
}

export interface BudgetGrouping {
  id: string;
  code: string;
  name: string;
  items: BudgetLineItem[];
  sub_total: number;
  calendar_overrides?: Record<string, any>;
}

export interface BudgetCategory {
  id: string;
  code: string;
  name: string;
  groupings: BudgetGrouping[];
  total: number;
}

export interface BudgetSummary {
  atl_total: number;
  btl_total: number;
  fringes_total: number;
  contingency_total: number;
  grand_total: number;
  fringe_breakdown: Record<string, number>;
}
// ...
export interface DepartmentBreakdown {
  id?: string;
  name: string;
  total: number;
  percentage: number;
}

export interface PhaseBreakdown {
  name: string;
  total: number;
  percentage: number;
}

export interface ProjectSummaryResponse {
  total_cost: number;
  department_breakdown: DepartmentBreakdown[];
  phase_breakdown: PhaseBreakdown[];
}

export interface CatalogItem {
  description: string;
  default_rate: number;
  default_category_id: string;
  default_category_name: string;
  is_labor: boolean;
}

export interface AwardRate {
  award: string;
  type: string;
  level: string;
  base_rate: number;
}

export interface Project {
  id: string;
  name: string;
  client?: string;
  start_date?: string;
  end_date?: string;
}

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  base_rate: number;
  overtime_rule_set?: string;
  default_allowances: LaborAllowance[];
}

export interface ProjectPhase {
  id: string;
  project_id: string;
  name: string;
  type: string;
  start_date: string;
  end_date: string;
}

export interface BudgetTemplate {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  item_count: number;
  category_count: number;
}

// --- Requests ---
export interface LaborCostRequest {
  line_item_id?: string;
  base_hourly_rate: number;
  is_casual: boolean;
  is_artist: boolean;
  calendar_mode: 'inherit' | 'custom';
  phase_details?: Record<string, any>;
  grouping_id?: string;
  project_id: string;
  award_classification_id?: string;
}

export interface LaborCostResponse {
  total_cost: number;
  breakdown: Record<string, any>;
  fringes: FringeBreakdown;
}


// --- API Functions ---

const API_URL = '/api';

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_URL}/projects`);
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

export async function fetchAwardRates(): Promise<AwardRate[]> {
  const res = await fetch(`${API_URL}/award-rates`);
  if (!res.ok) throw new Error('Failed to fetch award rates');
  return res.json();
}

export async function fetchBudget(projectId?: string): Promise<BudgetCategory[]> {
  const url = projectId ? `${API_URL}/projects/${projectId}/budget` : `${API_URL}/budget`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch budget');
  return res.json();
}

export async function fetchProjectPhases(projectId: string): Promise<ProjectPhase[]> {
  const res = await fetch(`${API_URL}/projects/${projectId}/phases`);
  if (!res.ok) throw new Error('Failed to fetch phases');
  return res.json();
}

export async function addProjectPhase(projectId: string, phase: Omit<ProjectPhase, 'id' | 'project_id'>): Promise<ProjectPhase> {
  const res = await fetch(`${API_URL}/projects/${projectId}/phases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(phase),
  });
  if (!res.ok) throw new Error('Failed to add phase');
  return res.json();
}

export async function deleteProjectPhase(phaseId: string): Promise<void> {
  const res = await fetch(`${API_URL}/projects/phases/${phaseId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete phase');
}

export async function fetchSummary(): Promise<BudgetSummary> {
  const res = await fetch(`${API_URL}/summary`);
  if (!res.ok) throw new Error('Failed to fetch summary');
  return res.json();
}

export async function fetchProjectSummary(projectId: string): Promise<ProjectSummaryResponse> {
  const res = await fetch(`${API_URL}/projects/${projectId}/summary`);
  if (!res.ok) throw new Error('Failed to fetch project summary');
  return res.json();
}

export async function fetchSettings(): Promise<FringeSettings> {
  const res = await fetch(`${API_URL}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(settings: FringeSettings): Promise<FringeSettings> {
  const res = await fetch(`${API_URL}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}

export async function fetchCatalog(): Promise<CatalogItem[]> {
  const res = await fetch(`${API_URL}/catalog`);
  if (!res.ok) throw new Error('Failed to fetch catalog');
  return res.json();
}

export async function addBudgetLineItem(
  groupingId: string,
  itemData: Partial<BudgetLineItem>
): Promise<any> {
  const res = await fetch(`${API_URL}/budget/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...itemData,
      grouping_id: groupingId,
      // Default fallbacks if missing
      rate: itemData.rate || 0,
      description: itemData.description || '',
      is_labor: itemData.is_labor || false,
      quantity: (itemData.prep_qty || 0) + (itemData.shoot_qty || 0) + (itemData.post_qty || 0),
      total: itemData.total || 0
    }),
  });
  if (!res.ok) throw new Error('Failed to add item');
  return res.json();
}

export async function deleteBudgetLineItem(itemId: string): Promise<any> {
  const res = await fetch(`${API_URL}/budget/items/${itemId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete item');
  return res.json();
}

interface BudgetGroupingUpdate {
  name?: string;
  calendar_overrides?: Record<string, any>;
}

export async function updateBudgetGrouping(groupingId: string, updates: BudgetGroupingUpdate): Promise<BudgetGrouping> {
  const res = await fetch(`${API_URL}/budget/groupings/${groupingId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update grouping');
  return res.json();
}

// --- New Calculation API ---
export async function calculateLaborCost(req: LaborCostRequest): Promise<LaborCostResponse> {
  const res = await fetch(`${API_URL}/calculate-labor-cost`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error('Failed to calculate labor');
  return res.json();
}


/**
 * @deprecated Use calculateLaborCost instead
 */
export async function calculateLaborRate(
  base_hourly_rate: number,
  daily_hours: number,
  days_per_week: number,
  is_casual: boolean,
  ot_threshold_15?: number,
  ot_threshold_20?: number,
  allowances?: LaborAllowance[],
  shifts?: ShiftInput[]
): Promise<{ weekly_rate: number; fringes: FringeBreakdown }> {
  const res = await fetch(`${API_URL}/calculate-labor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base_hourly_rate,
      daily_hours,
      days_per_week,
      is_casual,
      ot_threshold_15: ot_threshold_15 ?? 8,
      ot_threshold_20: ot_threshold_20 ?? 10,
      allowances: allowances ?? [],
      shifts: shifts ?? []
    }),
  });
  if (!res.ok) throw new Error('Failed to calculate labor');
  return res.json();
}

export async function fetchCrew(): Promise<CrewMember[]> {
  const res = await fetch(`${API_URL}/crew`);
  if (!res.ok) throw new Error('Failed to fetch crew');
  return res.json();
}

export async function addCrewMember(crew: Omit<CrewMember, 'id'>): Promise<CrewMember> {
  const res = await fetch(`${API_URL}/crew`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...crew, id: '' }),
  });
  if (!res.ok) throw new Error('Failed to add crew member');
  return res.json();
}

export async function updateCrewMember(id: string, crew: CrewMember): Promise<CrewMember> {
  const res = await fetch(`${API_URL}/crew/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(crew),
  });
  if (!res.ok) throw new Error('Failed to update crew member');
  return res.json();
}

export async function deleteCrewMember(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/crew/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete crew member');
}

export async function fetchTemplates(): Promise<BudgetTemplate[]> {
  const res = await fetch(`${API_URL}/templates`);
  if (!res.ok) throw new Error('Failed to fetch templates');
  return res.json();
}

export async function createTemplate(data: { name: string; description?: string; budget_id: string; reset_quantities: boolean }): Promise<BudgetTemplate> {
  const res = await fetch(`${API_URL}/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create template');
  return res.json();
}

export async function deleteTemplate(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/templates/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete template');
}

export interface BudgetSaveRequest {
  categories: BudgetCategory[];
  deleted_item_ids: string[];
  deleted_grouping_ids: string[];
  deleted_category_ids: string[];
}

export async function saveBudget(req: BudgetSaveRequest): Promise<void> {
  const res = await fetch(`${API_URL}/budget`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error('Failed to save budget');
}

export async function createProject(data: { name: string, client: string, template_id?: string }): Promise<Project> {
  const res = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create project');
  return res.json();
}

export async function initializeBudget(data: { name: string; project_id?: string; template_id?: string; reset_quantities: boolean }): Promise<{ budget_id: string; project_id: string }> {
  const res = await fetch(`${API_URL}/budget/initialize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to initialize budget');
  return res.json();
}