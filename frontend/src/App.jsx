import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider.jsx';
import Layout from './components/CandidatLayout.jsx';
import RHLayout from './components/RHlayout.jsx';
import CandidatLayout from './components/CandidatLayout.jsx'; // ← nouveau
import MesCandidatures from './pages/Candidat/MesCandidatures.jsx';
import DetailCandidature from './pages/Candidat/DetailCandidature.jsx';
import HomePage from './pages/Auth/HomePage.jsx';
import Login from './pages/Auth/Login.jsx';
import Register from './pages/Auth/Register.jsx';
import VerifyOtp from './pages/Auth/VerifyOtp.jsx';
import VerifyOtpRoute from './components/VerifyOtpRoute.jsx';
import RHCalendrierEntretiens from './pages/RH/RHCalendrierEntretiens.jsx';
import EntretienLive from './pages/RH/EntretienLive.jsx';
import AdminLayout from './components/AdminLayout.jsx';
import AdminDashboard from './pages/Admin/AdminDashboard.jsx';
import AdminUtilisateurs from './pages/Admin/AdminUtilisateurs.jsx';

import RoleBasedRoute from './components/RoleBasedRoute.jsx';
// Pages Candidat
import CandidatDashboard from './pages/Candidat/Dashboard.jsx';
import Unauthorized from './pages/Auth/Unauthorized.jsx';

import CandidatProfil from './pages/Candidat/Monprofil.jsx';

import RHCandidats from './pages/RH/Rhcandidatures.jsx';
import Rhsujet from './pages/RH/RHSujets.jsx';
import Rhquizsujet from './pages/RH/RHQuizEditor.jsx';
import CandidatQuiz from './pages/Candidat/Candidatquiz.jsx';
import ForgotPassword from './pages/Auth/ForgotPassword.jsx';
import ResetPassword from './pages/Auth/ResetPassword.jsx';

import CandidatOffres from './pages/Candidat/Offers.jsx';
//import CandidatApplications from './pages/candidat/Applications';
// Pages RH
import RHDashboard from './pages/RH/RHDashboard.jsx';
import PublicRoute from './components/PublicRoute.jsx'; // Importer le composant
import RHParametres from './pages/RH/RHParametres.jsx';
import RHEntretiens from './pages/RH/RHPlanifierEntretiens.jsx';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          <Route
            path="/"
            element={
              <PublicRoute>
                <HomePage />
              </PublicRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route
            path="/verify-otp"
            element={
              <VerifyOtpRoute>
                <VerifyOtp />
              </VerifyOtpRoute>
            }
          />
          {/* Espace RH */}
          <Route
            path="/rh"
            element={
              <RoleBasedRoute allowedRoles={['ROLE_RH']}>
                <RHLayout />
              </RoleBasedRoute>
            }
          >
            {/* /rh → Centre de Contrôle */}
            <Route index element={<RHDashboard />} />

            {/* /rh/candidats */}
            <Route path="sujets" element={<Rhsujet />} />
            <Route path="quiz" element={<Rhquizsujet />} />
            {/* /rh/sujets */}
            <Route path="candidats" element={<RHCandidats />} />

            {/* /rh/entretiens */}
            <Route path="entretiens" element={<RHEntretiens />} />
            <Route path="calendrier" element={<RHCalendrierEntretiens />} />
            <Route path="entretien/:roomToken" element={<EntretienLive />} />
            {/* /rh/parametres */}
            <Route path="parametres" element={<RHParametres />} />
          </Route>
          {/* Routes avec layout (Navbar + Footer) */}
          <Route
            path="/candidat"
            element={
              <RoleBasedRoute allowedRoles={['ROLE_CANDIDAT']}>
                <CandidatLayout />
              </RoleBasedRoute>
            }
          >
            {/* /candidat → Dashboard home */}
            <Route index element={<CandidatDashboard />} />

            <Route path="candidatures" element={<MesCandidatures />} />
            <Route path="candidatures/:id" element={<DetailCandidature />} />

            <Route path="quiz/:sujetId" element={<CandidatQuiz />} />
            {/* /candidat/offres → page Offres*/}
            <Route path="offres" element={<CandidatOffres />} />

            {/* /candidat/profil → page Mon profil */}
            <Route path="profil" element={<CandidatProfil />} />
            {/* ✅ Salle d'entretien candidat dans le layout */}
            <Route path="entretien/:roomToken" element={<EntretienLive />} />
          </Route>
          <Route
            path="/admin"
            element={
              <RoleBasedRoute allowedRoles={['ROLE_ADMIN']}>
                <AdminLayout />
              </RoleBasedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="utilisateurs" element={<AdminUtilisateurs />} />
            <Route path="candidats" element={<RHCandidats />} />
            <Route path="sujets" element={<Rhsujet />} />
            <Route path="calendrier" element={<RHCalendrierEntretiens />} />
          </Route>
          {/* ── Routes publiques avec Navbar marketing + Footer ── */}
          <Route element={<Layout />}>
            {/* Ajoute ici tes pages publiques si besoin */}
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;