import { UserRole } from '../models/User'

export type SeriesStatus =
  | 'Draft'
  | 'Submitted'
  | 'Needs Revision'
  | 'Approved by Editor'
  | 'Board Review'
  | 'Published'
  | 'Rejected'
  | 'Active'
  | 'Completed'
  | 'Hiatus'

export type SeriesWorkflowStage = 'mangaka' | 'editor' | 'board' | 'published'

export const WORKFLOW_STAGE_BY_STATUS: Record<SeriesStatus, SeriesWorkflowStage> = {
  Draft: 'mangaka',
  Submitted: 'editor',
  'Needs Revision': 'mangaka',
  'Approved by Editor': 'board',
  'Board Review': 'board',
  Published: 'published',
  Rejected: 'published',
  Active: 'published',
  Completed: 'published',
  Hiatus: 'published',
}

export const SUBMITTABLE_STATUSES: SeriesStatus[] = ['Draft', 'Needs Revision']

export const REVIEW_STATUS_BY_ROLE: Record<UserRole, SeriesStatus[]> = {
  reader: [],
  mangaka: [],
  assistant: ['Needs Revision', 'Approved by Editor', 'Board Review', 'Rejected'],
  editor: ['Needs Revision', 'Approved by Editor', 'Board Review', 'Rejected'],
  editorial_board: ['Needs Revision', 'Approved by Editor', 'Board Review', 'Rejected', 'Published', 'Active'],
}

export function canSubmitSeries(status: string | undefined) {
  return !!status && SUBMITTABLE_STATUSES.includes(status as SeriesStatus)
}

export function isReviewAllowed(role: UserRole, status: string) {
  return REVIEW_STATUS_BY_ROLE[role].includes(status as SeriesStatus)
}

export function getWorkflowStageForStatus(status: SeriesStatus): SeriesWorkflowStage {
  return WORKFLOW_STAGE_BY_STATUS[status]
}

export function getReviewStatusesForRole(role: UserRole): SeriesStatus[] {
  return REVIEW_STATUS_BY_ROLE[role]
}
