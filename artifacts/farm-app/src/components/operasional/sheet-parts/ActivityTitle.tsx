import { useState } from "react";
import { Edit3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AgronomyItem } from "@/types/operasional";

interface ActivityTitleProps {
  item: AgronomyItem;
  onStatusChange?: (id: string, payload: any) => void | Promise<any>;
}

export function ActivityTitle({ item, onStatusChange }: ActivityTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState("");

  const handleSave = () => {
    setIsEditing(false);
    const valStr = localValue.trim();
    const field = item.module === "operasional" ? "namaPekerjaan" : "kegiatan";
    
    if (valStr && valStr !== item.title) {
      onStatusChange?.(item.id, { [field]: valStr });
    }
  };

  return (
    <div className="mb-6 mt-2 group relative">
      {item.dateLabel !== "Riwayat Lama" && (
        <div className="mb-2">
          <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold tracking-widest uppercase shadow-sm", item.dateLabel === "Hari ini" ? "border-primary/40 text-primary bg-primary/5" : "text-muted-foreground border-border/50 bg-muted/20")}>
            {item.dateLabel}
          </Badge>
        </div>
      )}

      {isEditing ? (
        <input
          autoFocus
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          className="w-full bg-transparent text-3xl sm:text-4xl font-black tracking-tight text-foreground border-b-2 border-primary/50 outline-none pb-1 placeholder:text-muted-foreground/30"
          placeholder="Ketik judul aktivitas..."
        />
      ) : (
        <div 
          onClick={() => { setIsEditing(true); setLocalValue(item.title); }}
          className="flex items-center gap-3 cursor-pointer group-hover:bg-muted/40 rounded-xl p-1 -ml-1 transition-colors w-fit border-b border-dashed border-transparent hover:border-primary/30"
        >
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            {item.title}
          </h1>
          <span className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 transition-opacity">
            <Edit3 className="h-5 w-5" />
          </span>
        </div>
      )}
    </div>
  );
}
