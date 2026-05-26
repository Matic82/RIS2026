import { createBrowserRouter } from "react-router";
import { MemberLayout } from "./layouts/MemberLayout";
import { AdminLayout } from "./layouts/AdminLayout";
import { MemberLogin } from "./pages/member/MemberLogin";
import { MemberRegister } from "./pages/member/MemberRegister";
import { VerifyEmail } from "./pages/member/VerifyEmail";
import { ForgotPassword } from "./pages/member/ForgotPassword";
import { ResetPassword } from "./pages/member/ResetPassword";
import { MemberDashboard } from "./pages/member/MemberDashboard";
import { PurchaseHistory } from "./pages/member/PurchaseHistory";
import { RewardsCatalog } from "./pages/member/RewardsCatalog";
import { MemberProfile } from "./pages/member/MemberProfile";
import { AdminLogin } from "./pages/admin/AdminLogin";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { CustomerOverview } from "./pages/admin/CustomerOverview";
import { RewardsManagement } from "./pages/admin/RewardsManagement";
import { RulesManagement } from "./pages/admin/RulesManagement";
import { SQLQueryInterface } from "./pages/admin/SQLQueryInterface";
import { AuditLog } from "./pages/admin/AuditLog";
import { LandingPage } from "./pages/LandingPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/member/login",
    Component: MemberLogin,
  },
  {
    path: "/member/register",
    Component: MemberRegister,
  },
  {
    path: "/member/verify",
    Component: VerifyEmail,
  },
  {
    path: "/member/forgot-password",
    Component: ForgotPassword,
  },
  {
    path: "/member/reset-password",
    Component: ResetPassword,
  },
  {
    path: "/member",
    Component: MemberLayout,
    children: [
      {
        index: true,
        Component: MemberDashboard,
      },
      {
        path: "purchases",
        Component: PurchaseHistory,
      },
      {
        path: "rewards",
        Component: RewardsCatalog,
      },
      {
        path: "profile",
        Component: MemberProfile,
      },
    ],
  },
  {
    path: "/admin/login",
    Component: AdminLogin,
  },
  {
    path: "/admin",
    Component: AdminLayout,
    children: [
      {
        index: true,
        Component: AdminDashboard,
      },
      {
        path: "customers",
        Component: CustomerOverview,
      },
      {
        path: "rewards",
        Component: RewardsManagement,
      },
      {
        path: "rules",
        Component: RulesManagement,
      },
      {
        path: "sql",
        Component: SQLQueryInterface,
      },
      {
        path: "audit",
        Component: AuditLog,
      },
    ],
  },
]);
