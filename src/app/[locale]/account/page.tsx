import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { getSession } from '@/lib/auth';
import { getOrdersByUser } from '@/lib/services/order-service';
import { getUserPoints, getPointRule } from '@/lib/points';
import { prisma } from '@/lib/prisma';
import { getOrCreateInviteCode } from '@/lib/invite';
import { AccountMenu } from '@/components/account/account-menu';
import { AddressManager } from '@/components/account/address-manager';
import { PasswordForm } from '@/components/account/password-form';
import { InviteCodeCard } from '@/components/account/invite-code-card';

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc = (isLocale(locale) ? locale : 'ko') as Locale;
  const dict = getDictionary(loc);
  const session = await getSession();
  if (!session) redirect(`/${loc}/login?redirect=/${loc}/account`);

  const [orders, points, rule, couponCount, inviteCode, me] = await Promise.all([
    getOrdersByUser(session.id),
    getUserPoints(session.id),
    getPointRule(),
    prisma.userCoupon
      .count({
        where: {
          userId: session.id,
          status: 'available',
          OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
        },
      })
      .catch(() => 0),
    getOrCreateInviteCode(session.id),
    prisma.user.findUnique({
      where: { id: session.id },
      select: {
        invitedBy: { select: { name: true, username: true } },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-[900px] px-4 sm:px-8 py-12">
      <h1 className="font-display text-4xl sm:text-6xl text-ink mb-2">
        {dict.nav.account}
      </h1>
      <p className="text-muted mb-6">
        {session.name ? `${session.name} · ` : ''}
        {session.email ?? session.username ?? ''}
      </p>

      {/* 积分卡片 */}
      {rule.enabled && (
        <Link
          href={`/${loc}/account/points`}
          className="block border border-accent/40 bg-accent/5 px-5 py-4 mb-6 hover:bg-accent/10 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs tracking-widest text-muted mb-1">
                {loc === 'zh' ? '我的积分' : loc === 'en' ? 'My points' : '내 포인트'}
              </p>
              <p className="font-display text-3xl text-accent">
                {points.toLocaleString()}
                <span className="text-sm text-muted ml-1.5">
                  {loc === 'zh' ? '分' : loc === 'en' ? 'pts' : 'P'}
                </span>
              </p>
              <p className="text-xs text-muted mt-1">
                {loc === 'zh'
                  ? `订单实付满 ${rule.minSpendForUse.toLocaleString()}₩ 可用积分抵扣`
                  : loc === 'en'
                    ? `Use points on orders over ₩${rule.minSpendForUse.toLocaleString()}`
                    : `₩${rule.minSpendForUse.toLocaleString()} 이상 주문에서 포인트 사용 가능`}
              </p>
            </div>
            <span className="text-xs tracking-widest text-accent whitespace-nowrap">
              {loc === 'zh' ? '查看明细 →' : loc === 'en' ? 'Details →' : '내역 보기 →'}
            </span>
          </div>
        </Link>
      )}

      <AccountMenu ordersCount={orders.length} points={points} coupons={couponCount} />

      {inviteCode && (
        <div className="mt-6">
          <InviteCodeCard
            code={inviteCode}
            labels={{
              title: dict.account.inviteTitle,
              desc: dict.account.inviteDesc,
              codeLabel: dict.account.inviteCodeLabel,
              copy: dict.account.copyBtn,
              copied: dict.account.copied,
              hint: dict.account.inviteHint,
              uplineLabel: dict.account.uplineLabel,
              uplineName:
                me?.invitedBy?.name ?? me?.invitedBy?.username ?? null,
            }}
          />
        </div>
      )}

      <div className="mt-10 space-y-6">
        <AddressManager />
        <PasswordForm locale={loc} />
      </div>
    </div>
  );
}
