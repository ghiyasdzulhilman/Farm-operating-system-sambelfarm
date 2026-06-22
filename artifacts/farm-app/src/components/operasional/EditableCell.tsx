// src/components/operasional/EditableCell.tsx
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface EditableCellProps {
  value: any;
  onSave: (newValue: any) => void;
  type?: "text" | "number" | "select" | "textarea";
  options?: string[];
  className?: string;
  placeholder?: string;
  isNumeric?: boolean;
}

export function EditableCell({
  value,
  onSave,
  type = "text",
  options = [],
  className = "",
  placeholder = "Klik untuk edit...",
  isNumeric = false,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() || "");
  const inputRef = useRef<any>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    let finalValue = editValue.trim();

    if (isNumeric) {
      finalValue = finalValue === "" ? null : Number(finalValue);
    }

    if (finalValue !== value) {
      onSave(finalValue);
    }
    setIsEditing(false);
  };

  if (isEditing) {
    if (type === "select" && options.length > 0) {
      return (
        <select
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          className="w-full bg-background border border-primary rounded px-3 py-1 text-sm"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    return (
      <input
        ref={inputRef}
        type={type === "number" ? "number" : "text"}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        className={cn("w-full bg-background border border-primary rounded px-3 py-1 text-sm outline-none", className)}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={cn(
        "cursor-pointer hover:bg-muted/50 px-3 py-1.5 rounded transition-colors min-h-[28px] flex items-center text-sm",
        className
      )}
    >
      {value != null && value !== "" ? value : <span className="text-muted-foreground italic">{placeholder}</span>}
    </div>
  );
}