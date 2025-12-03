import Image from "next/image";
import React from "react";

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

          <span className="top-nav__brand-name">ForgeX</span>
        </div>

        <button className="top-nav__connect-btn">Connect Wallet</button>
      </div>
    </header>
  );
};

export default TopNav;
