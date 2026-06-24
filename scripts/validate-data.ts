import { ScoreRankData, SubjectGroup } from '../src/types/score-rank';
import { promises as fs } from 'fs';
import path from 'path';

export async function validateScoreRankFile(filePath: string): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data: ScoreRankData = JSON.parse(content);

    if (!data.year || !data.group || !data.entries || !data.meta) {
      errors.push('缺少必要的元数据字段');
    }

    if (!Array.isArray(data.entries)) {
      errors.push('entries 不是数组');
      return { valid: false, errors };
    }

    if (data.entries.length === 0) {
      errors.push('entries 数组为空');
      return { valid: false, errors };
    }

    let cumulativeSum = 0;
    for (let i = 0; i < data.entries.length; i++) {
      const entry = data.entries[i];

      if (entry.score === undefined || entry.score === null || entry.count === undefined || entry.count === null) {
        errors.push(`第 ${i} 条数据缺少 score 或 count 字段`);
        continue;
      }

      cumulativeSum += entry.count;
      if (entry.cumulative !== cumulativeSum) {
        errors.push(
          `分数 ${entry.score}: cumulative 不匹配，期望 ${cumulativeSum}，实际 ${entry.cumulative}`
        );
      }

      if (i < data.entries.length - 1) {
        if (entry.score !== data.entries[i + 1].score + 1) {
          errors.push(
            `分数不连续: ${entry.score} -> ${data.entries[i + 1].score}`
          );
        }
      }
    }

    if (cumulativeSum !== data.totalCandidates) {
      errors.push(
        `总人数不匹配: 期望 ${data.totalCandidates}，实际计算 ${cumulativeSum}`
      );
    }

    if (data.maxScore !== data.entries[0].score) {
      errors.push(
        `maxScore 不匹配: ${data.maxScore} != ${data.entries[0].score}`
      );
    }

    if (data.minScore !== data.entries[data.entries.length - 1].score) {
      errors.push(
        `minScore 不匹配: ${data.minScore} != ${data.entries[data.entries.length - 1].score}`
      );
    }

    if (!data.meta.source) {
      errors.push('meta.source 为空');
    }

  } catch (error) {
    if (error instanceof SyntaxError) {
      errors.push(`JSON 解析错误: ${error.message}`);
    } else {
      errors.push(`读取文件失败: ${error}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export async function validateAllScoreRankData(province: string): Promise<{
  totalFiles: number;
  validFiles: number;
  invalidFiles: { path: string; errors: string[] }[];
}> {
  const dataDir = path.join(process.cwd(), 'data', province, 'score-rank');
  const invalidFiles: { path: string; errors: string[] }[] = [];
  let totalFiles = 0;
  let validFiles = 0;

  try {
    const years = await fs.readdir(dataDir);

    for (const yearStr of years) {
      const yearPath = path.join(dataDir, yearStr);
      const stat = await fs.stat(yearPath);

      if (stat.isDirectory()) {
        const groups = await fs.readdir(yearPath);
        for (const groupFile of groups) {
          if (groupFile.endsWith('.json')) {
            totalFiles++;
            const filePath = path.join(yearPath, groupFile);
            const result = await validateScoreRankFile(filePath);

            if (result.valid) {
              validFiles++;
              console.log(`✓ ${yearStr}/${groupFile}`);
            } else {
              invalidFiles.push({
                path: `${yearStr}/${groupFile}`,
                errors: result.errors,
              });
              console.error(`✗ ${yearStr}/${groupFile}:`);
              result.errors.forEach((e) => console.error(`  - ${e}`));
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('读取数据目录失败:', error);
  }

  return { totalFiles, validFiles, invalidFiles };
}

const args = process.argv.slice(2);
const province = args[0] || 'hebei';

validateAllScoreRankData(province).then((result) => {
  console.log('\n验证结果:');
  console.log(`总文件数: ${result.totalFiles}`);
  console.log(`有效文件: ${result.validFiles}`);
  console.log(`无效文件: ${result.invalidFiles.length}`);

  if (result.invalidFiles.length > 0) {
    process.exit(1);
  }
});
