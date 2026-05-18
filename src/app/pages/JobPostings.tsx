import React from 'react';
import { RoleTaskBoard } from '../components/RoleTaskBoard';
import { Task } from '../types';

const STORAGE_KEY = 'designer-job-postings';

const seedTasks: Task[] = [
  {
    id: 'job-post-1',
    projectId: 'designer-recruitment',
    title: 'Senior Designer Opening',
    description: 'Publish a posting for an experienced senior designer role.',
    instruction: 'Include portfolio requirements, preferred software, and availability expectations.',
    assignedBy: '2',
    status: 'pending',
    deadline: '2026-05-28T23:59:59Z',
    createdAt: '2026-05-18T07:30:00Z',
  },
  {
    id: 'job-post-2',
    projectId: 'designer-recruitment',
    title: 'Junior Designer Opening',
    description: 'Create a fresh posting for junior designer applicants.',
    instruction: 'Mention basic design skills, collaboration ability, and internship experience if available.',
    assignedBy: '1',
    status: 'in_progress',
    deadline: '2026-05-23T23:59:59Z',
    createdAt: '2026-05-17T16:30:00Z',
  },
];

export function JobPostings() {
  return (
    <RoleTaskBoard
      title="Job Postings"
      description="Create and publish designer job postings."
      storageKey={STORAGE_KEY}
      seedTasks={seedTasks}
      createButtonLabel="Create Posting"
      emptyStateText="No designer job postings have been created yet."
    />
  );
}

export default JobPostings;
