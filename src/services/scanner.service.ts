import apiClient from '@/lib/api-client';
import type {
  TeamMember,
  Cart,
  SessionResponse,
  PickItem,
  Product
} from '@/interfaces';

/**
 * Scanner Service
 * Handles all logic related to warehouse scanning and picking
 */
export const scannerService = {
  /**
   * Fetch all active team members
   */
  async getTeamMembers() {
    return apiClient.get<TeamMember[]>('/scanner/team-members');
  },

  /**
   * Fetch available carts
   */
  async getCarts() {
    return apiClient.get<Cart[]>('/scanner/carts');
  },

  /**
   * Fetch master product list
   */
  async getProducts() {
    return apiClient.get<Product[]>('/scanner/products');
  },

  /**
   * Initialize a new scanning session for a team member and cart
   */
  async startSession(teamMemberId: string, cartId: string) {
    return apiClient.post<SessionResponse>('/scanner/start-session', { teamMemberId, cartId });
  },

  /**
   * Retrieve current pick list for a specific cart
   */
  async getPickList(cartId: string) {
    const encodedCartId = encodeURIComponent(cartId);
    return apiClient.get<PickItem[]>(`/scanner/pick-list?cartId=${encodedCartId}`);
  },

  /**
   * Sync and finish the cart picking process
   */
  async syncCart(cartId: string, items: PickItem[]) {
    return apiClient.post('/scanner/sync-cart', { cartId, items });
  },
};

export default scannerService;
