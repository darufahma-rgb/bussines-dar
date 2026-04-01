import { useState } from "react";
import { LOST_PRESETS } from "@/lib/constants";

interface LostReasonModalProps {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

/**
 * Modal to capture the reason a deal was lost.
 * Shared by Pipeline and CustomerDetail.
 */
export default function LostReasonModal({ onConfirm, onCancel }: LostReasonModalProps) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-foreground">Kenapa deal ini gagal?</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Mencatat alasan kegagalan membantu kamu melihat pola di Yearly Review.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {LOST_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setReason(p)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                reason === p
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <input
          className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="Atau tulis alasan lain..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onCancel}
            className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => onConfirm(reason)}
            className="text-sm bg-foreground text-background px-4 py-1.5 rounded-xl hover:opacity-90 transition-opacity"
          >
            Konfirmasi
          </button>
        </div>
      </div>
    </div>
  );
}
