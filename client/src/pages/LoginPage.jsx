import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getRoleHome } from "../lib/roleHome.js";
import { Button } from "../components/ui/Button.jsx";

const DEFAULT_GOOGLE_CLIENT_ID = "1041940225576-s693gmk83i92qk41ta6n1o8kaejiujrv.apps.googleusercontent.com";

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDevLogin, setShowDevLogin] = useState(false);
  const googleBtnRef = useRef(null);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;

    const handleCredentialResponse = async (response) => {
      setError("");
      setLoading(true);
      try {
        const data = await loginWithGoogle(response.credential);
        navigate(getRoleHome(data.user.role));
      } catch (err) {
        setError(err.message || "Google sign-in failed. Ensure your account uses @iiml.ac.in.");
      } finally {
        setLoading(false);
      }
    };

    let checkCount = 0;
    const initGoogle = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            auto_select: false,
          });
          googleBtnRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: "outline",
            size: "large",
            type: "standard",
            shape: "rectangular",
            text: "signin_with",
            logo_alignment: "left",
            width: 300,
          });
        } catch (err) {
          console.error("GIS initialization error:", err);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        checkCount += 1;
        if (window.google?.accounts?.id) {
          initGoogle();
          clearInterval(interval);
        } else if (checkCount > 20) {
          clearInterval(interval);
        }
      }, 250);
      return () => clearInterval(interval);
    }
  }, [clientId, loginWithGoogle, navigate]);

  const handleDevSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(email, name);
      navigate(getRoleHome(data.user.role));
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-4">
      <div className="w-full max-w-md">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Venue Booking</h1>
            <p className="text-blue-200/80 text-sm">IIM Lucknow Campus Management</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-200 text-sm text-center">
              {error}
            </div>
          )}

          {/* Primary Google SSO Section */}
          <div className="space-y-4 text-center">
            <p className="text-xs text-blue-200/60 uppercase tracking-wider font-medium">
              Institutional SSO Sign-In
            </p>

            <div className="flex justify-center min-h-[44px] items-center">
              <div ref={googleBtnRef} id="google-login-btn" className="w-full flex justify-center">
                <span className="text-xs text-blue-300/40 animate-pulse">Loading Google SSO…</span>
              </div>
            </div>

            <p className="text-xs text-blue-300/50">
              Only @iiml.ac.in institutional email accounts are permitted
            </p>
          </div>

          {/* Collapsible Dev Mode Login */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <button
              type="button"
              onClick={() => setShowDevLogin(!showDevLogin)}
              className="w-full text-xs text-blue-300/60 hover:text-blue-200 flex items-center justify-center gap-1 transition py-1"
            >
              <span>{showDevLogin ? "Hide Dev Login Form" : "Development / Testing Sign-In"}</span>
              <span>{showDevLogin ? "▲" : "▼"}</span>
            </button>

            {showDevLogin && (
              <form onSubmit={handleDevSubmit} className="space-y-4 mt-4" id="login-form">
                <div>
                  <label htmlFor="login-email" className="block text-xs font-medium text-blue-100 mb-1">
                    Institutional Email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@iiml.ac.in"
                    required
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div>
                  <label htmlFor="login-name" className="block text-xs font-medium text-blue-100 mb-1">
                    Full Name
                  </label>
                  <input
                    id="login-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Test Student"
                    required
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <Button
                  type="submit"
                  id="login-submit"
                  variant="secondary"
                  loading={loading}
                  className="w-full"
                >
                  Sign In (Dev Mode)
                </Button>
              </form>
            )}
          </div>

          <div className="mt-6 pt-4 text-center">
            <a href="/availability" className="text-blue-300/80 hover:text-blue-200 text-sm transition">
              View public availability board →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
