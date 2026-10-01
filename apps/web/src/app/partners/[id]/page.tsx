import { PartnerLedgerScreen } from '@/features/partners/components/partner-ledger-screen';

export const metadata = {
  title: 'Kartica partnera',
};

export default async function PartnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <PartnerLedgerScreen partnerId={id} />;
}
