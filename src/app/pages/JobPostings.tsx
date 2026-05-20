import React from 'react';
import { RoleTaskBoard } from '../components/RoleTaskBoard';
import { Task } from '../types';

export const JOB_POSTINGS_STORAGE_KEY = 'designer-job-postings';

type JobPostingTask = Task & {
  storyPoints?: number;
  telegramScreenshot?: string;
};

export const jobPostingSeedTasks: JobPostingTask[] = [
  {
    id: 'job-post-1',
    projectId: 'designer-recruitment',
    title: 'Senior Designer Opening',
    description: 'Publish a posting for an experienced senior designer role.',
    instruction: '',
    assignedBy: '0',
    status: 'pending',
    deadline: '2026-05-28T23:59:59Z',
    createdAt: '2026-05-18T07:30:00Z',
    storyPoints: 8,
    telegramScreenshot: '',
  },
  {
    id: 'job-post-2',
    projectId: 'designer-recruitment',
    title: 'Junior Designer Opening',
    description: 'Create a fresh posting for junior designer applicants.',
    instruction: '',
    assignedBy: '2',
    status: 'in_progress',
    deadline: '2026-05-23T23:59:59Z',
    createdAt: '2026-05-17T16:30:00Z',
    storyPoints: 5,
    telegramScreenshot: '',
  },
  {
    id: 'job-post-3',
    projectId: 'designer-recruitment',
    title: 'Interior Designer Opening',
    description: 'Publish a public opening for the system administrator approved designer position.',
    instruction: '',
    assignedBy: '8',
    status: 'pending',
    deadline: '2026-05-30T23:59:59Z',
    createdAt: '2026-05-19T11:00:00Z',
    storyPoints: 3,
    telegramScreenshot: '',
  },
];

export function JobPostings() {
  return (
    <RoleTaskBoard
      title="Job Postings"
      description="Create and publish designer job postings."
      storageKey={JOB_POSTINGS_STORAGE_KEY}
      seedTasks={jobPostingSeedTasks}
      showStoryPoints={true}
      hideStatus={true}
      hideInstruction={true}
      createButtonLabel="Create Task"
      emptyStateText="No designer job postings have been created yet."
    />
  );
}

export default JobPostings;
