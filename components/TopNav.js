import Image from "next/image";
import React from "react";
import WalletButton from "./WalletButton";

const TopNav = () => {
  return (
    <header className="top-nav">
      <div className="top-nav__inner">
        <div className="top-nav__brand">
          <Image
            src="/logo.webp"
            alt="TokenX logo"
            width={48}
            height={48}
            priority
          />

          <span className="top-nav__brand-name">TokenX</span>
        </div>

        <WalletButton />
      </div>
    </header>
  );
};

export default TopNav;
