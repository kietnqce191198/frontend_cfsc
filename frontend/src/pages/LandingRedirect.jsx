import { Navigate } from "react-router-dom";
import { getLandingRouteForProfile } from "../lib/roleUtils";

function LandingRedirect() {
  const profile = localStorage.getItem("accountProfile");
  const user = profile ? JSON.parse(profile) : null;

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to={getLandingRouteForProfile(user)} replace />;
}

export default LandingRedirect;
