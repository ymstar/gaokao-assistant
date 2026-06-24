import { promises as fs } from 'fs';
import path from 'path';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

interface SchoolBasic {
  code: string;
  name: string;
  location: string;
  authority: string;
  level: string;
  tier: string;
  infoUrl: string;
}

interface SchoolDetail {
  code: string;
  name: string;
  address: string;
  officialWebsite: string;
  admissionWebsite: string;
  phone: string;
}

// Step 1: Get schId mapping from list pages
async function getSchIdMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (let start = 0; start <= 120; start += 20) {
    const url = `https://gaokao.chsi.com.cn/sch/search--ssdmList%5B0%5D-13,start-${start}.dhtml`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const html = await res.text();
    const pairs = html.matchAll(/xh\/(\d+)\.jpg[\s\S]*?schoolInfo--schId-(\d+)/g);
    for (const m of pairs) {
      map.set(m[1], m[2]);
    }
    await new Promise(r => setTimeout(r, 300));
  }
  return map;
}

// Step 2: Fetch school detail from API
async function fetchSchoolDetail(schId: string): Promise<Partial<SchoolDetail>> {
  try {
    const res = await fetch(
      `https://gaokao.chsi.com.cn/wap/sch/schinfo/${schId}`,
      { headers: { 'User-Agent': UA, Accept: 'application/json' } }
    );
    const data = await res.json();
    if (data.flag && data.msg) {
      const m = data.msg;
      return {
        address: m.txdz || '',
        officialWebsite: m.xxwz || '',
        admissionWebsite: m.zswz || '',
        phone: m.dh || '',
      };
    }
  } catch {}
  return {};
}

async function main() {
  console.log('Step 1: 获取 schId 映射...');
  const schIdMap = await getSchIdMap();
  console.log(`  找到 ${schIdMap.size} 所院校的 schId`);

  // Load existing basic data
  const basicPath = path.join(process.cwd(), 'data', 'hebei', 'universities', '_raw', 'schools.json');
  const basics: SchoolBasic[] = JSON.parse(await fs.readFile(basicPath, 'utf-8'));

  console.log(`Step 2: 爬取 ${basics.length} 所院校详情...`);

  const details: SchoolDetail[] = [];
  let done = 0;

  for (const school of basics) {
    const schId = schIdMap.get(school.code);
    if (!schId) {
      console.log(`  [${++done}/${basics.length}] ${school.name} (${school.code}) - 无 schId，跳过`);
      details.push({ code: school.code, name: school.name, address: '', officialWebsite: '', admissionWebsite: '', phone: '' });
      continue;
    }

    const detail = await fetchSchoolDetail(schId);
    details.push({
      code: school.code,
      name: school.name,
      address: detail.address || '',
      officialWebsite: detail.officialWebsite || '',
      admissionWebsite: detail.admissionWebsite || '',
      phone: detail.phone || '',
    });

    done++;
    if (done % 10 === 0 || done === basics.length) {
      console.log(`  [${done}/${basics.length}] ${school.name} - 地址: ${(detail.address || '').slice(0, 30)}...`);
    }

    await new Promise(r => setTimeout(r, 200));
  }

  // Save details
  const outDir = path.join(process.cwd(), 'data', 'hebei', 'universities', '_raw');
  await fs.writeFile(path.join(outDir, 'school-details.json'), JSON.stringify(details, null, 2));
  console.log(`\n详情数据已保存 (${details.length} 条)`);

  // Merge with basic data and save final university data
  const merged = basics.map(b => {
    const d = details.find(dd => dd.code === b.code);
    return {
      code: b.code,
      name: b.name,
      nameShort: b.name.replace(/[（(].+[)）]/, ''),
      location: '河北',
      authority: b.authority,
      level: b.level,
      tier: b.tier || '',
      type: b.level === '本科' ? '一本' : '高职专科',
      address: d?.address || '',
      officialWebsite: d?.officialWebsite || '',
      admissionWebsite: d?.admissionWebsite || '',
      phone: d?.phone || '',
      chsiUrl: `https://gaokao.chsi.com.cn/sch/schoolInfo--schId-${schIdMap.get(b.code) || ''}.dhtml`,
      admissionScores: [],
    };
  });

  const commonDir = path.join(process.cwd(), 'data', 'hebei', 'universities', '_common');
  await fs.writeFile(path.join(commonDir, '院校基本信息.json'), JSON.stringify(merged, null, 2));
  console.log(`合并数据已保存到 _common/院校基本信息.json`);
}

main().catch(console.error);
