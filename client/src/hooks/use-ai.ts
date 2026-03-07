import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";

interface AIExplainRequest {
  taskTitle: string;
  taskDescription?: string | null;
  question?: string;
}

interface AIExplainResponse {
  answer: string;
  isFallback: boolean;
  steps?: string[];
}

export function useAIExplain() {
  return useMutation({
    mutationFn: async (data: AIExplainRequest): Promise<AIExplainResponse> => {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to get AI explanation");
      }

      return res.json();
    },
  });
}
