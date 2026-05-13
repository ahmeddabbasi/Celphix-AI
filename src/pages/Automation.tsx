import { Zap } from "lucide-react";

export default function Automation() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 select-none" data-reveal>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#214226]/10 text-[#214226] [.payg-shell_&]:bg-[#008631]/10 [.payg-shell_&]:text-[#008631]">
        <Zap className="h-8 w-8" />
      </div>
      <h1 className="font-display text-2xl font-bold text-[#214226] [.payg-shell_&]:text-[#008631]">
        Automation
      </h1>
      <p className="font-medium tracking-wide px-4 py-1.5 rounded-full text-sm bg-[#214226]/10 text-[#214226] [.payg-shell_&]:bg-[#008631]/10 [.payg-shell_&]:text-[#008631]">
        Under Progress Development
      </p>
    </div>
  );
}
