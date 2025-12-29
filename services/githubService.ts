
import { Issue, IssueStatus, IssuePriority, ProjectData, LabelStat, MonthlyStat, CategoryStat } from '../types';

// Helper to determine priority based on labels
const determinePriority = (labels: any[]): IssuePriority => {
  const labelNames = labels.map(l => l.name.toLowerCase());
  
  if (labelNames.some(n => n.includes('critical') || n.includes('p0') || n.includes('urgent'))) {
    return IssuePriority.CRITICAL;
  }
  if (labelNames.some(n => n.includes('high') || n.includes('p1'))) {
    return IssuePriority.HIGH;
  }
  if (labelNames.some(n => n.includes('medium') || n.includes('p2'))) {
    return IssuePriority.MEDIUM;
  }
  return IssuePriority.LOW;
};

// Helper to determine category based on labels
const determineCategory = (labels: any[]): string => {
  const labelNames = labels.map(l => l.name.toLowerCase());
  
  if (labelNames.some(n => n.includes('bug') || n.includes('fix') || n.includes('error'))) return 'Bug';
  if (labelNames.some(n => n.includes('feat') || n.includes('enhancement'))) return 'Feature';
  if (labelNames.some(n => n.includes('doc'))) return 'Documentation';
  if (labelNames.some(n => n.includes('perf'))) return 'Performance';
  if (labelNames.some(n => n.includes('refactor'))) return 'Refactor';
  
  return 'Other';
};

export const fetchRealGithubData = async (repoName: string, token?: string): Promise<ProjectData | null> => {
  try {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
    };

    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    // Fetch issues (pagination loop - fetch up to 300 to avoid rate limits/performance issues in browser)
    let allIssues: any[] = [];
    let page = 1;
    const perPage = 100;
    const maxPages = 3; 

    while (page <= maxPages) {
      const response = await fetch(`https://api.github.com/repos/${repoName}/issues?state=all&per_page=${perPage}&page=${page}`, { headers });
      
      if (!response.ok) {
        if (response.status === 404) throw new Error("Repo not found");
        if (response.status === 403) throw new Error("API Rate Limit Exceeded. Please provide a Token.");
        throw new Error("GitHub API Error");
      }

      const data = await response.json();
      if (data.length === 0) break;
      
      allIssues = [...allIssues, ...data];
      page++;
    }

    // Transform Data
    const mappedIssues: Issue[] = allIssues
      .filter(item => !item.pull_request) // Exclude PRs, keep only Issues
      .map(item => {
        const labels = item.labels || [];
        const labelNames = labels.map((l: any) => l.name);
        
        return {
          id: item.number,
          title: item.title,
          status: item.state === 'open' ? IssueStatus.OPEN : IssueStatus.CLOSED,
          priority: determinePriority(labels),
          category: determineCategory(labels),
          labels: labelNames,
          createdAt: item.created_at,
          closedAt: item.closed_at || undefined,
          assignee: item.assignee ? item.assignee.login : undefined,
          url: item.html_url
        };
      });

    // --- Statistics Calculation (Reused logic) ---
    const total = mappedIssues.length;
    const open = mappedIssues.filter(i => i.status === IssueStatus.OPEN).length;
    const closed = mappedIssues.filter(i => i.status === IssueStatus.CLOSED).length;

    // Avg Resolution Time
    let totalResolutionTime = 0;
    let closedCount = 0;
    const labelMap: Record<string, { count: number, totalDays: number, closedCount: number }> = {};
    const monthlyData: Record<number, { created: number, resolved: number }> = {};
    // Initialize months 0-11
    for(let i=0; i<12; i++) monthlyData[i] = { created: 0, resolved: 0 };

    mappedIssues.forEach(i => {
      // Monthly Trend
      const cDate = new Date(i.createdAt);
      if (!isNaN(cDate.getTime())) {
          monthlyData[cDate.getMonth()].created++;
      }
      
      if (i.status === IssueStatus.CLOSED && i.closedAt) {
        const start = new Date(i.createdAt).getTime();
        const end = new Date(i.closedAt).getTime();
        const diff = end - start;
        totalResolutionTime += diff;
        closedCount++;
        monthlyData[new Date(i.closedAt).getMonth()].resolved++;
      }

      // Label Stats
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
    });

    const avgResolutionDays = closedCount > 0 ? Math.round((totalResolutionTime / closedCount) / (1000 * 60 * 60 * 24)) : 0;

    // Format Monthly Trends
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTrends: MonthlyStat[] = months.map((m, idx) => ({
        name: m,
        created: monthlyData[idx].created,
        resolved: monthlyData[idx].resolved
    }));

    // Format Category Distribution
    const catMap: Record<string, number> = {};
    mappedIssues.forEach(i => {
      catMap[i.category] = (catMap[i.category] || 0) + 1;
    });
    const categoryDistribution: CategoryStat[] = Object.keys(catMap).map(key => ({ name: key, value: catMap[key] }));

    // Format Label Stats
    const labelStats: LabelStat[] = Object.keys(labelMap).map(name => {
      const d = labelMap[name];
      return {
        name,
        count: d.count,
        avgResolutionDays: d.closedCount > 0 ? parseFloat((d.totalDays / d.closedCount).toFixed(1)) : 0
      };
    }).sort((a, b) => b.count - a.count);

    return {
      repoName,
      issues: mappedIssues.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
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

  } catch (error) {
    console.error("Failed to fetch GitHub data", error);
    throw error;
  }
};
