export const DESIGNER_ASSIGNMENTS_NOTIFICATIONS_KEY = 'designer-assignments-notifications-updated';

const viewedPendingReviewCards = new Set<string>();
let designerAssignmentNotificationIds = new Set<string>();

export function setDesignerAssignmentNotificationIds(ids: Set<string>) {
  designerAssignmentNotificationIds = ids;
}

export function getPendingReviewHighlightedIds() {
  return new Set(
    [...designerAssignmentNotificationIds].filter((id) => !viewedPendingReviewCards.has(id))
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

export function resetDesignerAssignmentsHighlightState() {
  viewedPendingReviewCards.clear();
  designerAssignmentNotificationIds = new Set<string>();
}
