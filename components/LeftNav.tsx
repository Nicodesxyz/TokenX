"use client";

import React from "react";
import Link from "next/link";
import WalletButton from "./WalletButton";

interface LeftNavProps {
  isOpen: boolean;
  onClose: () => void;
}

const LeftNav: React.FC<LeftNavProps> = ({ isOpen, onClose }) => {
  return (
    <nav className={`left-nav${isOpen ? " nav-open" : ""}`}>
      <div className="left-nav__inner">

        {/* Close button — mobile only */}
        <div className="left-nav__close-row md:hidden">
          <button
            type="button"
            className="left-nav__close-btn"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            ✕ Close
          </button>
        </div>

        <ul className="left-nav__links">
          <li>
            <Link href="/" className="left-nav__link" onClick={onClose}>
              Home
            </Link>
          </li>
          <li>
            <Link href="/token" className="left-nav__link" onClick={onClose}>
              Token
            </Link>
          </li>
          <li>
            <Link href="/staking" className="left-nav__link" onClick={onClose}>
              Staking
            </Link>
          </li>
          <li>
            <Link href="/locking" className="left-nav__link" onClick={onClose}>
              Locking
            </Link>
          </li>
        </ul>

        {/* Wallet button — mobile only, sits below links */}
        <div className="left-nav__wallet md:hidden">
          <WalletButton />
        </div>

      </div>
    </nav>
  );
};

export default LeftNav;
