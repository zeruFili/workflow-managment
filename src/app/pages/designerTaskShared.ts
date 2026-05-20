import { designerProfiles, mockDesignerTasks, mockDesignerTaskApplications } from '../data/mockData';
import { DesignerTask, DesignerTaskApplication } from '../types';

export const TASK_STORAGE_KEY = 'designer-tasks';
export const APPLICATION_STORAGE_KEY = 'designer-task-applications';

export const designerRoles = new Set(['design_team_leader', 'designer']);
export const assignmentRoles = new Set(['ceo', 'general_manager', 'system_administrator']);

export const roleNamesByUserId: Record<string, string> = {
  '0': 'CEO',
  '1': 'Marketing Lead',
  '2': 'General Manager',
  '3': 'Design Team Leader',
  '4': 'Designer',
  '5': 'Site Engineer',
  '6': 'Finance Officer',
  '7': 'Purchasing Team',
  '8': 'System Administrator',
  '9': 'Sophia Ahmed',
  '10': 'Daniel Reed',
  '11': 'Liam Carter',
};

export function loadDesignerTasks(): DesignerTask[] {
  const savedTasks = localStorage.getItem(TASK_STORAGE_KEY);
  if (savedTasks) {
    const parsedTasks = JSON.parse(savedTasks) as DesignerTask[];
    const mergedTasks = [
      ...parsedTasks.map((task) => {
        const seedTask = mockDesignerTasks.find((candidate) => candidate.id === task.id);
        return seedTask ? { ...seedTask, ...task } : task;
      }),
      ...mockDesignerTasks.filter((seedTask) => !parsedTasks.some((task) => task.id === seedTask.id)),
    ];
    localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(mergedTasks));
    return mergedTasks;
  }

  localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(mockDesignerTasks));
  return mockDesignerTasks;
}

export function loadDesignerApplications(): DesignerTaskApplication[] {
  const savedApplications = localStorage.getItem(APPLICATION_STORAGE_KEY);
  if (savedApplications) {
    const parsedApplications = JSON.parse(savedApplications) as DesignerTaskApplication[];
    const mergedApplications = [
      ...parsedApplications.map((application) => {
        const seedApplication = mockDesignerTaskApplications.find((candidate) => candidate.id === application.id);
        return seedApplication ? { ...seedApplication, ...application } : application;
      }),
      ...mockDesignerTaskApplications.filter(
        (seedApplication) => !parsedApplications.some((application) => application.id === seedApplication.id)
      ),
    ];

    localStorage.setItem(APPLICATION_STORAGE_KEY, JSON.stringify(mergedApplications));
    return mergedApplications;
  }

  localStorage.setItem(APPLICATION_STORAGE_KEY, JSON.stringify(mockDesignerTaskApplications));
  return mockDesignerTaskApplications;
}

export function getTaskAssigneeLabel(assignedTo?: string) {
  if (!assignedTo) return 'Open for application';

  const designerProfile = designerProfiles.find((profile) => profile.designerId === assignedTo);
  if (designerProfile) return designerProfile.displayName;

  return roleNamesByUserId[assignedTo] ?? `User ${assignedTo}`;
}