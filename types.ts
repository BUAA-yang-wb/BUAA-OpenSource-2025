
export enum IssueStatus {
  OPEN = 'Open',
  CLOSED = 'Closed',
  IN_PROGRESS = 'In Progress'
}

export enum IssuePriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

export interface Issue {
  id: number;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  category: string;
  labels: string[]; // Added for tag analysis
  createdAt: string; // ISO Date
  closedAt?: string; // ISO Date
  assignee?: string;
  url?: string; // Added for external link
}

export interface MonthlyStat {
  name: string; // Month e.g. 'Jan'
  created: number;
  resolved: number;
}

export interface CategoryStat {
  name: string;
  value: number;
}

export interface LabelStat {
  name: string;
  count: number;
  avgResolutionDays: number;
}

export interface ProjectData {
  repoName: string;
  issues: Issue[];
  stats: {
    total: number;
    open: number;
    closed: number;
    avgResolutionDays: number;
    monthlyTrends: MonthlyStat[];
    categoryDistribution: CategoryStat[];
    labelStats: LabelStat[]; // Added for impact matrix
  }
}

export interface AIPrediction {
  riskLevel: 'Low' | 'Medium' | 'High';
  summary: string;
  predictedHotspots: string[];
  recommendations: string[];
  timestamp: number;
}

// New types for Simulation
export interface SimulationConfig {
  developerCountChange: number; // e.g., +2 or -1
  incomingIssueRate: number; // Percentage change, e.g., 1.2 for 20% increase
  weeklyMeetingHours: number; // New: Hours spent in meetings per week (Impacts capacity)
  codeReviewAvgHours: number; // New: Hours to merge a PR (Impacts velocity)
}

export interface SimulationResult {
  config: SimulationConfig;
  analysis: string;
  actionableSteps: string[];
  survivalProbability: number; // 0-100
}

export interface ForecastPoint {
  name: string;
  historicalOpen?: number;
  projectedOpen?: number; // The predicted accumulation of open issues
}

// New Type for Drill-down Analysis
export interface LabelAnalysisResult {
  labelName: string;
  rootCause: string;
  suggestedSolution: string;
  complexityScore: number; // 1-10
}

export interface ContributorStat {
  name: string;
  activeLoad: number; // Number of open issues assigned
  totalResolved: number;
  avgDays: number;
  riskScore: number; // 0-100 calculated by heuristic
}

export interface TeamHealthAnalysis {
  overview: string;
  highRiskDevs: string[];
  reallocationAdvice: string;
}
