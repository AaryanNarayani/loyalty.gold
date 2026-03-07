"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { ArrowLeft, Wallet, Settings, Plus, Check, ChevronRight, ArrowRightLeft, Users, ArrowUpRight, LogOut, Key, Eye, EyeOff, Copy, Trash2 } from "lucide-react";
import "./merchant.css";
import { BASE_URL } from "@/utils/config";

export default function MerchantDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);
  const [merchantData, setMerchantData] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [history, setHistory] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [rewardRatio, setRewardRatio] = useState(1.5);
  const [depositAmount, setDepositAmount] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [step, setStep] = useState(1);
  const [onboardData, setOnboardData] = useState({ name: "", shopDomain: "", rewardRatio: 1.5, storeType: "shopify" as "shopify" | "other", storeDescription: "" });
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [onboardError, setOnboardError] = useState("");
  const [goldEstimate, setGoldEstimate] = useState<{data: {estimatedUsdcAmount: number}} | null>(null);
  const [convertAmount, setConvertAmount] = useState("");
  const [isEstimating, setIsEstimating] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [onboardDeposited, setOnboardDeposited] = useState(false);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [editProfile, setEditProfile] = useState({ name: "", shopDomain: "" });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [withdrawAsset, setWithdrawAsset] = useState("USDC");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [destinationWallet, setDestinationWallet] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const [apiKeys, setApiKeys] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && session?.user?.email) {
      fetchMerchantData();
    }
  }, [status, session, router]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchMerchantData = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/merchant/me`, {
        headers: { "Authorization": `Bearer ${(session as any).accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.merchant) {
           localStorage.setItem("userRole", data.role);
           setMerchantData(data.merchant);
           setRewardRatio(data.merchant.rewardRatio * 100);
           setHistory(data.history);
           setEditProfile({ name: data.merchant.name, shopDomain: data.merchant.shopDomain });
        } else {
           setMerchantData({ isOnboarded: false });
        }
      } else if (res.status === 403) {
         alert("You are registered as a User. You cannot access the Merchant Portal.");
         router.push("/");
      }
    } catch (error) {
      console.error("Failed to fetch merchant data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || Number(depositAmount) <= 0) return;
    if (Number(depositAmount) > 10000) {
      alert("Maximum test token deposit is 10,000 USDC per request.");
      return;
    }

    setIsDepositing(true);
    try {
      const res = await fetch(`${BASE_URL}/api/merchant/deposit`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(session as any).accessToken}` 
        },
        body: JSON.stringify({ amount: Number(depositAmount) })
      });
      if (res.ok) {
        const data = await res.json();
        setMerchantData({ ...merchantData, balanceUsdc: data.balanceUsdc });
        setDepositAmount("");
        alert("Successfully airdropped USDC Test Tokens to your account");
      } else {
        const error = await res.json();
        alert(error.error || "Deposit failed");
      }
    } catch (e) {
      alert("Deposit failed");
    } finally {
      setIsDepositing(false);
    }
  };

  const handleSaveRatio = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/merchant/config`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(session as any).accessToken}` 
        },
        body: JSON.stringify({ rewardRatio: rewardRatio / 100 })
      });
      if (res.ok) {
        alert("Reward ratio successfully updated!");
      }
    } catch(e) {
      alert("Failed to save config");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOnboardStep1 = async () => {
    setIsOnboarding(true);
    setOnboardError("");
    try {
      const res = await fetch(`${BASE_URL}/api/merchant/onboard`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(session as any).accessToken}` 
        },
        body: JSON.stringify({
            name: onboardData.name,
            shopDomain: onboardData.shopDomain,
            storeType: onboardData.storeType
        })
      });
      const data = await res.json();
      if (res.ok) {
         setMerchantData(data.merchant);
         setStep(2);
      } else {
         setOnboardError(data.error || "Failed to create merchant profile");
      }
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
       setOnboardError("Something went wrong during onboarding.");
    } finally {
       setIsOnboarding(false);
    }
  };

  const handleFundPool = async () => {
    if (!depositAmount || Number(depositAmount) <= 0) return;
    if (Number(depositAmount) > 10000) { alert("Max airdrop is 10,000 USDC"); return; }
    setIsDepositing(true);
    try {
      const res = await fetch(`${BASE_URL}/api/merchant/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${(session as any).accessToken}` },
        body: JSON.stringify({ amount: Number(depositAmount) })
      });
      if (res.ok) {
        const data = await res.json();
        setMerchantData({ ...merchantData, balanceUsdc: data.balanceUsdc });
        setDepositAmount("");
        setOnboardDeposited(true);
      } else {
        const error = await res.json();
        alert(error.error || "Deposit failed");
      }
    } catch (e) { alert("Deposit failed"); }
    finally { setIsDepositing(false); }
  };

  const fetchGoldEstimate = async () => {
    setIsEstimating(true);
    try {
      const res = await fetch("https://oro-tradebook-devnet.up.railway.app/api/trading/estimate/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": process.env.NEXT_PUBLIC_X_API_KEY || "" },
        body: JSON.stringify({ goldAmount: 1 }) 
      });
      if (res.ok) {
        const data = await res.json();
        setGoldEstimate(data);
      } else {
        console.error("Failed to fetch estimate, status:", res.status);
      }
    } catch (e) { console.error("Failed to fetch gold estimate", e); }
    finally { setIsEstimating(false); }
  };

  const handleConvertToGold = async () => {
    if (!convertAmount || Number(convertAmount) <= 0) return;
    setIsConverting(true);
    try {
      const res = await fetch(`${BASE_URL}/api/merchant/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${(session as any).accessToken}` },
        body: JSON.stringify({ amount: Number(convertAmount) })
      });
      if (res.ok) {
        const data = await res.json();
        setMerchantData({ ...merchantData, balanceUsdc: data.balanceUsdc, balanceGold: data.balanceGold });
        alert(`Successfully converted ${convertAmount} USDC → ${data.goldAmountOz.toFixed(6)} oz Gold`);
        setConvertAmount("");
      } else {
        const err = await res.json();
        alert(err.error || "Conversion failed");
      }
    } catch (e) { alert("Conversion failed"); }
    finally { setIsConverting(false); }
  };

  const handleOnboardComplete = async () => {
    setIsOnboarding(true);
    setOnboardError("");
    try {
      const res = await fetch(`${BASE_URL}/api/merchant/onboard/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${(session as any).accessToken}` },
        body: JSON.stringify({ rewardRatio: onboardData.rewardRatio / 100 })
      });
      const data = await res.json();
      if (res.ok) {
        setMerchantData(data.merchant);
        setRewardRatio(data.merchant.rewardRatio * 100);
        setEditProfile({ name: data.merchant.name, shopDomain: data.merchant.shopDomain });
      } else {
        setOnboardError(data.error || "Failed to complete onboarding");
      }
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
       setOnboardError("Something went wrong.");
    } finally {
       setIsOnboarding(false);
    }
  };

  const handleUpdateProfile = async () => {
    setIsUpdatingProfile(true);
    try {
      const res = await fetch(`${BASE_URL}/api/merchant/profile`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(session as any).accessToken}` 
        },
        body: JSON.stringify(editProfile)
      });
      if (res.ok) {
        const data = await res.json();
        setMerchantData({ ...merchantData, name: data.merchant.name, shopDomain: data.merchant.shopDomain });
        alert("Profile updated successfully");
      } else {
        alert("Failed to update profile");
      }
    } catch(e) {
      alert("Error updating profile");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const fetchApiKeys = async () => {
    setIsLoadingKeys(true);
    try {
      const res = await fetch(`${BASE_URL}/api/merchant/keys`, {
        headers: { "Authorization": `Bearer ${(session as any).accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.keys);
      }
    } catch (e) {
      console.error("Failed to fetch API keys", e);
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const handleCreateKey = async () => {
    setIsCreatingKey(true);
    try {
      const res = await fetch(`${BASE_URL}/api/merchant/keys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(session as any).accessToken}`
        },
        body: JSON.stringify({ name: newKeyName || "Default" })
      });
      const data = await res.json();
      if (res.ok) {
        setApiKeys(prev => [...prev, data.key]);
        setNewKeyName("");
      } else {
        alert(data.error || "Failed to create key pair");
      }
    } catch (e) {
      alert("Failed to create key pair");
    } finally {
      setIsCreatingKey(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm("Are you sure you want to delete this key pair? Any webhooks using it will stop working.")) return;
    try {
      const res = await fetch(`${BASE_URL}/api/merchant/keys/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${(session as any).accessToken}` }
      });
      if (res.ok) {
        setApiKeys(prev => prev.filter(k => k.id !== id));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete key pair");
      }
    } catch (e) {
      alert("Failed to delete key pair");
    }
  };

  const toggleReveal = (id: string) => {
    setRevealedSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleWithdraw = async (asset: string) => {
    if (!withdrawAmount || Number(withdrawAmount) <= 0) return;
    if (!destinationWallet.trim()) {
      alert("Destination Wallet address is required");
      return;
    }
    setIsWithdrawing(true);
    try {
      const res = await fetch(`${BASE_URL}/api/merchant/withdraw`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(session as any).accessToken}` 
        },
        body: JSON.stringify({ asset, amount: Number(withdrawAmount), destinationWallet: destinationWallet.trim() })
      });
      
      if (res.ok) {
        const data = await res.json();
        setMerchantData({ ...merchantData, balanceUsdc: data.merchant.balanceUsdc, balanceGold: data.merchant.balanceGold });
        setWithdrawAmount("");
        alert(`Successfully withdrew ${asset}`);
      } else {
        const err = await res.json();
        alert(err.error || "Withdrawal failed");
      }
    } catch (e) {
      alert("Withdrawal request failed");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const switchTab = (tab: string) => {
    setActiveTab(tab);
    if (tab === "api") fetchApiKeys();
  };

  if (isLoading) {
    return (
      <div className="merchant-root m-loading">
        <div className="m-dot-grid-bg" />
        <div className="m-radial-light" />
        <img 
          src="/oro.svg" 
          alt="Loading..." 
          className="m-loading-logo"
        />
      </div>
    );
  }

  const usdcBalance = (merchantData?.balanceUsdc || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const goldBalance = (merchantData?.balanceGold || 0).toFixed(3);

  return (
    <div className="merchant-root m-layout">
      <div className="m-dot-grid-bg" />
      <div className="m-radial-light" />

      {merchantData && merchantData.isOnboarded !== false && (
        <aside className="m-sidebar">
          <div className="m-sidebar-brand">
            <div className="m-sidebar-brand-text">
              loyalty.gold
              <span className="m-brand-dot" />
            </div>
          </div>

          <nav className="m-sidebar-nav">
            <button onClick={() => switchTab("dashboard")} className={`m-nav-item ${activeTab === "dashboard" ? "active" : ""}`}>
              <svg className="m-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
              Dashboard
            </button>
            <button onClick={() => switchTab("withdrawals")} className={`m-nav-item ${activeTab === "withdrawals" ? "active" : ""}`}>
              <svg className="m-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              Withdrawals
            </button>
            <button onClick={() => switchTab("api")} className={`m-nav-item ${activeTab === "api" ? "active" : ""}`}>
              <svg className="m-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="round"><path d="M4 17l6-6-6-6" /><path d="M12 19h8" /></svg>
              API &amp; Webhooks
            </button>
            <button onClick={() => switchTab("docs")} className={`m-nav-item ${activeTab === "docs" ? "active" : ""}`}>
              <svg className="m-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
              Documentation
            </button>
            <div className="m-nav-item" style={{ opacity: 0.5, cursor: 'default', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <svg className="m-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                Staking
              </span>
              <span style={{ fontSize: 9, fontFamily: 'var(--m-font-mono)', fontWeight: 700, color: 'var(--m-gold-primary)', border: '1px solid var(--m-gold-primary)', padding: '1px 6px', borderRadius: 3, lineHeight: '16px' }}>SOON</span>
            </div>
          </nav>

          <div className="m-sidebar-footer">
            <span className="m-sidebar-footer-link" style={{ fontSize: 12, color: "var(--m-text-tertiary)", marginBottom: 8, display: "block" }}>{session?.user?.email}</span>
            <button className="m-sidebar-footer-link" onClick={() => { localStorage.removeItem("userRole"); signOut({ callbackUrl: "/" }); }}>Logout</button>
          </div>
        </aside>
      )}

      <main className="m-main" style={merchantData && merchantData.isOnboarded === false ? { background: '#F2EFEA', position: 'relative' } : {}}>
        {merchantData && merchantData.isOnboarded === false && (
          <>
            <div className="m-onboard-dots" />
            <div className="m-onboard-glow" />
          </>
        )}
        <div className="m-main-inner" style={merchantData && merchantData.isOnboarded === false ? { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', position: 'relative', zIndex: 10 } : {}}>
          {merchantData && merchantData.isOnboarded === false ? (
            <div className="m-onboard-container" style={{ width: '100%' }}>
              {onboardError && <div className="m-onboard-error">{onboardError}</div>}

              <div className="m-stepper">
                <div className="m-stepper-track" />
                <div className="m-stepper-progress" style={{ width: `calc(${((step - 1) / 3) * 100}% - 2rem)` }} />
                {[1, 2, 3, 4].map((num) => (
                  <div key={num} className={`m-step-circle ${step > num ? "completed" : step === num ? "completed" : "pending"}`}>
                    {step > num ? <Check size={16} /> : num}
                  </div>
                ))}
              </div>

              <div className="m-onboard-card">
                {step === 1 && (
                  <div>
                    <h2 className="m-onboard-title">Store Details</h2>
                    <p className="m-onboard-desc">Tell us about your store so we can set up your treasury wallet.</p>

                    <div className="m-onboard-field">
                      <label>Store / Brand Name</label>
                      <input className="m-input" type="text" placeholder="e.g. Acme Shoes" value={onboardData.name} onChange={(e) => setOnboardData({...onboardData, name: e.target.value})} />
                    </div>

                    <div className="m-onboard-field">
                      <label>Platform</label>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: 8 }}>
                        <button
                          type="button"
                          className={onboardData.storeType === 'shopify' ? 'm-method-card selected' : 'm-method-card'}
                          onClick={() => setOnboardData({...onboardData, storeType: 'shopify', shopDomain: ''})}
                          style={{ flex: 1, cursor: 'pointer', padding: '1.25rem', textAlign: 'center' }}
                        >
                          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Shopify</div>
                          <div className="m-text-tertiary" style={{ fontSize: 13 }}>Format: name.myshopify.com</div>
                        </button>
                        <button
                          type="button"
                          className={onboardData.storeType === 'other' ? 'm-method-card selected' : 'm-method-card'}
                          onClick={() => setOnboardData({...onboardData, storeType: 'other', shopDomain: ''})}
                          style={{ flex: 1, cursor: 'pointer', padding: '1.25rem', textAlign: 'center' }}
                        >
                          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Custom / Other</div>
                          <div className="m-text-tertiary" style={{ fontSize: 13 }}>Non-Shopify platform</div>
                        </button>
                      </div>
                    </div>

                    <div className="m-onboard-field">
                      <label>{onboardData.storeType === 'shopify' ? 'Shopify Domain' : 'Store Domain'}</label>
                      <input
                        className="m-input"
                        type="text"
                        placeholder={onboardData.storeType === 'shopify' ? 'acme-shoes.myshopify.com' : 'www.acme-shoes.com'}
                        value={onboardData.shopDomain}
                        onChange={(e) => setOnboardData({...onboardData, shopDomain: e.target.value})}
                      />
                    </div>

                    <div className="m-onboard-field">
                      <label>Brand Description <span className="m-text-tertiary" style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>(Optional)</span></label>
                      <input className="m-input" type="text" placeholder="Brief description of what you sell" value={onboardData.storeDescription} onChange={(e) => setOnboardData({...onboardData, storeDescription: e.target.value})} />
                    </div>

                    <div className="m-onboard-actions">
                      <button className="m-btn-gold" onClick={handleOnboardStep1} disabled={!onboardData.name || !onboardData.shopDomain || isOnboarding} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {isOnboarding ? "Creating Wallet..." : <>Next <ChevronRight size={16} /></>}
                      </button>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <h2 className="m-onboard-title">Fund Your Pool</h2>
                    <p className="m-onboard-desc">Deposit USDC to fund your reward treasury. This is the pool from which customer rewards are distributed.</p>

                    <div style={{ background: '#FFF8E7', border: '1px solid #E6CD82', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem', fontSize: 14, color: '#8A6D15', lineHeight: 1.6 }}>
                      <strong style={{ color: '#B8963F' }}>Devnet Mode:</strong> GRAIL is currently on Solana Devnet. You can airdrop test USDC tokens for free (max 10,000 per request).
                    </div>

                    {onboardDeposited && merchantData?.balanceUsdc > 0 && (
                      <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem', fontSize: 14, color: '#166534' }}>
                        ✓ Pool funded with <strong>${merchantData.balanceUsdc.toLocaleString()} USDC</strong>
                      </div>
                    )}

                    <div className="m-onboard-field">
                      <label>USDC Amount to Airdrop</label>
                      <input className="m-input" type="number" placeholder="e.g. 1000" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} max={10000} />
                    </div>

                    <button className="m-btn-gold" style={{ width: '100%', marginBottom: '1.5rem', padding: '1rem' }} onClick={handleFundPool} disabled={isDepositing || !depositAmount}>
                      {isDepositing ? "Airdropping USDC..." : "Airdrop USDC"}
                    </button>

                    <div className="m-onboard-actions-split">
                      <button className="m-onboard-back" onClick={() => setStep(1)}>Back</button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <button style={{ color: '#888', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, textDecoration: 'underline', fontFamily: 'var(--m-font-body)' }} onClick={() => { setStep(3); fetchGoldEstimate(); }}>Skip this step, I&apos;ll do it later</button>
                        <button className="m-btn-gold" onClick={() => { setStep(3); fetchGoldEstimate(); }} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          Next <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div>
                    <h2 className="m-onboard-title">Convert to Gold</h2>
                    <p className="m-onboard-desc">Convert full or a portion of your USDC into tokenized Gold. This gold is what gets distributed as customer rewards.</p>

                    <div style={{ background: '#FAFAFA', border: '1px solid #E6E3DE', borderRadius: 8, padding: '1.5rem', marginBottom: '2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <span style={{ fontSize: 14, color: '#555' }}>Available USDC</span>
                        <span className="m-font-mono" style={{ fontWeight: 600, fontSize: 16, color: '#111' }}>${(merchantData?.balanceUsdc || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="m-text-secondary" style={{ fontSize: 14 }}>Live Gold Price (per oz)</span>
                        <span className="m-font-mono" style={{ fontWeight: 600, fontSize: 16, color: 'var(--m-gold-primary)' }}>
                          {isEstimating ? "Loading..." : goldEstimate?.data?.estimatedUsdcAmount ? `$${goldEstimate.data.estimatedUsdcAmount.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}` : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="m-onboard-field">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <label style={{ margin: 0 }}>USDC Amount to Convert</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button type="button" className="m-quick-btn" onClick={() => setConvertAmount(((merchantData?.balanceUsdc || 0) * 0.25).toString())}>25%</button>
                          <button type="button" className="m-quick-btn" onClick={() => setConvertAmount(((merchantData?.balanceUsdc || 0) * 0.5).toString())}>50%</button>
                          <button type="button" className="m-quick-btn" onClick={() => setConvertAmount((merchantData?.balanceUsdc || 0).toString())}>Max</button>
                        </div>
                      </div>
                      <input className="m-input" type="number" placeholder="e.g. 500" value={convertAmount} onChange={(e) => setConvertAmount(e.target.value)} />
                      {convertAmount && goldEstimate?.data?.estimatedUsdcAmount && Number(convertAmount) > 0 && (
                        <div style={{ marginTop: 12, fontSize: 14, color: 'var(--m-gold-primary)', fontWeight: 500 }}>
                          ≈ {(Number(convertAmount) / goldEstimate.data.estimatedUsdcAmount).toFixed(6)} oz Gold
                        </div>
                      )}
                    </div>

                    <button className="m-btn-gold" style={{ width: '100%', marginBottom: '1.5rem', padding: '1rem' }} onClick={handleConvertToGold} disabled={isConverting || !convertAmount || Number(convertAmount) <= 0}>
                      {isConverting ? "Converting..." : "Convert USDC → Gold"}
                    </button>

                    {merchantData?.balanceGold > 0 && (
                      <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem', fontSize: 14, color: '#166534' }}>
                        ✓ Gold balance: <strong>{merchantData.balanceGold.toFixed(6)} oz</strong>
                      </div>
                    )}

                    <div className="m-onboard-actions-split">
                      <button className="m-onboard-back" onClick={() => setStep(2)}>Back</button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <button style={{ color: '#888', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, textDecoration: 'underline', fontFamily: 'var(--m-font-body)' }} onClick={() => setStep(4)}>Skip this step</button>
                        <button className="m-btn-gold" onClick={() => setStep(4)} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          Next <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div>
                    <h2 className="m-onboard-title">Set Reward Ratio</h2>
                    <p className="m-onboard-desc">Determine what percentage of each purchase value gets converted to gold rewards for your customers. This determines your promotion budget.</p>
                    
                    <div style={{ background: '#FAFAFA', border: '1px solid #E6E3DE', borderRadius: 12, padding: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
                      <label style={{ display: "block", fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, fontWeight: 600, color: '#555', fontFamily: 'var(--m-font-mono)' }}>Gold Reward Ratio</label>
                      
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
                        <input type="number" style={{ width: 140, background: 'transparent', border: 'none', borderBottom: '2px solid #E6E3DE', color: '#B8963F', fontSize: '3rem', fontWeight: 600, textAlign: 'center', outline: 'none', fontFamily: 'var(--m-font-mono)', paddingBottom: '0.5rem' }} value={onboardData.rewardRatio} onChange={(e) => setOnboardData({...onboardData, rewardRatio: Number(e.target.value)})} step="0.1" min="0.1" max="100" />
                        <span style={{ fontSize: "2rem", fontFamily: 'var(--m-font-mono)', color: '#555' }}>%</span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF', border: '1px solid #E6E3DE', padding: '1rem 1.5rem', borderRadius: 8 }}>
                        <span style={{ color: '#555', fontSize: 15 }}>Customer spends <span style={{ color: '#111', fontWeight: 500 }}>$100</span></span>
                        <ArrowRightLeft size={16} style={{ color: '#888' }} />
                        <span style={{ color: '#B8963F', fontSize: 15, fontWeight: 500 }}>Earns ${(100 * (onboardData.rewardRatio / 100)).toFixed(2)} Gold</span>
                      </div>
                    </div>

                    <div className="m-onboard-actions-split">
                      <button className="m-onboard-back" onClick={() => setStep(3)}>Back</button>
                      <button className="m-btn-gold" style={{ padding: '1rem 2rem' }} onClick={handleOnboardComplete} disabled={isOnboarding || onboardData.rewardRatio <= 0}>
                        {isOnboarding ? "Finalizing Setup..." : "Complete Setup"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {activeTab === "dashboard" && (
                <section>
                  <header className="m-section-header">
                    <div>
                      <h1 className="m-section-title">Dashboard</h1>
                      <p className="m-section-subtitle">Overview</p>
                    </div>
                  </header>

                  <div className="m-stats-grid">
                    <div className="m-card m-stat-card">
                      <div className="m-stat-label">Total Gold Distributed</div>
                      <div className="m-stat-value">{goldBalance} oz</div>
                      <div className="m-stat-change positive">
                        <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                        12% vs last month
                      </div>
                    </div>
                    <div className="m-card m-stat-card" style={{ position: "relative", overflow: "hidden" }}>
                      <div className="m-stat-label">Reward Pool (USDC)</div>
                      <div className="m-stat-value">${usdcBalance}</div>
                      <div className="m-stat-change gold" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 600 }}>
                        <span className="m-pulse-dot" />
                        {Number(merchantData?.balanceUsdc || 0) < 1000 ? "Low Balance Alert" : "Funded"}
                      </div>
                    </div>
                    <div className="m-card m-stat-card">
                      <div className="m-stat-label">Active Customers</div>
                      <div className="m-stat-value">{history.length}</div>
                      <div className="m-stat-change neutral">Lifetime</div>
                    </div>
                    <div className="m-card m-stat-card">
                      <div className="m-stat-label">Reward Ratio</div>
                      <div className="m-stat-value">{rewardRatio}%</div>
                      <div className="m-stat-change neutral">Current Config</div>
                    </div>
                  </div>

                  <div className="m-content-grid">
                    <div className="m-left-col">
                      <div className="m-card">
                        <div className="m-card-header">
                          <h3 className="m-card-title">Merchant Wallet</h3>
                          <div className="m-status-badge">
                            <span className="m-stat-label" style={{ margin: 0 }}>Status</span>
                            <div className="m-status-dot green" />
                          </div>
                        </div>
                        <div className="m-wallet-grid" style={{ display: 'block', padding: '1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '2rem' }}>
                            <div>
                              <div className="m-info-label" style={{ fontSize: '11px', letterSpacing: '0.1em', marginBottom: '8px' }}>AVAILABLE USDC</div>
                              <div className="m-font-mono" style={{ fontSize: '2.5rem', fontWeight: 500, color: 'var(--m-text-primary)' }}>${usdcBalance}</div>
                            </div>
                            
                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)' }}></div>
                            
                            <div>
                              <div className="m-info-label" style={{ fontSize: '11px', letterSpacing: '0.1em', marginBottom: '8px' }}>GOLD RESERVES</div>
                              <div className="m-font-mono secondary" style={{ fontSize: '1.75rem', fontWeight: 500, color: 'var(--m-gold-primary)' }}>{goldBalance} oz</div>
                            </div>
                          </div>
                          
                          <div className="m-flex" style={{ gap: '1rem', marginTop: '2rem' }}>
                            <button className="m-btn-gold" onClick={() => setShowDepositModal(true)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '0.875rem 0.5rem', fontSize: '14px', textTransform: 'initial', letterSpacing: 'normal' }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                              Deposit
                            </button>
                            <button className="m-btn-gold" onClick={() => switchTab("withdrawals")} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '0.875rem 0.5rem', fontSize: '14px', textTransform: 'initial', letterSpacing: 'normal' }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                              Withdraw
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="m-card" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                        <div className="m-card-header">
                          <h3 className="m-card-title">Recent Activity</h3>
                        </div>
                        <div style={{ overflowX: "auto" }}>
                          <table className="m-table">
                            <thead>
                              <tr>
                                <th>Status</th>
                                <th>User</th>
                                <th>Order ID</th>
                                <th>Gold Awarded</th>
                                <th className="text-right">Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {history.length === 0 ? (
                                <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--m-text-tertiary)", padding: "2rem" }}>No distributions found.</td></tr>
                              ) : (
                                history.map((item: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                                  <tr key={item.id}>
                                    <td>
                                      <span className={`m-status-inline ${item.status === "SUCCESS" ? "sent" : "failed"}`}>
                                        <span className="dot" /> {item.status === "SUCCESS" ? "Sent" : "Failed"}
                                      </span>
                                    </td>
                                    <td style={{ color: "var(--m-text-secondary)", fontFamily: "var(--m-font-body)" }}>{item.userEmail}</td>
                                    <td style={{ color: "var(--m-text-primary)" }}>{item.orderId}</td>
                                    <td style={{ color: "var(--m-gold-primary)", fontWeight: 500 }}>{item.amountGold} oz</td>
                                    <td className="text-right" style={{ color: "var(--m-text-tertiary)" }}>{new Date(item.createdAt).toLocaleDateString()}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    <div className="m-right-col">
                      <div className="m-card">
                        <h3 className="m-card-title m-mb-6">Reward Engine</h3>
                        <div className="m-mb-6">
                          <div className="m-flex m-justify-between m-items-center m-mb-2">
                            <span className="m-stat-label" style={{ margin: 0 }}>Reward Ratio</span>
                            <span className="m-font-mono m-text-xs m-text-secondary">% per order</span>
                          </div>
                          <div className="m-flex m-items-center m-gap-3 m-mb-3">
                            <input type="number" value={rewardRatio} onChange={(e) => setRewardRatio(Number(e.target.value))} className="m-ratio-input" step="0.1" />
                            <span className="m-text-gold m-font-mono m-text-sm">%</span>
                          </div>
                          <div className="m-range-row">
                            <span className="m-range-label">0.1</span>
                            <input type="range" min="0.1" max="10.0" step="0.1" value={rewardRatio} onChange={(e) => setRewardRatio(Number(e.target.value))} className="m-range-slider" />
                            <span className="m-range-label">10.0</span>
                          </div>
                        </div>
                        <div className="m-cost-box">
                          <div className="m-stat-label" style={{ marginBottom: 4 }}>Est. Cost per $1000 revenue</div>
                          <div className="m-font-mono" style={{ fontSize: "1.125rem", color: "var(--m-text-primary)" }}>${(rewardRatio * 10).toFixed(2)}</div>
                        </div>
                        <button className="m-btn-gold m-full-width" onClick={handleSaveRatio} disabled={isSaving}>
                          {isSaving ? "Saving..." : "Update Parameters"}
                        </button>
                      </div>

                      {/* Integrations */}
                      <div className="m-card">
                        <h3 className="m-card-title m-mb-4">Integrations</h3>
                        <div className="m-integration-list">
                          <div className="m-integration-row">
                            <span className="m-integration-name">
                              <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>
                              Shopify Plugin
                            </span>
                            <div className="m-integration-status">
                              <div className="m-status-dot green" style={{ width: 6, height: 6 }} />
                              <span className="label">Connected</span>
                            </div>
                          </div>
                          <div className="m-integration-row">
                            <span className="m-integration-name">
                              <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                              Webhooks
                            </span>
                            <div className="m-integration-status">
                              <div className="m-status-dot gold" style={{ width: 6, height: 6 }} />
                              <span className="label">Active</span>
                            </div>
                          </div>
                        </div>
                        <button className="m-btn-sm m-full-width m-mt-5" onClick={() => switchTab("api")}>Manage App</button>
                      </div>


                    </div>
                  </div>
                </section>
              )}

              {activeTab === "withdrawals" && (
                <section style={{ maxWidth: "720px", margin: "0 auto", padding: "2rem 0" }}>
                  <header style={{ textAlign: "center", marginBottom: "3rem" }}>
                    <h1 style={{ fontFamily: "var(--m-font-heading)", fontSize: "2rem", color: "#111", fontWeight: 400, marginBottom: "0.5rem" }}>Withdraw Funds</h1>
                    <p style={{ color: "#666", fontSize: "1.125rem", fontFamily: "var(--m-font-body)" }}>Transfer your assets to an external wallet securely.</p>
                  </header>

                  <div style={{
                    background: "#FFFFFF",
                    border: "1px solid #E6E3DE",
                    borderRadius: "16px",
                    boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
                    padding: "36px"
                  }}>
                    {/* ASSET SELECTION */}
                    <div style={{ marginBottom: "2rem" }}>
                      <div style={{ display: "flex", gap: "1rem" }}>
                        <button
                          onClick={() => setWithdrawAsset("USDC")}
                          style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            gap: "1rem",
                            padding: "16px 20px",
                            borderRadius: "12px",
                            border: withdrawAsset === "USDC" ? "1px solid #D4AF37" : "1px solid #E6E3DE",
                            background: withdrawAsset === "USDC" ? "rgba(212,175,55,0.05)" : "#FFFFFF",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            transform: withdrawAsset === "USDC" ? "translateY(-1px)" : "none",
                            boxShadow: withdrawAsset === "USDC" ? "0 4px 12px rgba(212,175,55,0.08)" : "none"
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = withdrawAsset === "USDC" ? "translateY(-1px)" : "none"; }}
                        >
                          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#2775CA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ color: "#FFF", fontWeight: 700, fontSize: 18, fontFamily: "var(--m-font-body)" }}>$</span>
                          </div>
                          <div style={{ textAlign: "left" }}>
                            <div style={{ fontWeight: 600, fontSize: 16, color: "#111", marginBottom: 2, fontFamily: "var(--m-font-body)" }}>USDC</div>
                            <div style={{ fontSize: 13, color: "#666", fontFamily: "var(--m-font-body)" }}>Available: ${usdcBalance}</div>
                          </div>
                        </button>

                        <button
                          onClick={() => setWithdrawAsset("GOLD")}
                          style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            gap: "1rem",
                            padding: "16px 20px",
                            borderRadius: "12px",
                            border: withdrawAsset === "GOLD" ? "1px solid #D4AF37" : "1px solid #E6E3DE",
                            background: withdrawAsset === "GOLD" ? "rgba(212,175,55,0.05)" : "#FFFFFF",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            transform: withdrawAsset === "GOLD" ? "translateY(-1px)" : "none",
                            boxShadow: withdrawAsset === "GOLD" ? "0 4px 12px rgba(212,175,55,0.08)" : "none"
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = withdrawAsset === "GOLD" ? "translateY(-1px)" : "none"; }}
                        >
                          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #D4AF37, #C69C2F)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.5)" }}></div>
                          </div>
                          <div style={{ textAlign: "left" }}>
                            <div style={{ fontWeight: 600, fontSize: 16, color: "#111", marginBottom: 2, fontFamily: "var(--m-font-body)" }}>GOLD</div>
                            <div style={{ fontSize: 13, color: "#666", fontFamily: "var(--m-font-body)" }}>Available: {goldBalance} oz</div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* DESTINATION WALLET */}
                    <div style={{ marginBottom: "2rem" }}>
                      <label style={{ display: "block", fontSize: 14, color: "#333", marginBottom: 8, fontWeight: 500, fontFamily: "var(--m-font-body)" }}>Destination Wallet (Solana)</label>
                      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                        <Wallet size={20} style={{ position: "absolute", left: 16, color: "#999" }} />
                        <input 
                          type="text" 
                          value={destinationWallet} 
                          onChange={(e) => setDestinationWallet(e.target.value)} 
                          placeholder="Paste or enter Solana wallet address" 
                          style={{ 
                            width: "100%", 
                            padding: "14px 110px 14px 44px", 
                            fontSize: "15px", 
                            fontFamily: "var(--m-font-mono)", 
                            background: "#FFFFFF", 
                            border: "1px solid #E6E3DE", 
                            borderRadius: "10px",
                            outline: "none",
                            color: "#111",
                            transition: "border-color 0.2s"
                          }} 
                          onFocus={(e) => e.target.style.borderColor = "#D4AF37"}
                          onBlur={(e) => e.target.style.borderColor = "#E6E3DE"}
                        />
                        <button 
                          onClick={async () => {
                            try {
                              const text = await navigator.clipboard.readText();
                              if (text) setDestinationWallet(text);
                            } catch (err) {
                              console.error("Failed to read clipboard contents: ", err);
                            }
                          }}
                          style={{ 
                            position: "absolute", 
                            right: 8, 
                            background: "#F5F5F5", 
                            border: "none", 
                            padding: "8px 16px", 
                            borderRadius: "6px", 
                            fontSize: 13, 
                            fontWeight: 600, 
                            color: "#555",
                            cursor: "pointer",
                            transition: "background 0.2s"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#EBEBEB"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "#F5F5F5"}
                        >
                          Paste
                        </button>
                      </div>
                    </div>

                    {/* AMOUNT INPUT */}
                    <div style={{ marginBottom: "2.5rem" }}>
                      <label style={{ display: "block", fontSize: 14, color: "#333", marginBottom: 8, fontWeight: 500, fontFamily: "var(--m-font-body)" }}>Amount</label>
                      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                        <span style={{ position: "absolute", left: 16, color: "#111", fontWeight: 500, fontSize: "18px", fontFamily: "var(--m-font-mono)" }}>
                          {withdrawAsset === "USDC" ? "$" : ""}
                        </span>
                        <input 
                          type="number" 
                          min="0"
                          value={withdrawAmount} 
                          onChange={(e) => setWithdrawAmount(e.target.value)} 
                          style={{ 
                            width: "100%", 
                            padding: "16px 100px 16px " + (withdrawAsset === "USDC" ? "36px" : "16px"), 
                            fontSize: "18px", 
                            fontWeight: 500,
                            fontFamily: "var(--m-font-mono)",
                            background: "#FFFFFF", 
                            border: "1px solid #E6E3DE", 
                            borderRadius: "10px", 
                            color: "#111",
                            outline: "none",
                            transition: "border-color 0.2s"
                          }} 
                          placeholder="0.00" 
                          onFocus={(e) => e.target.style.borderColor = "#D4AF37"}
                          onBlur={(e) => e.target.style.borderColor = "#E6E3DE"}
                        />
                        <div style={{ position: "absolute", right: 12, display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ color: "#666", fontWeight: 500, fontSize: "14px", fontFamily: "var(--m-font-body)" }}>{withdrawAsset}</span>
                          <button 
                            onClick={() => setWithdrawAmount(withdrawAsset === "USDC" ? (merchantData?.balanceUsdc || 0).toString() : (merchantData?.balanceGold || 0).toString())}
                            style={{ 
                              background: "rgba(212,175,55,0.1)", 
                              color: "#D4AF37", 
                              border: "none", 
                              padding: "6px 10px", 
                              borderRadius: "4px", 
                              fontSize: 12, 
                              fontWeight: 700, 
                              cursor: "pointer",
                              transition: "background 0.2s"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(212,175,55,0.15)"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(212,175,55,0.1)"}
                          >
                            MAX
                          </button>
                        </div>
                      </div>
                      <div style={{ marginTop: 10, fontSize: 13, color: "#666", display: "flex", fontFamily: "var(--m-font-body)" }}>
                        <span>Available Balance: {withdrawAsset === "USDC" ? `$${usdcBalance}` : `${goldBalance} oz`}</span>
                      </div>
                    </div>

                    {/* SUMMARY SECTION */}
                    {withdrawAmount && Number(withdrawAmount) > 0 && destinationWallet && (
                      <div style={{ 
                        background: "#F8F6F2", 
                        borderRadius: "12px", 
                        padding: "16px 20px",
                        marginBottom: "2rem",
                        animation: "fadeIn 0.3s ease"
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--m-font-body)" }}>Transaction Summary</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#666", fontFamily: "var(--m-font-body)" }}>Asset</span>
                            <span style={{ fontWeight: 500, color: "#111", fontFamily: "var(--m-font-body)" }}>{withdrawAsset}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#666", fontFamily: "var(--m-font-body)" }}>Amount</span>
                            <span style={{ fontWeight: 500, color: "#111", fontFamily: "var(--m-font-mono)" }}>
                              {withdrawAsset === "USDC" ? "$" : ""}{withdrawAmount} {withdrawAsset === "GOLD" ? "oz" : ""}
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#666", fontFamily: "var(--m-font-body)" }}>Network</span>
                            <span style={{ fontWeight: 500, color: "#111", fontFamily: "var(--m-font-body)" }}>Solana</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#666", fontFamily: "var(--m-font-body)" }}>Estimated Fee</span>
                            <span style={{ fontWeight: 500, color: "#111", fontFamily: "var(--m-font-mono)" }}>$0.02</span>
                          </div>
                          <div style={{ height: 1, background: "#E6E3DE", margin: "6px 0" }}></div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "#111", fontWeight: 600, fontFamily: "var(--m-font-body)" }}>You Will Receive</span>
                            <span style={{ fontWeight: 600, color: "#D4AF37", fontSize: 16, fontFamily: "var(--m-font-mono)" }}>
                              {withdrawAsset === "USDC" 
                                ? `$${Math.max(0, Number(withdrawAmount) - 0.02).toFixed(2)} USDC` 
                                : `${Math.max(0, Number(withdrawAmount)).toFixed(6)} oz`}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* WITHDRAW BUTTON */}
                    <button 
                      onClick={() => { if (withdrawAmount && destinationWallet) setShowWithdrawModal(true); }} 
                      disabled={isWithdrawing || !withdrawAmount || !destinationWallet} 
                      style={{ 
                        width: "100%", 
                        height: "48px",
                        background: (!withdrawAmount || !destinationWallet || isWithdrawing) ? "#E6E3DE" : "linear-gradient(135deg, #D4AF37, #C69C2F)",
                        color: (!withdrawAmount || !destinationWallet || isWithdrawing) ? "#999" : "white",
                        border: "none",
                        borderRadius: "10px", 
                        fontSize: 16, 
                        fontWeight: 600,
                        fontFamily: "var(--m-font-body)",
                        cursor: (!withdrawAmount || !destinationWallet || isWithdrawing) ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
                        boxShadow: (!withdrawAmount || !destinationWallet || isWithdrawing) ? "none" : "0 4px 14px rgba(212,175,55,0.3)"
                      }}
                      onMouseEnter={(e) => {
                        if (withdrawAmount && destinationWallet && !isWithdrawing) {
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow = "0 6px 20px rgba(212,175,55,0.4)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (withdrawAmount && destinationWallet && !isWithdrawing) {
                          e.currentTarget.style.transform = "none";
                          e.currentTarget.style.boxShadow = "0 4px 14px rgba(212,175,55,0.3)";
                        }
                      }}
                    >
                      {isWithdrawing ? "Processing..." : `Withdraw ${withdrawAsset}`}
                    </button>
                  </div>
                </section>
              )}

              {activeTab === "api" && (
                <section>
                  <div className="m-api-header">
                    <div>
                      <h1 className="m-section-title">API &amp; Webhooks</h1>
                      <p className="m-section-desc">Manage programmatic access and event notifications.</p>
                    </div>
                  </div>

                  {/* API Keys Section */}
                  <div className="m-card m-mb-8">
                    <div className="m-flex m-justify-between m-items-center m-mb-4">
                      <h3 className="m-card-title">Webhook Secrets</h3>
                      <div className="m-flex m-gap-2 m-items-center">
                        {apiKeys.length >= 4 && <span style={{ fontSize: 12, color: "#f59e0b", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", padding: "0.2rem 0.5rem", borderRadius: 12, fontWeight: 500 }}>Max 4</span>}
                        <input type="text" className="m-input" placeholder="Name" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} disabled={apiKeys.length >= 4 || isCreatingKey} style={{ width: 150, fontSize: 13 }} />
                        <button className="m-btn-gold" onClick={handleCreateKey} disabled={apiKeys.length >= 4 || isCreatingKey} style={{ padding: "0.5rem 1rem", opacity: apiKeys.length >= 4 ? 0.5 : 1 }}>
                          <Plus size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />{isCreatingKey ? "..." : "Add"}
                        </button>
                      </div>
                    </div>

                    {isLoadingKeys ? (
                      <div style={{ textAlign: "center", padding: "2rem", color: "var(--m-text-tertiary)" }}>Loading...</div>
                    ) : apiKeys.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "2rem" }}>
                        <Key size={32} style={{ color: "var(--m-text-tertiary)", marginBottom: "0.75rem" }} />
                        <p className="m-text-secondary" style={{ marginBottom: "1rem" }}>No webhook secrets yet.</p>
                        <button className="m-btn-gold" onClick={handleCreateKey} disabled={isCreatingKey}>
                          <Plus size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} /> Add First Secret
                        </button>
                      </div>
                    ) : (
                      <div className="m-flex-col m-gap-3">
                        {apiKeys.map((key: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                          <div key={key.id} className="m-key-secret-row">
                            <div className="m-flex m-justify-between m-items-center m-mb-3">
                              <div className="m-key-info">
                                <Key size={16} style={{ color: "var(--m-gold-primary)" }} />
                                <div>
                                  <div className="m-key-name" style={{ fontSize: 14 }}>{key.name}</div>
                                  <div className="m-key-date">Created {new Date(key.createdAt).toLocaleDateString()}</div>
                                </div>
                              </div>
                              <button className="m-key-delete" onClick={() => handleDeleteKey(key.id)}>
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                            <div className="m-key-secret-value">
                              <code className={`m-key-secret-code ${!revealedSecrets[key.id] ? "blurred" : ""}`}>{key.webhookSecret}</code>
                              <div className="m-key-secret-actions">
                                <button className="m-key-action-btn" onClick={() => toggleReveal(key.id)} title={revealedSecrets[key.id] ? "Hide" : "Reveal"}>
                                  {revealedSecrets[key.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                                {revealedSecrets[key.id] && (
                                  <button className={`m-key-action-btn ${copiedId === `secret-${key.id}` ? "copied" : ""}`} onClick={() => copyToClipboard(key.webhookSecret, `secret-${key.id}`)} title="Copy">
                                    {copiedId === `secret-${key.id}` ? <Check size={16} /> : <Copy size={16} />}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Endpoint Reference */}
                  <div className="m-card">
                    <h3 className="m-card-title m-mb-6">Endpoint Reference</h3>
                    <div className="m-code-block">
                      <div className="m-code-endpoint">
                        <span className="m-code-method-post">POST</span>
                        <span>/v1/rewards</span>
                      </div>
                      <pre style={{ lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>
                        <span className="m-code-cmd">curl</span> https://api.loyalty.gold/v1/rewards \{"\n"}  <span className="m-code-flag">-u</span> pk_live_...: \{"\n"}  <span className="m-code-flag">-d</span> amount=1000 \{"\n"}  <span className="m-code-flag">-d</span> currency=usd \{"\n"}  <span className="m-code-flag">-d</span> customer=cus_8s9d...
                      </pre>
                      <div className="m-code-endpoint" style={{ marginTop: "1.5rem" }}>
                        <span className="m-code-method-get">GET</span>
                        <span>/v1/balance</span>
                      </div>
                      <pre style={{ lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>
                        <span className="m-code-cmd">curl</span> https://api.loyalty.gold/v1/balance \{"\n"}  <span className="m-code-flag">-u</span> pk_live_...
                      </pre>
                    </div>
                  </div>
                </section>
              )}

              {/* ==================== DOCUMENTATION VIEW ==================== */}
              {activeTab === "docs" && (
                <section>
                  <header style={{ marginBottom: "2rem" }}>
                    <h1 className="m-section-title">Documentation</h1>
                    <p className="m-section-desc">Integration guides, resources, and account settings.</p>
                  </header>

                  <div className="m-docs-grid m-mb-8">
                    <div className="m-card m-docs-card">
                      <div className="m-docs-icon shopify">
                        <svg style={{ width: 24, height: 24 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>
                      </div>
                      <h3 className="m-docs-card-title">Shopify Integration</h3>
                      <p className="m-docs-card-desc">Connect your Shopify store in minutes. Our plugin automatically handles reward calculation and distribution based on order value.</p>
                      <div className="m-docs-steps">
                        <div className="m-docs-step"><span className="m-docs-step-num">1</span> Install Plugin</div>
                        <div className="m-docs-step"><span className="m-docs-step-num">2</span> Connect Merchant Wallet</div>
                        <div className="m-docs-step"><span className="m-docs-step-num">3</span> Activate Rewards</div>
                      </div>
                      <button className="m-btn-sm" onClick={() => alert("Please go to https://apps.shopify.com/loyalty-gold to install the app. (Mock Flow)")}>View Setup Guide</button>
                    </div>
                    <div className="m-card m-docs-card">
                      <div className="m-docs-icon api">
                        <svg style={{ width: 24, height: 24 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
                      </div>
                      <h3 className="m-docs-card-title">Manual API Integration</h3>
                      <p className="m-docs-card-desc">Build a fully custom reward experience using our REST API. Ideal for custom storefronts, mobile apps, or enterprise systems.</p>
                      <div className="m-docs-steps">
                        <div className="m-docs-step"><span className="m-docs-step-num">1</span> Generate API Keys</div>
                        <div className="m-docs-step"><span className="m-docs-step-num">2</span> Configure Webhooks</div>
                        <div className="m-docs-step"><span className="m-docs-step-num">3</span> Integrate Endpoints</div>
                      </div>
                      <button className="m-btn-sm" onClick={() => router.push("/docs")}>View API Docs</button>
                    </div>
                  </div>

                  {/* Profile & Settings Section */}
                  <h2 style={{ fontSize: "1.25rem", fontWeight: 500, marginBottom: "1.5rem", color: "var(--m-text-primary)" }}>Account Settings</h2>
                  <div className="m-settings-grid">
                    <div className="m-card" style={{ padding: "2rem" }}>
                      <h3 className="m-card-title m-mb-6">Profile Management</h3>
                      <div className="m-onboard-field">
                        <label className="m-input-label">Merchant Name</label>
                        <input type="text" className="m-input" value={editProfile.name} onChange={(e) => setEditProfile({...editProfile, name: e.target.value})} />
                      </div>
                      <div className="m-onboard-field">
                        <label className="m-input-label">Shopify Domain</label>
                        <input type="text" className="m-input" value={editProfile.shopDomain} onChange={(e) => setEditProfile({...editProfile, shopDomain: e.target.value})} />
                      </div>
                      <button className="m-btn-gold m-full-width" onClick={handleUpdateProfile} disabled={isUpdatingProfile} style={{ marginTop: 8 }}>
                        {isUpdatingProfile ? "Updating..." : "Update Profile"}
                      </button>

                      <div className="m-border-t m-mt-6 m-pt-6">
                        <div className="m-danger-zone">
                          <div className="m-danger-label">Treasury Wallet Keys</div>
                          <p className="m-text-secondary" style={{ fontSize: 13, marginBottom: "1rem" }}>Download your treasury wallet&apos;s keypair as a Solana JSON file. Keep this safe.</p>
                          <button className="m-danger-btn" onClick={async () => {
                            if (!confirm("⚠️ This will download your private key. Never share it. Continue?")) return;
                            try {
                              const res = await fetch(`${BASE_URL}/api/merchant/export-keys`, {
                                headers: { "x-merchant-email": session?.user?.email as string }
                              });
                              if (!res.ok) { alert("Failed to export keys"); return; }
                              const data = await res.json();
                              const blob = new Blob([JSON.stringify(data.secretKey)], { type: "application/json" });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `treasury-wallet-${data.publicKey.slice(0, 8)}.json`;
                              a.click();
                              URL.revokeObjectURL(url);
                            } catch { alert("Export failed"); }
                          }}>Export Wallet Keypair</button>
                        </div>
                      </div>
                    </div>

                    <div className="m-card" style={{ padding: "2rem" }}>
                      <h3 className="m-card-title m-mb-6">Integration Setup</h3>
                      <div className="m-mb-6">
                        <h4 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Webhook Endpoint</h4>
                        <p className="m-text-secondary m-text-sm m-mb-3">Set up a Shopify Webhook pointing to the endpoint below for the Order Creation event.</p>
                        <div className="m-cost-box">
                          <div className="m-stat-label" style={{ marginBottom: 4 }}>Webhook Endpoint</div>
                          <code className="m-font-mono m-text-gold" style={{ fontSize: 13, wordBreak: "break-all", display: "block" }}>https://api.loyalty.gold/webhooks/shopify/order</code>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      <div className={`m-modal-overlay ${showWithdrawModal ? "visible" : ""}`}>
        <div className="m-modal-backdrop" onClick={() => setShowWithdrawModal(false)} />
        <div className="m-modal-content">
          <h3 className="m-modal-title">Confirm Withdrawal</h3>
          <p className="m-modal-desc">You are about to withdraw <span className="m-font-mono m-font-medium" style={{ color: "var(--m-text-primary)" }}>{withdrawAsset === "USDC" ? "$" : ""}{withdrawAmount || "0.00"} {withdrawAsset}</span> to an external wallet. This action cannot be undone.</p>
          <div className="m-modal-details" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="m-modal-detail-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="m-modal-detail-label" style={{ color: "var(--m-text-secondary)" }}>Amount</span>
              <span className="m-modal-detail-value m-font-mono" style={{ fontSize: 14, fontWeight: 500, color: "var(--m-text-primary)" }}>{withdrawAsset === "USDC" ? "$" : ""}{withdrawAmount} {withdrawAsset}</span>
            </div>
            <div className="m-modal-detail-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="m-modal-detail-label" style={{ color: "var(--m-text-secondary)" }}>Destination Wallet</span>
              <span className="m-modal-detail-value m-font-mono" style={{ fontSize: 13, color: "var(--m-text-primary)" }}>{destinationWallet.length > 20 ? `${destinationWallet.substring(0, 10)}...${destinationWallet.substring(destinationWallet.length - 10)}` : destinationWallet}</span>
            </div>
            <div className="m-modal-detail-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="m-modal-detail-label" style={{ color: "var(--m-text-secondary)" }}>Network</span>
              <span className="m-modal-detail-value" style={{ color: "var(--m-text-primary)" }}>Solana (Devnet)</span>
            </div>
            <div className="m-modal-detail-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="m-modal-detail-label" style={{ color: "var(--m-text-secondary)" }}>Estimated Fee</span>
              <span className="m-modal-detail-value m-font-mono" style={{ fontSize: 14, color: "var(--m-text-primary)" }}>$0.02</span>
            </div>
          </div>
          <div className="m-modal-actions">
            <button className="m-btn-outline" onClick={() => setShowWithdrawModal(false)}>Cancel</button>
            <button className="m-btn-gold" onClick={() => { setShowWithdrawModal(false); handleWithdraw(withdrawAsset); }}>Confirm</button>
          </div>
        </div>
      </div>
      {/* Deposit Modal */}
      {showDepositModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={() => setShowDepositModal(false)}>
          <div style={{ background: "#FFFFFF", border: "1px solid #E6E3DE", borderRadius: 16, padding: "3rem", width: 500, maxWidth: "100%", boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "1.75rem", fontWeight: 400, marginBottom: "0.75rem", color: "#111", fontFamily: "var(--m-font-heading)" }}>Deposit USDC</h3>
            <p style={{ color: "#555", fontSize: 15, marginBottom: "2rem", lineHeight: 1.6 }}>
              Enter the amount of USDC to airdrop into your devnet merchant wallet. Max 10,000 per request.
            </p>

            <div style={{ marginBottom: "2.5rem" }}>
              <label style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#555", marginBottom: 12, fontWeight: 600 }}>Amount (USDC)</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#888", fontFamily: "var(--m-font-mono)", fontSize: "16px" }}>$</span>
                <input type="number" className="m-input" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} style={{ width: "100%", padding: "1.25rem 1rem 1.25rem 2.5rem", fontSize: "16px", background: "#FFFFFF", border: "1px solid #E6E3DE", borderRadius: 8, color: "#111" }} placeholder="0.00" autoFocus />
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <button style={{ flex: 1, background: "#FAFAFA", color: "#555", border: "1px solid #E6E3DE", borderRadius: 8, padding: "1rem", fontSize: 15, fontWeight: 500, cursor: "pointer", transition: "all 0.2s" }} onMouseOver={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#111" }} onMouseOut={(e) => { e.currentTarget.style.background = "#FAFAFA"; e.currentTarget.style.color = "#555" }} onClick={() => setShowDepositModal(false)}>Cancel</button>
              <button className="m-btn-gold" style={{ flex: 1, borderRadius: 8, padding: "1rem", fontSize: 15, fontWeight: 600 }} onClick={() => { handleDeposit(); setShowDepositModal(false); }} disabled={isDepositing || !depositAmount || Number(depositAmount) <= 0}>
                {isDepositing ? "Depositing..." : "Confirm Deposit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
