import React from "react";

// админ/общие
import Dashboard from "./pages/admin/Dashboard";
import Menu from "./pages/admin/Menu";
import OptionsSettings from "./pages/admin/OptionsSettings";
import ProductForm from "./pages/admin/ProductForm";
import ProductEdit from "./pages/admin/ProductEdit";

// заказы / экран клиента / POS
import Active from "./pages/orders/Active";
import Closed from "./pages/orders/Closed";
import CustomerScreen from "./pages/customer/CustomerScreen";
import CreateOrder from "./pages/pos/CreateOrder";

// auth
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

export type RouteItem = {
  path: string;
  element: JSX.Element;
  protected?: boolean;
  publicOnly?: boolean;
};

const protectedRoutes: RouteItem[] = [
  { path: "/dashboard", element: <Dashboard />, protected: true },
  { path: "/admin/menu", element: <Menu />, protected: true },
  { path: "/admin/settings/options", element: <OptionsSettings />, protected: true },
  { path: "/admin/product/new", element: <ProductForm />, protected: true },
  { path: "/admin/product/:id/edit", element: <ProductEdit />, protected: true },

  { path: "/orders/active", element: <Active />, protected: true },
  { path: "/orders/closed", element: <Closed />, protected: true },
  { path: "/display", element: <CustomerScreen />, protected: true },
  { path: "/pos/create", element: <CreateOrder />, protected: true },
];

const publicRoutes: RouteItem[] = [
  { path: "/login", element: <Login />, publicOnly: true },
  { path: "/register", element: <Register />, publicOnly: true },
];

const RoutesConfig: RouteItem[] = [...protectedRoutes, ...publicRoutes];
export default RoutesConfig;
