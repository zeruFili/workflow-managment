export const PENDING_REVIEW_HIGHLIGHTED_IDS = ['dtask-14', 'dtask-15'];
export const DESIGNER_ASSIGNMENTS_NOTIFICATIONS_KEY = 'designer-assignments-notifications-updated';

const viewedPendingReviewCards = new Set<string>();

export function getPendingReviewHighlightedIds() {
  return new Set(
    PENDING_REVIEW_HIGHLIGHTED_IDS.filter((id) => !viewedPendingReviewCards.has(id))
  );
}

export function getPendingReviewCount() {
  return getPendingReviewHighlightedIds().size;
}

export function markPendingReviewCardsViewed(ids: string[]) {
  ids.forEach((id) => viewedPendingReviewCards.add(id));
}

export function publishDesignerAssignmentsBadgeCount(count: number) {
  window.dispatchEvent(
    new CustomEvent(DESIGNER_ASSIGNMENTS_NOTIFICATIONS_KEY, { detail: count })
  );
}