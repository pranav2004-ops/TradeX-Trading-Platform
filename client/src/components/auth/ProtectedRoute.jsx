import { Navigate } from "react-router-dom";
import { hasAuthToken } from "../../utils/auth";

const ProtectedRoute = ({ children }) => {
  if (!hasAuthToken()) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
