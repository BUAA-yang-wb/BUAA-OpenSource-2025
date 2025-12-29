
import { GoogleGenAI, Type } from "@google/genai";
import { ProjectData, AIPrediction, SimulationConfig, SimulationResult, Issue, LabelAnalysisResult, TeamHealthAnalysis, ContributorStat } from "../types";

// Initialize Gemini
const getAiClient = () => {
  if (!process.env.API_KEY) {
    console.warn("API Key is missing!");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const analyzeProjectRisks = async (projectData: ProjectData): Promise<AIPrediction | null> => {
  const ai = getAiClient();
  if (!ai) return null;

  // Enhance context with detailed label analysis
  // We sort by 'impact' (count * avgResolutionDays) to find areas that consume the most dev time total.
  const topBottlenecks = projectData.stats.labelStats
    .map(l => ({
      ...l,
      totalImpact: l.count * l.avgResolutionDays
    }))
    .sort((a, b) => b.totalImpact - a.totalImpact)
    .slice(0, 5);

  const bottleneckContext = topBottlenecks.map(l => 
    `- [${l.name}] 累计: ${l.count}个, 平均解决: ${l.avgResolutionDays}天 (影响系数: ${l.totalImpact.toFixed(1)})`
  ).join('\n');

  const criticalIssues = projectData.issues
    .filter(i => i.priority === 'Critical' && i.status !== 'Closed')
    .slice(0, 3)
    .map(i => `- ${i.title}`)
    .join('\n');

  const prompt = `
    作为开源项目管理专家，请分析 '${projectData.repoName}' 项目的Issue数据并给出风险预测报告。
    你的核心任务是识别"效率瓶颈"并提供针对性建议。
    
    [项目概况]
    - 总Issue: ${projectData.stats.total}
    - 当前积压: ${projectData.stats.open}
    - 全局平均解决天数: ${projectData.stats.avgResolutionDays}
    
    [深度分析：高影响标签/模块]
    以下标签是消耗开发资源最多的领域 (按 频率*耗时 排序):
    ${bottleneckContext || "无详细标签数据"}

    [紧急关注]
    ${criticalIssues ? `高优先级积压:\n${criticalIssues}` : "暂无Critical级别积压"}

    请以 JSON 格式输出分析结果:
    1. riskLevel: (High/Medium/Low) 若存在解决时间远超平均值的高频标签，风险应为 High。
    2. summary: 200字以内。重点指出哪些具体模块（标签）拖慢了项目节奏。例如："尽管整体进度平稳，但 'Database' 类问题平均耗时是其他的2倍，需警惕。"
    3. predictedHotspots: 基于上述瓶颈，列出3个未来可能爆发问题的领域。
    4. recommendations: 3条建议。必须针对数据中发现的具体瓶颈标签提出改进措施（例如技术还债、增加特定领域文档等）。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskLevel: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
            summary: { type: Type.STRING },
            predictedHotspots: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    const result = JSON.parse(text);
    return { ...result, timestamp: Date.now() };
  } catch (error) {
    console.error("Gemini Error", error);
    return null;
  }
};

export const analyzeSimulation = async (
  projectData: ProjectData, 
  config: SimulationConfig,
  finalBacklogSize: number
): Promise<SimulationResult | null> => {
  const ai = getAiClient();
  if (!ai) return null;

  // Describe the scenario to the AI with precise parameters
  const prompt = `
    你是一个高级技术项目经理。用户正在使用"推演沙箱"模型进行What-if场景分析。
    
    [项目背景]
    项目: ${projectData.repoName}
    当前Issue积压: ${projectData.stats.open}
    
    [用户设定的管理变量]
    1. 人员变动: ${config.developerCountChange > 0 ? `增加 ${config.developerCountChange} 人` : config.developerCountChange < 0 ? `减少 ${Math.abs(config.developerCountChange)} 人` : '无变动'}
    2. 外部流量(Issue增长): 调整为原来的 ${Math.round(config.incomingIssueRate * 100)}%
    3. 🔴 会议负荷: 每人每周 ${config.weeklyMeetingHours} 小时 (基准约6小时)。
    4. 🔴 Code Review 速度: 平均 ${config.codeReviewAvgHours} 小时合并 (基准约24小时)。
    
    [数学模型推演结果]
    3个月后的预测积压量: ${finalBacklogSize} (趋势: ${finalBacklogSize > projectData.stats.open ? '恶化 📈' : '改善 📉'})
    
    请分析这个具体的管理场景:
    1. 重点分析"会议时长"和"CR速度"对团队生产力的具体影响。例如：如果会议设为15小时，请警告"无效沟通过多导致编码时间碎片化"。如果CR设为2小时，请分析"可能过于草率导致质量下降"或"极致敏捷"。
    2. 给出在该特定场景下的3个具体管理建议 (例如："实施无会日" 或 "引入自动化CI以减少人工Review时间")。
    3. 预估项目的生存概率 (0-100)。

    请以JSON格式返回。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: { type: Type.STRING },
            actionableSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
            survivalProbability: { type: Type.INTEGER }
          }
        }
      }
    });
    
    const text = response.text;
    if (!text) return null;
    const result = JSON.parse(text);

    return {
      config,
      analysis: result.analysis,
      actionableSteps: result.actionableSteps,
      survivalProbability: result.survivalProbability
    };
  } catch (error) {
    console.error("Gemini Simulation Error", error);
    return {
      config,
      analysis: "模拟分析服务暂时不可用。",
      actionableSteps: ["检查网络", "稍后重试"],
      survivalProbability: 50
    };
  }
};

// New function for drill-down analysis
export const analyzeSpecificLabel = async (
  labelName: string, 
  issues: Issue[], 
  avgProjectResolution: number
): Promise<LabelAnalysisResult | null> => {
  const ai = getAiClient();
  if (!ai) return null;

  // Filter last 10 issues for this label to send to context
  const contextIssues = issues.slice(0, 10).map(i => `- ${i.title} (Status: ${i.status})`).join('\n');

  const prompt = `
    请针对该软件项目的特定技术领域 "${labelName}" 进行深度分析。
    
    项目全局平均解决耗时: ${avgProjectResolution} 天。
    
    该领域的样本 Issue 列表:
    ${contextIssues}
    
    请做出以下判断并返回JSON格式:
    1. rootCause: 根本原因分析（请用中文回答）。为什么这些特定的问题会发生或难以修复？(例如："遗留代码库过于复杂"、"缺乏单元测试"、"需求定义模糊"等)。
    2. suggestedSolution: 一个具体的、可执行的技术修复建议（请用中文回答）。
    3. complexityScore: 修复难度评分 1-10 (10 表示极其难修)。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            labelName: { type: Type.STRING },
            rootCause: { type: Type.STRING },
            suggestedSolution: { type: Type.STRING },
            complexityScore: { type: Type.INTEGER }
          }
        }
      }
    });
    
    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Label Analysis Error", error);
    return null;
  }
};

export const generateProjectReport = async (projectData: ProjectData, reportType: 'weekly' | 'monthly' | 'risk'): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "# Error: API Config Missing";

  const criticalCount = projectData.issues.filter(i => i.priority === 'Critical').length;
  const topLabels = projectData.stats.labelStats.slice(0, 3).map(l => `${l.name} (${l.count})`).join(', ');

  const prompt = `
    请你扮演一位高级技术总监，为项目 "${projectData.repoName}" 撰写一份专业的 **${reportType === 'weekly' ? '周度进度' : (reportType === 'monthly' ? '月度总结' : '风险评估')}报告**。
    
    [核心数据]
    - 现有积压: ${projectData.stats.open} (Critical: ${criticalCount})
    - 累计解决: ${projectData.stats.closed}
    - 团队平均解决速度: ${projectData.stats.avgResolutionDays} 天/Issue
    - 活跃/问题高发领域: ${topLabels}
    
    [写作要求]
    1. 使用 Markdown 格式。
    2. 语气专业、客观、以数据为驱动。
    3. 结构包含：
       - **执行摘要 (Executive Summary)**: 一句话概括当前健康度。
       - **关键指标分析**: 结合数据分析趋势。
       - **风险与挑战**: 重点提及 Critical 问题和高发标签。
       - **下阶段建议**: 给出具体的管理或技术建议。
    4. 请用中文撰写。不要包含任何占位符，直接生成完整报告。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });
    return response.text || "无法生成报告内容。";
  } catch (error) {
    console.error("Report Generation Error", error);
    return "生成报告时发生错误，请稍后重试。";
  }
};

export const analyzeTeamHealth = async (
  stats: ContributorStat[],
  totalOpen: number
): Promise<TeamHealthAnalysis | null> => {
  const ai = getAiClient();
  if (!ai) return null;

  // Identify top 3 risky devs
  const riskyDevs = stats.sort((a, b) => b.riskScore - a.riskScore).slice(0, 3);
  const riskyContext = riskyDevs.map(d => 
    `- ${d.name}: 负载 ${d.activeLoad}个 (风险分: ${d.riskScore}/100), 历史解决 ${d.totalResolved}`
  ).join('\n');

  const prompt = `
    作为敏捷团队教练，请分析以下开发者的健康度数据。
    
    项目总积压: ${totalOpen}
    高风险人员名单:
    ${riskyContext}
    
    请分析并返回JSON:
    1. overview: 团队整体人力健康状况综述（中文）。
    2. highRiskDevs: 列出需要立即关注的人名。
    3. reallocationAdvice: 针对上述高风险人员的具体调配建议（例如：建议让Dev_X暂停接新需求，专注清理手头积压）。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overview: { type: Type.STRING },
            highRiskDevs: { type: Type.ARRAY, items: { type: Type.STRING } },
            reallocationAdvice: { type: Type.STRING }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Health Analysis Error", error);
    return null;
  }
};
