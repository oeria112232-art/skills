import { cn } from "@/lib/utils";

interface SkillsLogoProps {
  className?: string;
  showBg?: boolean;
}

export function SkillsLogo({ className = "w-9 h-9", showBg = true }: SkillsLogoProps) {
  return (
    <img 
      src="/photo_2023-12-26_12-55-02.jpg" 
      alt="Skills Logo" 
      className={cn("select-none object-contain rounded-xl transition-transform duration-300", className)} 
    />
  );
}
