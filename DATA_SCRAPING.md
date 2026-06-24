# 数据抓取指南

## 概述

本项目使用 cheerio 从河北省教育考试院官网抓取高考数据。所有数据必须来自官方来源，禁止编造。

## 数据来源

- **河北省教育考试院**: https://gk.hebeea.edu.cn/
- 一分一档表通常在每年6月24-26日发布

## 使用方法

### 1. 抓取一分一档表

```typescript
import { scrapeHebeiScoreRank } from './scripts/scrape-score-rank';

const data = await scrapeHebeiScoreRank(
  2025,
  '物理类',
  'https://gk.hebeea.edu.cn/xxx/一分一档表.html'
);

// 保存数据到文件
import { saveScoreRankData } from './src/lib/data/score-rank';
await saveScoreRankData('hebei', 2025, '物理类', data);
```

### 2. 验证数据

```bash
pnpm validate hebei
```

这会检查：
- 所有JSON文件格式正确
- 分数连续无间断
- cumulative计算正确
- 总人数与实际一致

### 3. 数据文件格式

```json
{
  "year": 2025,
  "group": "物理类",
  "maxScore": 698,
  "minScore": 200,
  "totalCandidates": 286000,
  "entries": [
    { "score": 698, "count": 1, "cumulative": 1 },
    { "score": 697, "count": 3, "cumulative": 4 },
    ...
  ],
  "meta": {
    "source": "河北省教育考试院",
    "sourceUrl": "https://gk.hebeea.edu.cn/...",
    "publishedAt": "2025-06-25",
    "quality": "official"
  }
}
```

## 数据位置

```
data/hebei/score-rank/
├── 2023/
│   ├── 物理类.json
│   └── 历史类.json
├── 2024/
│   ├── 物理类.json
│   └── 历史类.json
└── 2025/
    ├── 物理类.json
    └── 历史类.json
```

## 重要提醒

1. **禁止使用AI生成数据** - 所有数据必须来自官方来源
2. **必须记录数据来源** - meta字段必须包含source和sourceUrl
3. **部署前必须验证** - 运行 pnpm validate 检查数据完整性
4. **版本控制** - 数据文件应提交到git，便于追踪和审计
