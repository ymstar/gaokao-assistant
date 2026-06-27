# gaokao-schools.db

全国院校 SQLite 数据库，数据来自 gaokao.cn 开放 API。

## 数据来源

| 数据 | URL |
|---|---|
| 院校列表 | `https://static-data.gaokao.cn/www/2.0/school/list_v2.json` |
| 院校详情 | `https://static-data.gaokao.cn/www/2.0/school/{id}/info.json?a=www.gaokao.cn` |

## 库表概览

| 表 | 说明 |
|---|---|
| `schools` | 院校基础信息（list_v2.json） |
| `school_details` | 院校扩展详情（info.json） |
| `school_rankings` | 各类排名（软科、校友会、QS、US News 等） |
| `school_dual_class` | 双一流建设学科 |
| `school_special` | 特色专业（含学科评估等级） |
| `school_xueke_rank` | 学科评估等级统计 |
| `school_academic_points` | 硕博点 / 学科门类 |
| `school_labels` | 标签（985、211、双一流、强基计划 等） |
| `school_campuses` | 校区 |
| `school_campus_departments` | 校区 → 院系 |

---

## 表结构

### schools（院校基础信息）

list_v2.json 原始字段，字段值未经映射。

| 列 | 类型 | 说明 |
|---|---|---|
| `school_id` | INTEGER PK | 院校 ID |
| `name` | TEXT | 院校名称 |
| `f985` | TEXT | "1" = 985, "2" = 非 |
| `f211` | TEXT | "1" = 211, "2" = 非 |
| `province` | TEXT | 省份简称 |
| `city` | TEXT | 城市名称 |
| `qj` | TEXT | 排序权重（"1" 为最高） |
| `dual_class` | TEXT | "1" = 双一流 |
| `nature` | TEXT | 办学性质（公办/民办） |
| `level` | TEXT | 办学层次（普通本科/专科） |
| `answer_url` | TEXT | 咨询入口 URL |
| `data_fetched_at` | TEXT | 数据获取时间 |

### school_details（院校扩展详情）

info.json 关键字段提取。`raw_json` 列保存完整原始 JSON 用于回补未提取的字段。

| 列 | 类型 | 说明 |
|---|---|---|
| `school_id` | INTEGER PK FK | 院校 ID |
| `data_code` | TEXT | 数据编码 |
| `type` | TEXT | 类型编码 |
| `school_type` | TEXT | 院校类型编码 |
| `school_nature` | TEXT | 办学性质编码 |
| `belong` | TEXT | 主管部门 |
| `department` | TEXT | 部属/省属标志 |
| `create_date` | TEXT | 建校年份 |
| `area` | INTEGER | 占地面积 |
| `short_names` | TEXT | 简称（逗号分隔） |
| `province_id` | TEXT | 省份编码 |
| `city_id` | TEXT | 城市编码 |
| `county_id` | TEXT | 区县编码 |
| `province_name` | TEXT | 省份名称 |
| `city_name` | TEXT | 城市名称 |
| `town_name` | TEXT | 区县名称 |
| `level_name` | TEXT | 办学层次（本科/专科） |
| `type_name` | TEXT | 院校类型（综合类/理工类/...） |
| `school_type_name` | TEXT | 培养层次 |
| `school_nature_name` | TEXT | 办学性质 |
| `dual_class_name` | TEXT | 双一流名称 |
| `address` | TEXT | 地址 |
| `postcode` | TEXT | 邮编 |
| `site` | TEXT | 招生网站 |
| `school_site` | TEXT | 学校官网 |
| `phone` | TEXT | 招生电话 |
| `email` | TEXT | 招生邮箱 |
| `school_email` | TEXT | 学校邮箱 |
| `motto` | TEXT | 校训 |
| `content` | TEXT | 院校简介（HTML） |
| `num_subject` | TEXT | 本科专业数 |
| `num_master` | TEXT | 硕士点数量 |
| `num_doctor` | TEXT | 博士点数量 |
| `num_academician` | TEXT | 院士数量 |
| `num_library` | TEXT | 图书馆藏量 |
| `num_lab` | TEXT | 实验室数量 |
| `recommend_master_rate` | TEXT | 保研率 |
| `upgrading_rate` | TEXT | 升学率 |
| `is_military` | INTEGER | 1 = 军事院校 |
| `is_police_judicial` | INTEGER | 1 = 司法警校 |
| `is_police_public` | INTEGER | 1 = 公安警校 |
| `is_yikao` | INTEGER | 1 = 艺考院校 |
| `school_special_num` | INTEGER | 特色专业数量 |
| `raw_json` | TEXT | 完整原始 JSON |
| `data_fetched_at` | TEXT | 数据获取时间 |

### school_rankings（排名）

| 列 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER PK | 自增 |
| `school_id` | INTEGER FK | 院校 ID |
| `rank_type` | TEXT | 排名类型（ruanke_rank / xyh_rank / qs_world / us_rank / qs_rank / wsl / ...） |
| `rank_value` | TEXT | 排名值 |

### school_dual_class（双一流学科）

| 列 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER PK | 自增 |
| `school_id` | INTEGER FK | 院校 ID |
| `class_name` | TEXT | 双一流建设学科名称 |

### school_special（特色专业）

| 列 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER PK | 自增 |
| `school_id` | INTEGER FK | 院校 ID |
| `special_id` | TEXT | 专业原始 ID |
| `special_name` | TEXT | 专业名称 |
| `level_name` | TEXT | 级别（国家级/省级） |
| `nation_feature` | TEXT | 国家特色专业标志 |
| `province_feature` | TEXT | 省级特色专业标志 |
| `xueke_rank` | TEXT | 学科评估等级 |
| `ruanke_rank` | TEXT | 软科专业排名 |
| `ruanke_level` | TEXT | 软科专业等级 |

### school_xueke_rank（学科评估统计）

| 列 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER PK | 自增 |
| `school_id` | INTEGER FK | 院校 ID |
| `grade` | TEXT | 等级（A+/A/A-/B+/B/B-/C+/C/C-） |
| `count` | INTEGER | 该等级学科数量 |

### school_academic_points（硕博点 / 学科门类）

| 列 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER PK | 自增 |
| `school_id` | INTEGER FK | 院校 ID |
| `category` | TEXT | 类别：`master` / `doctor` / `subject` |
| `name` | TEXT | 名称 |
| `count` | TEXT | 数量 |

### school_labels（标签）

| 列 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER PK | 自增 |
| `school_id` | INTEGER FK | 院校 ID |
| `name` | TEXT | 标签名称（如 "985"、"211"、"双一流"、"强基"、"101计划"） |
| `key` | TEXT | 标签 key |
| `value` | TEXT | 标签值 |

### school_campuses（校区）

| 列 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER PK | 自增 |
| `school_id` | INTEGER FK | 院校 ID |
| `campus_name` | TEXT | 校区名称 |

### school_campus_departments（校区院系）

| 列 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER PK | 自增 |
| `campus_id` | INTEGER FK → school_campuses.id | 校区 ID |
| `dept_name` | TEXT | 院系名称 |

---

## 使用方式

```typescript
import {
  getDb,
  initDb,
  listSchools,
  getSchoolById,
  getSchoolCount,
} from '@/lib/db/gaokao-schools';

// 初始化（每次启动调用一次即可）
initDb();

// 分页查询
const { schools, total } = listSchools({
  province: '北京',
  is985: true,
  keyword: '大学',
  limit: 20,
});

// 单校完整信息
const pku = getSchoolById(31);
// pku.school         — 基础信息
// pku.detail         — 扩展详情
// pku.rankings       — 各类排名
// pku.dualClass      — 双一流学科
// pku.specials       — 特色专业
// pku.xuekeRanks     — 学科评估
// pku.academicPoints — 硕博点
// pku.labels         — 标签
// pku.campuses       — 校区及院系
```

## 更新数据

```bash
pnpm import:schools
```

脚本支持断点续传：已导入的院校详情会自动跳过，仅更新新增/失败的院校。
