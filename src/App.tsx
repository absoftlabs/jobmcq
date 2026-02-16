import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayout from "@/components/AdminLayout";
import StudentLayout from "@/components/StudentLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminQuestions from "./pages/admin/Questions";
import AdminExams from "./pages/admin/Exams";
import AdminUsers from "./pages/admin/Users";
import AdminReports from "./pages/admin/Reports";
import AdminCourseCategories from "./pages/admin/courses/Categories";
import AdminManageCourses from "./pages/admin/courses/Manage";
import AdminCourseLessons from "./pages/admin/courses/Lessons";
import AdminPaymentGateway from "./pages/admin/PaymentGateway";
import StudentDashboard from "./pages/student/Dashboard";
import LiveExams from "./pages/student/LiveExams";
import ExamScreen from "./pages/student/ExamScreen";
import ResultReview from "./pages/student/ResultReview";
import MyExams from "./pages/student/MyExams";
import Leaderboard from "./pages/student/Leaderboard";
import Wallet from "./pages/student/Wallet";
import CourseDetails from "./pages/CourseDetails";
import MyCourses from "./pages/student/MyCourses";
import CourseLearn from "./pages/student/CourseLearn";
import BkashCallback from "./pages/BkashCallback";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/courses/:slug" element={<CourseDetails />} />
            <Route path="/payment/bkash/callback" element={<BkashCallback />} />
            <Route path="/auth" element={<Auth />} />

            {/* Admin routes */}
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="questions" element={<AdminQuestions />} />
              <Route path="exams" element={<AdminExams />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="payment-gateway" element={<AdminPaymentGateway />} />
              <Route path="courses" element={<Navigate to="/admin/courses/manage" replace />} />
              <Route path="courses/categories" element={<AdminCourseCategories />} />
              <Route path="courses/manage" element={<AdminManageCourses />} />
              <Route path="courses/lessons" element={<AdminCourseLessons />} />
            </Route>

            {/* Student routes */}
            <Route path="/student" element={<ProtectedRoute requiredRole="student"><StudentLayout /></ProtectedRoute>}>
              <Route index element={<StudentDashboard />} />
              <Route path="exams" element={<LiveExams />} />
              <Route path="exam/:attemptId" element={<ExamScreen />} />
              <Route path="result/:attemptId" element={<ResultReview />} />
              <Route path="my-exams" element={<MyExams />} />
              <Route path="courses" element={<MyCourses />} />
              <Route path="courses/:courseId/learn" element={<CourseLearn />} />
              <Route path="leaderboard" element={<Leaderboard />} />
              <Route path="wallet" element={<Wallet />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
