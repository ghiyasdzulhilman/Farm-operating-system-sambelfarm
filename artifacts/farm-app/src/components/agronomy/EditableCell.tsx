// src/components/agronomy/EditableCell.tsx
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditableCellProps {
  value: any;
  rowId: string;
  columnId: string;
  type?: "text" | "number" | "select" | "datetime-local";
  options?: { label: string; value: string }[];
  onUpdate: (rowId: string, columnId: string, value: any) => void;
}

export const EditableCell: React.FC<EditableCellProps> = ({
  value: initialValue,
  rowId,
  columnId,
  type = "text",
  options = [],
  onUpdate,
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleBlur = () => {
    // Hanya trigger update jika value benar-benar berubah
    if (value !== initialValue) {
      // Pastikan tipe number tidak dikirim sebagai string
      const parsedValue = type === "number" ? Number(value) : value;
      onUpdate(rowId, columnId, parsedValue);
    }
  };

  if (type === "select") {
    return (
      <Select
        value={value || ""}
        onValueChange={(newValue) => {
          setValue(newValue);
          onUpdate(rowId, columnId, newValue);
        }}
      >
        <SelectTrigger className="w-full border-none bg-transparent hover:bg-muted/50 focus:ring-0 shadow-none h-8 px-2">
          <SelectValue placeholder="Pilih..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      value={value ?? ""}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      type={type}
      className="w-full border-none bg-transparent hover:bg-muted/50 focus-visible:ring-1 focus-visible:ring-ring shadow-none h-8 px-2"
    />
  );
};
