
import React, { useState, useEffect } from 'react';
import { AIPrediction, ProjectData, SimulationConfig, SimulationResult, ForecastPoint } from '../types';
import { analyzeProjectRisks, analyzeSimulation } from '../services/geminiService';
import { generateForecast } from '../services/analysisUtils';
import { SimulationChart } from './Charts';

interface PredictionPanelProps {
  projectData: ProjectData;
  darkMode: boolean;
}

export const PredictionPanel: React.FC<PredictionPanelProps> = ({ projectData, darkMode }) => {
  const [activeTab, setActiveTab] = useState<'analysis' | 'simulation'>('analysis');
  
  // Analysis State
  const [prediction, setPrediction] = useState<AIPrediction | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Simulation State
  const [simConfig, setSimConfig] = useState<SimulationConfig>({
    developerCountChange: 0,
    incomingIssueRate: 1.0,
    weeklyMeetingHours: 6, // Default baseline
    codeReviewAvgHours: 24, // Default baseline
  });
  const [forecastData, setForecastData] = useState<ForecastPoint[]>([]);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Calculate math forecast whenever config or data changes
  useEffect(() => {
    const data = generateForecast(projectData.stats.monthlyTrends, simConfig);
    setForecastData(data);
  }, [simConfig, projectData]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    const result = await analyzeProjectRisks(projectData);
    setPrediction(result);
    setAnalyzing(false);
  };

  const handleRunSimulation = async () => {
    setSimulating(true);
    // Find the last projected value
    const lastPoint = forecastData[forecastData.length - 1];
    const finalBacklog = lastPoint.projectedOpen || 0;
    
    const result = await analyzeSimulation(projectData, simConfig, finalBacklog);
    setSimResult(result);
    setSimulating(false);
  };

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
      {/* Header Tabs */}
      <div className="flex border-b border-gray-100 dark:border-gray-700">
        <button 
          onClick={() => setActiveTab('analysis')}
          className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'analysis' ? 'bg-slate-800 dark:bg-slate-700 text-white' : 'bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          智能风险诊断
        </button>
        <button 
          onClick={() => setActiveTab('simulation')}
          className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'simulation' ? 'bg-blue-600 text-white' : 'bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
          推演沙箱 (Simulation Lab)
        </button>
      </div>

      {/* Tab Content: Analysis */}
      {activeTab === 'analysis' && (
        <div className="p-6 min-h-[400px]">
          {!prediction && !analyzing ? (
             <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4 py-12">
               <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-full">
                 <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
               </div>
               <p>点击下方按钮，让 AI 分析当前项目的潜在风险。</p>
               <button onClick={handleAnalyze} className="bg-gray-900 dark:bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-black dark:hover:bg-gray-600 transition-colors">
                 开始智能诊断
               </button>
             </div>
          ) : analyzing ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4 py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
              <p className="text-gray-500 animate-pulse">Gemini 正在分析 Issue 模式...</p>
            </div>
          ) : prediction && (
            <div className="animate-fadeIn space-y-6">
               <div className="flex items-center gap-4">
                 <div className={`px-4 py-1 rounded-full text-sm font-bold border ${prediction.riskLevel === 'High' ? 'bg-red-100 text-red-700 border-red-200' : prediction.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                   风险等级: {prediction.riskLevel}
                 </div>
                 <span className="text-xs text-gray-400">生成于: {new Date(prediction.timestamp).toLocaleTimeString()}</span>
               </div>
               
               <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-100 dark:border-gray-600">
                 <h4 className="font-bold text-gray-900 dark:text-white mb-2">📊 综合评估</h4>
                 <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{prediction.summary}</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <h4 className="font-bold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                     预测爆发点
                   </h4>
                   <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 text-sm">
                     {prediction.predictedHotspots.map((h, i) => <li key={i}>{h}</li>)}
                   </ul>
                 </div>
                 <div>
                   <h4 className="font-bold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                     AI 建议
                   </h4>
                   <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 text-sm">
                     {prediction.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                   </ul>
                 </div>
               </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Simulation */}
      {activeTab === 'simulation' && (
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Controls */}
            <div className="space-y-6">
               <h4 className="font-bold text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 pb-2">参数配置</h4>
               
               {/* 1. Dev Count */}
               <div>
                 <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                   人员变动 ({simConfig.developerCountChange > 0 ? '+' : ''}{simConfig.developerCountChange} 人)
                 </label>
                 <input 
                   type="range" min="-5" max="5" step="1" 
                   value={simConfig.developerCountChange}
                   onChange={(e) => setSimConfig({...simConfig, developerCountChange: parseInt(e.target.value)})}
                   className="w-full mt-2 accent-blue-600"
                 />
                 <div className="flex justify-between text-xs text-gray-400">
                   <span>裁员</span>
                   <span>扩招</span>
                 </div>
               </div>

               {/* 2. Issue Rate */}
               <div>
                 <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                   外部 Issue 增长率 ({Math.round(simConfig.incomingIssueRate * 100)}%)
                 </label>
                 <input 
                   type="range" min="0.5" max="2.0" step="0.1" 
                   value={simConfig.incomingIssueRate}
                   onChange={(e) => setSimConfig({...simConfig, incomingIssueRate: parseFloat(e.target.value)})}
                   className="w-full mt-2 accent-blue-600"
                 />
                 <div className="flex justify-between text-xs text-gray-400">
                   <span>减缓</span>
                   <span>激增</span>
                 </div>
               </div>

               {/* 3. Meeting Hours */}
               <div>
                 <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex justify-between">
                   <span>周会议耗时/人</span>
                   <span className="text-blue-500">{simConfig.weeklyMeetingHours} h</span>
                 </label>
                 <input 
                   type="range" min="0" max="20" step="1" 
                   value={simConfig.weeklyMeetingHours}
                   onChange={(e) => setSimConfig({...simConfig, weeklyMeetingHours: parseInt(e.target.value)})}
                   className="w-full mt-2 accent-purple-600"
                 />
                 <p className="text-[10px] text-gray-400 mt-1">基准: 6h。高会议时长会降低有效编码产能。</p>
               </div>

               {/* 4. Code Review Hours */}
               <div>
                 <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex justify-between">
                   <span>Code Review 平均合并</span>
                   <span className="text-blue-500">{simConfig.codeReviewAvgHours} h</span>
                 </label>
                 <input 
                   type="range" min="1" max="72" step="1" 
                   value={simConfig.codeReviewAvgHours}
                   onChange={(e) => setSimConfig({...simConfig, codeReviewAvgHours: parseInt(e.target.value)})}
                   className="w-full mt-2 accent-purple-600"
                 />
                 <p className="text-[10px] text-gray-400 mt-1">基准: 24h。速度越快，流转效率越高。</p>
               </div>

               <button 
                 onClick={handleRunSimulation}
                 disabled={simulating}
                 className={`w-full py-3 rounded-lg font-bold text-white shadow-md transition-all ${simulating ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'}`}
               >
                 {simulating ? 'AI 推演中...' : '运行沙箱推演'}
               </button>
            </div>

            {/* Visuals */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-inner">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">积压趋势预测 (Backlog Forecast)</h4>
                <SimulationChart data={forecastData} darkMode={darkMode} />
              </div>

              {simResult && (
                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 animate-fadeIn">
                   <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200">🤖 AI 场景分析</h4>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${simResult.survivalProbability > 70 ? 'bg-green-100 text-green-700' : simResult.survivalProbability > 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        生存概率: {simResult.survivalProbability}%
                      </span>
                   </div>
                   <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                     {simResult.analysis}
                   </p>
                   <div>
                     <span className="text-xs font-semibold text-slate-500 uppercase">建议行动:</span>
                     <ul className="mt-2 space-y-1">
                       {simResult.actionableSteps.map((step, idx) => (
                         <li key={idx} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                           <span className="text-blue-500">•</span> {step}
                         </li>
                       ))}
                     </ul>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
