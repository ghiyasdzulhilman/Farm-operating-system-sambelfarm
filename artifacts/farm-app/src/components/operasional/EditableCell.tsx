// artifacts/farm-app/src/components/operasional/EditableCell.tsx
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface EditableCellProps {
  value: any;
  onSave: (newValue: any) => void;
  type?: "text" | "number" | "select";
  options?: string[];
  className?: string;
  placeholder?: string;
}

export function EditableCell({
  value,
  onSave,
  type = "text",
  options = [],
  className = "",
  placeholder = "Klik untuk edit...",
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() || "");
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    let finalValue: any = editValue;

    if (type === "number") {
      finalValue = editValue === "" ? null : Number(editValue);
    }

    if (finalValue !== value) {
      onSave(finalValue);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditValue(value?.toString() || "");
      setIsEditing(false);
    }
  };

  if (isEditing) {
    if (type === "select" && options.length > 0) {
      return (
        <select
          ref={inputRef as any}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="w-full bg-background border border-primary rounded px-2 py-1 text-sm outline-none"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        ref={inputRef as any}
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full bg-background border border-primary rounded px-2 py-1 text-sm outline-none",
          className
        )}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={cn(
        "cursor-pointer hover:bg-muted/50 px-2 py-1 rounded transition-colors min-h-[1.5rem] flex items-center",
        className
      )}
    >
      {value !== null && value !== undefined && value !== "" ? (
        <span className="text-sm">{value}</span>
      ) : (
        <span className="text-muted-foreground text-sm italic">{placeholder}</span>
      )}
    </div>
  );
}