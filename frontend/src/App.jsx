import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Homepage from "./pages/Homepage";
import ProductDetail from "./pages/ProductDetail";
import AccountPage from "./pages/AccountPage";
import CustomerProfilePage from "./pages/CustomerProfilePage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ChangePassword from "./pages/ChangePassword";
import OrderHistory from "./pages/OrderHistory";
import OrderDetail from "./pages/OrderDetail";
import RedeemPage from "./pages/RedeemPage";
import CartPage from "./pages/CartPage";
import UserManagement from "./pages/UserManagement";
import RolePermission from "./pages/RolePermission";
import Permission from "./pages/PermissionList";
import UserProfilePage from "./pages/UserProfilePage";
import SegmentManagement from "./pages/SegmentManagement";
import SegmentCreate from "./pages/SegmentCreate";
import SegmentDetail from "./pages/SegmentDetail";
import SegmentCustomerList from "./pages/SegmentCustomerList";
import LoyaltyStudioPage from "./pages/LoyaltyStudioPage";
import LoyaltyPage from "./pages/LoyaltyPage";
import Coupon from "./pages/Coupon";
import PromotionManagement from "./pages/PromotionManagement";
import ProductImage from "./pages/ProductImage";
import LoyaltyReportPage from "./pages/LoyaltyReportPage";
import PromotionAnalyticsPage from "./pages/PromotionAnalyticsPage";
import EngagementAnalytics from "./pages/EngagementAnalytics";
import LoyaltyManage from "./pages/LoyaltyManage";
import ProductPage from "./pages/ProductPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CategoryPage from "./pages/CategoryPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLayout from "./layouts/AdminLayout";
import AdminRoute from "./routes/AdminRoute";

import "./admin.css";
import "./assets/Permission.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/order-history" element={<OrderHistory />} />
        <Route path="/order-detail/:orderId" element={<OrderDetail />} />
        <Route path="/customers/:customerId" element={<CustomerProfilePage />} />
        <Route path="/loyalty" element={<LoyaltyPage />} />
        <Route path="/loyalty/redeem" element={<RedeemPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route
          path="/admin/*"
          element={(
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          )}
        >
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<Navigate to="/admin" replace />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="users/:userId" element={<UserProfilePage />} />
          <Route path="roles" element={<RolePermission />} />
          <Route path="permissions" element={<Permission />} />
          <Route path="segments" element={<SegmentManagement />} />
          <Route path="segments/new" element={<SegmentCreate />} />
          <Route path="segments/:id" element={<SegmentDetail />} />
          <Route path="segments/:id/customers" element={<SegmentCustomerList />} />
          <Route path="customers/:customerId" element={<CustomerProfilePage />} />
          <Route path="loyalty-studio" element={<LoyaltyStudioPage />} />
          <Route path="loyalty" element={<LoyaltyManage />} />
          <Route path="loyaltyreport" element={<LoyaltyReportPage />} />
          <Route path="promotions" element={<PromotionManagement />} />
          <Route path="promotions/:id/analytics" element={<PromotionAnalyticsPage />} />
          <Route path="analytics/promotions/:id" element={<PromotionAnalyticsPage />} />
          <Route path="coupons" element={<Coupon />} />
          <Route path="categories" element={<CategoryPage />} />
          <Route path="products" element={<ProductPage />} />
          <Route path="products/:productId" element={<ProductDetailPage />} />
          <Route path="product-image" element={<ProductImage />} />
          <Route path="engagementanalytics" element={<EngagementAnalytics />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="colored"
      />
    </BrowserRouter>
  );
}

export default App;
