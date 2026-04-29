"use client";

import React, { useState } from "react";
import LeftNav from "./LeftNav";
import TopNav from "./TopNav";

export default function NavWrapper() {
  const [navOpen, setNavOpen] = useState(false);

  const close = () => setNavOpen(false);
  const toggle = () => setNavOpen((prev) => !prev);

  return (
    <>
      {/* Backdrop — mobile only, closes nav on tap */}
      {navOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <LeftNav isOpen={navOpen} onClose={close} />
      <TopNav onMenuToggle={toggle} />
    </>
  );
}
