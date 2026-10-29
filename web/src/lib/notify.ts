"use client";

import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "./error-message";

export const notify = {
  success: (title: string, description?: string) => {
    toast.add({
      title,
      description,
      type: "success",
      timeout: 3500,
    });
  },
  error: (title: string, errOrDesc?: unknown) => {
    const description = errOrDesc ? getErrorMessage(errOrDesc, String(errOrDesc)) : undefined;
    toast.add({
      title,
      description,
      type: "error",
      timeout: 6000,
    });
  },
  info: (title: string, description?: string) => {
    toast.add({
      title,
      description,
      type: "info",
      timeout: 4000,
    });
  },
};

export { getErrorMessage };
