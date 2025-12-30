import React, { useState, useEffect } from 'react';
import { Issue, ContributorStat, TeamHealthAnalysis, IssueStatus } from '../types';
import { analyzeTeamHealth } from '../services/geminiService';

interface Props {
  issues: Issue[];
  darkMode: boolean;
}

export const ContributorHealthPanel: React.FC<Props> = ({ issues, darkMode }) => {
  const [stats, setStats] = useState<ContributorStat[]>([]);
  const [analysis, setAnalysis] = useState<TeamHealthAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Calculate stats from issues
  useEffect(() => {
    const map = new Map<string, { open: number; resolved: number; totalDays: number }>();
    
    issues.forEach(i => {
      if (!i.assignee) return;
      if (!map.has(i.assignee)) {
        map.set(i.assignee, { open: 0, resolved: 0, totalDays: 0 });
      }
      const entry = map.get(i.assignee)!;
      
      if (i.status === IssueStatus.OPEN || i.status === IssueStatus.IN_PROGRESS) {
        entry.open++;
      } else if (i.status === IssueStatus.CLOSED && i.closedAt) {
        entry.resolved++;
        const days = (new Date(i.closedAt).getTime() - new Date(i.createdAt).getTime()) / (1000 * 3600 * 24);
        entry.totalDays += days;
      }
    });

    const calculatedStats: ContributorStat[] = Array.from(map.entries()).map(([name, data]) => {

      const loadFactor = Math.min(10, data.open) / 10;
      const loadRisk = loadFactor * 60;
      
      const velocityFactor = Math.min(20, data.resolved) / 20;
      const velocityRisk = velocityFactor * 40;

      const totalRisk = Math.min(100, loadRisk + velocityRisk);
      
      return {
        name,
        activeLoad: data.open,
        totalResolved: data.resolved,
        avgDays: data.resolved > 0 ? parseFloat((data.totalDays / data.resolved).toFixed(1)) : 0,
        riskScore: Math.round(totalRisk)
      };
    }).sort((a, b) => b.riskScore - a.riskScore); // Highest risk first

    setStats(calculatedStats);
  }, [issues]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    const totalOpen = issues.filter(i => i.status !== IssueStatus.CLOSED).length;
    const result = await analyzeTeamHealth(stats, totalOpen);
    setAnalysis(result);
    setAnalyzing(false);
  };

  if (stats.length === 0) return null;

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
       {/* Header */}
       <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <span className="text-xl">❤️</span> 贡献者健康度模型 (Contributor Health)
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              基于工作负荷与产出速度的倦怠风险分析
            </p>
          </div>
          <button 
            onClick={handleAnalyze}
            disabled={analyzing}
            className={`px-4 py-2 rounded-lg font-medium text-sm text-white shadow-sm transition-all flex items-center gap-2 ${analyzing ? 'bg-gray-400 cursor-not-allowed' : 'bg-pink-600 hover:bg-pink-700'}`}
          >
            {analyzing ? (
               <>
                 <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 AI 诊断中...
               </>
            ) : (
               <>✨ AI 深度诊断</>
            )}
          </button>
       </div>

       <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Metrics List */}
          <div>
             <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-4 tracking-wider flex items-center justify-between">
                <span>实时负荷监控</span>
                <span className="text-xs font-normal normal-case">Top 6 High Risk</span>
             </h4>
             <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {stats.slice(0, 6).map(dev => (
                  <div key={dev.name} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700 hover:border-pink-200 dark:hover:border-pink-900 transition-colors">
                     {/* Avatar / Initials */}
                     <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-200 font-bold text-xs shadow-sm border border-gray-100 dark:border-gray-500">
                        {dev.name.includes('_') ? dev.name.split('_')[1] : dev.name.substring(0,2).toUpperCase()}
                     </div>
                     
                     <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                           <span className="font-medium text-gray-700 dark:text-gray-200 truncate">{dev.name}</span>
                           <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                             dev.riskScore >= 70 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 
                             dev.riskScore >= 40 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' :
                             'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                           }`}>
                             Risk: {dev.riskScore}
                           </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 dark:text-gray-400 mb-2">
                           <span>当前积压: <strong className="text-gray-700 dark:text-gray-300">{dev.activeLoad}</strong></span>
                           <span>历史解决: <strong className="text-gray-700 dark:text-gray-300">{dev.totalResolved}</strong></span>
                        </div>
                        {/* Risk Bar */}
                        <div className="w-full bg-gray-200 dark:bg-gray-600 h-1.5 rounded-full overflow-hidden">
                           <div 
                             className={`h-full rounded-full transition-all duration-500 ${dev.riskScore >= 70 ? 'bg-red-500' : dev.riskScore >= 40 ? 'bg-yellow-500' : 'bg-green-500'}`} 
                             style={{ width: `${dev.riskScore}%` }}
                           ></div>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </div>

          {/* Right: AI Analysis Panel */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col relative overflow-hidden">
             {analysis ? (
               <div className="space-y-6 animate-fadeIn z-10">
                  <div>
                    <h5 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
                       <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                       团队概况
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-white dark:bg-slate-800 p-3 rounded border border-slate-100 dark:border-slate-700">
                      {analysis.overview}
                    </p>
                  </div>

                  {analysis.highRiskDevs.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-800/30">
                       <h5 className="font-bold text-red-700 dark:text-red-400 text-sm uppercase mb-2 flex items-center gap-2">
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                         高风险关注名单
                       </h5>
                       <div className="flex flex-wrap gap-2">
                          {analysis.highRiskDevs.map(dev => (
                             <span key={dev} className="px-2 py-1 bg-white dark:bg-red-900/50 rounded text-xs font-mono text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800 font-semibold">
                               {dev}
                             </span>
                          ))}
                       </div>
                    </div>
                  )}

                  <div>
                    <h5 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
                       <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                       人员调配建议
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-white dark:bg-slate-800 p-3 rounded border border-slate-100 dark:border-slate-700">
                      {analysis.reallocationAdvice}
                    </p>
                  </div>
               </div>
             ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 text-center z-10">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                     <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                  </div>
                  <p className="font-medium text-slate-500 dark:text-slate-400">准备就绪</p>
                  <p className="text-xs mt-1 max-w-[200px]">点击 "AI 深度诊断" 以识别团队中的单点依赖和潜在倦怠风险。</p>
               </div>
             )}
             {/* Decorative Background */}
             <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-pink-100 dark:bg-pink-900/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
             <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-100 dark:bg-blue-900/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
          </div>
       </div>
    </div>
  );
};