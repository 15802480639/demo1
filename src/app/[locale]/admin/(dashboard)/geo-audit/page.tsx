import { runGeoAudit } from '@/lib/geo-audit';
import GeoHealthCheck from '@/components/admin/geo-health-check';

/**
 * GEO 体检页（服务端算分，客户端只负责渲染与交互）。
 * 分数在服务端算，避免把整库统计逻辑暴露到浏览器。
 */
export const dynamic = 'force-dynamic';

export default async function AdminGeoAuditPage() {
  const audit = await runGeoAudit();
  return <GeoHealthCheck audit={audit} />;
}