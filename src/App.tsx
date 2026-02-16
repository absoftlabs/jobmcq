import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import StudentDashboard from "./pages/student/Dashboard";
import LiveExams from "./pages/student/LiveExams";
import ExamScreen from "./pages/student/ExamScreen";
import ResultReview from "./pages/student/ResultReview";
import MyExams from "./pages/student/MyExams";
import Leaderboard from "./pages/student/Leaderboard";
import Wallet from "./pages/student/Wallet";

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
            <Route path="/auth" element={<Auth />} />

            {/* Admin routes */}
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="questions" element={<AdminQuestions />} />
              <Route path="exams" element={<AdminExams />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="reports" element={<AdminReports />} />
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
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
