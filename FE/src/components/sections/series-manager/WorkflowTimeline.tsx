import { CheckCircle2, Clock, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface WorkflowTimelineProps {
  status: string
}

export function WorkflowTimeline({ status = 'Draft' }: WorkflowTimelineProps) {
  const { t } = useTranslation()

  const steps = [
    { key: 'Draft', label: t('seriesManager.statusDraft', 'Draft') },
    { key: 'Pending_Editor', label: t('seriesManager.statusPendingEditor', 'Editor Production') },
    { key: 'Pending_EB', label: t('seriesManager.statusPendingEB', 'EB Review') },
    { key: 'Active', label: t('seriesManager.statusActive', 'Active') },
  ]

  const statuses = ['Draft', 'Pending_Editor', 'Pending_EB', 'Active']
  const currentIdx = statuses.indexOf(status)

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2.5">
        {t('seriesManager.workflowStatus', 'Workflow Status')}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {steps.map((step, idx) => {
          const stepIdx = statuses.indexOf(step.key)
          const isCompleted = stepIdx < currentIdx
          const isCurrent = stepIdx === currentIdx

          return (
            <div key={step.key} className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border transition-all ${
                  isCompleted
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : isCurrent
                    ? 'bg-blue-50 text-blue-700 border-blue-200 ring-2 ring-blue-100/40'
                    : 'bg-neutral-50 text-neutral-400 border-neutral-100'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="size-3.5 text-emerald-600 animate-fade-in" />
                ) : isCurrent ? (
                  <Clock className="size-3.5 text-blue-600 animate-pulse" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
                )}
                {step.label}
              </span>
              {idx < steps.length - 1 && (
                <ChevronRight className="size-3.5 text-neutral-300 shrink-0" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
