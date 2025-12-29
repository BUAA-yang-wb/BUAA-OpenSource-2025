
import React, { useState, useEffect } from 'react';
import { ProjectData, IssuePriority, LabelStat, LabelAnalysisResult } from '../types';
import { generateMockData } from '../services/mockData';
import { fetchRealGithubData } from '../services/githubService';
import { analyzeSpecificLabel } from '../services/geminiService';
import { TrendChart, CategoryChart, PriorityChart, LabelAnalysisChart } from './Charts';
import { PredictionPanel } from './PredictionPanel';
import { ReportModal } from './ReportModal';
import { ContributorHealthPanel } from './ContributorHealthPanel';

interface DashboardProps {
  darkMode: boolean;
  toggleTheme: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ darkMode, toggleTheme }) => {
  const [repoName, setRepoName] = useState('facebook/react');
  const [data, setData] = useState<ProjectData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [inputName, setInputName] = useState('');
  
  // Real Data State
  const [apiToken, setApiToken] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isUsingMock, setIsUsingMock] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Search & Drill-down State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [labelAnalysis, setLabelAnalysis] = useState<LabelAnalysisResult | null>(null);
  const [analyzingLabel, setAnalyzingLabel] = useState(false);

  // Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Initial Load (Mock)
  useEffect(() => {
    loadMockData(repoName);
  }, []);

  const loadMockData = (name: string) => {
    setIsUsingMock(true);
    const mock = generateMockData(name);
    setData(mock);
    resetFilters();
  };

  const resetFilters = () => {
    setSelectedLabel(null);
    setLabelAnalysis(null);
    setSearchTerm('');
    setErrorMsg(null);
  };

  const parseRepoInput = (input: string) => {
    const trimmed = input.trim();
    // Handle full GitHub URLs
    try {
      const urlObj = new URL(trimmed);
      if (urlObj.hostname === 'github.com' || urlObj.hostname === 'www.github.com') {
        const parts = urlObj.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) {
          return `${parts[0]}/${parts[1]}`;
        }
      }
    } catch (e) {
      // Not a valid URL, treat as string
    }
    return trimmed;
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName.trim()) return;

    const cleanName = parseRepoInput(inputName);
    setRepoName(cleanName);
    setIsEditing(false);
    setIsLoadingData(true);
    setErrorMsg(null);

    try {
      // Attempt to fetch real data
      const realData = await fetchRealGithubData(cleanName, apiToken);
      if (realData) {
        setData(realData);
        setIsUsingMock(false);
        resetFilters();
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || "Fetch failed");
      // Fallback to mock data on error? Or just show error?
      // Let's show error but keep previous data or load mock if desperate.
      // For UX, let's load mock but tell user
      loadMockData(cleanName);
      setErrorMsg(`无法获取真实数据 (${error.message})，已切换回模拟模式。`);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleLabelClick = async (label: LabelStat) => {
    if (!data) return;
    
    // Toggle off if same label clicked
    if (selectedLabel === label.name) {
      setSelectedLabel(null);
      setLabelAnalysis(null);
      return;
    }

    setSelectedLabel(label.name);
    setLabelAnalysis(null); // Clear previous result
    setAnalyzingLabel(true);
    setSearchTerm(''); // Clear search when drilling down

    // Filter issues for this label
    const relevantIssues = data.issues.filter(i => i.labels.includes(label.name));
    const result = await analyzeSpecificLabel(label.name, relevantIssues, data.stats.avgResolutionDays);
    
    setLabelAnalysis(result);
    setAnalyzingLabel(false);
  };

  if (!data && !isLoadingData) return null;

  // Prepare Priority Data for Chart
  const priorityStats = data ? [
    { name: 'Critical', value: data.issues.filter(i => i.priority === IssuePriority.CRITICAL).length },
    { name: 'High', value: data.issues.filter(i => i.priority === IssuePriority.HIGH).length },
    { name: 'Medium', value: data.issues.filter(i => i.priority === IssuePriority.MEDIUM).length },
    { name: 'Low', value: data.issues.filter(i => i.priority === IssuePriority.LOW).length },
  ] : [];

  // Logic to Filter Issues Table
  const filteredIssues = data ? data.issues.filter(i => {
    // 1. Search Filter
    const matchesSearch = !searchTerm || 
      i.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      i.labels.some(l => l.toLowerCase().includes(searchTerm.toLowerCase()));

    // 2. Label Filter
    const matchesLabel = !selectedLabel || i.labels.includes(selectedLabel);
    
    // 3. View Logic
    const isDefaultView = !searchTerm && !selectedLabel;
    const matchesPriority = !isDefaultView || i.priority === IssuePriority.CRITICAL;

    return matchesSearch && matchesLabel && matchesPriority;
  }) : [];

  const getListHeaderInfo = () => {
    if (searchTerm) {
      return { 
        title: `搜索结果: "${searchTerm}"`, 
        badge: 'Search Results', 
        badgeColor: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' 
      };
    }
    if (selectedLabel) {
      return { 
        title: `"${selectedLabel}" 相关 Issue`, 
        badge: 'Filtered View', 
        badgeColor: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' 
      };
    }
    return { 
      title: '近期高优 Issue 列表', 
      badge: 'Critical Only', 
      badgeColor: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' 
    };
  };

  const listHeader = getListHeaderInfo();

  return (
    <div className="min-h-screen pb-12 relative">
      <ReportModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
        projectData={data!} 
        darkMode={darkMode} 
      />

      {/* Header Section */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-30 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-4 min-w-fit">
            <div className="bg-blue-600 p-2 rounded-lg shadow-md shadow-blue-200 dark:shadow-none">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="hidden md:block">
               <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight">Proj 3</h1>
               <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">项目问题追踪与预测助手</div>
            </div>
          </div>
          
          {/* Global Search Bar (Only shown when not editing repo to save space on mobile, or just hide on small screens) */}
          <div className="flex-1 max-w-lg px-4 hidden md:block">
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      if (e.target.value) {
                        setSelectedLabel(null); 
                        setLabelAnalysis(null);
                      }
                    }}
                    placeholder="全库搜索 Issue (标题或标签)..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg leading-5 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-all shadow-sm"
                />
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center justify-end gap-3 min-w-fit">
             {/* Repo Switcher */}
             <div className="flex items-center justify-end">
               {isEditing ? (
                 <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-end sm:items-center gap-2 w-full justify-end animate-fadeIn absolute right-4 top-16 bg-white dark:bg-gray-800 p-4 shadow-xl rounded-xl border border-gray-200 dark:border-gray-700 z-50 sm:static sm:bg-transparent sm:shadow-none sm:border-none sm:p-0">
                   <div className="relative w-64">
                     <input 
                       type="text" 
                       value={inputName}
                       onChange={(e) => setInputName(e.target.value)}
                       placeholder="GitHub URL (e.g. facebook/react)"
                       className="pl-3 pr-4 py-2 border border-blue-300 dark:border-blue-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                       autoFocus
                     />
                   </div>
                   <div className="relative w-48 group">
                      <input 
                        type="password"
                        value={apiToken}
                        onChange={(e) => setApiToken(e.target.value)}
                        placeholder="Github Token (可选)"
                        className="pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                        title="用于提高 API 速率限制"
                      />
                      <a 
                        href="https://github.com/settings/tokens/new" 
                        target="_blank" 
                        rel="noreferrer"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500"
                        title="去 GitHub 创建 Token"
                      >
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                   </div>
                   <div className="flex gap-2">
                     <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm whitespace-nowrap">
                       确定
                     </button>
                     <button 
                       type="button"
                       onClick={() => setIsEditing(false)}
                       className="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-2 rounded-lg text-sm transition-colors"
                     >
                       取消
                     </button>
                   </div>
                 </form>
               ) : (
                 <div className="flex items-center gap-3">
                   {errorMsg && (
                     <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-full animate-pulse">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {errorMsg}
                     </div>
                   )}
                   <button 
                     onClick={() => {
                       setInputName(repoName);
                       setIsEditing(true);
                     }}
                     className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all group"
                   >
                     <span className="font-mono text-sm font-semibold text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                       {repoName}
                     </span>
                     {isUsingMock ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">Mock</span>
                     ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border border-green-200 dark:border-green-800">Live</span>
                     )}
                     <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                     </svg>
                   </button>
                 </div>
               )}
             </div>

             {/* Theme Toggle */}
             <button 
               onClick={toggleTheme} 
               className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
               aria-label="Toggle Dark Mode"
             >
               {darkMode ? (
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
               ) : (
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
               )}
             </button>

             <button 
                onClick={() => setIsReportModalOpen(true)}
                className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-all transform hover:scale-105"
             >
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
               生成汇报
             </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Loading State Overlay */}
        {isLoadingData && (
          <div className="fixed inset-0 bg-white/50 dark:bg-black/50 z-40 flex items-center justify-center backdrop-blur-sm">
             <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">正在从 GitHub 拉取数据...</h3>
                <p className="text-gray-500 text-sm mt-2">分析 Issue、计算趋势、构建模型</p>
             </div>
          </div>
        )}

        {data && (
          <>
            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slideUp">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">总 Issue 数量</p>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{data.stats.total}</h3>
                  </div>
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <span className="text-green-500 flex items-center font-medium">
                    <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    +12%
                  </span>
                  <span className="text-gray-400 ml-2">vs 上月</span>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">当前积压 (Open)</p>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{data.stats.open}</h3>
                  </div>
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                    <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                </div>
                <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div className="bg-yellow-500 h-1.5 rounded-full" style={{ width: `${(data.stats.open / data.stats.total) * 100}%` }}></div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Critical 级问题</p>
                    <h3 className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                      {data.issues.filter(i => i.priority === IssuePriority.CRITICAL && i.status !== 'Closed').length}
                    </h3>
                  </div>
                  <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-lg">
                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                </div>
                <div className="mt-4 text-sm text-red-500 font-medium">需要立即关注</div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">平均解决耗时</p>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{data.stats.avgResolutionDays} <span className="text-sm text-gray-400 font-normal">天</span></h3>
                  </div>
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-500">基于过去300条数据</div>
              </div>
            </div>

            {/* AI Prediction Panel */}
            <div className="animate-slideUp delay-100">
               <PredictionPanel projectData={data} darkMode={darkMode} />
            </div>

            <div className="animate-slideUp delay-100">
               <ContributorHealthPanel issues={data.issues} darkMode={darkMode} />
            </div>

            {/* Main Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slideUp delay-200">
              <TrendChart data={data.stats.monthlyTrends} darkMode={darkMode} />
              <LabelAnalysisChart 
                data={data.stats.labelStats} 
                onLabelClick={handleLabelClick} 
                selectedLabel={selectedLabel}
                darkMode={darkMode}
              />
              
              {/* Drill-down Analysis Panel */}
              {analyzingLabel && (
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl border border-blue-100 dark:border-blue-900/50 shadow-md flex items-center justify-center min-h-[150px]">
                   <div className="flex flex-col items-center gap-3">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                     <span className="text-gray-500 dark:text-gray-400 animate-pulse">Gemini 正在深入分析 "{selectedLabel}" 标签下的问题根因...</span>
                   </div>
                </div>
              )}

              {labelAnalysis && (
                <div className="lg:col-span-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 p-6 rounded-xl border border-blue-100 dark:border-slate-700 shadow-md animate-fadeIn relative overflow-hidden">
                   <div className="relative z-10">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                           <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">AI 诊断报告</span>
                           {labelAnalysis.labelName} 模块分析
                        </h3>
                        <button onClick={() => { setSelectedLabel(null); setLabelAnalysis(null); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-gray-700/50 p-4 rounded-lg border border-red-100 dark:border-red-900/30">
                           <h4 className="font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              根本原因 (Root Cause)
                           </h4>
                           <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{labelAnalysis.rootCause}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-700/50 p-4 rounded-lg border border-green-100 dark:border-green-900/30">
                           <h4 className="font-bold text-green-600 dark:text-green-400 mb-2 flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              修复建议 (Solution)
                           </h4>
                           <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{labelAnalysis.suggestedSolution}</p>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex items-center gap-2">
                         <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">修复复杂度评分:</span>
                         <div className="flex gap-1">
                           {[...Array(10)].map((_, i) => (
                             <div key={i} className={`h-2 w-4 rounded-full ${i < labelAnalysis.complexityScore ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-600'}`}></div>
                           ))}
                         </div>
                         <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 ml-2">{labelAnalysis.complexityScore}/10</span>
                      </div>
                   </div>
                   {/* Decor */}
                   <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-500 opacity-5 rounded-full blur-3xl"></div>
                </div>
              )}

              <CategoryChart data={data.stats.categoryDistribution} darkMode={darkMode} />
              <PriorityChart data={priorityStats} darkMode={darkMode} />
            </div>

            {/* Issue List Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden animate-slideUp delay-300">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <div>
                   <h3 className="font-bold text-gray-800 dark:text-white">{listHeader.title}</h3>
                   <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Showing {filteredIssues.length} issues</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${listHeader.badgeColor}`}>
                  {listHeader.badge}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3 text-xs font-medium uppercase">ID</th>
                      <th className="px-6 py-3 text-xs font-medium uppercase">Title</th>
                      <th className="px-6 py-3 text-xs font-medium uppercase">Priority</th>
                      <th className="px-6 py-3 text-xs font-medium uppercase">Status</th>
                      <th className="px-6 py-3 text-xs font-medium uppercase">Assignee</th>
                      <th className="px-6 py-3 text-xs font-medium uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredIssues.map((issue) => {
                      const isCritical = issue.priority === IssuePriority.CRITICAL;
                      return (
                        <tr 
                          key={issue.id} 
                          className={`
                            hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors
                            ${isCritical ? 'bg-red-50 dark:bg-red-900/10 border-l-4 border-l-red-500' : 'border-l-4 border-l-transparent'}
                          `}
                        >
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 font-mono">#{issue.id}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <a 
                                href={issue.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className={`text-sm font-medium hover:underline flex items-center gap-2 ${isCritical ? 'text-red-700 dark:text-red-400 font-bold' : 'text-gray-900 dark:text-white'}`}
                              >
                                {isCritical && <span>🔥</span>}
                                {issue.title}
                              </a>
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {issue.labels.slice(0, 3).map(label => (
                                  <span key={label} onClick={() => {
                                      // Quick filter by clicking tag in table
                                      setSelectedLabel(label === selectedLabel ? null : label);
                                  }} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] rounded-full cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600">
                                    {label}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                              issue.priority === IssuePriority.CRITICAL ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                              issue.priority === IssuePriority.HIGH ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' :
                              issue.priority === IssuePriority.MEDIUM ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' :
                              'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                            }`}>
                              {issue.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                             <span className={`flex items-center gap-1.5 text-sm ${issue.status === 'Closed' ? 'text-purple-600 dark:text-purple-400' : 'text-green-600 dark:text-green-400'}`}>
                               <span className={`w-1.5 h-1.5 rounded-full ${issue.status === 'Closed' ? 'bg-purple-600 dark:bg-purple-400' : 'bg-green-600 dark:bg-green-400'}`}></span>
                               {issue.status}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {issue.assignee ? (
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-[10px] font-bold">
                                  {issue.assignee.substring(0, 1).toUpperCase()}
                                </div>
                                {issue.assignee}
                              </div>
                            ) : <span className="text-gray-300 dark:text-gray-600 italic">Unassigned</span>}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {new Date(issue.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredIssues.length === 0 && (
                 <div className="p-8 text-center text-gray-400 dark:text-gray-500">
                    无匹配数据
                 </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};
