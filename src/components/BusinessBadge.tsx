const bizConfig: Record<string, { textColor: string; bgColor: string; brandColor: string; logo?: string }> = {
  Temantiket: {
    textColor: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/40",
    brandColor: "#2563EB",
    logo: "/logo-temantiket.png",
  },
  SYMP: {
    textColor: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/40",
    brandColor: "#DC2626",
    logo: "/logo-symp.png",
  },
  "SYMP Studio": {
    textColor: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/40",
    brandColor: "#DC2626",
    logo: "/logo-symp.png",
  },
  AIGYPT: {
    textColor: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/40",
    brandColor: "#7C3AED",
    logo: "/logo-aigypt.png",
  },
  Darcia: {
    textColor: "text-pink-700 dark:text-pink-400",
    bgColor: "bg-pink-50 dark:bg-pink-950/40",
    brandColor: "#EC4899",
  },
};

export default function BusinessBadge({ name }: { name: string }) {
  const config = bizConfig[name];
  if (!config) {
    return (
      <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
        {name}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.textColor}`}>
      {config.logo && (
        <span
          className="w-3.5 h-3.5 rounded-sm flex items-center justify-center shrink-0 overflow-hidden"
          style={{ backgroundColor: config.brandColor }}
        >
          <img
            src={config.logo}
            alt={name}
            className="w-full h-full object-contain p-px"
            style={{ filter: "brightness(0) invert(1)" }}
          />
        </span>
      )}
      {name}
    </span>
  );
}
