import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import notificationApi from "../../api/notificationApi";

export type DomainCounts = {
  marketingTasks: number;
  dataCollectorTasks: number;
  quantitySurveyorTasks: number;
  designerTasks: number;
  designerJobPostings: number;
};

interface NotificationCountsContextType {
  counts: DomainCounts;
  refresh: () => Promise<void>;
  decrement: (domain: keyof DomainCounts, amount?: number) => void;
}

const defaultCounts: DomainCounts = {
  marketingTasks: 0,
  dataCollectorTasks: 0,
  quantitySurveyorTasks: 0,
  designerTasks: 0,
  designerJobPostings: 0,
};

const NotificationCountsContext = createContext<NotificationCountsContextType>({
  counts: defaultCounts,
  refresh: async () => {},
  decrement: () => {},
});

export function NotificationCountsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [counts, setCounts] = useState<DomainCounts>(defaultCounts);

  const decrement = useCallback(
    (domain: keyof DomainCounts, amount = 1) => {
      setCounts((prev) => ({
        ...prev,
        [domain]: Math.max(0, prev[domain] - amount),
      }));
    },
    []
  );

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const result = await notificationApi.getUnreadCounts();
      console.log(
        `[NotificationCounts] Backend response for role="${user.role}":`,
        JSON.stringify(result),
      );
      setCounts({
        marketingTasks: result.marketingTasks ?? 0,
        dataCollectorTasks: result.dataCollectorTasks ?? 0,
        quantitySurveyorTasks: result.quantitySurveyorTasks ?? 0,
        designerTasks: result.designerTasks ?? 0,
        designerJobPostings: result.designerJobPostings ?? 0,
      });
    } catch {
      console.warn("[NotificationCounts] Backend unreachable — counts set to 0");
      setCounts(defaultCounts);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refresh();
    }
  }, [user]);

  return (
    <NotificationCountsContext.Provider value={{ counts, refresh, decrement }}>
      {children}
    </NotificationCountsContext.Provider>
  );
}

export function useNotificationCounts() {
  return useContext(NotificationCountsContext);
}
