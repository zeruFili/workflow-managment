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
    status: 'in_progress',
    submissions: [
      {
        id: 'sub-1',
        submittedBy: '7',
        submittedByName: 'Robert Taylor',
        submittedAt: '2026-05-18T12:10:00Z',
        notes: 'Captured the telegram preview and measurement notes. See images.',
        attachments: ['https://placehold.co/800x480/0f172a/f8fafc?text=Telegram+Preview'],
        metadata: { telegramHandle: '@site_updates' },
      },
    ],
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
    submissions: [
      {
        id: 'sub-2',
        submittedBy: '4',
        submittedByName: 'Michael Brown',
        submittedAt: '2026-05-18T15:42:00Z',
        notes: 'Fixed missing phone numbers and attached Telegram preview for confirmation.',
        attachments: ['https://placehold.co/800x480/1e293b/e2e8f0?text=Telegram+Destination+Preview'],
        metadata: { telegramChannel: '@customer_updates', location: 'Site A' },
      },
    ],
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
