import { get } from '@/utils/api';

export async function getWardRequestChain(userId) {
  // Returns all ward requests for a user, ordered by created_at asc
  const res = await get(`/api/ward-requests/chain/${userId}`);
  if (res.data && res.data.success) {
    return res.data.requests;
  }
  return [];
}
