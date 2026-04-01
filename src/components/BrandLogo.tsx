import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const DEFAULT_COMPANY_NAME = "Celphix";
const DEFAULT_LOGO_SRC = "/salesagent/LOGO.png";

export function BrandLogo(props: {
  to?: string;
  companyName?: string;
  className?: string;
  imgClassName?: string;
  ariaLabel?: string;
}) {
  const {
    to = "/",
    companyName = DEFAULT_COMPANY_NAME,
    className,
    imgClassName,
    ariaLabel,
  } = props;

  return (
    <Link
      to={to}
      className={cn("brand-logo", className)}
      aria-label={ariaLabel ?? `${companyName} — Home`}
    >
      <img
        src={DEFAULT_LOGO_SRC}
        alt={companyName}
        className={cn("header-logo", imgClassName)}
        loading="eager"
        decoding="async"
      />
    </Link>
  );
}
