import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface Option {
  label: string;
  value: string;
}

interface EditableCellProps {
  value: any;
  onSave: (val: any) => void;
  type?: "text" | "number" | "select" | "multi-select" | "datetime-local";
  options?: string[] | Option[]; // Mendukung array string biasa atau array object
  className?: string;
  placeholder?: string;
}

export const EditableCell: React.FC<EditableCellProps> = ({
  value: initialValue,
  onSave,
  type = "text",
  options = [],
  className,
  placeholder = "Kosong...",
}) => {
  const [localValue, setLocalValue] = useState(initialValue);

  // Sync jika props dari atas (database/API) berubah
  useEffect(() => {
    setLocalValue(initialValue);
  }, [initialValue]);

  const handleBlur = () => {
    if (localValue !== initialValue) {
      const finalValue = type === "number" ? Number(localValue) : localValue;
      onSave(finalValue);
    }
  };

  // --- RENDER MULTI-SELECT (Untuk Pekerja) ---
  if (type === "multi-select") {
    // Pastikan valuenya array
    const selectedValues = Array.isArray(localValue) ? localValue : [];
    
    return (
      <Popover>
        <PopoverTrigger asChild>
          <div className={cn("cursor-pointer min-h-[32px] flex flex-wrap gap-1 p-1 hover:bg-muted/50 rounded", className)}>
            {selectedValues.length === 0 && <span className="text-muted-foreground text-sm pl-1">{placeholder}</span>}
            {selectedValues.map((val: string) => {
              // Cari label jika options berupa object
              const opt = options.find((o) => typeof o === 'object' && o.value === val) as Option | undefined;
              const label = opt ? opt.label : val;
              return <Badge key={val} variant="secondary" className="text-xs font-normal">{label}</Badge>;
            })}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-2">
            {options.map((opt) => {
              const optValue = typeof opt === "string" ? opt : opt.value;
              const optLabel = typeof opt === "string" ? opt : opt.label;
              const isChecked = selectedValues.includes(optValue);

              return (
                <div key={optValue} className="flex items-center space-x-2 p-1 hover:bg-muted rounded">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      const nextValues = checked
                        ? [...selectedValues, optValue]
                        : selectedValues.filter((v) => v !== optValue);
                      setLocalValue(nextValues);
                      onSave(nextValues); // Langsung save saat di-ceklis
                    }}
                  />
                  <label className="text-sm cursor-pointer w-full">{optLabel}</label>
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // --- RENDER SINGLE SELECT (Untuk Status, Area, Kategori) ---
  if (type === "select") {
    return (
      <Select
        value={localValue || ""}
        onValueChange={(newValue) => {
          setLocalValue(newValue);
          onSave(newValue);
        }}
      >
        <SelectTrigger className={cn("w-full border-none bg-transparent hover:bg-muted/50 focus:ring-0 shadow-none h-8 px-2", className)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => {
            const optValue = typeof opt === "string" ? opt : opt.value;
            const optLabel = typeof opt === "string" ? opt : opt.label;
            return (
              <SelectItem key={optValue} value={optValue}>
                {optLabel}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    );
  }

  // --- RENDER TEXT / NUMBER / DATETIME ---
  return (
    <Input
      value={localValue ?? ""}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      type={type}
      placeholder={placeholder}
      className={cn("w-full border-none bg-transparent hover:bg-muted/50 focus-visible:ring-1 focus-visible:ring-ring shadow-none h-8 px-2", className)}
    />
  );
};
