import { InvestigationPageContent } from './InvestigationPageContent'

export const dynamic = 'force-dynamic'

export default async function InvestigationPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentId?: string }>
}) {
  const params = await searchParams
  const paymentId =
    typeof params?.paymentId === 'string'
      ? params.paymentId
      : null

  return (
    <InvestigationPageContent paymentId={paymentId} />
  )
}
