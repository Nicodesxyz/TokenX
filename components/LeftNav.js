import React from "react";
import Link from "next/link";

const LeftNav = () => {
  return (
    <nav className="left-nav">
      <div className="left-nav__inner">
        <ul className="left-nav__links">
          <li>
            <Link href="/" className="left-nav__link">
              Home
            </Link>
          </li>
          <li>
            <Link href="/staking" className="left-nav__link">
              Staking
            </Link>
          </li>
          <li>
            <Link href="/token" className="left-nav__link">
              Token
            </Link>
          </li>
          <li>
            <Link href="/locking" className="left-nav__link">
              Locking
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default LeftNav;
