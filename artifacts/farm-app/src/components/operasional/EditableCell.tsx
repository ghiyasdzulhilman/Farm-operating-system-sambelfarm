// src/components/operasional/EditableCell.tsx
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface EditableCellProps {
  value: any;
  onSave: (val: any) => void;
  type?: "text" | "number" | "select" | "multi-select" | "datetime-local";
  options?: string[] | { label: string; value: string }[];
  className?: string;
  placeholder?: string;
}

export const EditableCell: React.FC<EditableCellProps> = ({
  value: initialValue,
  onSave,
  type = "text",
  options = [],
  className,
  placeholder = "—",
}) => {
  const [localValue, setLocalValue] = useState(initialValue);

  useEffect(() => {
    setLocalValue(initialValue);
  }, [initialValue]);

  const handleBlur = () => {
    if (localValue !== initialValue) {
      const finalValue = type === "number" ? Number(localValue) : localValue;
      onSave(finalValue);
    }
  };

  // 1. RENDER MULTI-SELECT (Untuk Tim Pekerja)
  if (type === "multi-select") {
    const selectedValues = Array.isArray(localValue) ? localValue : [];
    return (
      <Popover>
        <PopoverTrigger asChild>
          <div className={cn("cursor-pointer min-h-[32px] flex flex-wrap gap-1 p-1 hover:bg-muted/50 rounded items-center w-full", className)}>
            {selectedValues.length === 0 && <span className="text-muted-foreground text-sm pl-1">{placeholder}</span>}
            {selectedValues.map((val: string) => (
              <Badge key={val} variant="secondary" className="text-xs font-normal">
                {val}
              </Badge>
            ))}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {options.map((opt) => {
              const label = typeof opt === "string" ? opt : opt.label;
              const isChecked = selectedValues.includes(label);
              return (
                <div key={label} className="flex items-center space-x-2 p-1 hover:bg-muted rounded">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      const nextValues = checked
                        ? [...selectedValues, label]
                        : selectedValues.filter((v) => v !== label);
                      setLocalValue(nextValues);
                      onSave(nextValues);
                    }}
                  />
                  <label className="text-sm cursor-pointer w-full select-none">{label}</label>
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // 2. RENDER SINGLE SELECT (Status, Kategori, Area)
  if (type === "select") {
    return (
      <Select
        value={localValue || ""}
        onValueChange={(newValue) => {
          setLocalValue(newValue);
          onSave(newValue);
        }}
      >
        <SelectTrigger className={cn("w-full border-none bg-transparent hover:bg-muted/50 focus:ring-0 shadow-none h-8 px-1 text-left justify-start font-normal", className)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => {
            const val = typeof opt === "string" ? opt : opt.value;
            const lbl = typeof opt === "string" ? opt : opt.label;
            return (
              <SelectItem key={val} value={val}>
                {lbl}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    );
  }

  // 3. RENDER INPUT STANDAR (Text, Number, Datetime)
  return (
    <Input
      value={localValue ?? ""}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      type={type}
      placeholder={placeholder}
      className={cn("w-full border-none bg-transparent hover:bg-muted/50 focus-visible:ring-1 focus-visible:ring-ring shadow-none h-8 px-1", className)}
    />
  );
};
