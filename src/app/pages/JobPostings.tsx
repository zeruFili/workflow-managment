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
    projectId: 'interior-design-company',
    title: 'Draft Living Room Elevation',
    description:
      'Prepare the initial elevation concept for the living room wall design, including layout, proportions, and visual balance.',
    instruction:
      'Measure the wall width, ceiling height, socket locations, and any switches before drafting the elevation.',
    assignedBy: '2',
    status: 'pending',
    deadline: '2026-05-28T23:59:59Z',
    createdAt: '2026-05-18T07:30:00Z',
    storyPoints: 8,
    telegramScreenshot: '',
  },
  {
    id: 'job-post-2',
    projectId: 'interior-design-company',
    title: 'Prepare Material Palette Board',
    description:
      'Create a refined material palette board for the project, showing finishes, colors, and selected surface references.',
    instruction:
      'Collect sample codes, finish names, and supplier references for each selected material before finalizing the board.',
    assignedBy: '2',
    status: 'in_progress',
    deadline: '2026-05-23T23:59:59Z',
    createdAt: '2026-05-17T16:30:00Z',
    storyPoints: 5,
    telegramScreenshot: '',
  },
  {
    id: 'job-post-3',
    projectId: 'interior-design-company',
    title: 'Review Ceiling Detail Drawings',
    description:
      'Check the ceiling detail drawings against the latest site conditions and confirm the design is ready for final review.',
    instruction:
      'Verify ceiling levels, beam drops, and lighting conflicts before approving the drawings.',
    assignedBy: '8',
    status: 'pending',
    deadline: '2026-05-30T23:59:59Z',
    createdAt: '2026-05-19T11:00:00Z',
    storyPoints: 3,
    telegramScreenshot: '',
  },
  {
    id: 'job-post-4',
    projectId: 'interior-design-company',
    title: 'Measure Reception Desk Area',
    description:
      'Collect measurements for the reception desk and waiting area planning.',
    instruction:
      'Measure desk width, circulation space, and distances to nearby walls or columns.',
    assignedBy: '2',
    status: 'pending',
    deadline: '2026-05-31T23:59:59Z',
    createdAt: '2026-05-20T09:15:00Z',
    storyPoints: 8,
    telegramScreenshot: '',
  },
  {
    id: 'job-post-5',
    projectId: 'interior-design-company',
    title: 'Finalize Kitchen Cabinetry Sketch',
    description:
      'Prepare the final sketch for the kitchen cabinetry layout and storage arrangement.',
    instruction:
      'Record cabinet heights, appliance sizes, and required clearances before completing the sketch.',
    assignedBy: '8',
    status: 'pending',
    deadline: '2026-06-01T23:59:59Z',
    createdAt: '2026-05-20T14:00:00Z',
    storyPoints: 5,
    telegramScreenshot: '',
  },
  {
    id: 'job-post-6',
    projectId: 'interior-design-company',
    title: 'Develop Bedroom Mood Board',
    description:
      'Build a complete mood board for a bedroom interior design package.',
    instruction:
      'Collect material references, furniture inspirations, and lighting concepts for the bedroom design.',
    assignedBy: '2',
    status: 'pending',
    deadline: '2026-06-02T23:59:59Z',
    createdAt: '2026-05-21T10:45:00Z',
    storyPoints: 5,
    telegramScreenshot: '',
  },
];

export function JobPostings() {
  return (
    <RoleTaskBoard
      title="Interior Design Tasks"
      description="Tasks assigned by an interior design company for designers working within the company."
      storageKey={JOB_POSTINGS_STORAGE_KEY}
      seedTasks={jobPostingSeedTasks}
      showStoryPoints={true}
      hideStatus={true}
      hideInstruction={true}
      createButtonLabel="Create Task"
      emptyStateText="No interior design tasks have been created yet."
    />
  );
}

export default JobPostings;