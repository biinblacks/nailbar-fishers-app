import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ChatProvider } from "./context/ChatContext";
import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { ChatButton } from "./components/chat/ChatButton";
import { ChatWidget } from "./components/chat/ChatWidget";
import { ProtectedRoute } from "./components/admin/ProtectedRoute";

import { HomePage } from "./pages/HomePage";
import { BookingPage } from "./pages/BookingPage";
import { ConfirmationPage } from "./pages/ConfirmationPage";
import { ReviewPage } from "./pages/ReviewPage";
import { LoginPage } from "./pages/admin/LoginPage";
import { DashboardPage } from "./pages/admin/DashboardPage";
import { ServicesAdmin } from "./pages/admin/ServicesAdmin";
import { HoursAdmin } from "./pages/admin/HoursAdmin";
import { StaffAdmin } from "./pages/admin/StaffAdmin";
import { KnowledgeAdmin } from "./pages/admin/KnowledgeAdmin";
import { MessagesAdmin } from "./pages/admin/MessagesAdmin";
import { EmbedChatPage } from "./pages/EmbedChatPage";

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
      <ChatButton />
      <ChatWidget />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <Routes>
          <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
          <Route path="/booking" element={<PublicLayout><BookingPage /></PublicLayout>} />
          <Route
            path="/booking/confirmation/:id"
            element={<PublicLayout><ConfirmationPage /></PublicLayout>}
          />
          <Route path="/review" element={<PublicLayout><ReviewPage /></PublicLayout>} />
          <Route path="/embed/chat" element={<EmbedChatPage />} />

          <Route path="/admin/login" element={<LoginPage />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/services"
            element={
              <ProtectedRoute>
                <ServicesAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/hours"
            element={
              <ProtectedRoute>
                <HoursAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/staff"
            element={
              <ProtectedRoute>
                <StaffAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/knowledge"
            element={
              <ProtectedRoute>
                <KnowledgeAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/messages"
            element={
              <ProtectedRoute>
                <MessagesAdmin />
              </ProtectedRoute>
            }
          />
        </Routes>
      </ChatProvider>
    </AuthProvider>
  );
}
