import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SiteSettingsProvider } from "@/contexts/SiteSettingsContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayout from "@/components/AdminLayout";
import StudentLayout from "@/components/StudentLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminQuestions from "./pages/admin/Questions";
import AdminCategories from "./pages/admin/Categories";
import AdminExams from "./pages/admin/Exams";
import AdminUsers from "./pages/admin/Users";
import AdminReports from "./pages/admin/Reports";
import AdminFlashCards from "./pages/admin/FlashCards";
import AdminSettings from "./pages/admin/Settings";
import AdminPricing from "./pages/admin/Pricing";
import BkashSettingsPage from "./pages/admin/payments/BkashSettingsPage";
import StudentDashboard from "./pages/student/Dashboard";
import LiveExams from "./pages/student/LiveExams";
import ExamScreen from "./pages/student/ExamScreen";
import ResultReview from "./pages/student/ResultReview";
import MyExams from "./pages/student/MyExams";
import Leaderboard from "./pages/student/Leaderboard";
import Wallet from "./pages/student/Wallet";
import StudentSubscriptionPage from "./pages/student/Subscription";
import FlashCardsPublic from "./pages/FlashCards";
import GuestFlashCardGame from "./pages/GuestFlashCardGame";
import FlashCardGame from "./pages/student/FlashCardGame";
import PricingPage from "./pages/Pricing";
import SubscriptionCheckoutPage from "./pages/SubscriptionCheckoutPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SiteSettingsProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/pricing/checkout/:slug" element={<SubscriptionCheckoutPage />} />
              <Route path="/flash-cards" element={<FlashCardsPublic />} />
              <Route path="/play/flash-cards" element={<GuestFlashCardGame />} />

              {/* Admin routes */}
              <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminLayout /></ProtectedRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="questions" element={<AdminQuestions />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="exams" element={<AdminExams />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="flash-cards" element={<AdminFlashCards />} />
                <Route path="pricing" element={<AdminPricing />} />
                <Route path="payments/bkash" element={<BkashSettingsPage />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              {/* Student routes */}
              <Route path="/student" element={<ProtectedRoute requiredRole="student"><StudentLayout /></ProtectedRoute>}>
                <Route index element={<StudentDashboard />} />
                <Route path="exams" element={<LiveExams />} />
                <Route path="exam/:attemptId" element={<ExamScreen />} />
                <Route path="result/:attemptId" element={<ResultReview />} />
                <Route path="my-exams" element={<MyExams />} />
                <Route path="leaderboard" element={<Leaderboard />} />
                <Route path="wallet" element={<Wallet />} />
                <Route path="flash-cards" element={<FlashCardGame />} />
                <Route path="subscription" element={<StudentSubscriptionPage />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </SiteSettingsProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
