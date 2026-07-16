import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import Layout from './components/CandidatLayout';
import RHLayout from './components/RHlayout';
import CandidatLayout from './components/CandidatLayout'; // ← nouveau
import MesCandidatures from './pages/Candidat/MesCandidatures_new.jsx';
import DetailCandidature from './pages/Candidat/DetailCandidature_new.jsx';
import HomePage from './pages/Auth/HomePage';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import VerifyOtp from './pages/Auth/VerifyOtp';
import VerifyOtpRoute from './components/VerifyOtpRoute';
import RHCalendrierEntretiens from './pages/RH/RHCalendrierEntretiens';
import EntretienLive from './pages/RH/EntretienLive';
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminUtilisateurs from './pages/Admin/AdminUtilisateurs';

import RoleBasedRoute from './components/RoleBasedRoute';
// Pages Candidat
import CandidatDashboard from './pages/Candidat/Dashboard';
import Unauthorized from './pages/Auth/Unauthorized';

import CandidatProfil from './pages/Candidat/Monprofil';

import RHCandidats from './pages/RH/Rhcandidatures';
import Rhsujet from './pages/RH/Rhsujet';
import Rhquizsujet from './pages/RH/Rhquizgestion';
import CandidatQuiz from './pages/Candidat/Candidatquiz';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';

import CandidatOffres from './pages/Candidat/Offers';
//import CandidatApplications from './pages/candidat/Applications';
// Pages RH
import RHDashboard from './pages/RH/Rhdashboard';
import PublicRoute from './components/PublicRoute'; // Importer le composant
import RHParametres from './pages/RH/Rhparametres';
import RHEntretiens from './pages/RH/Rhplanifierentretiens';

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