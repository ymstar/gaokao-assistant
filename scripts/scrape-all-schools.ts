import { promises as fs } from 'fs';
import path from 'path';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
const BASE = 'https://gaokao.chsi.com.cn';

// Province code mapping (阳光高考 uses these codes)
const PROVINCES: Record<string, string> = {
  '11': '北京', '12': '天津', '13': '河北', '14': '山西', '15': '内蒙古',
  '21': '辽宁', '22': '吉林', '23': '黑龙江', '31': '上海', '32': '江苏',
  '33': '浙江', '34': '安徽', '35': '福建', '36': '江西', '37': '山东',
  '41': '河南', '42': '湖北', '43': '湖南', '44': '广东', '45': '广西',
  '46': '海南', '50': '重庆', '51': '四川', '52': '贵州', '53': '云南',
  '54': '西藏', '61': '陕西', '62': '甘肃', '63': '青海', '64': '宁夏',
  '65': '新疆',
};

function parseSchoolBlock(block: string) {
  const codeM = block.match(/xh\/(\d+)\.jpg/);
  const schIdM = block.match(/schoolInfo--schId-(\d+)/);
  const nameM = block.match(/class="name[^"]*">\s*([^<\s]+)/);
  const locM = block.match(/iconfont[^>]*>[^<]*<\/i>([^<]*?)<span class="col-line"/);
  const authM = block.match(/item-depart-title[^>]*>主管部门：<\/span>\s*([^<\n]+)/);
  const levelM = block.match(/sch-level-tag[^>]*>([^<]+)/);
  // Tier: look for tags after the first sch-level-tag
  let tier = '';
  const tierM = block.match(/sch-level-tag[^>]*>[^<]*<\/div>\s*([\s\S]*?)<\/div>/);
  if (tierM) {
    const tags = tierM[1].match(/sch-level-tag[^>]*>([^<]+)/g);
    if (tags) tier = tags.map(t => t.match(/>([^<]+)/)?.[1]?.trim() || '').filter(Boolean).join(',');
  }

  if (!codeM) return null;
  return {
    code: codeM[1],
    schId: schIdM?.[1] || '',
    name: nameM?.[1]?.replace(/\s+/g, '').trim() || '',
    location: locM?.[1]?.trim() || '',
    authority: authM?.[1]?.trim() || '',
    level: levelM?.[1]?.trim() || '',
    tier,
  };
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  return res.text();
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const startTime = Date.now();

  // ========== PHASE 1: Scrape all list pages ==========
  console.log('=== Phase 1: 爬取全国院校列表 ===');

  // First, get total pages from the all-schools listing
  const firstPage = await fetchPage(`${BASE}/sch/search--ss-on,option-qg,searchType-1,start-0.dhtml`);
  const maxStartMatch = firstPage.match(/start-(\d+)\.dhtml/g);
  const maxStart = maxStartMatch
    ? Math.max(...[...new Set(maxStartMatch.map(m => parseInt(m.match(/(\d+)/)![1])))])
    : 0;
  const totalPages = Math.floor(maxStart / 20) + 1;
  console.log(`共 ${totalPages} 页, 预计 ~${maxStart + 20} 所院校`);

  const allSchools: any[] = [];

  for (let page = 0; page < totalPages; page++) {
    const start = page * 20;
    const url = `${BASE}/sch/search--ss-on,option-qg,searchType-1,start-${start}.dhtml`;
    const html = await fetchPage(url);

    const blocks = html.split('<div class="sch-item"');
    for (let i = 1; i < blocks.length; i++) {
      const school = parseSchoolBlock(blocks[i]);
      if (school && school.name) allSchools.push(school);
    }

    if ((page + 1) % 10 === 0 || page === totalPages - 1) {
      console.log(`  第 ${page + 1}/${totalPages} 页, 累计 ${allSchools.length} 所`);
    }
    await sleep(200);
  }

  console.log(`\n列表爬取完成: ${allSchools.length} 所院校`);

  // ========== PHASE 2: Fetch detail info from API ==========
  console.log('\n=== Phase 2: 爬取院校详情 (地址/官网/电话) ===');

  let detailDone = 0;
  const total = allSchools.length;

  for (const school of allSchools) {
    if (!school.schId) {
      detailDone++;
      continue;
    }
    try {
      const res = await fetch(`${BASE}/wap/sch/schinfo/${school.schId}`, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
      });
      const data = await res.json();
      if (data.flag && data.msg) {
        school.address = data.msg.txdz || '';
        school.officialWebsite = data.msg.xxwz || '';
        school.admissionWebsite = data.msg.zswz || '';
        school.phone = data.msg.dh || '';
      }
    } catch {}

    detailDone++;
    if (detailDone % 50 === 0 || detailDone === total) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(`  [${detailDone}/${total}] ${elapsed}s elapsed`);
    }
    await sleep(150);
  }

  // ========== PHASE 3: Group by province and save ==========
  console.log('\n=== Phase 3: 按省份分组保存 ===');

  const byProvince = new Map<string, any[]>();
  for (const school of allSchools) {
    // Find province code from location or authority
    let provinceCode = '';
    for (const [code, name] of Object.entries(PROVINCES)) {
      if (school.location === name || school.location?.includes(name)) {
        provinceCode = code;
        break;
      }
    }
    if (!provinceCode) provinceCode = 'other';

    if (!byProvince.has(provinceCode)) byProvince.set(provinceCode, []);
    byProvince.get(provinceCode)!.push(school);
  }

  const dataDir = path.join(process.cwd(), 'data');

  for (const [provCode, schools] of byProvince) {
    const provName = PROVINCES[provCode] || provCode;
    const provDir = provCode === 'other' ? 'other' : provCode;
    const outDir = path.join(dataDir, provDir, 'universities', '_common');
    await fs.mkdir(outDir, { recursive: true });

    const formatted = schools.map(s => ({
      code: s.code,
      name: s.name,
      nameShort: s.name.replace(/[（(].+[)）]/, ''),
      location: provName,
      authority: s.authority || '',
      level: s.level || '',
      tier: s.tier || '',
      address: s.address || '',
      officialWebsite: s.officialWebsite || '',
      admissionWebsite: s.admissionWebsite || '',
      phone: s.phone || '',
      chsiUrl: s.schId ? `${BASE}/sch/schoolInfo--schId-${s.schId}.dhtml` : '',
      admissionScores: [],
    }));

    await fs.writeFile(path.join(outDir, '院校基本信息.json'), JSON.stringify(formatted, null, 2));
    console.log(`  ${provName} (${provCode}): ${schools.length} 所`);
  }

  // Also save the full dataset
  await fs.writeFile(path.join(dataDir, '_all-schools.json'), JSON.stringify(allSchools, null, 2));

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n全部完成! 共 ${allSchools.length} 所院校, ${byProvince.size} 个省份, 耗时 ${elapsed} 分钟`);
}

main().catch(console.error);
