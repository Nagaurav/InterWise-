import React from "react";
import Button from "./Button";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const Hero = () => {
  return (
    <section className="min-h-[calc(100svh-100px)] flex flex-col items-center px-8 justify-center relative">
      <div className="absolute left-0 -top-30 -z-10 pointer-events-none max-h-[calc(100%+7.5rem)] overflow-hidden">
        <Image width={700} height={700} src="/images/bg-shade.png" alt="" style={{ width: "auto", height: "auto" }} />
      </div>

      <div className="absolute bottom-0 right-0 -z-10 pointer-events-none">
        <Image
          className="bottom-0 right-0 -z-10"
          width={700}
          height={700}
          src="/images/bg-shade2.png"
          alt=""
          style={{ width: "auto", height: "auto" }}
        />
      </div>
      <div className="absolute w-full max-sm:hidden -z-10 -top-30 pointer-events-none">
        {/* <Image
          width={200}
          height={200}
          className="relative right-0 top-10"
          src="/images/ecllipse.png"
          alt="Circular"
        /> */}
        <div className="absolute overflow-hidden -rotate-6 top-80 left-32 rounded-3xl w-33 h-44">
          {/* <Image
            fill
            className="object-cover"
            src="/images/background.jpeg"
            alt="background image"
          /> */}
        </div>
      </div>
      <div className="flex flex-col gap-6 items-center -mt-16 text-[var(--nav-text)]">
        <div className="w-56 relative -top-6 rounded-full border-2 border-[#413239] bg-[#1f1f1f] py-2 text-white -mt-15">
          <h3 className="text-center">AI-Driven SaaS Website</h3>
        </div>
        <h1 className="font-semibold max-sm:text-[40px] text-7xl text-center">
          Master Interviews with AI
        </h1>
        <p className="text-xl text-center">
          AI-powered feedback to help you ace every interview with confidence.
        </p>

        <Button
          href="/dashboard"
          name="Practice Now"
          style={{ marginTop: "20px", fontWeight: "600" }}
        />
      </div>

      <Link
        href="/about"
        className="arrow-div mt-22 absolute flex items-center gap-3 py-1.5 pl-5 pr-1.5 text-sm font-medium text-white rounded-full border-2 border-[#413239] bg-[#1f1f1f]/80 backdrop-blur-sm transition-colors duration-300 hover:border-[var(--theme-color)] group"
      >
        How it works
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--theme-color)] transition-colors duration-300 group-hover:bg-[var(--theme-hover)]">
          <ArrowRight className="w-4 h-4 transition-colors duration-300 group-hover:text-black" />
        </span>
      </Link>

      <div className="absolute bottom-0 flex justify-center w-full overflow-hidden -z-10 pointer-events-none">
        <Image
          width={1000}
          height={1000}
          src="/images/circles.png"
          alt="circle-bg"
          style={{ width: "auto", height: "auto" }}
        />
        {/* soft glow rising from the bottom of the arcs */}
        <div className="absolute bottom-0 w-[420px] h-[180px] max-sm:w-[220px] max-sm:h-[100px] translate-y-1/2 rounded-[50%] bg-[var(--theme-hover)]/30 blur-3xl" />
        <div className="absolute bottom-0 w-[200px] h-[80px] max-sm:w-[110px] max-sm:h-[45px] translate-y-1/2 rounded-[50%] bg-[var(--theme-color)]/60 blur-2xl" />
      </div>
    </section>
  );
};

export default Hero;
