
import React, { useState } from 'react';
import { ProjectData } from '../types';
import { generateProjectReport } from '../services/geminiService';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectData: ProjectData;
  darkMode: boolean;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, projectData, darkMode }) => {
  const [reportType, setReportType] = useState<'weekly' | 'monthly' | 'risk'>('weekly');
  const [reportContent, setReportContent] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setLoading(true);
    const content = await generateProjectReport(projectData, reportType);
    setReportContent(content);
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(reportContent);
    // Simple feedback could be added here
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal Panel */}
        <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} px-4 pt-5 pb-4 sm:p-6 sm:pb-4`}>
            <div className="sm:flex sm:items-start">
              <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 ${darkMode ? 'bg-indigo-900' : 'bg-indigo-100'}`}>
                <svg className={`h-6 w-6 ${darkMode ? 'text-indigo-300' : 'text-indigo-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className={`text-lg leading-6 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`} id="modal-title">
                  智能项目汇报生成器
                </h3>
                <div className="mt-2">
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    选择报告类型，AI 将基于当前仪表盘数据为您撰写专业总结。
                  </p>
                </div>

                {/* Controls */}
                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as any)}
                    className={`block w-full pl-3 pr-10 py-2 text-base border focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  >
                    <option value="weekly">周度进度报告 (Weekly Progress)</option>
                    <option value="monthly">月度总结报告 (Monthly Summary)</option>
                    <option value="risk">风险评估简报 (Risk Assessment)</option>
                  </select>
                  <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {loading ? (
                       <span className="flex items-center gap-2">
                         <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                         撰写中...
                       </span>
                    ) : '开始生成'}
                  </button>
                </div>

                {/* Result Area */}
                {reportContent && (
                  <div className="mt-4 relative">
                    <div className={`p-4 rounded-md text-sm overflow-y-auto max-h-[400px] whitespace-pre-wrap font-mono ${darkMode ? 'bg-gray-900 text-gray-300 border-gray-700' : 'bg-gray-50 text-gray-800 border-gray-200'} border`}>
                      {reportContent}
                    </div>
                    <button 
                      onClick={handleCopy}
                      className="absolute top-2 right-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                      title="复制到剪贴板"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className={`${darkMode ? 'bg-gray-800 border-t border-gray-700' : 'bg-gray-50 border-t border-gray-100'} px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse`}>
            <button
              type="button"
              className={`mt-3 w-full inline-flex justify-center rounded-md border shadow-sm px-4 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700 bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50 bg-white'}`}
              onClick={onClose}
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
