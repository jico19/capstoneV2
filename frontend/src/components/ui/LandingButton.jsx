import { useState } from "react";

export default function LandingButton({
  label     = "Login",
  bgColor   = "#ffffff",
  textColor = "#1b4332",
  baseColor = "#1b4332",
  onClick,
  style = {},
  disabled = false,
  type = "button",
}) {
  const [pressed, setPressed] = useState(false);

  const handleClick = (e) => {
    if (disabled) return;
    setPressed(false);
    onClick?.(e);
  };

  return (
    <button
      type={type}
      disabled={disabled}
      aria-disabled={disabled}
      style={{
        opacity: disabled ? 0.5 : 1,
        backgroundColor: bgColor,
        color: textColor,
        borderColor: baseColor,
        ...style,
      }}
      className="relative w-full h-[42px] cursor-pointer select-none rounded-md border border-stone-200 px-4 py-2 font-jakarta text-[14px] font-semibold transition-colors duration-150 hover:opacity-90 active:opacity-100 flex items-center justify-center shadow-xs"
      onClick={handleClick}
    >
      <span>{label}</span>
    </button>
  );
}