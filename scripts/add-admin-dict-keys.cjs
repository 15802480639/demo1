// 一次性脚本：向 AdminDict 类型与 ko/zh/en 三语 admin 对象中插入新键
// ⚠️ 一次性脚本，执行后即可删除。
//
// ⭐ 为什么要脚本插入而不是手改三处：
//   三语段落相隔近千行，手改极易漏改某一种语言（记忆库铁律：
//   "批量改多语言极易把中文写进 ko 段，改完必须 Read 复核"）。
//   这里用脚本保证三语同时插入、键名完全一致，插完再逐一复核。

const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, '../src/i18n/dictionaries.ts');

/**
 * 新增键清单。
 * 每个键三语对照，缺任一语言都会被脚本拒绝（防止漏翻）。
 */
const NEW_KEYS = [
  // ---- 侧边栏导航 ----
  ['navReports', '매출 리포트', '销售报表', 'Sales Reports'],
  ['navAuditLogs', '작업 로그', '操作日志', 'Audit Logs'],
  ['navStaff', '관리자 권한', '管理员权限', 'Staff & Roles'],
  ['navImport', 'Excel 일괄 등록', 'Excel 批量导入', 'Excel Import'],
  ['roleLabelTip', '현재 관리자 권한 등급입니다.', '当前管理员的权限档位。', 'Your current admin permission tier.'],

  // ---- 权限分级页 ----
  ['staffTitle', '관리자 권한 관리', '管理员权限管理', 'Staff Permissions'],
  ['staffIntro', '관리자별 권한 등급을 지정합니다. 권한 변경은 즉시 적용됩니다.', '为每位管理员指定权限档位，权限变更立即生效。', 'Assign a permission tier to each admin. Changes apply immediately.'],
  ['staffRole', '권한 등급', '权限档位', 'Permission tier'],
  ['staffCurrent', '현재 등급', '当前档位', 'Current tier'],
  ['staffChangeRole', '등급 변경', '变更档位', 'Change tier'],
  ['staffRoleChanged', '권한 등급이 변경되었습니다', '权限档位已变更', 'Permission tier updated'],
  ['staffAgents', '상담원 권한', '客服权限', 'Agent permissions'],
  ['staffAgentRole', '상담원 권한 등급', '客服权限档位', 'Agent tier'],
  ['staffOwnerOnly', '권한 관리는 소유자만 할 수 있습니다.', '仅所有者可管理权限。', 'Only the owner can manage permissions.'],

  // ---- Excel 导入 ----
  ['impTitle', 'Excel 일괄 등록/수정', 'Excel 批量导入 / 修改', 'Excel Bulk Import'],
  ['impIntro', '상품 정보를 엑셀로 일괄 등록하거나 수정합니다. 같은 slug가 있으면 수정, 없으면 신규 등록됩니다.', '用 Excel 批量新建或修改商品。已存在相同 slug 的会更新，否则新建。', 'Bulk create or update products via Excel. Existing slug is updated, otherwise created.'],
  ['impDownloadTpl', '양식 다운로드', '下载模板', 'Download template'],
  ['impSelectFile', '엑셀 파일 선택', '选择 Excel 文件', 'Choose Excel file'],
  ['impUpload', '업로드 및 실행', '上传并执行', 'Upload & run'],
  ['impParsing', '분석 중...', '解析中…', 'Parsing…'],
  ['impDone', '완료', '完成', 'Done'],
  ['impCreated', '신규 등록', '新建', 'Created'],
  ['impUpdated', '수정됨', '更新', 'Updated'],
  ['impSkipped', '건너뜀', '跳过', 'Skipped'],
  ['impFailed', '실패', '失败', 'Failed'],
  ['impRow', '행', '行', 'Row'],
  ['impErrorList', '오류 내역', '错误明细', 'Errors'],
  ['impDryRun', '미리보기(저장 안 함)', '试运行（不写入）', 'Dry run (no save)'],
  ['impColName', '상품명', '商品名', 'Product name'],
  ['impColSlug', '슬러그', 'Slug', 'Slug'],
  ['impColCode', '품번', '货号', 'Item code'],
  ['impColPrice', '가격', '价格', 'Price'],
  ['impColStock', '재고', '库存', 'Stock'],
  ['impColColor', '색상', '颜色', 'Color'],
  ['impColSize', '사이즈', '尺码', 'Size'],
  ['impColCategory', '카테고리', '分类', 'Category'],
  ['impColBrand', '브랜드', '品牌', 'Brand'],
  ['impColStatus', '상태', '状态', 'Status'],
  ['impColSkuCode', 'SKU 코드', 'SKU 编码', 'SKU code'],
  ['impColGender', '성별', '性别', 'Gender'],
  ['impColCompare', '비교가', '划线价', 'Compare at'],
  ['impHint', '색상/사이즈가 있으면 SKU가 자동 생성됩니다. 같은 상품+같은 옵션의 행은 SKU 하나로 합쳐집니다.', '填了颜色/尺码会自动生成 SKU。同一商品 + 同一选项的多行会合并为一个 SKU。', 'Fill Color/Size to auto-create SKUs. Rows with the same product and options merge into one SKU.'],

  // ---- 导出 ----
  ['expTitle', '데이터 내보내기', '数据导出', 'Data Export'],
  ['expOrders', '주문 내보내기', '导出订单', 'Export orders'],
  ['expCustomers', '회원 내보내기', '导出会员', 'Export members'],
  ['expSales', '매출 리포트 내보내기', '导出销售报表', 'Export sales report'],
  ['expRange7', '최근 7일', '最近 7 天', 'Last 7 days'],
  ['expRange30', '최근 30일', '最近 30 天', 'Last 30 days'],
  ['expRange90', '최근 90일', '最近 90 天', 'Last 90 days'],
  ['expRangeAll', '전체', '全部', 'All'],
  ['expWorking', '내보내는 중...', '导出中…', 'Exporting…'],
  ['expDone', '내보내기가 완료되었습니다', '导出完成', 'Export completed'],

  // ---- 销售报表 ----
  ['repTitle', '매출 리포트', '销售报表', 'Sales Report'],
  ['repIntro', '기간별 매출, 주문 수, 평균 주문 금액을 확인합니다.', '按期间查看销售额、订单数与客单价。', 'View revenue, order count and average order value by period.'],
  ['repDate', '날짜', '日期', 'Date'],
  ['repOrders', '주문 수', '订单数', 'Orders'],
  ['repItems', '수량', '件数', 'Items'],
  ['repRevenue', '매출액', '销售额', 'Revenue'],
  ['repAov', '평균 주문 금액', '客单价', 'Avg order value'],
  ['repNewCustomers', '신규 회원', '新增会员', 'New members'],
  ['repSummary', '요약', '汇总', 'Summary'],
  ['repTotalRevenue', '총 매출액', '总销售额', 'Total revenue'],
  ['repTotalOrders', '총 주문 수', '总订单数', 'Total orders'],
  ['repTotalItems', '총 수량', '总件数', 'Total items'],
  ['repAvgOrder', '평균 주문 금액', '客单价', 'Avg order value'],
  ['repEmpty', '해당 기간의 데이터가 없습니다.', '该期间暂无数据。', 'No data in this period.'],

  // ---- 操作日志 ----
  ['audTitle', '작업 로그', '操作日志', 'Audit Log'],
  ['audIntro', '관리자의 변경 이력을 확인합니다.', '查看管理员的操作记录。', 'Review admin operation history.'],
  ['audActor', '작업자', '操作人', 'Actor'],
  ['audAction', '작업', '操作', 'Action'],
  ['audTarget', '대상', '对象', 'Target'],
  ['audSummary', '내용', '内容', 'Detail'],
  ['audTime', '시각', '时间', 'Time'],
  ['audAll', '전체 작업', '全部操作', 'All actions'],
  ['audEmpty', '작업 로그가 없습니다.', '暂无操作日志。', 'No audit logs yet.'],

  // ---- 聊天-订单关联 ----
  ['chatOrderLink', '연결된 주문', '关联订单', 'Linked order'],
  ['chatOrderNone', '연결된 주문 없음', '未关联订单', 'No linked order'],
  ['chatLinkOrder', '주문 연결', '关联订单', 'Link order'],
  ['chatLinkOrderPh', '주문번호 입력', '输入订单号', 'Enter order no.'],
  ['chatLinked', '주문이 연결되었습니다', '订单已关联', 'Order linked'],
  ['chatOrderTotal', '주문 금액', '订单金额', 'Order total'],
  ['chatOrderStatus', '주문 상태', '订单状态', 'Order status'],
];

const src = fs.readFileSync(FILE, 'utf8');
const lines = src.split(/\r?\n/);

// ---- 1) 插入类型声明（AdminDict 类型，269 行起）----
const typeStart = lines.findIndex((l) => l.startsWith('export type AdminDict = {'));
if (typeStart === -1) throw new Error('AdminDict type not found');
// 找到类型结束行（行首 "};"）
let typeEnd = -1;
for (let i = typeStart + 1; i < lines.length; i++) {
  if (lines[i] === '};') { typeEnd = i; break; }
}
if (typeEnd === -1) throw new Error('AdminDict type end not found');

const typeInserts = NEW_KEYS.map(([k]) => `  ${k}: string;`);
lines.splice(typeEnd, 0, ...typeInserts);

// ---- 2) 定位三语 admin 对象并插入 ----
// 三语对象起始行号（插入类型后行号会偏移，所以从后往前插）
const adminStarts = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i] === '  admin: {') adminStarts.push(i);
}
if (adminStarts.length !== 3) {
  throw new Error(`expected 3 admin objects, found ${adminStarts.length}`);
}
// 语言顺序：ko, zh, en
const LANGS = ['ko', 'zh', 'en'];

// 从后往前处理，避免行号偏移
for (let k = adminStarts.length - 1; k >= 0; k--) {
  const start = adminStarts[k];
  const lang = LANGS[k];
  // 找到该对象的结束（行首 "  }," 且缩进 2）
  let end = -1;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i] === '  },') { end = i; break; }
  }
  if (end === -1) throw new Error(`admin object end not found for ${lang}`);
  const inserts = NEW_KEYS.map(([key, ko, zh, en]) => {
    const val = lang === 'ko' ? ko : lang === 'zh' ? zh : en;
    if (!val) throw new Error(`missing ${lang} value for ${key}`);
    return `    ${key}: '${val.replace(/'/g, "\\'")}',`;
  });
  lines.splice(end, 0, ...inserts);
}

fs.writeFileSync(FILE, lines.join('\n'), 'utf8');
console.log(`inserted ${NEW_KEYS.length} keys into AdminDict type + 3 languages`);
