
import { MonthlyStat, ForecastPoint, SimulationConfig } from '../types';

// Simple Linear Regression to find the trend line (y = mx + b)
// Returns slope (m) and intercept (b)
const calculateRegression = (values: number[]) => {
  const n = values.length;
  if (n === 0) return { m: 0, b: 0 };

  const xSum = values.reduce((acc, _, i) => acc + i, 0);
  const ySum = values.reduce((acc, val) => acc + val, 0);
  
  const xxSum = values.reduce((acc, _, i) => acc + (i * i), 0);
  const xySum = values.reduce((acc, val, i) => acc + (i * val), 0);

  const m = (n * xySum - xSum * ySum) / (n * xxSum - xSum * xSum);
  const b = (ySum - m * xSum) / n;

  return { m, b };
};

export const generateForecast = (
  history: MonthlyStat[], 
  config: SimulationConfig
): ForecastPoint[] => {
  // 1. Calculate the 'Net Growth' (Created - Resolved) for each historical month
  let currentBacklog = 0;
  const backlogHistory: number[] = history.map(h => {
    const net = h.created - h.resolved;
    currentBacklog += net;
    return Math.max(0, currentBacklog);
  });

  // 2. Prepare Chart Data for History
  const chartData: ForecastPoint[] = history.map((h, i) => ({
    name: h.name,
    historicalOpen: backlogHistory[i],
    projectedOpen: undefined
  }));

  // 3. Calculate separate trends for Creation and Resolution
  const createdValues = history.map(h => h.created);
  const resolvedValues = history.map(h => h.resolved);

  const createdTrend = calculateRegression(createdValues);
  const resolvedTrend = calculateRegression(resolvedValues);

  // 4. Project 3 months into the future
  const lastMonthIndex = history.length - 1;
  const nextMonths = ['Next M1', 'Next M2', 'Next M3'];
  
  // Start projection from the last actual backlog point
  let projectedBacklog = backlogHistory[backlogHistory.length - 1];

  // --- EFFECTIVE CAPACITY MODEL ---
  // Baseline assumptions for the historical data:
  const BASELINE_MEETING_HOURS = 6; // Avg dev spends 6h in meetings
  const BASELINE_REVIEW_HOURS = 24; // Avg PR takes 24h to merge
  
  // A. Meeting Impact (Capacity Modifier)
  // If user sets 2h meetings: (40 - 2) / (40 - 6) = 38/34 = 1.11x capacity boost
  // If user sets 15h meetings: (40 - 15) / (40 - 6) = 25/34 = 0.73x capacity drag
  const workHoursAvailable = Math.max(10, 40 - config.weeklyMeetingHours); // Min 10h work
  const baselineWorkHours = 40 - BASELINE_MEETING_HOURS;
  const meetingFactor = workHoursAvailable / baselineWorkHours;

  // B. Code Review Impact (Velocity Modifier)
  // We use a decay function. Faster reviews improve velocity, but not infinitely.
  // 48h review vs 24h baseline -> slower. 
  // 4h review vs 24h baseline -> faster.
  // Formula: 1 + (Baseline - Actual) * Sensitivity
  const reviewDiff = BASELINE_REVIEW_HOURS - config.codeReviewAvgHours;
  // Sensitivity: Every 10 hours saved adds ~5% efficiency
  const reviewFactor = 1 + (reviewDiff * 0.005);

  // C. Developer Count Impact
  // Heuristic: +1 dev adds ~15% output (diminishing returns), -1 dev removes ~18% output (loss of context)
  const devChange = config.developerCountChange;
  const devFactor = devChange >= 0 
    ? 1 + (devChange * 0.15) 
    : Math.max(0.1, 1 + (devChange * 0.18)); 

  // Combined Efficiency Multiplier
  const totalEfficiencyMultiplier = meetingFactor * reviewFactor * devFactor;

  nextMonths.forEach((monthName, i) => {
    const futureIndex = lastMonthIndex + 1 + i;
    
    // Predicted Creation (Incoming)
    let predictedCreated = (createdTrend.m * futureIndex + createdTrend.b);
    predictedCreated = predictedCreated * config.incomingIssueRate;

    // Predicted Resolution (Throughput)
    let predictedResolved = (resolvedTrend.m * futureIndex + resolvedTrend.b);
    
    // Apply the sophisticated efficiency model
    predictedResolved = predictedResolved * totalEfficiencyMultiplier;

    // Ensure non-negative
    predictedCreated = Math.max(0, predictedCreated);
    predictedResolved = Math.max(0, predictedResolved);

    // Update backlog
    const netChange = predictedCreated - predictedResolved;
    projectedBacklog += netChange;
    projectedBacklog = Math.max(0, projectedBacklog); // Backlog can't be negative

    chartData.push({
      name: monthName,
      historicalOpen: undefined,
      projectedOpen: Math.round(projectedBacklog)
    });
  });

  return chartData;
};
