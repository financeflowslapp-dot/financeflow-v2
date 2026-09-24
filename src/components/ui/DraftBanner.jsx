// Lightweight, mobile-friendly "resume unfinished work?" prompt.
// Used together with useDraftPersistence — shown whenever pendingDraft is non-null.
export function DraftBanner({
  onContinue,
  onDiscard,
  title = 'Unfinished draft found',
  description = 'Would you like to continue where you left off?',
}) {
  return (
    <div className="draft-banner" role="status">
      <div className="draft-banner-text">
        <span className="draft-banner-title">📝 {title}</span>
        <span className="draft-banner-desc">{description}</span>
      </div>
      <div className="draft-banner-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDiscard}>Discard</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={onContinue}>Continue Draft</button>
      </div>
    </div>
  )
}
