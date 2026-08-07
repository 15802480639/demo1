export default function AdminDashboard() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>
      {/* TODO: 统计卡片来自 Prisma（销售额 / 订单数 / 低库存预警） */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {["Orders", "Revenue", "Customers"].map((k) => (
          <div key={k} className="rounded-xl border bg-white p-6">
            <p className="text-sm text-zinc-500">{k}</p>
            <p className="mt-2 text-2xl font-semibold">—</p>
          </div>
        ))}
      </div>
    </div>
  );
}
