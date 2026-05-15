import React, { createContext, useContext, useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import StudentDashboard from './pages/StudentDashboard'
import DoctorDashboard from './pages/DoctorDashboard'
import AdminDashboard from './pages/AdminDashboard'
import LiveSession from './pages/LiveSession'
import Layout from './components/Layout'

export const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

function RoleRoute({ allowedRoles, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('edu_user')
    return stored ? JSON.parse(stored) : null
  })

  const login = (userData) => {
    setUser(userData)
    localStorage.setItem('edu_user', JSON.stringify(userData))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('edu_user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={
            user ? <Navigate to={`/${user.role}`} replace /> : <Navigate to="/login" replace />
          } />
          <Route path="/student/*" element={
            <RoleRoute allowedRoles={['student']}>
              <Layout><StudentDashboard /></Layout>
            </RoleRoute>
          } />
          <Route path="/doctor/*" element={
            <RoleRoute allowedRoles={['doctor']}>
              <Layout><DoctorDashboard /></Layout>
            </RoleRoute>
          } />
          <Route path="/admin/*" element={
            <RoleRoute allowedRoles={['admin']}>
              <Layout><AdminDashboard /></Layout>
            </RoleRoute>
          } />
          <Route path="/live/:lectureId" element={
            <RoleRoute allowedRoles={['doctor','admin']}>
              <LiveSession />
            </RoleRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
