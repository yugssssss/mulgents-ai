import { useDispatch, useSelector } from "react-redux";
import { FaGoogle } from "react-icons/fa";
import ArtifactPanel from "../components/ArtifactPanel";
import ChatArea from "../components/ChatArea";
import Sidebar from "../components/Sidebar";
import api from "../utils/axios";
import { setUserData } from "../redux/user.slice";
import { signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { auth, googleProvider } from "../../firebase";
import { useEffect, useState } from "react";

function Home() {
  const { userData } = useSelector(state => state.user);
  const dispatch = useDispatch();
  const [loginError, setLoginError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);

  // On mount: attempt session restore + pre-warm all backend services
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const { data } = await api.get("/api/me", { timeout: 4000 });
        if (data?.user) {
          dispatch(setUserData(data.user));
        }
      } catch {
        // No valid session or service warming up — user can click login
      } finally {
        setSessionChecking(false);
      }
    };

    // Pre-warm all backend services in background so they're ready when user types
    const warmupServices = () => {
      api.get("/api/warmup", { timeout: 12000 }).catch(() => {});
    };

    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const token = await result.user.getIdToken();
          await login(token);
        }
      } catch (error) {
        console.error("Redirect result error:", error);
      }
    };

    restoreSession();
    warmupServices(); // Fire and forget
    checkRedirect();
  }, []);

  const login = async (token) => {
    try {
      const { data } = await api.post(`/api/auth/login`, { token });
      dispatch(setUserData(data.user));
    } catch (error) {
      console.error("Backend login error:", error);
      setLoginError("Server error: " + (error?.response?.data?.message || error.message));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (loginLoading) return;
    setLoginError(null);
    setLoginLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      await login(token);
    } catch (error) {
      console.error("Popup login error:", error?.code, error?.message);
      if (
        error?.code === "auth/popup-blocked" ||
        error?.code === "auth/popup-closed-by-user" ||
        error?.code === "auth/cancelled-popup-request" ||
        error?.code === "auth/missing-or-invalid-nonce"
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectError) {
          setLoginError("Login failed: " + (redirectError?.message || "Unknown error"));
          setLoginLoading(false);
        }
      } else {
        setLoginError("Login failed: " + (error?.message || "Unknown error."));
        setLoginLoading(false);
      }
    }
  };

  return (
    <div className="h-screen flex bg-[#0d0f14] text-white overflow-hidden">
      <Sidebar />
      <ChatArea />
      <ArtifactPanel />

      {!userData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[340px] bg-[#13151c] border border-white/[0.08] rounded-2xl p-7 flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h2 className="text-[17px] font-semibold text-slate-100 tracking-tight">Welcome to MulgentAi</h2>
              <p className="text-[13px] text-slate-500">Please login to continue using the app.</p>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loginLoading || sessionChecking}
              className="w-full flex items-center justify-center gap-3 py-[11px] rounded-xl text-sm font-medium text-white bg-gradient-to-br from-indigo-500 to-violet-700 hover:from-indigo-400 hover:to-violet-600 active:from-indigo-600 active:to-violet-800 border border-indigo-500/30 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <FaGoogle size={15} className="text-white" />
              {sessionChecking ? "Checking session..." : loginLoading ? "Signing in..." : "Continue with Google"}
            </button>

            {loginError && (
              <p className="text-[12px] text-red-400 text-center leading-snug">{loginError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;