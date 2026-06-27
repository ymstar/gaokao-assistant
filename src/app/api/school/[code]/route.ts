import { NextRequest, NextResponse } from 'next/server';
import { getSchoolById, getImageCode } from '@/lib/db/gaokao-schools';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const schoolId = parseInt(code, 10);

  if (isNaN(schoolId)) {
    return NextResponse.json({ error: 'Invalid school code' }, { status: 400 });
  }

  const data = getSchoolById(schoolId);

  if (!data.school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 });
  }

  // 构建 University 兼容结构
  const university = {
    code: String(data.school.school_id),
    imageCode: getImageCode(data.school.school_id),
    name: data.school.name,
    location: data.school.province,
    city: data.school.city,
    level: data.school.level === '普通本科' ? '本科' : data.school.level === '专科（高职）' ? '高职(专科)' : data.school.level,
    tier: data.labels.filter(l => ['985', '211', '双一流'].includes(l.name)).map(l => l.name).join(' ') || undefined,
    type: data.detail?.type_name || undefined,
    authority: data.detail?.belong || undefined,
    address: data.detail?.address || undefined,
    phone: data.detail?.phone || undefined,
    officialWebsite: data.detail?.school_site || undefined,
    admissionWebsite: data.detail?.site || undefined,
    motto: data.detail?.motto || undefined,
    createDate: data.detail?.create_date || undefined,
    area: data.detail?.area || undefined,
    shortNames: data.detail?.short_names || undefined,
    content: data.detail?.content || undefined,
    numSubject: data.detail?.num_subject || undefined,
    numMaster: data.detail?.num_master || undefined,
    numDoctor: data.detail?.num_doctor || undefined,
    numAcademician: data.detail?.num_academician || undefined,
    numLibrary: data.detail?.num_library || undefined,
    numLab: data.detail?.num_lab || undefined,
    recommendMasterRate: data.detail?.recommend_master_rate || undefined,
    upgradingRate: data.detail?.upgrading_rate || undefined,
    // 扩展数据
    rankings: data.rankings,
    dualClass: data.dualClass,
    specials: data.specials,
    xuekeRanks: data.xuekeRanks,
    academicPoints: data.academicPoints,
    labels: data.labels,
    campuses: data.campuses,
  };

  return NextResponse.json({
    code,
    university,
    plans: [],
    lines: [],
  });
}