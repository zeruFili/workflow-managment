import { UserRole } from "../types";

export const ROLE_RESOURCE_FILTERS: Record<string, Record<string, string[]>> = {
  marketing_task: {
    marketing_lead: ["review"],
    finance_officer: ["submission", "review"],
    ceo: ["submission", "review"],
  },
  data_collector_task: {
    data_collector: ["review"],
    general_manager: ["submission", "review"],
    ceo: ["submission", "review"],
  },
  quantity_surveyor_task: {
    quantity_surveyor: ["review"],
    general_manager: ["submission", "review"],
    ceo: ["submission", "review"],
  },
  designer_task: {
    designer: ["posted_job"],
    general_manager: ["submission", "review"],
    ceo: ["submission", "review"],
  },
};
