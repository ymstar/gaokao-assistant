# gaokao-score-rank.db

河北省高考一分一档 SQLite 数据库，数据来源于阳光高考平台 (gaokao.cn)，通过 `scripts/scrape-gaokao-section.ts` 抓取导入。

## 表结构

### `provinces`（1 行）

| 列 | 类型 | 说明 |
|----|------|------|
| code | TEXT PK | 省份编码（教育部标准，河北 = "13"） |
| name | TEXT | 省份简称 |

### `categories`（4 行）

| 列 | 类型 | 说明 |
|----|------|------|
| code | TEXT PK | 科类编码（2073=物理类, 2074=历史类, 1=理科, 2=文科） |
| name | TEXT | 科类名称 |
| province_code | TEXT | 所属省份编码 |

### `score_rank`（13,132 行）— 一分一档核心数据

| 列 | 类型 | 说明 |
|----|------|------|
| id | INTEGER PK | 自增主键 |
| province_code | TEXT | 省份编码 |
| category_code | TEXT | 科类编码 |
| year | INTEGER | 年份 |
| batch_type | INTEGER | 批次类型（3=本科批/专科批合并数据） |
| batch_name | TEXT | 批次名称（如 "本科批"、"专科批"） |
| control_score | INTEGER | 该批次的录取控制分数线 |
| score | INTEGER | 分数（聚合段取最高分，如 "701-750" → 750） |
| score_display | TEXT | 原始分数显示（如 "701-750"、"700"、"140"） |
| num | INTEGER | 该分数/分数段人数 |
| cum_total | INTEGER | 从最高分累积到当前分的人数 |
| rank_start | INTEGER | 该分数段的起始位次 |
| rank_end | INTEGER | 该分数段的结束位次 |

**唯一约束**：`(province_code, category_code, year, batch_type, score)`

**数据覆盖**：河北省 2016-2026 共 11 年，每年 2 个科类（2020 年前：理科/文科；2021 年后：物理类/历史类）

**关键设计**：
- 高分区域存在聚合段（如 "701-750"），其中 `score` 取最高分 750，`num` 为该段总人数，`rank_start` 和 `rank_end` 为位次范围
- 读取时通过 `buildEntries()` 展开聚合段为逐分数据，其中仅最高分携带人数，其余分数 count=0
- `cum_total` 始终为从最高分开始的累积计数（不是严格等差数列）

### `equivalent_score`（39,396 行）— 等效分映射

| 列 | 类型 | 说明 |
|----|------|------|
| id | INTEGER PK | 自增主键 |
| score_rank_id | INTEGER FK | 关联 `score_rank.id` |
| ref_year | INTEGER | 参照年份 |
| ref_score | INTEGER | 参照年份该位次对应的等效分数 |
| ref_rank_start | INTEGER | 等效位次区间起始 |
| ref_rank_end | INTEGER | 等效位次区间结束 |

**作用**：给定某年某分数的位次，查询其他年份同等位次对应的分数。每条 `score_rank` 记录通常有 3 条参照记录（2023/2024/2025 各一条），用于三年等效分加权计算。

### `import_log`（22 行）— 导入日志

| 列 | 类型 | 说明 |
|----|------|------|
| id | INTEGER PK | 自增主键 |
| province_code | TEXT | 省份编码 |
| category_code | TEXT | 科类编码 |
| year | INTEGER | 年份 |
| batch_type | INTEGER | 批次类型 |
| batch_name | TEXT | 批次名称 |
| total_entries | INTEGER | 导入条目数 |
| source_url | TEXT | 数据来源 URL |
| status | TEXT | 导入状态（success/error） |
| error_message | TEXT | 错误信息 |
| imported_at | TEXT | 导入时间 |

### 索引

- `idx_sr_prov_year_cat` — `score_rank(province_code, year, category_code)`
- `idx_es_score_rank_id` — `equivalent_score(score_rank_id)`
- `idx_il_prov_year_cat_batch` — `import_log(province_code, category_code, year, batch_type)`

## 数据统计

| 年份 | 物理类/理科 | 历史类/文科 |
|------|-------------|-------------|
| 2026 | 350,991 人 | 231,476 人 |
| 2025 | 363,040 人 | 243,714 人 |
| 2024 | 384,426 人 | 243,704 人 |
| 2023 | 335,207 人 | 240,794 人 |
| 2022 | 297,622 人 | 194,469 人 |
| 2021 | 216,153 人 | 202,096 人 |
| 2020 | 261,461 人 | 175,891 人 |
| 2019 | 249,148 人 | 169,071 人 |
| 2018 | 225,818 人 | 143,029 人 |
| 2017 | 210,305 人 | 131,219 人 |
| 2016 | 210,225 人 | 128,776 人 |

## 数据来源

- API 地址：`https://static-data.gaokao.cn/www/2.0/section2021/{year}/{province_code}/{category_code}/{batch_type}/lists.json`
- 示例：`https://static-data.gaokao.cn/www/2.0/section2021/2026/13/2073/3/lists.json`
- 质量等级：verified（经官方数据交叉校验）

## 相关代码

- `src/lib/db/gaokao-score-rank.ts` — 数据库操作封装（建表、导入、查询、导出 JSON）
- `src/lib/db/score-rank-adapter.ts` — 适配器，将 DB 数据转为应用层 `ScoreRankData` 格式
- `scripts/scrape-gaokao-section.ts` — 数据抓取脚本
