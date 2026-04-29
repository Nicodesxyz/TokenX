"use client";

import Image from "next/image";
import React from "react";
import WalletButton from "./WalletButton";

interface TopNavProps {
  onMenuToggle: () => void;
}

const TopNav: React.FC<TopNavProps> = ({ onMenuToggle }) => {
  return (
    <header className="top-nav">
      <div className="top-nav__inner">
        <div className="top-nav__brand">
          <Image
            src="/logo.webp"
            alt="TokenX logo"
            width={60}
            height={60}
            priority
          />
          <span className="top-nav__brand-name">TokenX</span>
        </div>

        {/* Desktop: wallet button */}
        <div className="hidden md:block">
          <WalletButton />
        </div>

        {/* Mobile: hamburger button */}
        <button
          type="button"
          className="hamburger-btn md:hidden"
          onClick={onMenuToggle}
          aria-label="Open navigation menu"
        >
          <span className="hamburger-btn__line" />
          <span className="hamburger-btn__line" />
          <span className="hamburger-btn__line" />
        </button>
      </div>
    </header>
  );
};

export default TopNav;
