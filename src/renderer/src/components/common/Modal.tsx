import type { ReactNode } from 'react'

export function Modal({
  title,
  children,
  onClose,
  footer
}: {
  title: string
  children: ReactNode
  onClose: () => void
  footer?: ReactNode
}): JSX.Element {
  return (
    <div className="modal-overlay" role="presentation" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2>{title}</h2>
        {children}
        {footer}
      </div>
    </div>
  )
}
