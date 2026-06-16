import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function PrivateRoute({ children, requireApproved = true, requireAdmin = false }) {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (requireAdmin && userProfile?.role !== 'admin') {
    return <Navigate to="/" />;
  }

  if (requireApproved && userProfile?.status !== 'approved') {
    return <Navigate to="/pending" />;
  }

  return children;
}
