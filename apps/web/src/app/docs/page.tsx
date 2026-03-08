"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { useSession } from "next-auth/react";
import "./docs.css";

const CODE_NODE = `import crypto from 'crypto';

const WEBHOOK_SECRET = 'your_webhook_secret_here';
const SHOP_DOMAIN = 'my-store.com';
const ORO_WEBHOOK_URL = 'https://loyaltygold-production.up.railway.app/api/webhooks/shopify/order';

async function sendRewardWebhook(orderData) {
  // 1. Convert payload to JSON string
  const rawBody = JSON.stringify(orderData);
  
  // 2. Generate HMAC SHA256 Signature
  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody, 'utf8')
    .digest('base64');
    
  // 3. Send the POST request
  const response = await fetch(ORO_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shop-Domain': SHOP_DOMAIN,
      'X-Oro-Signature': signature
    },
    body: rawBody
  });
  
  if (response.ok) {
    console.log('Reward successfully processed by loyalty.gold');
  } else {
    console.error('Failed to notify loyalty.gold', await response.text());
  }
}

// Call this function when an order succeeds
sendRewardWebhook({
  id: 'order_12345',
  email: 'customer@example.com',
  total_price: '150.00'
});`;

const CODE_PYTHON = `import hmac
import hashlib
import json
import base64
import requests

WEBHOOK_SECRET = b'your_webhook_secret_here'
SHOP_DOMAIN = 'my-store.com'
ORO_WEBHOOK_URL = 'https://loyaltygold-production.up.railway.app/api/webhooks/shopify/order'

def send_reward_webhook(order_data):
    # 1. Convert payload to JSON string (no spaces for exact match)
    raw_body = json.dumps(order_data, separators=(',', ':')).encode('utf-8')
    
    # 2. Generate HMAC SHA256 Signature in Base64
    signature = base64.b64encode(
        hmac.new(WEBHOOK_SECRET, raw_body, hashlib.sha256).digest()
    ).decode('utf-8')
    
    # 3. Send the POST request
    headers = {
        'Content-Type': 'application/json',
        'X-Shop-Domain': SHOP_DOMAIN,
        'X-Oro-Signature': signature
    }
    
    response = requests.post(ORO_WEBHOOK_URL, headers=headers, data=raw_body)
    
    if response.status_code == 200:
        print('Reward successfully processed by loyalty.gold')
    else:
        print(f'Failed to notify loyalty.gold: {response.text}')

# Call this function when an order succeeds
send_reward_webhook({
    "id": "order_12345",
    "email": "customer@example.com",
    "total_price": "150.00"
})`;

const CODE_CURL = `# 1. Define your test payload
PAYLOAD='{"id":"test_123","email":"customer@example.com","total_price":"150.00"}'

# 2. Add your webhook secret
SECRET="your_webhook_secret_here"

# 3. Generate the HMAC signature
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)

# 4. Trigger the webhook!
curl -X POST https://loyaltygold-production.up.railway.app/api/webhooks/shopify/order \\
  -H "Content-Type: application/json" \\
  -H "X-Shop-Domain: my-store.com" \\
  -H "X-Oro-Signature: $SIGNATURE" \\
  -d "$PAYLOAD"`;

export default function DocsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  console.log(session);
  const [activeTab, setActiveTab] = useState("manual"); 
  const [activeCodeLang, setActiveCodeLang] = useState("node"); 
  const [copiedContext, setCopiedContext] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    setUserRole(localStorage.getItem("userRole"));
    setIsHydrating(false);
  }, []);

  const getCodeContent = () => {
      switch(activeCodeLang) {
          case 'node': return CODE_NODE;
          case 'python': return CODE_PYTHON;
          case 'curl': return CODE_CURL;
          default: return CODE_NODE;
      }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(getCodeContent());
    setCopiedContext(true);
    setTimeout(() => setCopiedContext(false), 2000);
  };
  
  // Custom navigation variables based on user session role
  const isMerchant = userRole === "merchant";
  const isStandardUser = userRole === "user";
  
  const backRoute = status === "unauthenticated" ? "/" : ((status === "authenticated" && isStandardUser) ? "/user" : "/merchant");
  const backLabel = status === "unauthenticated" ? "Return to Home" : ((status === "authenticated" && isStandardUser) ? "Back to Vault" : "Back to Dashboard");

  if (isHydrating) {
      return (
          <div className="d-root" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
             <div className="d-dot-grid-bg" />
             <div className="d-radial-light" />
             <img src="/oro.svg" alt="Loading Docs..." style={{ width: 64, height: 64, objectFit: "contain", animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite", filter: "drop-shadow(0 0 15px rgba(212, 175, 55, 0.4))", zIndex: 10 }} />
          </div>
      );
  }

  return (
    <div className="d-root">
      <div className="d-dot-grid-bg" />
      <div className="d-radial-light" />

      <header className="d-header">
        <div className="d-header-inner">
          <button className="d-back-btn" onClick={() => router.push(backRoute)}>
            <ArrowLeft size={16} /> {backLabel}
          </button>
          <div className="d-brand">
            loyalty.gold <span className="d-brand-dot" /> Docs
          </div>
        </div>
      </header>

      <main className="d-main">
        <div className="d-sidebar">
          <nav className="d-nav">
            <div className="d-nav-label">Integrations</div>
            <button 
              className={`d-nav-item ${activeTab === 'shopify' ? 'active' : ''}`}
              onClick={() => setActiveTab('shopify')}
            >
              Shopify Integration
            </button>
            <button 
              className={`d-nav-item ${activeTab === 'manual' ? 'active' : ''}`}
              onClick={() => setActiveTab('manual')}
            >
              Manual API Integration
            </button>
          </nav>
        </div>

        <div className="d-content">
          {activeTab === 'shopify' && (
            <div className="d-article">
              <h1 className="d-title">Shopify Integration</h1>
              <p className="d-desc">Coming soon. The Shopify App Store integration guide is currently being written while our public app is under review.</p>
              
              <div className="d-empty-state">
                  <div className="d-empty-icon" />
                  <h3>Documentation Pending</h3>
                  <p>In the meantime, you can explore the Manual API Integration.</p>
              </div>
            </div>
          )}

          {activeTab === 'manual' && (
            <div className="d-article">
              <h1 className="d-title">Manual API Integration</h1>
              <p className="d-desc">Integrate loyalty.gold rewards directly into your custom backend application in 3 simple steps.</p>

              <div className="d-step-block">
                <div className="d-step-num">Step 1</div>
                <h2>Generate a Webhook Secret</h2>
                <p>To securely talk to our API, you need a Webhook Secret to sign your payloads.</p>
                <ol className="d-list">
                    <li>Log in to your Merchant Dashboard on loyalty.gold.</li>
                    <li>Navigate to the <strong>API & Webhooks</strong> section.</li>
                    <li>Generate a new API Key Pair. You will receive a <code>Webhook Secret</code>. Keep this secure!</li>
                    <li>Note your registered <code>Shop Domain</code> (e.g., <code>my-store.com</code>).</li>
                </ol>
              </div>

              <div className="d-step-block">
                <div className="d-step-num">Step 2</div>
                <h2>Implement the Webhook Call</h2>
                <p>Whenever an order is successfully placed and paid for in your system, send a <code>POST</code> request to the loyalty.gold webhook endpoint.</p>
                
                <div className="d-callout">
                    <span className="d-tag post">POST</span>
                    <code>https://loyaltygold-production.up.railway.app/api/webhooks/shopify/order</code>
                </div>

                <h3>Payload Format (JSON)</h3>
                <p>The JSON body must include at least an <code>id</code> (your order ID), <code>email</code>, and <code>total_price</code>.</p>
                <pre className="d-pre"><code>{`{
  "id": "order_12345",
  "email": "customer@example.com",
  "total_price": "150.00"
}`}</code></pre>

                <h3>Required Headers</h3>
                <ul className="d-list">
                    <li><code>X-Shop-Domain</code>: The domain you registered with loyalty.gold (e.g. <code>my-store.com</code>).</li>
                    <li><code>X-Oro-Signature</code>: A base64-encoded HMAC SHA256 signature of the raw JSON body, signed using your Webhook Secret.</li>
                    <li><code>Content-Type</code>: <code>application/json</code></li>
                </ul>
              </div>

              <div className="d-step-block">
                <div className="d-step-num">Step 3</div>
                <h2>Generating the Signature & Calling the API</h2>
                <p>Sign the raw JSON body using standard HMAC SHA256 procedures. Ensure the raw body string perfectly matches what you transmit over wire.</p>

                <div className="d-code-window">
                    <div className="d-code-header">
                        <div className="d-code-tabs">
                            <button className={activeCodeLang === 'node' ? 'active' : ''} onClick={() => setActiveCodeLang('node')}>Node.js</button>
                            <button className={activeCodeLang === 'python' ? 'active' : ''} onClick={() => setActiveCodeLang('python')}>Python</button>
                            <button className={activeCodeLang === 'curl' ? 'active' : ''} onClick={() => setActiveCodeLang('curl')}>cURL</button>
                        </div>
                        <button className="d-copy-btn" onClick={copyToClipboard} title="Copy code">
                            {copiedContext ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                    </div>
                    <pre className="d-code-body"><code>{getCodeContent()}</code></pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
