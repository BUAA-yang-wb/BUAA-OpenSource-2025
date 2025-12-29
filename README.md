# 🚀 开源项目智囊 (Open Source Project Assistant)

> 一个基于 Google Gemini AI 的智能项目健康度监测、瓶颈分析与风险推演平台。

![React](https://img.shields.io/badge/React-19.0-blue) ![Tailwind](https://img.shields.io/badge/Tailwind-3.0-cyan) ![Gemini](https://img.shields.io/badge/AI-Google%20Gemini-orange) ![Status](https://img.shields.io/badge/Status-Active%20Development-green)

## 📖 项目简介

**开源项目智囊 (Proj 3)** 是一个专为技术管理者和维护者设计的现代化仪表盘。它不仅仅展示传统的 Issue 统计数据，更利用生成式 AI (GenAI) 的能力，将冰冷的数据转化为可执行的洞察。

核心愿景是将项目管理从 **“被动响应”** 转变为 **“主动预测”**，通过量化“会议损耗”、“代码审查阻塞”以及“人员倦怠风险”等隐性指标，辅助团队做出更科学的决策。

---

## ✅ 当前开发情况 (Current Status)

目前项目处于 **Beta 阶段**，核心功能模块已搭建完毕，UI/UX 经过多轮深度优化（支持暗黑模式），并已集成多个基于 Gemini 2.5 Flash 模型的 AI 智能体。

### 🌟 核心功能模块

#### 1. 📊 智能数据可视化
- **全景仪表盘**: 实时展示 Total/Open/Critical Issue 计数及平均解决耗时。
- **技术瓶颈矩阵 (Bottleneck Matrix)**: 创新的散点图视图。
    - **X轴**: 问题出现频率。
    - **Y轴**: 解决耗时。
    - **红区预警**: 自动识别“高频且难修”的技术债务模块。
- **多维图表**: 包含趋势图 (Line)、分类统计 (Pie)、优先级分布 (Bar)。

#### 2. 🧠 AI 深度诊断 (Drill-down Analysis)
- **交互式根因分析**: 点击瓶颈矩阵中的气泡，AI 自动读取该标签下的 Issue 样本，分析根本原因（Root Cause）并给出技术修复建议。
- **全局搜索与过滤**: 支持按标题/标签搜索，UI 针对 **Critical** 级别问题进行高亮（红色边框 + 火焰图标 🔥）。

#### 3. 🧪 推演沙箱 (Simulation Lab) - *核心亮点*
基于 **有效产能理论 (Effective Capacity Theory)** 的 What-if 分析工具：
- **可调节参数**:
    - 人员变动 (+/- Headcount)。
    - 外部 Issue 增长率。
    - 🔴 **周会议耗时**: 量化会议对编码时间的挤占。
    - 🔴 **Code Review 速度**: 量化流转效率对交付的影响。
- **双模预测**: 结合数学回归模型（线性趋势）与 AI 定性分析（生存概率评估）。

#### 4. ❤️ 贡献者健康度模型 (Contributor Health) - *New*
关注“人”的因素：
- **倦怠风险指数**: 基于 `Active Load` (当前积压) 和 `Velocity` (历史产出) 的启发式算法。
- **AI 人员调配**: 自动识别单点依赖风险，并生成具体的人员减负建议。

#### 5. 📄 自动化汇报
- **一键生成报告**: 支持生成周报、月报或风险简报。AI 扮演“技术总监”角色，输出结构化的 Markdown 报告。

#### 6. 🎨 UI/UX 体验
- **原生暗黑模式**: 基于 Tailwind CSS 的完整 Dark Mode 适配。
- **响应式设计**: 适配桌面与移动端展示。

---

## 🛠 技术栈

- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS
- **Visualization**: Recharts
- **AI Core**: Google Gemini API (`gemini-2.5-flash`)
- **Build Tooling**: ES Modules (Browser native imports)

---
