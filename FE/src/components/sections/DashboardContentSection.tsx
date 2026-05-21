import { KpiCardsSection } from './KpiCardsSection'
import { RoleStripSection } from './RoleStripSection'
import { SeriesRankingSection } from './SeriesRankingSection'
import { WorkflowBoardSection } from './WorkflowBoardSection'
import { RoleCtaSection } from './RoleCtaSection'

export function DashboardContentSection() {
  return (
    <div className="flex flex-1 flex-col gap-6 overflow-hidden p-4 sm:p-6 lg:p-8">
      <KpiCardsSection />
      <WorkflowBoardSection />
      <SeriesRankingSection />
      <RoleStripSection />
      <RoleCtaSection />
    </div>
  )
}
