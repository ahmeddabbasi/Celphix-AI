import { Navigate } from "react-router-dom";

export default function Index() {
  // Avoid any dummy/placeholder UI.
  // If this route is ever used, send the user to the real dashboard.
  return <Navigate to="/" replace />;
}
