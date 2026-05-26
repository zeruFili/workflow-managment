export const SITE_ENGINEER_NOTIFICATIONS_KEY = 'site-engineer-notifications-v2';

export const SITE_ENGINEER_HIGHLIGHTED_IDS = ['task-10', 'task-11', 'task-12'];

export function getInitialSiteEngineerNotificationCount() {
  return SITE_ENGINEER_HIGHLIGHTED_IDS.length;
}