import { promises as fs } from 'fs';
import path from 'path';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

interface School {
  code: string;
  name: string;
  location: string;
  authority: string;
  level: string;
  tier: string;
  infoUrl: string;
}

function parseSchools(html: string): School[] {
  const schools: School[] = [];
  // Split by sch-item blocks
  const blocks = html.split('<div class="sch-item"');

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];

    // Code from image URL
    const codeMatch = block.match(/xh\/(\d+)\.jpg/);
    if (!codeMatch) continue;

    // Name
    const nameMatch = block.match(/class="name[^"]*">\s*([\s\S]*?)\s*<\/span>/);
    const name = nameMatch ? nameMatch[1].replace(/\s+/g, '').trim() : '';

    // Location - text after the icon, before the pipe
    const locMatch = block.match(/iconfont[^>]*>[^<]*<\/i>([^<]*?)<span class="col-line"/);
    const location = locMatch ? locMatch[1].trim() : '';

    // Authority
    const authMatch = block.match(/item-depart-title[^>]*>主管部门：<\/span>\s*([^<\n]+)/);
    const authority = authMatch ? authMatch[1].trim() : '';

    // Level
    const levelMatch = block.match(/sch-level-tag[^>]*>([^<]+)</);
    const level = levelMatch ? levelMatch[1].trim() : '';

    // Tier (双一流, 211, 985 etc.)
    const tierMatch = block.match(/sch-level-tag[^>]*>[^<]*<\/div>\s*([\s\S]*?)<\/div>/);
    let tier = '';
    if (tierMatch) {
      const tierTags = tierMatch[1].match(/sch-level-tag[^>]*>([^<]+)/g);
      if (tierTags) {
        tier = tierTags.map(t => {
          const m = t.match(/>([^<]+)/);
          return m ? m[1].trim() : '';
        }).filter(Boolean).join(',');
      }
    }

    // Info URL
    const urlMatch = block.match(/window\.open\('([^']+)'/);
    const infoUrl = urlMatch ? urlMatch[1] : '';

    schools.push({
      code: codeMatch[1],
      name,
      location,
      authority,
      level,
      tier,
      infoUrl,
    });
  }
  return schools;
}

async function fetchPage(start: number): Promise<string> {
  const url = `https://gaokao.chsi.com.cn/sch/search--ssdmList%5B0%5D-13,start-${start}.dhtml`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  return res.text();
}

async function main() {
  console.log('开始爬取阳光高考河北院校数据...');

  // First, find total pages
  const firstPage = await fetchPage(0);
  const maxStartMatch = firstPage.match(/start-(\d+)\.dhtml/g);
  const starts = maxStartMatch
    ? [...new Set(maxStartMatch.map(m => parseInt(m.match(/(\d+)/)![1])))]
    : [];
  const maxStart = Math.max(...starts, 0);
  console.log(`最大分页偏移: ${maxStart}, 预计 ${maxStart / 20 + 1} 页`);

  const allSchools: School[] = parseSchools(firstPage);
  console.log(`第1页: ${allSchools.length} 所院校`);

  // Fetch remaining pages
  for (let start = 20; start <= maxStart; start += 20) {
    const html = await fetchPage(start);
    const schools = parseSchools(html);
    console.log(`第${start / 20 + 1}页: ${schools.length} 所院校`);
    allSchools.push(...schools);
    // Be polite
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n总计爬取: ${allSchools.length} 所院校`);

  // Save raw data
  const outDir = path.join(process.cwd(), 'data', 'hebei', 'universities', '_raw');
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    path.join(outDir, 'schools.json'),
    JSON.stringify(allSchools, null, 2)
  );
  console.log(`数据已保存到 ${outDir}/schools.json`);
}

main().catch(console.error);
