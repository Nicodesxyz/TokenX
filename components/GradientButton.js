import React from "react";

const GradientButton = ({
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
