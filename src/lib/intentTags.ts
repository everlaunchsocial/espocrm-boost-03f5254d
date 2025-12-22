// Predefined intent tags for lead classification
export const INTENT_TAGS = [
  { value: 'urgent', label: 'Urgent / Time-Sensitive', emoji: '🔥', color: 'bg-red-500/10 text-red-600' },
  { value: 'high_budget', label: 'High Budget', emoji: '💰', color: 'bg-green-500/10 text-green-600' },
  { value: 'cold', label: 'Cold / No Response', emoji: '❄️', color: 'bg-blue-500/10 text-blue-500' },
  { value: 'waiting_reply', label: 'Waiting on Reply', emoji: '⏱️', color: 'bg-amber-500/10 text-amber-600' },
  { value: 'needs_demo', label: 'Needs Demo', emoji: '🧠', color: 'bg-purple-500/10 text-purple-600' },
  { value: 'just_curious', label: 'Just Curious', emoji: '🧼', color: 'bg-slate-500/10 text-slate-600' },
  { value: 'scheduling_conflict', label: 'Scheduling Conflict', emoji: '📅', color: 'bg-orange-500/10 text-orange-600' },
  { value: 'ghosted', label: 'Ghosted', emoji: '👻', color: 'bg-gray-500/10 text-gray-500' },
  { value: 'sms_only', label: 'Wants SMS Only', emoji: '💬', color: 'bg-cyan-500/10 text-cyan-600' },
  { value: 'ready_to_buy', label: 'Ready to Buy', emoji: '🎯', color: 'bg-emerald-500/10 text-emerald-600' },
  { value: 'price_sensitive', label: 'Price Sensitive', emoji: '💵', color: 'bg-yellow-500/10 text-yellow-600' },
  { value: 'decision_maker', label: 'Decision Maker', emoji: '👔', color: 'bg-indigo-500/10 text-indigo-600' },
] as const;

export type IntentTagValue = typeof INTENT_TAGS[number]['value'];

export function getIntentTagConfig(tag: string) {
  return INTENT_TAGS.find(t => t.value === tag) || {
    value: tag,
    label: tag,
    emoji: '🏷️',
    color: 'bg-muted text-muted-foreground',
  };
}
