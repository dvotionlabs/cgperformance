"use client";

import { useState } from "react";
import Link from "next/link";

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header>
      <nav className="wrap">
        <Link href="/#top" className="brand">
          <img src="/images/logo-cgp.png" alt="CGP logo" />
          <span>CG PERFORMANCE</span>
        </Link>
        <button
          className="navtoggle"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          MENU
        </button>
        <ul className={`navlinks${open ? " open" : ""}`}>
          <li>
            <a href="/#philosophy" onClick={() => setOpen(false)}>
              Philosophy
            </a>
          </li>
          <li>
            <a href="/#pricing" onClick={() => setOpen(false)}>
              Pricing
            </a>
          </li>
          <li>
            <a href="/#locations" onClick={() => setOpen(false)}>
              Locations
            </a>
          </li>
          <li>
            <a href="/#about" onClick={() => setOpen(false)}>
              About
            </a>
          </li>
          <li>
            <Link href="/signup" onClick={() => setOpen(false)}>
              Sign up
            </Link>
          </li>
          <li>
            <a href="/#contact" onClick={() => setOpen(false)}>
              Contact
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
