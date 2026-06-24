# GaoKao - 高考志愿应用系统

## Project Overview

河北省高考志愿助手，提供以下功能：
1. 一分一档表查询和可视化
2. 等效分计算器
3. **冲稳保匹配** — 输入分数自动匹配冲、稳、保三档院校
4. 院校库浏览（投档线+基本信息）

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Data:** JSON files (static, no database)
- **Package Manager:** pnpm

## Data Sources

- 河北省教育考试院: https://gk.hebeea.edu.cn/
- 阳光高考平台: https://gaokao.chsi.com.cn/
- **重要**: 所有数据必须来自官方来源，禁止编造数据

## Key Commands

```bash
pnpm install          # 安装依赖
pnpm dev              # 启动开发服务器
pnpm build            # 构建生产版本
pnpm start            # 启动生产服务器

# 数据验证
pnpm tsx scripts/validate-data.ts hebei            # 一分一档验证
pnpm tsx scripts/validate-admission-lines.ts hebei  # 投档线验证
```

## Project Structure

```
GaoKao/
├── src/                        # Next.js应用代码
│   ├── app/
│   │   ├── [province]/         # 省份动态路由
│   │   │   ├── score-rank/     # 一分一档查询
│   │   │   ├── equivalent-score/ # 等效分计算
│   │   │   ├── match/          # 冲稳保匹配
│   │   │   └── universities/   # 院校库
│   │   └── api/
│   │       └── [province]/
│   │           ├── score-rank/search/
│   │           ├── match/
│   │           └── universities/list/
│   ├── components/
│   ├── lib/
│   │   ├── data/               # 数据加载（含缓存）
│   │   ├── utils/              # 算法（排名查询、等效分、匹配）
│   │   └── provinces/          # 省份配置
│   └── types/                  # TypeScript 类型定义
├── data/                       # 所有数据JSON文件
│   └── hebei/
│       ├── meta.json
│       ├── score-rank/         # 一分一档 (2023-2025)
│       ├── admission-lines/    # 投档线 (待导入)
│       └── universities/       # 院校信息
├── scripts/                    # 数据抓取和验证脚本
├── REQUIREMENTS.md             # 功能需求文档
└── DATA_SCRAPING.md            # 数据采集指南
```

## Data Model

### 一分一档表 (`src/types/score-rank.ts`)

```typescript
interface ScoreRankEntry { score, count, cumulative }
interface ScoreRankData { year, group, entries[], totalCandidates, meta }
```

### 投档线 (`src/types/admission-line.ts`)

```typescript
interface AdmissionLineEntry {
  universityCode, universityName, majorGroup,
  planCount, minScore, minRank, avgScore?, maxScore?
}
interface AdmissionLineData { year, batch, group, entries[], meta }
```

### 匹配结果 (`src/types/admission-line.ts`)

```typescript
interface MatchResult {
  universityCode, universityName, majorGroup, batch,
  matchType: '冲' | '稳' | '保',
  targetMinScore, targetMinRank, userScore, userRank,
  scoreGap, rankGap, confidence: 'high' | 'medium' | 'low'
}
```

## 核心算法

### 冲稳保匹配 (`src/lib/utils/match.ts`)

基于**位次**（不是分数）进行匹配：
1. 用一分一档算出用户当年位次
2. 对每条投档线记录，算出用户位次 vs 投档最低位次的比值
3. 分类规则（gapRatio = (userRank - targetRank) / targetRank）：
   - **保**: gapRatio ≤ -20%（用户位次高 20%+）
   - **稳**: gapRatio ≤ -5%（用户位次高 5%-20%）
   - **冲**: gapRatio > -5%（用户位次接近或低于投档位次）
4. 多年数据加权平均（近期权重更高）
5. 置信度：3年数据=高，2年=中，1年=低

## Adding New Provinces

1. Create directory: `data/[province-code]/`
2. Create `data/[province-code]/meta.json`
3. Add data directories: `score-rank/`, `admission-lines/`, `universities/`
4. Add province config in `src/lib/provinces/index.ts`

## Important Notes

- 数据准确性至关重要，禁止使用AI生成或估算数据
- 所有数据必须有meta信息记录来源和时间
- 部署前必须通过数据验证脚本检查
- 投档线数据的 minRank 字段是匹配算法的核心，务必准确
