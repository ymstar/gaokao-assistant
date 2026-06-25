/**
 * 数据增强脚本：为 _all-schools.json 补充 city 和 cityTier 字段
 *
 * 用法: pnpm tsx scripts/enrich-all-schools.ts
 *
 * 数据来源:
 * - city: 从 address 字段正则提取
 * - cityTier: 从 data/common/city-tier-flat.json 映射
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const ALL_SCHOOLS_PATH = path.join(ROOT, 'data', '_all-schools.json');
const CITY_TIER_PATH = path.join(ROOT, 'data', 'common', 'city-tier-flat.json');

type CityTier = '一线' | '新一线' | '二线' | '三线' | '四线' | '五线';

interface School {
  code: string;
  name: string;
  location?: string;
  city?: string;
  cityTier?: CityTier;
  address?: string;
  [key: string]: unknown;
}

/**
 * 从地址中提取城市名
 * 支持的格式:
 * - "北京市海淀区xxx" → 北京
 * - "河北省石家庄市xxx" → 石家庄
 * - "广东省广州市xxx" → 广州
 * - "重庆市xxx" → 重庆
 * - "西藏自治区拉萨市xxx" → 拉萨
 */
function extractCity(address: string): string | null {
  if (!address) return null;

  // 直辖市: 北京/上海/天津/重庆 + "市"
  const directMatch = address.match(/(北京|上海|天津|重庆)市/);
  if (directMatch) return directMatch[1];

  // 省/自治区 + 市名
  const provinceMatch = address.match(/(?:省|自治区)([^\s市,;。；·]{2,4}?)市/);
  if (provinceMatch) return provinceMatch[1];

  // 开头就是市名（如"武汉市xxx"）
  const startMatch = address.match(/^([^\s省]{2,4}?)市/);
  if (startMatch) return startMatch[1];

  return null;
}

async function main() {
  // Load data
  const schools: School[] = JSON.parse(fs.readFileSync(ALL_SCHOOLS_PATH, 'utf8'));
  const cityTierMap: Record<string, CityTier> = JSON.parse(
    fs.readFileSync(CITY_TIER_PATH, 'utf8')
  );

  let cityCount = 0;
  let tierCount = 0;
  let noCity = 0;

  for (const school of schools) {
    // Extract city from address
    const city = school.address ? extractCity(school.address) : null;
    if (city) {
      school.city = city;
      cityCount++;
    } else {
      noCity++;
    }

    // Assign city tier
    if (city && cityTierMap[city]) {
      school.cityTier = cityTierMap[city];
      tierCount++;
    }
  }

  // Write back
  fs.writeFileSync(ALL_SCHOOLS_PATH, JSON.stringify(schools, null, 2), 'utf8');

  console.log(`✅ 数据增强完成`);
  console.log(`   总计: ${schools.length} 所院校`);
  console.log(`   提取城市: ${cityCount} 所 (${noCity} 所未匹配)`);
  console.log(`   标注城市等级: ${tierCount} 所`);

  // Stats
  const tierStats: Record<string, number> = {};
  for (const s of schools) {
    if (s.cityTier) {
      tierStats[s.cityTier] = (tierStats[s.cityTier] || 0) + 1;
    }
  }
  console.log(`   等级分布:`, tierStats);
}

main().catch(console.error);
