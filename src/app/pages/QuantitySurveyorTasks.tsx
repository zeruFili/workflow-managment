import React from 'react';
import { RoleTaskBoard } from '../components/RoleTaskBoard';
import { Task } from '../types';

const STORAGE_KEY = 'quantity-surveyor-tasks';

const seedTasks: Task[] = [
  {
    id: 'qs-task-1',
    projectId: 'quantity-surveying',
    title: 'Prepare bill of quantities draft',
    description: 'Draft the initial bill of quantities for the active project.',
    instruction: 'Review the current drawings and extract measurable items before pricing.',
    assignedBy: '2',
    status: 'pending',
    deadline: '2026-05-27T23:59:59Z',
    createdAt: '2026-05-18T09:00:00Z',
  },
  {
    id: 'qs-task-2',
    projectId: 'quantity-surveying',
    title: 'Check material quantities',
    description: 'Validate material quantities for the tender review.',
    instruction: 'Compare the estimate against the latest scope and flag any mismatches.',
    assignedBy: '2',
    status: 'in_progress',
    deadline: '2026-05-24T23:59:59Z',
    createdAt: '2026-05-17T14:00:00Z',
  },
];

export function QuantitySurveyorTasks() {
  return (
    <RoleTaskBoard
      title="Quantity Surveyor Tasks"
      description="Create and manage tasks for quantity surveyors."
      storageKey={STORAGE_KEY}
      seedTasks={seedTasks}
      createButtonLabel="Create Survey Task"
      emptyStateText="No quantity surveyor tasks have been created yet."
    />
  );
}

export default QuantitySurveyorTasks;
