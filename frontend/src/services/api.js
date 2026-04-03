import apiClient from "../lib/apiClient";
import { customerHttp } from "../lib/apiClient";
import axios from "axios";
import { toast } from "react-toastify";

// =============================
// 1. AXIOS INSTANCES
// =============================
export const apiAuth = axios.create({
  baseURL: import.meta.env.VITE_API_AUTH || "/api-auth",
});

export const apiCustomer = axios.create({
  baseURL: import.meta.env.VITE_API_CUSTOMER || "/api-customer",
});

export const apiEngagement = axios.create({
  baseURL: import.meta.env.VITE_API_ENGAGEMENT || "/api-engagement",
});

export const apiProduct = axios.create({
  baseURL: import.meta.env.VITE_API_PRODUCT || "/api-product",
});

const api = apiClient;
const customerApiClient = customerHttp;
const engagementApiClient = apiEngagement;

// =============================
// 2. INTERCEPTORS: XỬ LÝ TOKEN & LỖI CHO MỌI REQUEST
// =============================
const authInterceptor = (config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

const normalizePath = (url) => {
  if (!url) return "";
  const withoutHost = String(url).replace(/^https?:\/\/[^/]+/i, "");
  return withoutHost.split("?")[0] || "";
};

const shouldSuppress401Toast = (url) => {
  const path = normalizePath(url);
  return (
    path.includes("/api/auth/logout") ||
    path.includes("/api/auth/login") ||
    path.includes("/api/auth/refresh") ||
    path.includes("/api/auth/register") ||
    path.includes("/api/accounts/forgot-password")
  );
};

const handleAuthError = (error) => {
  const status = error?.response?.status;
  const requestUrl = error?.config?.url;
  const hasToken = Boolean(localStorage.getItem("accessToken"));

  if (status === 401) {
    // Không báo lỗi 401 cho các flow auth (logout/login/refresh...) hoặc khi đã không còn token.
    if (!shouldSuppress401Toast(requestUrl) && hasToken) {
      toast.error("Session expired or not logged in (401)");
    }
  } else if (status === 403) {
    const denyMessage = "You are not authorized to perform this action (403)";
    toast.error(denyMessage);

    // Cập nhật lại message trong data để các component khác có thể dùng
    if (error.response?.data && typeof error.response.data === "object") {
      error.response.data.message = denyMessage;
    }
  }
  return Promise.reject(error);
};

// Áp dụng Interceptor cho TẤT CẢ các instances chỉ bằng 1 vòng lặp
[apiAuth, apiCustomer, apiEngagement, api, customerApiClient, apiProduct].forEach((instance) => {
  if (instance) {
    instance.interceptors.request.use(authInterceptor, (err) => Promise.reject(err));
    instance.interceptors.response.use((res) => res, handleAuthError);
  }
});

// =============================
// 3. AUTH & USER API (Port 8081)
// =============================
export const roleApi = {
  getAllRoles: () => api.get("/api/roles"),
  assignPermissions: (roleId, permissionIds) => api.post(`/api/roles/${roleId}/permissions`, { permissionIds }),
  removePermissions: (roleId, permissionIds) => api.delete(`/api/roles/${roleId}/permissions`, { data: { permissionIds } }),
  getRolePermissions: (roleId) => api.get(`/api/roles/${roleId}/permissions`),
};

export const permissionApi = {
  getAllPermissions: () => apiAuth.get("/api/permissions?size=1000"),
};

// =============================
// CUSTOMER SEGMENT API (Customer Service)
// =============================
// =============================
// PROMOTION / ENGAGEMENT API (Engagement Service)
// =============================
// export const promotionApi = {
//   /** Public: khuyến mãi đang hiệu lực. Bearer tự gửi qua interceptor → backend resolve customer & segment. */
//   getAvailable: (params = {}) => engagementHttp.get("/promotions/available", { params }),
//   /** Public: khuyến mãi nổi bật (banner / trang chủ). */
//   getFeatured: (params = {}) => engagementHttp.get("/promotions/featured", { params }),
//   listPromotions: () => engagementHttp.get("/promotions"),
//   getTargetSegments: (promotionId) =>
//     engagementHttp.get(`/promotions/${promotionId}/target-segments`),
//   assignTargetSegments: (promotionId, body) =>
//     engagementHttp.post(`/promotions/${promotionId}/target-segments`, body),
//   removeTargetSegment: (promotionId, segmentId) =>
//     engagementHttp.delete(`/promotions/${promotionId}/target-segments/${segmentId}`),
//   previewReach: (promotionId) => engagementHttp.get(`/promotions/${promotionId}/preview-reach`),
// };

//export const segmentApi = {
//  getSegments: (page = 1, limit = 10) =>
//    customerApiClient.get("/customer-segments", { params: { page, limit } }),
//  getSegmentById: (id) => customerApiClient.get(`/customer-segments/${id}`),
//  createSegment: (payload) => customerApiClient.post("/customer-segments", payload),
//  updateSegment: (id, payload) => customerApiClient.put(`/customer-segments/${id}`, payload),
//  deleteSegment: (id) => customerApiClient.delete(`/customer-segments/${id}`),
//  getCustomersInSegment: (id, page = 1, limit = 10) =>
//    customerApiClient.get(`/customer-segments/${id}/customers`, { params: { page, limit } }),
//};

// =============================
// CONFIG URL
// =============================
const API_AUTH_URL =
  import.meta.env.VITE_API_AUTH || "/api-auth";

const API_CUSTOMER_URL =
  import.meta.env.VITE_API_CUSTOMER || "/api-customer";

// =============================
// AXIOS INSTANCE
// =============================

// Auth Service
// export const apiAuth = axios.create({
//   baseURL: API_AUTH_URL,
// });

// Customer Service
// export const apiCustomer = axios.create({
//   baseURL: API_CUSTOMER_URL,
// });

// =============================
// INTERCEPTOR TOKEN
// =============================
// const authInterceptor = (config) => {
//   const token = localStorage.getItem("accessToken");
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// };

// apiAuth.interceptors.request.use(
//   authInterceptor,
//   (error) => Promise.reject(error)
// );

// apiCustomer.interceptors.request.use(
//   authInterceptor,
//   (error) => Promise.reject(error)
// );

// USER API

export const userApi = {
  getAllUsers: async () => {
    const res = await apiAuth.get("/users");
    return res.data;
  },
  createUser: async (userData) => {
    // Không cần lấy token thủ công nữa vì Interceptor đã tự động gắn
    const res = await apiAuth.post("/users", userData);
    return res.data;
  },
  updateUser: async (userId, userData) => {
    const res = await apiAuth.put(`/users/${userId}`, userData);
    return res.data;
  },
  lockUser: async (userId) => {
    const res = await apiAuth.put(`/users/${userId}/lock`);
    return res.data;
  },
  unlockUser: async (userId) => {
    const res = await apiAuth.put(`/users/${userId}/unlock`);
    return res.data;
  },
  deleteUser: async (userId) => {
    const res = await apiAuth.delete(`/users/${userId}`);
    return res.data;
  },
};

// =============================
// 4. CUSTOMER & SEGMENT API (Port 8082)
// =============================
export const customerApi = {
  getCustomerProfile: (customerId, include) =>
    apiCustomer.get(`/api/customers/${customerId}`, { params: include ? { include } : {} }),
  getCustomerByUserId: (userId) =>
    apiCustomer.get(`/api/customers/by-user/${userId}`),
  getByUserId: async (userId) => {
    const res = await apiCustomer.get(`/customers/find-id/${userId}`);
    return res.data;
  },
  setDefaultAddress: (customerId, addressId) =>
    apiCustomer.put(`/address-order/${customerId}/address/${addressId}/default`),
  addCustomerAddress: (customerId, addressData) =>
    apiCustomer.post(`/address-order/${customerId}/address`, addressData),
  deleteCustomerAddress: (customerId, addressId) =>
    apiCustomer.delete(`/address-order/${customerId}/address/${addressId}`),
};

export const segmentApi = {
  getSegments: (page = 1, limit = 10) =>
    apiCustomer.get("/customer-segments", { params: { page, limit } }),
  getSegmentById: (id) => apiCustomer.get(`/customer-segments/${id}`),
  createSegment: (payload) => apiCustomer.post("/customer-segments", payload),
  updateSegment: (id, payload) => apiCustomer.put(`/customer-segments/${id}`, payload),
  deleteSegment: (id) => apiCustomer.delete(`/customer-segments/${id}`),
  getCustomersInSegment: (id, page = 1, limit = 10) =>
    apiCustomer.get(`/customer-segments/${id}/customers`, { params: { page, limit } }),
};

// =============================
// 5. LOYALTY, ENGAGEMENT & PROMOTION API (Port 8083)
// =============================
export const loyaltyApi = {
  getLoyaltyInfo: async (customerId) => {
    const res = await apiEngagement.get(`/customer/${customerId}/loyalty`);
    return res.data;
  },
  getPointsHistory: async (customerId, params) => {
    const res = await apiEngagement.get(`/customer/${customerId}/loyalty/points-history`, { params });
    return res.data;
  },
  getTierHistory: async (customerId) => {
    const res = await apiEngagement.get(`/customer/${customerId}/loyalty/tier-history`);
    return res.data;
  },
  getRedemptions: (customerId) =>
    apiEngagement.get(`/customer/${customerId}/loyalty/redemptions`),
  getAvailableRewards: () =>
    apiEngagement.get('/customer/loyalty/available-rewards'),
  redeemReward: (customerId, rewardId) =>
    apiEngagement.post(`/customer/${customerId}/loyalty/redeem`, { rewardId }),
  getAllTiers: () =>
    apiEngagement.get("/loyalty/tiers"),
  compareTiers: () =>
    apiEngagement.get("/loyalty/tiers/compare"),
};

export const promotionApi = {
  getPromotions: async (page = 0, size = 10, status = '', type = '') => {
    let url = `/api/promotions?page=${page}&size=${size}&sortBy=createdAt&sortDir=desc`;
    if (status) url += `&status=${status}`;
    if (type) url += `&type=${type}`;
    const res = await apiEngagement.get(url);
    return res.data;
  },
  createPromotion: async (data) => {
    const res = await apiEngagement.post('/api/promotions', data);
    return res.data;
  },
  updatePromotion: async (id, data) => {
    const res = await apiEngagement.put(`/api/promotions/${id}`, data);
    return res.data;
  },
  deletePromotion: async (id) => {
    const res = await apiEngagement.delete(`/api/promotions/${id}`);
    return res.data;
  },
  changeStatus: async (id, status) => {
    const res = await apiEngagement.put(`/api/promotions/${id}/status?status=${status}`);
    return res.data;
  },
  /** Public endpoint: không dùng auth-refresh interceptor để tránh redirect loop khi chưa login. */
  getAvailable: (params = {}) => apiEngagement.get("/api/promotions/available", { params }),
  /** Public endpoint: không bắt buộc đăng nhập. */
  getFeatured: (params = {}) => apiEngagement.get("/api/promotions/featured", { params }),
  listPromotions: () => apiEngagement.get("/api/promotions"),
  getTargetSegments: (promotionId) => apiEngagement.get(`/api/promotions/${promotionId}/target-segments`),
  assignTargetSegments: (promotionId, body) => apiEngagement.post(`/api/promotions/${promotionId}/target-segments`, body),
  removeTargetSegment: (promotionId, segmentId) => apiEngagement.delete(`/api/promotions/${promotionId}/target-segments/${segmentId}`),
  previewReach: (promotionId) => apiEngagement.get(`/api/promotions/${promotionId}/preview-reach`),
};

export const engagementLoyaltyApi = {
  getConfig: async () => {
    const res = await apiEngagement.get("/loyalty/config");
    return res.data;
  },

  updatePointsConfig: async (payload) => {
    const res = await apiEngagement.put("/loyalty/config/points", payload);
    return res.data;
  },

  updateExpirationConfig: async (payload) => {
    const res = await apiEngagement.put("/loyalty/config/expiration", payload);
    return res.data;
  },

  updateTierConfig: async (payload) => {
    const res = await apiEngagement.put("/loyalty/config/tiers", payload);
    return res.data;
  },

  getTierBenefits: async (tierId) => {
    const res = await apiEngagement.get(`/loyalty/tiers/${tierId}/benefits`);
    return res.data;
  },

  createTierBenefit: async (tierId, payload) => {
    const res = await apiEngagement.post(`/loyalty/tiers/${tierId}/benefits`, payload);
    return res.data;
  },

  updateTierBenefit: async (tierId, benefitId, payload) => {
    const res = await apiEngagement.put(`/loyalty/tiers/${tierId}/benefits/${benefitId}`, payload);
    return res.data;
  },

  deleteTierBenefit: async (tierId, benefitId) => {
    const res = await apiEngagement.delete(`/loyalty/tiers/${tierId}/benefits/${benefitId}`);
    return res.data;
  },
};

// =============================
// 6. PRODUCTION & PRODUCT API (Port 8084)
// =============================
export const categoryApi = {
  getAll: async (params = {}) => {
    const res = await apiProduct.get("/categories", { params });
    return res.data;
  },
  getById: async (id) => {
    const res = await apiProduct.get(`/categories/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await apiProduct.post("/categories", data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await apiProduct.put(`/categories/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await apiProduct.delete(`/categories/${id}`);
    return res.data;
  },
};

export const productApi = {
  // --- Product Basic CRUD ---
  getAll: async (params = {}) => {
    const res = await apiProduct.get("/products", { params });
    return res.data;
  },
  // Alias cho getAll
  getProducts: (params) => apiProduct.get("/products", { params }),

  getById: async (id) => {
    const res = await apiProduct.get(`/products/${id}`);
    return res.data;
  },
  // Alias cho getById
  getProduct: (id) => apiProduct.get(`/products/${id}`),

  create: async (data) => {
    const res = await apiProduct.post("/products", data);
    return res.data;
  },
  // Alias cho create
  createProduct: (data) => apiProduct.post("/products", data),

  update: async (id, data) => {
    const res = await apiProduct.put(`/products/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await apiProduct.delete(`/products/${id}`);
    return res.data;
  },
  toggleAvailability: async (id) => {
    const res = await apiProduct.patch(`/products/${id}/toggle-availability`);
    return res.data;
  },

  // --- Category / Bulk ---
  getAllCate: async () => {
    const res = await apiProduct.get("/categories");
    return res.data;
  },
  bulkAssignCategory: async (data) => {
    const res = await apiProduct.put("/products/bulk/category", data);
    return res.data;
  },
  getAllCategoriesForDropdown: async () => {
    const res = await apiProduct.get("/products/categories");
    return res.data;
  },

  // --- Ingredients ---
  getIngredients: async (productId) => {
    const res = await apiProduct.get(`/products/${productId}/ingredients`);
    return res.data;
  },
  assignIngredients: async (productId, ingredients) => {
    const res = await apiProduct.post(`/products/${productId}/ingredients`, ingredients);
    return res.data;
  },
  updateIngredient: async (productId, ingredientId, quantity) => {
    const res = await apiProduct.put(`/products/${productId}/ingredients/${ingredientId}`, { quantity });
    return res.data;
  },
  removeIngredient: async (productId, ingredientId) => {
    const res = await apiProduct.delete(`/products/${productId}/ingredients/${ingredientId}`);
    return res.data;
  },
  getAllIngredients: async () => {
    const res = await apiProduct.get("/products/ingredients");
    return res.data;
  },

  // --- Tags ---
  getAllTags: async () => {
    const res = await apiProduct.get("/products/tags");
    return res.data;
  },
  getProductTags: async (productId) => {
    const res = await apiProduct.get(`/products/${productId}/tags`);
    return res.data;
  },
  assignTags: async (productId, tagData) => {
    const res = await apiProduct.post(`/products/${productId}/tags`, tagData);
    return res.data;
  },

  // --- Images (Story 40) ---
  uploadImage: (productId, file) => {
    const formData = new FormData();
    formData.append("image", file);
    return apiProduct.post(`/products/${productId}/images`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  uploadImagesBulk: (productId, files) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));
    return apiProduct.post(`/products/${productId}/images/bulk`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  setPrimaryImage: (productId, imageId) =>
    apiProduct.put(`/products/${productId}/images/${imageId}/primary`),
  deleteImage: (productId, imageId) =>
    apiProduct.delete(`/products/${productId}/images/${imageId}`),
  reorderImages: (productId, reorderData) =>
    apiProduct.put(`/products/${productId}/images/reorder`, reorderData),
};

export default apiAuth;