import { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

interface GuideStep {
  icon: string;
  title: string;
  desc: string;
}

interface PageGuideProps {
  steps: GuideStep[];
}

export default function PageGuide({ steps }: PageGuideProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden text-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors text-left"
      >
        <span className="flex items-center gap-2.5 text-muted-foreground font-medium text-sm">
          <HelpCircle className="h-4 w-4 text-primary/60" />
          Cara menggunakan halaman ini
        </span>
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" />
        }
      </button>

      {open && (
        <div className="px-5 py-4 grid sm:grid-cols-2 gap-4 bg-muted/20 border-t border-border">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-lg shrink-0 leading-tight">{step.icon}</span>
              <div>
                <p className="font-semibold text-sm text-foreground">{step.title}</p>
                <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
