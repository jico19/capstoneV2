import { useState } from "react";

export default function LandingButton({
  label     = "Login",
  bgColor   = "#ffffff",
  textColor = "#1b4332",
  baseColor = "#1b4332",
  onClick,
  style = {},
  disabled = false,
}) {
  const [pressed, setPressed] = useState(false);

  const handleDown  = ()      => !disabled && setPressed(true);
  const handleUp    = ()      => { if (!disabled && pressed) { setPressed(false); onClick?.(); } };
  const handleLeave = ()      => setPressed(false);

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      style={{ opacity: disabled ? 0.5 : 1, ...style }}
      className={`relative w-full h-[45px] cursor-pointer select-none
        ${pressed ? "" : "drop-shadow-[0px_2px_6px_rgba(0,0,0,0.25)]"}`}
      onMouseDown={handleDown}
      onMouseUp={handleUp}
      onMouseLeave={handleLeave}
      onTouchStart={handleDown}
      onTouchEnd={handleUp}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setPressed(true);  }}
      onKeyUp={e =>   { if (e.key === "Enter" || e.key === " ") { setPressed(false); onClick?.(); } }}
    >
      {/* Depth base layer */}
      <div
        className="absolute bottom-0 left-0 w-full h-[91%] rounded-[10px] transition-opacity duration-150"
        style={{ backgroundColor: baseColor }}
      />

      {/* Face layer */}
      <div
        className={`absolute left-0 w-full h-[91%] rounded-[10px] flex items-center justify-center px-[10px] py-[8px] transition-[top,box-shadow] duration-[120ms] ease-in-out
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
    </div>
  );
}