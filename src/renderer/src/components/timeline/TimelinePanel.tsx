import { useMemo } from 'react'
import { buildTimelineModel } from '@shared/deriveTimeline'
import { useAppStore } from '../../store/useAppStore'
import { LaneTreeColumn } from './LaneTreeColumn'
import { TimelineSvg } from './TimelineSvg'
import { WeekAxis } from './WeekAxis'

const DAY_WIDTH = 38
const LANE_HEIGHT = 36

export function TimelinePanel(): JSX.Element {
  const document = useAppStore((s) => s.document)
  const customerId = useAppStore((s) => s.selectedCustomerId)
  const projectId = useAppStore((s) => s.selectedProjectId)
  const selectedTaskId = useAppStore((s) => s.selectedTaskId)
  const selectTask = useAppStore((s) => s.selectTask)

  const project = useMemo(() => {
    if (!document || !customerId || !projectId) return null
    const c = document.customers.find((x) => x.id === customerId)
    return c?.projects.find((p) => p.id === projectId) ?? null
  }, [document, customerId, projectId])

  const model = useMemo(() => {
    if (!project) return null
    return buildTimelineModel(project)
  }, [project])

  const getTaskTitle = (id: string): string => {
    const t = project?.tasks.find((x) => x.id === id)
    return t?.title ?? id
  }

  if (!document) {
    return (
      <div className="panel center">
        <div className="empty-hint">Loading…</div>
      </div>
    )
  }

  if (!customerId || !projectId || !project) {
    return (
      <div className="panel center">
        <div className="panel-header">Timeline</div>
        <div className="empty-hint">Select a customer and project to view the timeline.</div>
      </div>
    )
  }

  if (!model) return null

  const chartHeight = Math.max(1, model.lanes.length) * LANE_HEIGHT

  return (
    <div className="panel center timeline-workspace">
      <div className="panel-header">Timeline</div>
      <div className="timeline-toolbar">
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{project.name}</span>
      </div>
      <div className="timeline-body">
        <LaneTreeColumn customerId={customerId} project={project} />
        <div className="timeline-scroll">
          <div className="timeline-inner">
            <div style={{ minHeight: chartHeight }}>
              <TimelineSvg
                model={model}
                selectedTaskId={selectedTaskId}
                onSelectTask={(id) => selectTask(id)}
                getTaskTitle={getTaskTitle}
                dayWidth={DAY_WIDTH}
                laneHeight={LANE_HEIGHT}
              />
            </div>
            <div className="week-axis-wrap">
              <WeekAxis model={model} dayWidth={DAY_WIDTH} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
