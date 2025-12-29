
import { Issue, IssueStatus, IssuePriority, ProjectData, LabelStat } from '../types';

// Helper to generate random dates within last 12 months
const randomDate = (start: Date, end: Date) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

export const generateMockData = (repoName: string): ProjectData => {
  const categories = ['Bug', 'Feature', 'Documentation', 'Performance', 'Refactor'];
  const priorities = [IssuePriority.LOW, IssuePriority.MEDIUM, IssuePriority.HIGH, IssuePriority.CRITICAL];
  const statuses = [IssueStatus.OPEN, IssueStatus.CLOSED, IssueStatus.IN_PROGRESS];
  
  // Tag pool with associated "difficulty" weights (1.0 = normal, 2.0 = takes twice as long)
  const tagPool = [
    { name: 'UI', weight: 0.5 },
    { name: 'Backend', weight: 1.5 },
    { name: 'Database', weight: 2.0 }, // Harder to fix
    { name: 'API', weight: 1.2 },
    { name: 'Auth', weight: 1.8 },
    { name: 'Accessibility', weight: 0.8 },
    { name: 'Tests', weight: 1.0 },
    { name: 'DevOps', weight: 1.6 },
    { name: 'Legacy-Code', weight: 2.5 } // Very hard to fix
  ];

  const issues: Issue[] = [];
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  // Generate 150 random issues
  for (let i = 1; i <= 150; i++) {
    const created = randomDate(oneYearAgo, now);
    const isClosed = Math.random() > 0.4; // 60% closed chance
    const status = isClosed ? IssueStatus.CLOSED : (Math.random() > 0.7 ? IssueStatus.IN_PROGRESS : IssueStatus.OPEN);
    
    // Assign 1-3 random labels
    const numLabels = Math.floor(Math.random() * 3) + 1;
    const issueLabels: string[] = [];
    let maxWeight = 1.0;
    
    for (let k = 0; k < numLabels; k++) {
      const tag = tagPool[Math.floor(Math.random() * tagPool.length)];
      if (!issueLabels.includes(tag.name)) {
        issueLabels.push(tag.name);
        // Track the max weight to influence resolution time
        if (tag.weight > maxWeight) maxWeight = tag.weight;
      }
    }

    let closedAt = undefined;
    if (status === IssueStatus.CLOSED) {
      // Simulate resolution time based on complexity (weight)
      const baseDays = Math.random() * 20; // 0-20 days base
      const weightedDays = baseDays * maxWeight;
      // Add randomness
      const finalDays = Math.max(0.5, weightedDays + (Math.random() * 5 - 2.5));
      
      const closeDate = new Date(created.getTime() + finalDays * 24 * 60 * 60 * 1000);
      // Ensure we don't go into the future
      closedAt = closeDate > now ? now.toISOString() : closeDate.toISOString();
    }

    issues.push({
      id: i,
      title: `${categories[Math.floor(Math.random() * categories.length)]}: Issue description sample #${i}`,
      status: status,
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      category: categories[Math.floor(Math.random() * categories.length)],
      labels: issueLabels,
      createdAt: created.toISOString(),
      closedAt: closedAt,
      assignee: Math.random() > 0.5 ? `dev_${Math.floor(Math.random() * 10)}` : undefined,
      url: `https://github.com/${repoName}/issues/${i}`
    });
  }

  // Calculate Stats
  const total = issues.length;
  const open = issues.filter(i => i.status === IssueStatus.OPEN || i.status === IssueStatus.IN_PROGRESS).length;
  const closed = issues.filter(i => i.status === IssueStatus.CLOSED).length;

  // Calculate Avg Resolution Time & Label Stats
  let totalResolutionTime = 0;
  let closedCount = 0;
  
  const labelMap: Record<string, { count: number, totalDays: number, closedCount: number }> = {};

  issues.forEach(i => {
    // Label stats accumulation
    i.labels.forEach(label => {
      if (!labelMap[label]) labelMap[label] = { count: 0, totalDays: 0, closedCount: 0 };
      labelMap[label].count++;
      
      if (i.status === IssueStatus.CLOSED && i.closedAt) {
        const start = new Date(i.createdAt).getTime();
        const end = new Date(i.closedAt).getTime();
        const days = (end - start) / (1000 * 60 * 60 * 24);
        
        labelMap[label].totalDays += days;
        labelMap[label].closedCount++;
      }
    });

    // Global resolution time
    if (i.status === IssueStatus.CLOSED && i.closedAt) {
      const start = new Date(i.createdAt).getTime();
      const end = new Date(i.closedAt).getTime();
      totalResolutionTime += (end - start);
      closedCount++;
    }
  });

  const avgResolutionDays = closedCount > 0 ? Math.round((totalResolutionTime / closedCount) / (1000 * 60 * 60 * 24)) : 0;

  // Finalize Label Stats Array
  const labelStats: LabelStat[] = Object.keys(labelMap).map(name => {
    const d = labelMap[name];
    return {
      name,
      count: d.count,
      avgResolutionDays: d.closedCount > 0 ? parseFloat((d.totalDays / d.closedCount).toFixed(1)) : 0
    };
  }).sort((a, b) => b.count - a.count); // Most frequent first

  // Monthly Trends
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyTrends = months.map(m => ({ name: m, created: 0, resolved: 0 }));
  
  issues.forEach(i => {
    const cDate = new Date(i.createdAt);
    const cMonth = cDate.getMonth(); // 0-11
    monthlyTrends[cMonth].created++;
    
    if (i.status === IssueStatus.CLOSED && i.closedAt) {
      const rDate = new Date(i.closedAt);
      const rMonth = rDate.getMonth();
      monthlyTrends[rMonth].resolved++;
    }
  });

  // Category Distribution
  const catMap: Record<string, number> = {};
  issues.forEach(i => {
    catMap[i.category] = (catMap[i.category] || 0) + 1;
  });
  const categoryDistribution = Object.keys(catMap).map(key => ({ name: key, value: catMap[key] }));

  return {
    repoName,
    issues: issues.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), // Newest first
    stats: {
      total,
      open,
      closed,
      avgResolutionDays,
      monthlyTrends,
      categoryDistribution,
      labelStats
    }
  };
};