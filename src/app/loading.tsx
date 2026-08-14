import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative">
        <div className="absolute inset-0 bg-brand-primary/20 rounded-full blur-xl animate-pulse"></div>
        <Loader2 className="w-10 h-10 animate-spin text-brand-primary relative z-10" />
      </div>
      <p className="text-sm text-text-secondary font-medium animate-pulse">Memuat...</p>
    </div>
  );
}
