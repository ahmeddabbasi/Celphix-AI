import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen w-screen bg-background flex items-center justify-center px-[var(--page-pad-x)] py-[var(--page-pad-y)]">
      <div className="w-full max-w-lg">
        <div data-reveal className="glass rounded-[24px] p-[clamp(22px,4vw,40px)] shadow-floating">
          <p className="label-caps text-muted-foreground/70">404</p>
          <h1 className="mt-2 font-display text-display text-foreground">Page not found</h1>
          <p className="mt-3 text-sm text-muted-foreground/80 leading-relaxed">
            The route <span className="font-mono text-foreground/80">{location.pathname}</span> doesn’t exist.
          </p>
          <div className="mt-6">
            <Button asChild>
              <Link to="/">Return home</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
