// Finds all incomplete goals that match a given transaction's category + note.
// Matching rules:
//   1. Goal must have a linked_categories entry equal to the transaction category.
//   2. If the goal has trigger_keywords — at least one must appear in the note.
//   3. If no keywords are set — category match alone is enough.
export function findMatchingGoals(goals, category, note = '') {
  if (!category) return []
  const catLower  = category.toLowerCase()
  const noteLower = (note || '').toLowerCase()
  return goals.filter(g => {
    if (Number(g.saved) >= Number(g.target)) return false // completed — skip
    const cats = Array.isArray(g.linked_categories) ? g.linked_categories : []
    if (!cats.some(c => c.toLowerCase() === catLower)) return false
    const kws = Array.isArray(g.trigger_keywords) ? g.trigger_keywords.filter(Boolean) : []
    if (kws.length === 0) return true // no keywords = category alone triggers
    return kws.some(kw => noteLower.includes(kw.toLowerCase()))
  })
}
