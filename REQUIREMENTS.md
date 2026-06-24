# 高考志愿助手 - 功能需求文档

> 本文档供 Agent 开发时参考，按优先级从高到低排列。每个功能模块包含数据需求、接口设计、页面设计和验收标准。

---

## 当前现状

**已有功能**：一分一档查询（2023-2025，物理+历史）、等效分计算、院校基本信息展示（132 所）

**核心缺陷**：

- 院校投档线数据为空 → 用户查完分数不知道能上什么学校
- 院校页面只有关键词搜索，无法按分数/城市/层次筛选
- 无招生计划数据，无法评估竞争程度
- 无"冲稳保"匹配逻辑，用户需要自己猜
- 无专业就业数据，无法指导专业选择

**技术债务**（开发新功能前先修）：

- 所有页面和 API 路由硬编码 `'hebei'`，未使用动态路由参数 `[province]`
- 院校 API 路由 `year=0` 硬编码，导致投档线数据永远读不到
- `findScoreByRank` 在 `src/lib/utils/score-rank.ts` 和 `src/lib/utils/equivalent-score.ts` 中重复定义
- `src/lib/data/cache.ts` 定义了缓存层但从未被使用
- `University` 类型缺少 `address`, `phone`, `officialWebsite`, `chsiUrl` 等实际在用的字段，页面用 `any` 绕过类型检查
- `University` 的 `location` 字段存储的是省份名（如"河北"），不是城市名

---

## P0 - 投档线数据 + 智能匹配（核心中的核心）

### 目标

让用户输入分数后，自动列出"冲、稳、保"三档院校。这是网站从"查分工具"变成"志愿填报助手"的关键。

### 1.1 投档线数据采集与存储

**数据来源**：河北省教育考试院公布的各年度各批次投档线（通常在录取结束后发布）

**数据文件结构**：

```
data/hebei/admission-lines/
├── 2023/
│   ├── 本科批/
│   │   ├── 物理类.json
│   │   └── 历史类.json
│   └── 专科批/
│       ├── 物理类.json
│       └── 历史类.json
├── 2024/
│   └── ...（同上结构）
└── 2025/
    └── ...（同上结构）
```

**数据模型**（新建 `src/types/admission-line.ts`）：

```typescript
export interface AdmissionLineEntry {
  universityCode: string;      // 院校代码，与院校基本信息对应
  universityName: string;
  majorGroup: string;          // 专业组/专业类（河北新高考按专业组投档）
  subjectRequirements?: string; // 选科要求，如"物理+化学"
  planCount: number;           // 招生计划数
  minScore: number;            // 最低投档分
  minRank: number;             // 最低位次
  avgScore?: number;           // 平均投档分
  maxScore?: number;           // 最高投档分
}

export interface AdmissionLineData {
  year: number;
  batch: '本科批' | '专科批' | '本科提前批' | '专科提前批';
  group: '物理类' | '历史类';
  entries: AdmissionLineEntry[];
  meta: {
    source: string;
    sourceUrl: string;
    publishedAt: string;
    quality: 'official' | 'verified' | 'unverified';
  };
}
```

**验收标准**：

- [ ] 能通过 `loadAdmissionLineData('hebei', 2024, '本科批', '物理类')` 读取数据
- [ ] 数据包含 `minRank` 字段（位次），这是匹配的核心依据
- [ ] 每条记录都有 `meta.source` 和 `meta.sourceUrl`
- [ ] 数据验证脚本能检查：universityCode 是否与院校基本信息匹配、分数是否在合理范围内

### 1.2 冲稳保匹配算法

**新建** `src/lib/utils/match.ts`

**输入**：用户分数、年份、科类、目标批次（默认本科批）

**算法**：

```typescript
export interface MatchResult {
  universityCode: string;
  universityName: string;
  majorGroup: string;
  batch: string;
  matchType: '冲' | '稳' | '保';
  targetMinScore: number;    // 目标年份投档线
  targetMinRank: number;     // 目标年份最低位次
  userScore: number;         // 用户输入分数
  userRank: number;          // 用户对应位次
  scoreGap: number;          // 分数差 = userScore - targetMinScore
  rankGap: number;           // 位次差 = userRank - targetMinRank（负数=用户位次更高=好事）
  confidence: 'high' | 'medium' | 'low';
}

export function matchSchools(
  userScore: number,
  year: number,          // 用户成绩所在年份
  group: SubjectGroup,
  batch: string,         // '本科批' | '专科批'
  allScoreRankData: Record<number, ScoreRankData>,  // 多年一分一档
  admissionLines: AdmissionLineData[],              // 多年投档线
  targetYears?: number[] // 默认 [最近三年]
): MatchResult[]
```

**匹配规则**（基于位次，不是分数）：

1. 先用一分一档算出用户在 **当年** 的位次
2. 对每条投档线记录，算出用户位次 vs 投档最低位次的差值
3. 多年数据取加权平均（近期权重更高）：
   - 稳：用户位次高于投档位次 5%-20%（如投档位次 50000，用户位次 40000-47500）
   - 冲：用户位次高于投档位次 0%-5%（如投档位次 50000，用户位次 47500-50000）
   - 保：用户位次高于投档位次 20%+（如投档位次 50000，用户位次 ≤ 40000）
4. 位次低于投档位次的也标为"冲"（录取概率低但有希望）
5. 同一所学校不同专业组分别计算，取最优匹配

**置信度**：

- high：有 3 年数据，趋势一致
- medium：有 2 年数据，或趋势不一致
- low：只有 1 年数据

**验收标准**：

- [ ] 输入 550 分 → 输出冲稳保列表，每档按匹配度排序
- [ ] 匹配结果展示分数差和位次差，让用户理解为什么是"冲"或"保"
- [ ] 同一学校不同专业组独立显示（如"XX大学 01物理组"和"XX大学 02化学组"）
- [ ] 无投档线数据的学校不出现在结果中

### 1.3 匹配结果页面

**新建路由**：`src/app/[province]/match/page.tsx`

**页面结构**：

```
┌──────────────────────────────────────────────┐
│  分数输入区                                    │
│  [年份 ▼] [科类 ▼] [批次 ▼] [分数输入] [查询]  │
├──────────────────────────────────────────────┤
│  你的位置：550分 / 排名 42,350 / 超过 88.3%    │
├──────────────────────────────────────────────┤
│  ┌─ 冲一冲 (12所) ──────────────────────────┐ │
│  │  学校 | 专业组 | 投档线 | 分差 | 位次差    │ │
│  │  学校 | 专业组 | 投档线 | 分差 | 位次差    │ │
│  │  ...                                     │ │
│  └──────────────────────────────────────────┘ │
│  ┌─ 稳一稳 (25所) ──────────────────────────┐ │
│  │  ...                                     │ │
│  └──────────────────────────────────────────┘ │
│  ┌─ 保一保 (18所) ──────────────────────────┐ │
│  │  ...                                     │ │
│  └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

**每行信息**：院校名称（可点击）、专业组名、选科要求、去年投档线（分数+位次）、与用户分差（+12 / -8）、置信度图标

**验收标准**：

- [ ] 页面通过动态路由参数获取省份，不硬编码
- [ ] 冲稳保三档分区展示，每档可折叠/展开
- [ ] 点击院校名称可跳转到院校详情页（P2 功能，先预留链接）
- [ ] 结果可按分差排序
- [ ] 移动端适配：表格改为卡片列表

---

## P1 - 院校筛选器升级

### 目标

让学生能按分数段、城市等级、院校层次、专业类别精准筛选学校。

### 2.1 院校数据补充

**扩展** `University` 类型（在 `src/types/university.ts` 中）：

```typescript
export interface University {
  code: string;
  name: string;
  nameShort?: string;
  location: string;           // 省份
  city?: string;              // 城市（新增）
  cityTier?: CityTier;        // 城市等级（新增）
  authority?: string;
  level?: string;             // 本科 / 高职(专科)
  tier?: string;              // 985 / 211 / 双一流 / 普通本科 / ...
  type?: string;              // 综合 / 理工 / 师范 / 医药 / ...
  tags?: string[];            // 标签，如 ['公办', '省属重点', '医学强校']
  group?: SubjectGroup;
  admissionScores?: AdmissionScoreEntry[];
  popularMajors?: string[];   // 热门专业名称（新增）
  officialWebsite?: string;
  admissionWebsite?: string;
  phone?: string;
  address?: string;
  chsiUrl?: string;
}

export type CityTier = '一线' | '新一线' | '二线' | '三线' | '四线' | '五线';

export interface AdmissionScoreEntry {
  year: number;
  batch: string;
  group: SubjectGroup;
  minScore: number;
  minRank: number;
  avgScore?: number;
  majorGroup?: string;
}
```

**补充数据**：

为 132 所院校补充 `city`、`cityTier`、`tags` 字段。这些可以从公开数据源查到，不需要抓取，可以手动维护一份 `data/hebei/universities/_common/city-tier-mapping.json`：

```json
{
  "北京": "一线", "上海": "一线", "广州": "一线", "深圳": "一线",
  "成都": "新一线", "杭州": "新一线", "武汉": "新一线", "南京": "新一线", "重庆": "新一线",
  "石家庄": "二线", "保定": "三线", "唐山": "三线", "廊坊": "三线",
  ...
}
```

**验收标准**：

- [ ] 132 所院校均有 city 字段
- [ ] type 字段正确（综合/理工/师范/医药等），不为空
- [ ] tier 字段正确（985/211/双一流/普通本科/高职），不为空
- [ ] University 类型定义完整，页面不再需要 `as any` 转换

### 2.2 院校筛选 API 改造

**改造** `src/app/api/[province]/universities/list/route.ts`

**查询参数**（扩展现有的 `UniversityListFilters`）：

```typescript
GET /api/hebei/universities/list
  ?keyword=大学
  &level=本科              // 本科 / 高职(专科)
  &tier=211                // 985 / 211 / 双一流 / ...
  &type=理工               // 综合 / 理工 / 师范 / ...
  &cityTier=一线            // 一线 / 新一线 / 二线 / ...
  &province=北京            // 院校所在省份
  &group=物理类
  &year=2024
  &minScore=500            // 该校投档线 >= 500
  &maxScore=560            // 该校投档线 <= 560
  &sort=minScore_asc       // 排序字段_方向
  &page=1
  &pageSize=20
```

**返回格式**：

```json
{
  "data": [University...],
  "pagination": { "page": 1, "pageSize": 20, "total": 87, "totalPages": 5 }
}
```

**验收标准**：

- [ ] 所有筛选条件可组合使用
- [ ] 分数筛选基于投档线数据（如果投档线数据存在）
- [ ] 支持分页
- [ ] 修复当前 `year=0` 的硬编码 bug

### 2.3 院校筛选页面改版

**改造** `src/app/[province]/universities/page.tsx`

**页面布局**：

```
┌──────────────────────────────────────────────┐
│  搜索栏：[关键词输入] [搜索]                   │
├──────────────────────────────────────────────┤
│  筛选条件（横向排列，可收起）                    │
│  [层次 ▼] [类型 ▼] [城市等级 ▼] [省份 ▼]      │
│  [分数段: ____ - ____]                         │
│  [科类 ▼] [年份 ▼]                            │
├──────────────────────────────────────────────┤
│  排序：[综合] [投档线↑] [投档线↓] [排名↑]      │
├──────────────────────────────────────────────┤
│  共 87 所院校                                   │
│  ┌──────────────────────────────────────────┐ │
│  │  学校卡片（每行 1-2 个）                   │ │
│  │  名称 | 层次标签 | 城市 | 类型              │ │
│  │  2024投档线: 542分 / 位次 28,350           │ │
│  │  2023投档线: 538分 / 位次 30,100           │ │
│  └──────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────┐ │
│  │  ...更多卡片                               │ │
│  └──────────────────────────────────────────┘ │
│  [分页器]                                      │
└──────────────────────────────────────────────┘
```

**验收标准**：

- [ ] 筛选条件变更后 URL 参数同步更新（可分享链接）
- [ ] 每张院校卡片展示多年投档线趋势
- [ ] 筛选条件有"重置"按钮
- [ ] 移动端筛选条件改为底部抽屉

---

## P2 - 招生计划数据

### 目标

让学生知道目标学校每个专业招多少人，竞争程度如何。

### 3.1 招生计划数据存储

**数据文件结构**：

```
data/hebei/admission-plans/
├── 2024/
│   ├── 本科批/
│   │   ├── 物理类.json
│   │   └── 历史类.json
│   └── 专科批/
│       ├── 物理类.json
│       └── 历史类.json
└── 2025/
    └── ...（同上）
```

**数据模型**（新建 `src/types/admission-plan.ts`）：

```typescript
export interface AdmissionPlanEntry {
  universityCode: string;
  universityName: string;
  majorCode: string;           // 专业代码
  majorName: string;           // 专业名称
  planCount: number;           // 计划招生人数
  yearsOfStudy: number;        // 学制（4年/5年/3年）
  tuition?: number;            // 学费（元/年）
  subjectRequirements: string; // 选科要求
  remark?: string;             // 备注
}

export interface AdmissionPlanData {
  year: number;
  batch: string;
  group: SubjectGroup;
  entries: AdmissionPlanEntry[];
  meta: {
    source: string;
    sourceUrl: string;
    publishedAt: string;
    quality: 'official' | 'verified' | 'unverified';
  };
}
```

**验收标准**：

- [ ] 能按院校代码查到该校所有专业的招生计划
- [ ] 能按专业名称搜索跨院校的招生计划
- [ ] 数据验证脚本能检查 planCount > 0、universityCode 有效

### 3.2 院校详情页（新建）

**新建路由**：`src/app/[province]/universities/[code]/page.tsx`

**页面结构**：

```
┌──────────────────────────────────────────────┐
│  院校名称 | 985 | 公办 | 理工 | 北京-海淀区     │
│  官网链接 | 招生网链接 | 电话                     │
├──────────────────────────────────────────────┤
│  Tab: [投档线] [招生计划] [专业]                  │
├──────────────────────────────────────────────┤
│  投档线 Tab：                                   │
│  ┌──────────────────────────────────────────┐ │
│  │  折线图：多年投档线趋势（物理+历史双线）     │ │
│  └──────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────┐ │
│  │  表格：年份 | 科类 | 专业组 | 最低分 | 位次  │ │
│  └──────────────────────────────────────────┘ │
├──────────────────────────────────────────────┤
│  招生计划 Tab：                                 │
│  2025年 本科批 物理类                            │
│  ┌──────────────────────────────────────────┐ │
│  │  专业名 | 计划数 | 学制 | 学费 | 选科要求   │ │
│  └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

**验收标准**：

- [ ] 通过 `/hebei/universities/10001` 这样的 URL 访问
- [ ] 投档线 Tab 展示多年趋势图和详细表格
- [ ] 招生计划 Tab 展示该校所有专业及招生人数
- [ ] 数据为空时有友好提示，不是空白

---

## P3 - 专业就业数据 + 专业选择指导

### 目标

让学生在选专业时有就业数据参考，而不只是"听起来感兴趣"。

### 4.1 专业数据存储

**数据文件**：`data/common/majors.json`（全国通用，不按省份分）

**数据模型**（新建 `src/types/major.ts`）：

```typescript
export interface Major {
  code: string;                // 专业代码（6位）
  name: string;                // 专业名称
  category: string;            // 学科门类（如"工学"、"医学"）
  subCategory: string;         // 专业类（如"计算机类"、"临床医学类"）
  yearsOfStudy: number;        // 推荐学制
  degreeType?: string;         // 授予学位
  employmentRate?: number;     // 就业率（百分比）
  avgSalary?: number;          // 平均月薪（元）
  salaryRange?: [number, number]; // 薪资区间
  demandTrend?: '上升' | '稳定' | '下降';  // 人才需求趋势
  zhangRating?: '推荐' | '可选' | '谨慎' | '不推荐';  // 张雪峰视角评级
  zhangComment?: string;       // 张雪峰视角点评
  relatedExams?: string[];     // 相关资格考试
  careerPaths?: string[];      // 典型就业方向
}
```

**数据来源与处理**：

- 基础字段（code, name, category, subCategory）：教育部专业目录
- 就业数据（employmentRate, avgSalary 等）：来源需标注，禁止编造
- `zhangRating` 和 `zhangComment`：基于张雪峰公开观点整理，标注"仅供参考"

**验收标准**：

- [ ] 至少覆盖 200 个常见专业
- [ ] 每个专业有 category 和 subCategory
- [ ] 就业数据标注来源年份
- [ ] zhangRating 字段不为空（覆盖前 100 个最常见的专业）

### 4.2 专业探索页面

**新建路由**：`src/app/[province]/majors/page.tsx`

**页面结构**：

```
┌──────────────────────────────────────────────┐
│  搜索：[专业名称/方向输入]                      │
├──────────────────────────────────────────────┤
│  快捷标签：[高薪] [好就业] [考研友好] [考公友好]  │
├──────────────────────────────────────────────┤
│  按学科门类浏览                                  │
│  工学(45) | 理学(30) | 医学(20) | 经济学(15)   │
│  管理学(18) | 法学(12) | 文学(20) | 教育学(15)  │
├──────────────────────────────────────────────┤
│  专业卡片列表                                    │
│  ┌──────────────────────────────────────────┐ │
│  │  计算机科学与技术                          │ │
│  │  学科门类：工学 > 计算机类                   │ │
│  │  就业率：95.2% | 平均薪资：8,500元/月       │ │
│  │  评级：★★★★★ 推荐                         │ │
│  │  就业方向：互联网、金融科技、AI...           │ │
│  └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

---

## P4 - 志愿填报模拟

### 目标

河北本科批可填 96 个平行志愿，让学生模拟填报顺序并获得风险评估。

### 5.1 填报模拟功能

**新建路由**：`src/app/[province]/volunteer/page.tsx`

**功能流程**：

1. 用户输入分数、年份、科类
2. 系统展示冲稳保匹配结果（复用 P0 的匹配算法）
3. 用户从匹配结果中选择学校加入"我的志愿表"
4. 系统自动按"冲→稳→保"排序，但允许用户手动调整
5. 实时显示志愿表的风险评估

**数据结构**（存储在 localStorage，不需后端）：

```typescript
interface VolunteerSheet {
  id: string;
  userScore: number;
  userRank: number;
  year: number;
  group: SubjectGroup;
  batch: string;
  entries: VolunteerEntry[];
  createdAt: string;
}

interface VolunteerEntry {
  rank: number;             // 志愿序号（1-96）
  universityCode: string;
  universityName: string;
  majorGroup: string;
  matchType: '冲' | '稳' | '保';
  userScore: number;
  targetMinScore: number;
  scoreGap: number;
}
```

**风险评估显示**：

```
志愿表评估
━━━━━━━━━━━━━━━━━━━━━━━━
冲(15所) ████████░░ 适中
稳(40所) ██████████ 充足
保(20所) ████████░░ 适中
━━━━━━━━━━━━━━━━━━━━━━━━
风险等级：低 | 建议：冲的数量可以适当增加
```

**验收标准**：

- [ ] 志愿表可保存到 localStorage，刷新不丢失
- [ ] 最多 96 个志愿，超出时有提示
- [ ] 拖拽排序（移动端长按拖拽）
- [ ] 冲稳保分布以饼图或柱状图展示
- [ ] 可导出为图片或 PDF（打印用）

---

## P5 - 批次线 + 趋势分析

### 6.1 批次线数据

**数据文件**：`data/hebei/batch-lines.json`

```typescript
export interface BatchLineEntry {
  year: number;
  batch: string;              // '本科批' | '专科批' | '特殊类型招生控制线'
  group: '物理类' | '历史类';
  score: number;
}

export interface BatchLineData {
  province: string;
  entries: BatchLineEntry[];
  meta: {
    source: string;
    sourceUrl: string;
  };
}
```

**展示位置**：一分一档查询页面顶部，作为参考坐标

**验收标准**：

- [ ] 每年每科类的本科线、专科线均完整
- [ ] 在一分一档图表中用水平虚线标注批次线

### 6.2 趋势分析增强

**改造现有等效分页面**，增加趋势解读：

- 不只显示"上升/下降/稳定"，给出具体分析文字
  - "2023-2025 年，550 分对应的位次从 38,000 退后到 42,000，说明该分数段竞争逐年加剧"
- 显示各年批次线变化
- 如果用户分数接近批次线，给出风险提示

**验收标准**：

- [ ] 趋势分析有文字解读，不只是标签
- [ ] 图表中标注批次线位置
- [ ] 分数低于本科线时有明确提示

---

## P0 前置 - 技术债务修复

> 这些必须在开发 P0 功能前完成，否则新代码会继承这些问题。

### T1. 修复动态路由硬编码

**涉及文件**：

- `src/app/[province]/page.tsx`
- `src/app/[province]/score-rank/page.tsx`
- `src/app/[province]/score-rank/ScoreRankClient.tsx`
- `src/app/[province]/equivalent-score/page.tsx`
- `src/app/[province]/equivalent-score/EquivalentScoreClient.tsx`
- `src/app/[province]/universities/page.tsx`
- `src/app/api/[province]/score-rank/search/route.ts`
- `src/app/api/[province]/universities/list/route.ts`

**修改方式**：从 `params` 或 URL 中读取 province 参数，替换所有硬编码的 `'hebei'`

**验收标准**：全局搜索 `'hebei'` 仅出现在 `data/hebei/` 路径和 `provinces/index.ts` 的配置中

### T2. 修复院校 API 的 year=0 硬编码

**文件**：`src/app/api/[province]/universities/list/route.ts`

**修改**：从查询参数读取 year 和 group，不再硬编码

### T3. 消除重复定义

**文件**：`src/lib/utils/equivalent-score.ts`

**修改**：删除重复的 `findScoreByRank`，改为从 `./score-rank` 导入

### T4. 补全 University 类型定义

**文件**：`src/types/university.ts`

**修改**：将页面中实际使用的所有字段（address, phone, chsiUrl, officialWebsite, admissionWebsite, tags, city, cityTier）加入类型定义

### T5. 启用缓存层

**文件**：`src/lib/data/cache.ts`、`src/lib/data/score-rank.ts`、`src/lib/data/universities.ts`

**修改**：在 data loader 中使用已有的 cache 模块

---

## 数据文件清单（汇总）

| 优先级 | 文件路径 | 内容 | 来源 |
|--------|---------|------|------|
| P0 | `data/hebei/admission-lines/{year}/{batch}/{group}.json` | 各校投档线 | 省考试院 |
| P1 | `data/hebei/universities/_common/city-tier-mapping.json` | 城市等级映射 | 公开数据 |
| P1 | 扩展 `data/hebei/universities/_common/院校基本信息.json` | 补充 city/tier/tags | 公开数据 |
| P2 | `data/hebei/admission-plans/{year}/{batch}/{group}.json` | 招生计划 | 省考试院 |
| P3 | `data/common/majors.json` | 专业就业数据 | 教育部+公开来源 |
| P5 | `data/hebei/batch-lines.json` | 批次线 | 省考试院 |

---

## 开发顺序建议

```
T1-T5 技术债务修复（1天）
  │
  ▼
P0 投档线数据采集 + 匹配算法 + 匹配页面（3-5天）
  │
  ▼
P1 院校筛选器升级（2-3天）
  │
  ▼
P2 招生计划 + 院校详情页（2-3天）
  │
  ▼
P3 专业就业数据 + 专业探索页（2-3天）
  │
  ▼
P4 志愿填报模拟（3-4天）
  │
  ▼
P5 批次线 + 趋势分析增强（1-2天）
```

**关键路径**：P0 是一切的基础。没有投档线数据，P1 的分数筛选、P2 的详情页、P4 的冲稳保都无法工作。建议集中力量先把 P0 的数据采集和匹配算法做好。
