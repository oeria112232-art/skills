import { cn } from "@/lib/utils";

interface SkillsLogoProps {
  className?: string;
  showBg?: boolean;
}

export function SkillsLogo({ className = "w-9 h-9", showBg = true }: SkillsLogoProps) {
  return (
    <svg 
      className={cn("select-none object-contain rounded-xl transition-transform duration-300", className)} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF5F33" />
          <stop offset="100%" stopColor="#FF3C00" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="url(#logo-grad)"/>
      <path d="M50 25L22 37L50 49L78 37L50 25Z" fill="white" />
      <path d="M30 45.5V60C30 65 38.9 69 50 69C61.1 69 70 65 70 60V45.5L50 54L30 45.5Z" fill="white" fillOpacity="0.95" />
      <path d="M78 37V58C78 59.1 76.8 60 75 60C73.2 60 72 59.1 72 58V39.5L78 37Z" fill="white" fillOpacity="0.8" />
    </svg>
  );
}
