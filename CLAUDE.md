# GaoKao - 高考志愿应用系统

## Project Overview

河北省高考志愿助手，提供以下功能：
1. 一分一档表查询和可视化
2. 等效分计算器
3. 一本院校招生数据查看
4. 志愿咨询（集成zhangxuefeng-skill）

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Data:** JSON files (static, no database)
- **Package Manager:** pnpm

## Data Sources

- 河北省教育考试院: https://gk.hebeea.edu.cn/
- **重要**: 所有数据必须来自官方来源，禁止编造数据

## Key Commands

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start

# 数据验证
pnpm tsx scripts/validate-data.ts hebei
```

## Project Structure

```
GaoKao/
├── src/              # Next.js应用代码
├── data/             # 所有数据JSON文件
│   └── hebei/        # 河北省数据
│       ├── meta.json
│       ├── score-rank/
│       │   ├── 2023/
│       │   ├── 2024/
│       │   └── 2025/
│       └── universities/
├── scripts/          # 数据抓取和验证脚本
└── tests/            # 测试文件
```

## Data Model

### 一分一档表

```typescript
interface ScoreRankEntry {
  score: number;      // 分数
  count: number;      // 该分数人数
  cumulative: number; // 累计排名
}

interface ScoreRankData {
  year: number;
  group: '物理类' | '历史类';
  maxScore: number;
  minScore: number;
  totalCandidates: number;
  entries: ScoreRankEntry[];
  meta: {
    source: string;
    sourceUrl: string;
    publishedAt: string;
    quality: 'official' | 'verified' | 'unverified';
  };
}
```

### 等效分计算

```typescript
interface EquivalentScoreResult {
  inputScore: number;
  inputRank: number;
  inputYear: number;
  inputGroup: SubjectGroup;
  equivalents: {
    year: number;
    score: number;
    rank: number;
  }[];
  averageScore: number;
  trend: 'rising' | 'falling' | 'stable';
}
```

### 大学数据

```typescript
interface University {
  code: string;
  name: string;
  location: string;
  group: SubjectGroup;
  admissionScores: {
    year: number;
    minScore: number;
    avgScore: number;
    rank?: number;
  }[];
}
```

## Adding New Provinces

1. Create directory: `data/[province-code]/`
2. Create `data/[province-code]/meta.json`
3. Add data directories: `score-rank/`, `universities/`
4. Add province config in `src/lib/provinces/index.ts`

## Important Notes

- 数据准确性至关重要，禁止使用AI生成或估算数据
- 所有数据必须有meta信息记录来源和时间
- 部署前必须通过数据验证脚本检查
