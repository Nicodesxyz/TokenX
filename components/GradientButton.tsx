import React, { ButtonHTMLAttributes } from "react";

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

const GradientButton: React.FC<GradientButtonProps> = ({
  children,
  className = "",
  disabled = false,
  onClick,
  type = "button",
  ...rest
}) => {
  return (
    <div className="button-wrap">
      <div className="button-shadow"></div>

      <button
        type={type}
        disabled={disabled}
        onClick={onClick}
        className={`button-gradient ${className}`}
        {...rest}
      >
        <span>{children}</span>
      </button>
    </div>
  );
};

export default GradientButton;
