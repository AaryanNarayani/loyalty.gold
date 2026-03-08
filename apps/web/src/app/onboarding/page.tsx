"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Store, UserCircle } from "lucide-react";
import toast from "react-hot-toast";
import "./onboarding.css";
import { BASE_URL } from "@/utils/config";

export default function OnboardingGateway() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [isAssessing, setIsAssessing] = useState(true);
  const [isInitializingUser, setIsInitializingUser] = useState(false);

  async function assessRole() {
    try {
      const email = session?.user?.email;
      if (!email) return;

      const merchantRes = await fetch(`${BASE_URL}/api/merchant/me`, {
        headers: { "Authorization": `Bearer ${(session as any).accessToken}` }
      });
      
      if (merchantRes.ok) {
        const data = await merchantRes.json();
        if (data.merchant) {
            localStorage.setItem("userRole", data.role);
            router.push("/merchant");
            return;
        }
      }

      const userRes = await fetch(`${BASE_URL}/api/user/me`, {
        headers: { "Authorization": `Bearer ${(session as any).accessToken}` }
      });

      if (userRes.ok) {
          const data = await userRes.json();
          localStorage.setItem("userRole", data.role);
          router.push("/user");
          return;
      }

      setIsAssessing(false);
      
    } catch (error) {
      console.error("Failed to assess role:", error);
      setIsAssessing(false);
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && session?.user?.email) {
      assessRole();
    }
  }, [status, session, router]); 

  const selectUserRole = async () => {
    setIsInitializingUser(true);
    try {
      const res = await fetch(`${BASE_URL}/api/user/init`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${(session as any).accessToken}` }
      });

      if (res.ok) {
        localStorage.setItem("userRole", "user");
        router.push("/user");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to initialize User role");
        setIsInitializingUser(false);
      }
    } catch (e) {
      console.error("Init user failed", e);
      setIsInitializingUser(false);
    }
  };

  const selectMerchantRole = () => {
      localStorage.setItem("userRole", "merchant");
      router.push("/merchant");
  };

  if (isAssessing) {
      return (
          <div className="ob-wrapper">
             <div className="ob-dots" />
             <div className="ob-glow" />
             <div className="ob-container" style={{ justifyContent: 'center', minHeight: '100vh' }}>
                <img src="/oro.svg" alt="Loading..." className="ob-loader-logo" />
             </div>
          </div>
      );
  }

  return (
    <div className="ob-wrapper">
       <div className="ob-dots" />
       <div className="ob-glow" />
       
       <div className="ob-container">
         <div className="ob-brand">loyalty.gold</div>
         
         <div className="ob-header">
           <h1 className="ob-title">Select Your Role</h1>
           <p className="ob-subtitle">
              Are you here to manage a merchant rewards program<br />
              or view the gold rewards you've earned?
           </p>
         </div>

         <div className="ob-cards">
             <div className="ob-card" onClick={selectUserRole}>
                <div className="ob-icon-wrapper">
                   <UserCircle size={40} strokeWidth={1.5} />
                </div>
                <h2 className="ob-card-title">Standard User</h2>
                <p className="ob-card-desc">
                   View and manage the tokenized gold rewards you've earned from participating merchants.
                </p>
                <button disabled={isInitializingUser} className="ob-btn ob-btn-primary">
                   {isInitializingUser ? "Generating Profile..." : "Enter User Vault"}
                </button>
             </div>

             <div className="ob-card" onClick={selectMerchantRole}>
                <div className="ob-icon-wrapper">
                   <Store size={40} strokeWidth={1.5} />
                </div>
                <h2 className="ob-card-title">Brand Merchant</h2>
                <p className="ob-card-desc">
                   Set up your merchant dashboard to distribute real gold rewards to your customers.
                </p>
                <button className="ob-btn ob-btn-outline">
                   Setup Merchant Portal
                </button>
             </div>
         </div>

         <div className="ob-helper">
           <div style={{ display: "flex", alignItems: "center", gap: "8px", opacity: 0.6, fontSize: "0.9rem" }}>
             Powered by <div style={{ width: "114px", height: "20px", backgroundColor: "#B8963F", WebkitMask: "url(/grail.svg) no-repeat center", WebkitMaskSize: "contain", mask: "url(/grail.svg) no-repeat center", maskSize: "contain" }} />
           </div>
         </div>
       </div>
    </div>
  );
}
