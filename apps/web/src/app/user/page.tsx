"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { ArrowLeft, Coins, ArrowRightLeft, ShieldCheck, Download, LogOut } from "lucide-react";
import "./user.css";
import { BASE_URL } from "@/utils/config";

export default function UserDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);
  const [userData, setUserData] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [balance, setBalance] = useState({ goldOz: 0 });
  const [history, setHistory] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [isLoading, setIsLoading] = useState(true);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && session?.user?.email) {
      fetchUserData();
    }
  }, [status, session, router]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUserData = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/user/me`, {
        headers: { 
          "Authorization": `Bearer ${(session as any).accessToken}` 
        }
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("userRole", data.role);
        setUserData(data.user);
        setBalance(data.balance);
        setHistory(data.history);
      } else if (res.status === 403) {
        alert("You are registered as a Merchant. You cannot access the User Vault.");
        router.push("/merchant");
        return;
      } else if (res.status === 404) {
         setUserData({ email: session?.user?.email });
      }
    } catch (error) {
      console.error("Failed to fetch user data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportKeys = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/user/keys`, {
        headers: { 
          "Authorization": `Bearer ${(session as any).accessToken}` 
        }
      });
      if (res.ok) {
        const keys = await res.json();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(keys.secretKey));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `solana-wallet-${keys.publicKey.substring(0,6)}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
      } else {
        alert("Wallet keys not found. You might need to accumulate a reward first to mint your wallet.");
      }
    } catch (error) {
       console.error("Failed to export keys", error);
       alert("Failed to export keys");
    }
  };

  if (isLoading) {
    return <div className="u-loading">Loading...</div>;
  }

  const goldPriceUsd = 2450.50;
  const usdValue = balance.goldOz * goldPriceUsd;
  const lifetimeOz = balance.goldOz.toFixed(3);
  const walletAddr = userData?.walletAddress
    ? `${userData.walletAddress.substring(0,6)}...${userData.walletAddress.substring(userData.walletAddress.length - 4)}`
    : "Pending";

  return (
    <div className="user-root">
      <div className="u-bg-layer" />
      <div className="u-radial" />

      <div className="u-container">
        {/* Top Nav */}
        <nav className="u-topnav">
          <Link href="/" className="u-brand">
            loyalty.gold
            <span className="u-brand-dot" />
          </Link>
          <div className="u-nav-right">
            <span className="u-nav-email">{session?.user?.email}</span>
            <button className="u-nav-logout" onClick={() => { localStorage.removeItem("userRole"); signOut({ callbackUrl: "/" }); }}>Logout</button>
          </div>
        </nav>

        <div className="u-page-content">
          {/* Hero Balance Card */}
          <div className="u-card u-hero">
            <div className="u-hero-label">Your Gold Rewards</div>
            <div className="u-balance u-balance-shimmer">
              {balance.goldOz.toFixed(3)}<span className="u-balance-unit"> oz</span>
            </div>
            <div className="u-balance-usd">
              ≈ ${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </div>

            <div className="u-hero-meta">
              <div className="u-meta-item">
                <div className="u-meta-label">Lifetime Earned</div>
                <div className="u-meta-value">{lifetimeOz} oz</div>
              </div>
              <div className="u-meta-divider" />
              <div className="u-meta-item">
                <div className="u-meta-label">Wallet</div>
                <div className="u-meta-value" style={{ color: "var(--u-gold)" }}>{walletAddr}</div>
              </div>
              <div className="u-meta-divider" />
              <div className="u-meta-item">
                <div className="u-meta-label">Network</div>
                <div className="u-meta-value">Solana</div>
              </div>
            </div>

            <div className="u-hero-actions">
              <button className="u-btn-gold" onClick={() => setShowWithdrawModal(true)}>
                Withdraw Gold
              </button>
              <button className="u-btn-outline" onClick={handleExportKeys}>
                Export Keys
              </button>
            </div>
          </div>

          {/* Rewards History */}
          <div className="u-section-header">
            <h2 className="u-section-title">Rewards History</h2>
          </div>

          {history.length === 0 ? (
            <div className="u-card u-empty">
              <div className="u-empty-coins">
                <div className="u-empty-coin" />
                <div className="u-empty-coin" />
                <div className="u-empty-coin" />
                <div className="u-empty-coin" />
              </div>
              <h3 className="u-empty-title">No rewards yet</h3>
              <p className="u-empty-desc">
                When you shop with participating merchants, you&apos;ll start earning real gold rewards automatically.
              </p>
            </div>
          ) : (
            <div className="u-card u-history-card">
              <table className="u-table">
                <thead>
                  <tr>
                    <th>Merchant</th>
                    <th>Order</th>
                    <th>Gold Earned</th>
                    <th>Status</th>
                    <th className="u-col-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                    <tr key={record.id}>
                      <td style={{ fontWeight: 500 }}>{record.merchantName}</td>
                      <td className="u-mono" style={{ color: "var(--u-text-secondary)" }}>{record.orderId}</td>
                      <td className="u-gold-amount">+{typeof record.amountGold === 'number' ? record.amountGold.toFixed(6) : Number(record.amountGold).toFixed(6)} oz</td>
                      <td>
                        <span className={`u-status-badge ${record.status === "SUCCESS" ? "success" : "failed"}`}>
                          <span className="dot" />
                          {record.status === "SUCCESS" ? "Confirmed" : "Failed"}
                        </span>
                      </td>
                      <td className="u-col-right" style={{ color: "var(--u-text-tertiary)", fontSize: 13 }}>
                        {new Date(record.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Wallet Details */}
          <div className="u-section-header" style={{ marginTop: "1rem" }}>
            <h2 className="u-section-title">Wallet Details</h2>
          </div>
          <div className="u-card u-wallet-card">
            <div className="u-wallet-rows">
              <div className="u-wallet-row">
                <span className="u-wallet-label">Wallet Address</span>
                <span className="u-wallet-value gold">{walletAddr}</span>
              </div>
              <div className="u-wallet-row">
                <span className="u-wallet-label">Network</span>
                <span className="u-wallet-value">Solana (Devnet)</span>
              </div>
              <div className="u-wallet-row">
                <span className="u-wallet-label">Underlying Protocol</span>
                <span className="u-wallet-value gold">Oro GRAIL</span>
              </div>
              <div className="u-wallet-row">
                <span className="u-wallet-label">Custody</span>
                <span className="u-wallet-value">Self-Custody (Embedded Wallet)</span>
              </div>
            </div>
          </div>

          {/* Staking — Coming Soon */}
          <div className="u-staking">
            <div className="u-staking-badge">COMING SOON</div>
            <h4 style={{ fontWeight: 500, fontSize: 14, color: "var(--u-text-primary)", marginBottom: 4 }}>Stake GOLD</h4>
            <p style={{ fontSize: 13, color: "var(--u-text-secondary)", margin: 0 }}>Earn yield on your gold rewards.</p>
          </div>
        </div>
      </div>

      {/* Withdraw Modal */}
      <div className={`u-modal-overlay ${showWithdrawModal ? "visible" : ""}`}>
        <div className="u-modal-backdrop" onClick={() => setShowWithdrawModal(false)} />
        <div className="u-modal-content">
          <h3 className="u-modal-title">Withdraw Gold</h3>
          <p className="u-modal-desc">
            Your rewards are real tokenized gold. Withdraw them to any Solana wallet at any time.
          </p>

          <div className="u-input-group">
            <label className="u-input-label">Amount</label>
            <div className="u-input-prefix-wrap">
              <input
                type="number"
                className="u-input"
                placeholder="0.000"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
              <span className="prefix">oz</span>
            </div>
          </div>

          <div className="u-input-group">
            <label className="u-input-label">Destination Wallet</label>
            <input
              type="text"
              className="u-input"
              placeholder="Solana wallet address"
            />
          </div>

          <div className="u-note">
            <strong>Note:</strong> Gold withdrawals are processed on-chain and may take up to 10 minutes to confirm.
          </div>

          <div className="u-modal-actions">
            <button className="u-btn-outline" onClick={() => setShowWithdrawModal(false)}>Cancel</button>
            <button className="u-btn-gold" onClick={() => { setShowWithdrawModal(false); alert("Withdrawal feature coming soon!"); }}>
              Withdraw
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
