import React from 'react';
import { RoleTaskBoard } from '../components/RoleTaskBoard';
import { Task } from '../types';

const STORAGE_KEY = 'data-collector-tasks';

const seedTasks: Task[] = [
  {
    id: 'dc-task-1',
    projectId: 'data-collection',
    title: 'Collect site measurements',
    description: 'Measure the assigned site and record room dimensions.',
    instruction: 'Capture wall lengths, ceiling heights, and access points before end of day.',
    assignedBy: '2',
    status: 'pending',
    deadline: '2026-05-25T23:59:59Z',
    createdAt: '2026-05-18T08:00:00Z',
  },
  {
    id: 'dc-task-2',
    projectId: 'data-collection',
    title: 'Update customer survey sheet',
    description: 'Verify field entries and correct any missing contact details.',
    instruction: 'Cross-check the phone numbers and addresses with the latest client notes.',
    assignedBy: '1',
    status: 'in_progress',
    deadline: '2026-05-22T23:59:59Z',
    createdAt: '2026-05-17T10:00:00Z',
  },
];

export function DataCollectorTasks() {
  return (
    <RoleTaskBoard
      title="Data Collector Tasks"
      description="Create and manage tasks for data collectors."
      storageKey={STORAGE_KEY}
      seedTasks={seedTasks}
      createButtonLabel="Create Data Task"
      emptyStateText="No data collector tasks have been created yet."
    />
  );
}

export default DataCollectorTasks;
