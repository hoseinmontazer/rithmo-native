/**
 * useAskRithmo — «از داده‌های من بپرس»
 *
 * A single question -> answer interaction, not a chat history: a
 * mutation, not a cached query, and nothing is persisted client-side
 * between questions (no conversation history for the MVP — see
 * ai_gateway/services.py::get_ask_rithmo_answer's own docstring on why).
 *
 * Free for every authenticated user (docs/DECISIONS.md DEC-005 —
 * Progressive Premium Value: the endpoint itself is no longer
 * Premium-gated; only the four historical/comparative intents are,
 * per-answer, via `AskRithmoAnswer.premium_required` — see the screen).
 * This used to also reject client-side for a non-premium user before
 * ever calling the API, which would have silently blocked every free
 * user's question regardless of the backend now allowing it.
 */
import { useMutation } from '@tanstack/react-query';
import { askRithmoService } from '@api/services/askRithmoService';
import { useAuth } from '@hooks/useAuth';
import type { AskRithmoResponse } from '@types/askRithmo.types';

export function useAskRithmo() {
  const { isAuthenticated } = useAuth();

  const mutation = useMutation<AskRithmoResponse, unknown, string>({
    mutationFn: (question: string) => {
      if (!isAuthenticated) {
        return Promise.reject(new Error('not_authenticated'));
      }
      return askRithmoService.ask(question);
    },
  });

  return {
    ask: mutation.mutate,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    response: mutation.data,
    reset: mutation.reset,
  };
}
