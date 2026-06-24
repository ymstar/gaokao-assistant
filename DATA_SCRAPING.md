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

---

## 投档线数据

### 数据来源

河北省各年度投档线数据由河北省教育考试院在每批次录取结束后发布。通常可在以下渠道获取：

- 河北省教育考试院官网: https://gk.hebeea.edu.cn/
- 阳光高考平台: https://gaokao.chsi.com.cn/
- 各高校招生网站

### 数据文件格式

文件路径: `data/hebei/admission-lines/{year}/{batch}/{group}.json`

```json
{
  "year": 2024,
  "batch": "本科批",
  "group": "物理类",
  "entries": [
    {
      "universityCode": "10001",
      "universityName": "北京大学",
      "majorGroup": "01不限",
      "subjectRequirements": "不限",
      "planCount": 10,
      "minScore": 688,
      "minRank": 52,
      "avgScore": 692,
      "maxScore": 700
    }
  ],
  "meta": {
    "source": "河北省教育考试院",
    "sourceUrl": "https://gk.hebeea.edu.cn/...",
    "publishedAt": "2024-07-20",
    "quality": "official"
  }
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| universityCode | string | ✅ | 院校代码（与院校基本信息对应） |
| universityName | string | ✅ | 院校名称 |
| majorGroup | string | ✅ | 专业组名称（河北新高考按专业组投档） |
| subjectRequirements | string | ❌ | 选科要求 |
| planCount | number | ✅ | 招生计划数 |
| minScore | number | ✅ | 最低投档分（>0） |
| minRank | number | ✅ | 最低位次（>0，核心匹配依据） |
| avgScore | number | ❌ | 平均投档分 |
| maxScore | number | ❌ | 最高投档分 |

### 验证

```bash
pnpm tsx scripts/validate-admission-lines.ts hebei
```

### 导入流程

1. 从官方渠道获取投档线数据（PDF/网页/Excel）
2. 按上述格式整理为 JSON 文件
3. 放入对应目录: `data/hebei/admission-lines/{year}/{batch}/{group}.json`
4. 运行验证脚本确认数据格式正确
5. universityCode 必须与 `data/hebei/universities/_common/院校基本信息.json` 中的 code 一致
6. minRank（最低位次）是匹配算法的核心字段，务必准确

## 重要提醒

1. **禁止使用AI生成数据** - 所有数据必须来自官方来源
2. **必须记录数据来源** - meta字段必须包含source和sourceUrl
3. **部署前必须验证** - 运行 pnpm validate 检查数据完整性
4. **版本控制** - 数据文件应提交到git，便于追踪和审计
