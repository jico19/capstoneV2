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
      style={{ opacity: disabled ? 0.5 : 1, ...style }}
      className={`relative w-full h-[45px] cursor-pointer select-none bg-transparent border-none p-0 outline-none
        ${pressed ? "" : "drop-shadow-[0px_2px_6px_rgba(0,0,0,0.25)]"}`}
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => !disabled && setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) setPressed(true);
      }}
      onKeyUp={() => setPressed(false)}
      onClick={handleClick}
    >
      {/* Depth base layer */}
      <div
        className="absolute bottom-0 left-0 w-full h-[91%] rounded-[10px] transition-opacity duration-150 pointer-events-none"
        style={{ backgroundColor: baseColor }}
      />

      {/* Face layer */}
      <div
        className={`absolute left-0 w-full h-[91%] rounded-[10px] flex items-center justify-center px-[10px] py-[8px] transition-[top,box-shadow] duration-[120ms] ease-in-out pointer-events-none
          ${pressed
            ? "top-[8.89%] shadow-[inset_0px_4px_8px_rgba(0,0,0,0.25),inset_0px_-4px_4px_rgba(27,67,50,0.25)]"
            : "top-0 shadow-[inset_0px_-4px_12px_rgba(0,0,0,0.25)]"
          }`}
        style={{ backgroundColor: bgColor }}
      >
        <span
          className="font-jakarta text-[16px] font-semibold text-center w-full leading-normal transition-colors duration-150"
          style={{ color: textColor }}
        >
          {label}
        </span>
      </div>
    </button>
  );
}