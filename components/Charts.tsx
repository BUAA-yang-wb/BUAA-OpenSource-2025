import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Area, ComposedChart, ScatterChart, Scatter, ZAxis, ReferenceLine, LabelList
} from 'recharts';
import { MonthlyStat, CategoryStat, ForecastPoint, LabelStat } from '../types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

interface CommonChartProps {
  darkMode?: boolean;
}

interface TrendChartProps extends CommonChartProps {
  data: MonthlyStat[];
}

export const TrendChart: React.FC<TrendChartProps> = ({ data, darkMode }) => {
  return (
    <div className="h-80 w-full bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Issue 解决趋势分析</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#374151" : "#eee"} />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: darkMode ? '#9ca3af' : '#666' }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: darkMode ? '#9ca3af' : '#666' }} />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '8px', 
              border: 'none', 
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              backgroundColor: darkMode ? '#1f2937' : '#fff',
              color: darkMode ? '#f3f4f6' : '#333'
            }} 
            itemStyle={{ color: darkMode ? '#f3f4f6' : '#333' }}
            labelStyle={{ color: darkMode ? '#9ca3af' : '#333' }}
          />
          <Legend verticalAlign="top" height={36} wrapperStyle={{ color: darkMode ? '#9ca3af' : '#333' }} />
          <Line type="monotone" dataKey="created" name="新增 Issue" stroke="#8884d8" strokeWidth={3} activeDot={{ r: 8 }} />
          <Line type="monotone" dataKey="resolved" name="已解决 Issue" stroke="#82ca9d" strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

interface CategoryChartProps extends CommonChartProps {
  data: CategoryStat[];
}

export const CategoryChart: React.FC<CategoryChartProps> = ({ data, darkMode }) => {
  return (
    <div className="h-80 w-full bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">问题分类统计</h3>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            fill="#8884d8"
            paddingAngle={5}
            dataKey="value"
            label={({ value }) => `${value}`} 
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke={darkMode ? '#1f2937' : '#fff'} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              borderRadius: '8px', 
              border: 'none', 
              backgroundColor: darkMode ? '#1f2937' : '#fff',
              color: darkMode ? '#f3f4f6' : '#333'
            }}
          />
          <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ color: darkMode ? '#9ca3af' : '#333' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

interface PriorityChartProps extends CommonChartProps {
  data: CategoryStat[]; 
}

export const PriorityChart: React.FC<PriorityChartProps> = ({ data, darkMode }) => {
  return (
    <div className="h-80 w-full bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">优先级分布</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 40, left: 40, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={darkMode ? "#374151" : "#eee"}/>
          <XAxis type="number" hide />
          <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12, fill: darkMode ? '#9ca3af' : '#666'}} axisLine={false} tickLine={false}/>
          <Tooltip 
             cursor={{fill: 'transparent'}} 
             contentStyle={{ 
              borderRadius: '8px', 
              border: 'none', 
              backgroundColor: darkMode ? '#1f2937' : '#fff',
              color: darkMode ? '#f3f4f6' : '#333'
            }}
          />
          <Bar dataKey="value" name="Issue 数量" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={20}>
            {
              data.map((entry, index) => (
                 <Cell key={`cell-${index}`} fill={entry.name === 'Critical' ? '#ef4444' : (entry.name === 'High' ? '#f97316' : '#4f46e5')} />
              ))
            }
            <LabelList dataKey="value" position="right" style={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 12, fontWeight: 500 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface SimulationChartProps extends CommonChartProps {
  data: ForecastPoint[];
}

export const SimulationChart: React.FC<SimulationChartProps> = ({ data, darkMode }) => {
  return (
    <div className="h-64 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorOpen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#374151" : "#f0f0f0"} />
          <XAxis dataKey="name" tick={{fontSize: 12, fill: darkMode ? '#9ca3af' : '#888'}} axisLine={false} tickLine={false} />
          <YAxis tick={{fontSize: 12, fill: darkMode ? '#9ca3af' : '#888'}} axisLine={false} tickLine={false} />
          <Tooltip 
             labelStyle={{ color: darkMode ? '#e5e7eb' : '#333', fontWeight: 600 }}
             contentStyle={{ 
               borderRadius: '8px', 
               border: 'none', 
               boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
               backgroundColor: darkMode ? '#1f2937' : '#fff',
               color: darkMode ? '#f3f4f6' : '#333'
             }}
          />
          <Legend wrapperStyle={{ color: darkMode ? '#9ca3af' : '#333' }}/>
          {/* Historical Area */}
          <Area 
            type="monotone" 
            dataKey="historicalOpen" 
            name="历史积压 (Backlog)" 
            stroke="#3b82f6" 
            fillOpacity={1} 
            fill="url(#colorOpen)" 
            strokeWidth={2}
          />
          {/* Projected Line (Dashed) */}
          <Line 
            type="monotone" 
            dataKey="projectedOpen" 
            name="推演预测 (Forecast)" 
            stroke="#f59e0b" 
            strokeWidth={3} 
            strokeDasharray="5 5" 
            dot={{ r: 4, fill: '#f59e0b' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

interface LabelAnalysisChartProps extends CommonChartProps {
  data: LabelStat[];
  onLabelClick?: (label: LabelStat) => void;
  selectedLabel?: string | null;
}

export const LabelAnalysisChart: React.FC<LabelAnalysisChartProps> = ({ data, onLabelClick, selectedLabel, darkMode }) => {
  // Take top 8 tags to avoid clutter
  const chartData = data.slice(0, 10);
  
  return (
    <div className="h-80 w-full bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative transition-colors duration-200">
      <div className="flex justify-between items-center mb-4">
         <div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">技术瓶颈矩阵 (Bottleneck Matrix)</h3>
            <p className="text-xs text-blue-500 mt-1">✨ 点击图表中的圆点进行 AI 根因诊断</p>
         </div>
         <span className="text-xs text-gray-400">X: 频率 | Y: 解决耗时</span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#374151" : "#eee"} />
          <XAxis type="number" dataKey="count" name="Frequency" unit=" issues" tick={{fontSize: 12, fill: darkMode ? '#9ca3af' : '#666'}} />
          <YAxis type="number" dataKey="avgResolutionDays" name="Avg Time" unit=" d" tick={{fontSize: 12, fill: darkMode ? '#9ca3af' : '#666'}} />
          <ZAxis type="category" dataKey="name" name="Label" />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} 
             content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white dark:bg-gray-700 p-3 border border-gray-100 dark:border-gray-600 shadow-lg rounded-lg">
                      <p className="font-bold text-gray-800 dark:text-white">{data.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-300">数量: {data.count}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-300">平均耗时: {data.avgResolutionDays} 天</p>
                      <p className="text-xs text-blue-500 mt-1">点击查看详情</p>
                    </div>
                  );
                }
                return null;
             }}
          />
          <ReferenceLine y={5} stroke="red" strokeDasharray="3 3" label={{ value: 'High Cost Threshold', position: 'insideTopRight', fontSize: 10, fill: 'red' }} />
          <Scatter 
            name="Labels" 
            data={chartData} 
            onClick={(e) => {
              if (onLabelClick && e.payload) {
                 onLabelClick(e.payload as LabelStat);
              }
            }}
            cursor="pointer"
          >
            {chartData.map((entry, index) => {
               // Color logic: Red if frequent AND slow
               const isCritical = entry.count > 5 && entry.avgResolutionDays > 5;
               const isSelected = selectedLabel === entry.name;
               
               return (
                 <Cell 
                   key={`cell-${index}`} 
                   fill={isCritical ? '#ef4444' : '#3b82f6'} 
                   stroke={isSelected ? (darkMode ? '#fff' : '#000') : 'none'}
                   strokeWidth={isSelected ? 3 : 0}
                 />
               );
            })}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};