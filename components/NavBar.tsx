"use client";
import React from "react";
import Image from "next/image";
import Button from "./Button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import UserProfile from "./auth-components/UserProfile";
import { useAuth } from "@/context/AuthContext";

const NavBar = () => {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  return (
    <nav className="relative z-40 min-h-[100px] items-center flex sm:px-10 px-8 justify-between">
      <div className="flex items-center gap-3">
        <Link href={"/"} className="flex items-center gap-3">
          <Image width={35} height={35} src="/images/logo.svg" alt="Logo" style={{ width: 'auto', height: 'auto' }} />
          <h2 className="text-2xl font-medium text-white sm:text-3xl">
            interwise
          </h2>
        </Link>
      </div>
      <div className="max-lg:hidden">
        <ul className="flex font-[500] text-[var(--nav-text)] text-lg gap-8 items-center">
          {["Home", "About", "Dashboard"].map(
            (item, index) => {
              const link = item === "Home" ? "/" : `/${item.toLowerCase()}`;

              return (
                <li key={index} className="relative nav-hover">
                  <Link
                    href={link}
                    className={`${pathname === link ? "font-bold" : ""}`}
                  >
                    {item}
                  </Link>
                </li>
              );
            }
          )}
        </ul>
      </div>
      <div className="flex items-center gap-6">
        {/* <Image
          width={36}
          height={36}
          className="cursor-pointer sm:hidden invert"
          src="/images/download.svg"
          alt=""
        /> */}
        {isAuthenticated ? (
          <UserProfile />
        ) : (
          <Button href="/login" name="Let's Talk" />
        )}
      </div>
    </nav>
  );
};

export default NavBar;
