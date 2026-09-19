import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import WalletButton from "./WalletButton";

export default function Navbar() {
  const { isAuthenticated, isAdmin, isManufacturer, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-bold text-indigo-700">
          AuthentiChain
        </Link>

        <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
          <Link to="/verify" className="hover:text-indigo-700">
            Verify a product
          </Link>

          {isManufacturer && (
            <Link to="/manufacturer" className="hover:text-indigo-700">
              My Dashboard
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin" className="hover:text-indigo-700">
              Admin Dashboard
            </Link>
          )}

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="text-slate-400">{user?.fullName}</span>
              <button
                onClick={handleLogout}
                className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-100"
              >
                Log out
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="hover:text-indigo-700">
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700"
              >
                Become a manufacturer
              </Link>
            </>
          )}

          <WalletButton />
        </nav>
      </div>
    </header>
  );
}
