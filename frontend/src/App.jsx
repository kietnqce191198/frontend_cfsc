import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Pages - Public & User
import Homepage from "./pages/Homepage";
import AccountPage from "./pages/AccountPage";
import CustomerProfilePage from "./pages/CustomerProfilePage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ChangePassword from "./pages/ChangePassword";
import OrderHistory from "./pages/OrderHistory";
import OrderDetail from "./pages/OrderDetail";
import RedeemPage from "./pages/RedeemPage";
import CartPage from "./pages/CartPage";
// Pages - Admin Management
import UserManagement from "./pages/UserManagement";
import RolePermission from "./pages/RolePermission";
import Permission from "./pages/PermissionList";

// Pages - Segment Management
import SegmentManagement from "./pages/SegmentManagement";
import SegmentCreate from "./pages/SegmentCreate";
import SegmentDetail from "./pages/SegmentDetail";
import SegmentCustomerList from "./pages/SegmentCustomerList";
import LoyaltyStudioPage from "./pages/LoyaltyStudioPage";
import LoyaltyPage from "./pages/LoyaltyPage";
import Coupon from "./pages/Coupon";
import PromotionManagement from "./pages/PromotionManagement";
import ProductImage from "./pages/ProductImage";

// Layouts & Routes
import AdminLayout from "./layouts/AdminLayout";
import AdminRoute from "./routes/AdminRoute";
import LoyaltyManage from "./pages/LoyaltyManage";



import "./admin.css";
import "./assets/Permission.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ProductPage from "./pages/ProductPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CategoryPage from "./pages/CategoryPage";


function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* --- Public Routes --- */}
        <Route path="/" element={<Homepage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/change-password" element={<ChangePassword />} />
        
        {/* Customer & Orders */}
        <Route path="/order-history" element={<OrderHistory />} />
        <Route path="/order-detail/:orderId" element={<OrderDetail />} />
        <Route path="/customers/:customerId" element={<CustomerProfilePage />} />
        <Route path="/loyalty/redeem" element={<RedeemPage />} />
        <Route path="/cart" element={<CartPage />} />
        {/* --- Admin Routes --- */}


        {/* Public / Homepage */}
        <Route path="/" element={<Homepage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        {/* 👇 THÊM ROUTE LOYALTY */}
        <Route path="/loyalty" element={<LoyaltyPage />} />
        {/* Admin panel */}
        <Route
          path="/admin/*"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          {/* Mặc định chuyển hướng về quản lý user khi vào /admin */}
          <Route index element={<Navigate to="users" />} />

          {/* User & Auth Management */}

          {/* Default khi vào /admin → users */}
          <Route index element={<Navigate to="users" replace />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="roles" element={<RolePermission />} />
          <Route path="permissions" element={<Permission />} />
          <Route path="coupons" element={<Coupon />} />
          <Route path="permissions" element={<Permission />} />
          <Route path="coupons" element={<Coupon />} />
          <Route path="categories" element={<CategoryPage />} />
          <Route path="products" element={<ProductPage />} />
          <Route path="products/:productId" element={<ProductDetailPage />} />
          <Route path="promotions" element={<PromotionManagement />} />
          <Route path="product-image" element={<ProductImage />} />

          {/* Quản lý hồ sơ khách hàng trong Admin */}
          <Route path="customers/:customerId" element={<CustomerProfilePage />} />

          {/* Segment Management (Phân đoạn khách hàng) */}
          <Route path="segments" element={<SegmentManagement />} />
          <Route path="segments/new" element={<SegmentCreate />} />
          <Route path="segments/:id" element={<SegmentDetail />} />
          <Route path="segments/:id/customers" element={<SegmentCustomerList />} />
          <Route path="loyalty-studio" element={<LoyaltyStudioPage />} />

          {/* Loyalty Manage (Admin) */}
          <Route path="loyalty" element={<LoyaltyManage />} />

          <Route path="promotions" element={<PromotionManagement />} />
        </Route>

        {/* Fallback route (Tùy chọn) */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {/* Notification system */}

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