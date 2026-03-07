import React from "react";
import {
  extend,
  render,
  BlockStack,
  Button,
  Heading,
  Image,
  Layout,
  TextBlock,
  TextContainer,
  View,
} from "@shopify/post-purchase-ui-extensions-react";

const COIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 170" fill="none">
  <defs>
    <linearGradient id="cFace" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFE066"/>
      <stop offset="40%" stop-color="#F0B800"/>
      <stop offset="100%" stop-color="#C58A00"/>
    </linearGradient>
    <linearGradient id="cEdge" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#C58A00"/>
      <stop offset="100%" stop-color="#8C6000"/>
    </linearGradient>
    <linearGradient id="cTop" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFF0A0"/>
      <stop offset="100%" stop-color="#F0B800"/>
    </linearGradient>
  </defs>

  <!-- Coin 1 — back left -->
  <ellipse cx="82" cy="128" rx="38" ry="12" fill="#8C6000"/>
  <rect x="44" y="88" width="76" height="40" fill="url(#cEdge)"/>
  <ellipse cx="82" cy="88" rx="38" ry="12" fill="url(#cFace)"/>
  <ellipse cx="82" cy="88" rx="26" ry="8" fill="url(#cTop)" opacity="0.5"/>
  <text x="82" y="92" text-anchor="middle" font-size="11" fill="#C58A00" font-family="serif" font-weight="bold">O</text>

  <!-- Coin 2 — back right -->
  <ellipse cx="138" cy="122" rx="38" ry="12" fill="#8C6000"/>
  <rect x="100" y="82" width="76" height="40" fill="url(#cEdge)"/>
  <ellipse cx="138" cy="82" rx="38" ry="12" fill="url(#cFace)"/>
  <ellipse cx="138" cy="82" rx="26" ry="8" fill="url(#cTop)" opacity="0.5"/>
  <text x="138" y="86" text-anchor="middle" font-size="11" fill="#C58A00" font-family="serif" font-weight="bold">O</text>

  <!-- Coin 3 — front centre (tallest) -->
  <ellipse cx="110" cy="138" rx="44" ry="14" fill="#8C6000"/>
  <rect x="66" y="68" width="88" height="70" fill="url(#cEdge)"/>
  <ellipse cx="110" cy="68" rx="44" ry="14" fill="url(#cFace)"/>
  <ellipse cx="110" cy="68" rx="30" ry="9" fill="url(#cTop)" opacity="0.55"/>
  <text x="110" y="73" text-anchor="middle" font-size="13" fill="#C58A00" font-family="serif" font-weight="bold">O</text>

  <!-- Sparkles -->
  <g fill="#F0B800" opacity="0.85">
    <polygon points="110,10 112,17 119,17 114,22 116,29 110,24 104,29 106,22 101,17 108,17" />
    <polygon points="168,28 169.5,33 175,33 171,36.5 172.5,41.5 168,38 163.5,41.5 165,36.5 161,33 166.5,33" transform="scale(0.7) translate(72,10)"/>
    <polygon points="50,22 51,26 55,26 52,28.5 53,32.5 50,30 47,32.5 48,28.5 45,26 49,26" transform="scale(0.6) translate(28,14)"/>
  </g>
</svg>`;
const COIN_SRC = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(COIN_SVG)}`;

// ── ORO wordmark ──────────────────────────────────────────────────────────────
const ORO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="752" height="276" fill="none"><path fill="#C5A059" d="M310.169 92.775c17.233 0 32.793 4.101 46.691 12.329 14.106 8.227 25.253 19.284 33.481 33.182 8.422 13.704 12.626 29.276 12.626 46.107s-4.204 32.196-12.626 46.094c-8.228 13.899-19.388 24.955-33.481 33.182-13.898 8.214-29.652 12.329-46.691 12.329s-32.598-4.102-46.691-12.329c-14.093-8.227-25.345-19.283-33.767-33.182-8.214-13.898-12.328-29.056-12.328-46.094 0-17.039 4.101-32.403 12.328-46.107 8.409-13.898 19.674-24.955 33.767-33.182 14.093-8.215 29.458-12.329 46.691-12.329Zm348.185 0c17.234 0 32.794 4.101 46.692 12.329 14.093 8.227 25.253 19.284 33.468 33.182 8.421 13.704 12.626 29.276 12.626 46.107s-4.204 32.196-12.626 46.094c-8.215 13.898-19.375 24.955-33.468 33.182-13.898 8.214-29.653 12.329-46.692 12.329-17.038 0-32.598-4.102-46.691-12.329-14.093-8.227-25.344-19.283-33.767-33.182-8.214-13.898-12.328-29.056-12.328-46.094 0-17.039 4.101-32.403 12.328-46.107 8.423-13.898 19.674-24.955 33.767-33.182 14.093-8.215 29.458-12.329 46.691-12.329Zm-189.121 3.303 3.854 17.506 17.506-17.506h62.886l-6.54 29.731h-73.865l.39 19.179v129.459h-33.04V96.078h28.809ZM197.148 92h-31.331l-20.233 91.998h-31.706l-19.855 90.277H0l20.233-92H51.94l19.854-90.277h31.331L123.358 0h94.024l-20.234 92Zm113.021 30.727c-11.355 0-21.633 2.841-30.834 8.512-9.201 5.489-16.545 12.925-22.022 22.321-5.489 9.2-8.227 19.491-8.227 30.833 0 11.341 2.751 21.723 8.227 31.119 5.477 9.2 12.821 16.649 22.022 22.32 9.201 5.489 19.479 8.228 30.834 8.228s21.632-2.752 30.833-8.228c9.201-5.684 16.546-13.12 22.022-22.32 5.49-9.396 8.227-19.765 8.227-31.119 0-11.355-2.75-21.633-8.227-30.833-5.476-9.396-12.821-16.844-22.022-22.321-9.201-5.671-19.478-8.512-30.833-8.512Zm348.185 0c-11.354 0-21.633 2.841-30.833 8.512-9.201 5.489-16.546 12.925-22.022 22.321-5.489 9.2-8.227 19.491-8.228 30.833 0 11.341 2.752 21.723 8.228 31.119 5.476 9.2 12.821 16.649 22.022 22.32 9.2 5.489 19.479 8.228 30.833 8.228 11.355 0 21.633-2.752 30.834-8.228 9.2-5.684 16.546-13.12 22.022-22.32 5.489-9.396 8.228-19.765 8.228-31.119-.001-11.355-2.752-21.633-8.228-30.833-5.476-9.396-12.822-16.844-22.022-22.321-9.201-5.671-19.479-8.512-30.834-8.512Z"/></svg>`;
const ORO_LOGO_SRC = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(ORO_SVG)}`;

// ─────────────────────────────────────────────────────────────────────────────
extend("Checkout::PostPurchase::ShouldRender", async ({ storage }) => {
  await storage.update({});
  return { render: true };
});

render("Checkout::PostPurchase::Render", App);

export function App({ done }: any) {
  return (
    <Layout
      maxInlineSize={0.5}
      media={[
        { viewportSize: "small",  sizes: [1] },
        { viewportSize: "medium", sizes: [0.6] },
        { viewportSize: "large",  sizes: [0.45] },
      ]}
    >
      <BlockStack spacing="loose" alignment="center">

        {/* Coin illustration */}
        <View>
          <Image source={COIN_SRC} description="Gold coins" />
        </View>

        {/* Copy — centred */}
        <TextContainer alignment="center">
          <Heading>Your purchase earned you gold</Heading>
          <TextBlock>
            A small fraction of a troy ounce of physical gold has been added to
            your wallet backed on-chain, withdrawable anytime.
          </TextBlock>
        </TextContainer>

        {/* Primary CTA */}
        <Button
          submit
          onPress={() => {
            window.open("https://loyalty.gold/user", "_blank");
            done();
          }}
        >
          View your gold balance
        </Button>

        {/* Dismiss */}
        <Button subdued onPress={() => done()}>
          Continue
        </Button>

        {/* ORO wordmark — small, bottom */}
        <View>
          <Image source={ORO_LOGO_SRC} description="Oro" />
        </View>

      </BlockStack>
    </Layout>
  );
}