/**
 * Which of the PartnerHome states the screen is in.
 *
 * Previously the screen ignored `isError`, so ANY failed request (network,
 * 500, 401, 403) fell through to the "not connected" message with a connect
 * CTA - telling a linked partner their link was gone because the request
 * failed. Only a successful response with status 'no_partner' may say that.
 *
 *   loading     first load, nothing to show yet
 *   error       request failed and there is nothing cached - honest error,
 *               never a connect/unlink CTA
 *   stale       cached data exists but the latest (background) refetch failed
 *               - keep rendering the cached data plus a small retry notice
 *   no_partner  the server answered: no partner linked
 *   connected   the server answered with a linked-partner payload
 *               (success or not_shared)
 */
export type PartnerHomeViewState =
  | 'loading'
  | 'error'
  | 'stale'
  | 'no_partner'
  | 'connected';

export function resolvePartnerHomeState(input: {
  data: { status: string } | null | undefined;
  /** Accepted for call-site clarity; loading is simply "no data and no error". */
  isLoading?: boolean;
  isError: boolean;
}): PartnerHomeViewState {
  const { data, isError } = input;
  if (data) {
    if (isError) { return 'stale'; }
    return data.status === 'no_partner' ? 'no_partner' : 'connected';
  }
  if (isError) { return 'error'; }
  return 'loading';
}
