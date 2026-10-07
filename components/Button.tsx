import React from "react";
import Link from "next/link";

const Button = ({
  name,
  style,
  hidden,
  href,
}: {
  name: string;
  style?: React.CSSProperties;
  hidden?: string;
  // when set, renders a link styled as a button (avoids nesting <button> inside <a>)
  href?: string;
}) => {
  const className = `btn inline-block max-sm:px-6 max-sm:${hidden} px-8 cursor-pointer text-white transition-all duration-500 py-3 rounded-full sm:text-xl font-medium`;

  if (href) {
    return (
      <Link href={href} style={style} className={className}>
        {name}
      </Link>
    );
  }

  return (
    <button style={style} className={className}>
      {name}
    </button>
  );
};

export default Button;
