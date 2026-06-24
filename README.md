# 高考志愿助手

河北省高考志愿填报辅助系统，提供一分一档查询、等效分计算、大学招生数据查看等功能。

## 功能特性

1. **一分一档表查询** - 查看历年分数排名数据和可视化图表
2. **等效分计算器** - 根据当年分数计算前三年的等效分
3. **大学招生数据** - 查看一本院校的招生信息和历年录取分数
4. **志愿咨询** - 集成AI智能志愿填报建议

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

## 主要功能

### 一分一档查询
- 选择年份和科类（物理类/历史类）
- 输入分数查询对应的排名
- 查看多年分数排名对比图表

### 等效分计算
- 输入今年的分数
- 自动计算前三年同等排名对应的分数
- 显示三年平均等效分和趋势分析

### 大学数据
- 按大学名称或代码搜索
- 查看各大学的录取分数和招生计划
- 查看大学详情页的历年录取数据

## 数据来源

- **河北省教育考试院**: https://gk.hebeea.edu.cn/
- 所有数据来自官方来源，确保准确性
- 禁止使用AI生成或估算数据

## 数据抓取

详细的数据抓取说明请查看 [DATA_SCRAPING.md](./DATA_SCRAPING.md)

```bash
# 验证数据完整性
pnpm validate hebei

# 抓取数据（需要实际的URL）
pnpm scrape:score-rank
```

## 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **图表**: Recharts
- **数据**: JSON文件存储
- **包管理**: pnpm

## 项目结构

```
GaoKao/
├── src/                    # Next.js应用代码
│   ├── app/                # 页面和API路由
│   ├── components/         # React组件
│   ├── lib/                # 工具函数和数据加载
│   └── types/              # TypeScript类型定义
├── data/                   # 数据文件
│   └── hebei/              # 河北省数据
├── scripts/                # 数据抓取和验证脚本
└── CLAUDE.md               # 项目文档
```

## 部署

推荐使用 Vercel 部署：

```bash
# 构建生产版本
pnpm build

# 部署到Vercel
vercel
```

## 添加新省份

1. 创建 `data/[province-code]/` 目录
2. 添加 `meta.json` 配置文件
3. 创建 `score-rank/` 和 `universities/` 数据目录
4. 在 `src/lib/provinces/index.ts` 添加省份配置

## 注意事项

- 数据准确性至关重要，所有数据必须来自官方来源
- 部署前必须运行 `pnpm validate` 验证数据
- 系统仅供参考，实际填报请以官方数据为准

## 相关文档

- [CLAUDE.md](./CLAUDE.md) - 项目详细文档
- [DATA_SCRAPING.md](./DATA_SCRAPING.md) - 数据抓取指南
