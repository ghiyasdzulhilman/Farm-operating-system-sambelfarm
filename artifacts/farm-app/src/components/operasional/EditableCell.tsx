// src/components/operasional/EditableCell.tsx
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditableCellProps {
  value: any;
  onSave: (val: any) => void;
  type?: "text" | "number" | "select" | "multi-select" | "datetime-local" | "time" | "date";
  options?: string[] | { label: string; value: string }[];
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  onAddOption?: (newLabel: string) => void;
  onDeleteOption?: (valueId: string) => void;
}

export const EditableCell: React.FC<EditableCellProps> = ({
  value: initialValue,
  onSave,
  type = "text",
  options = [],
  className,
  placeholder = "—",
  disabled = false,
  onAddOption,
  onDeleteOption,
}) => {
  const [localValue, setLocalValue] = useState(initialValue);
  const [isAdding, setIsAdding] = useState(false);
  const [newOptionText, setNewOptionText] = useState("");
  // 💡 Tambahkan state ini untuk kontrol open/close manual Popover Single Select
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setLocalValue(initialValue);
  }, [initialValue]);

  const handleBlur = () => {
    if (localValue !== initialValue && !disabled) {
      const finalValue = type === "number" ? Number(localValue) : localValue;
      onSave(finalValue);
    }
  };

  const handleAddNew = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (newOptionText.trim() && onAddOption) {
      onAddOption(newOptionText.trim());
      setNewOptionText("");
      setIsAdding(false);
    }
  };

  // 1. RENDER MULTI-SELECT (Untuk Tim Pekerja)
  if (type === "multi-select") {
    const selectedValues = Array.isArray(localValue) ? localValue : [];
    return (
      <Popover>
        <PopoverTrigger asChild disabled={disabled}>
          <div className={cn("cursor-pointer min-h-[32px] flex flex-wrap gap-1 p-1 hover:bg-muted/50 rounded items-center w-full", disabled && "opacity-50 cursor-not-allowed hover:bg-transparent", className)}>
            {selectedValues.length === 0 && <span className="text-muted-foreground text-sm pl-1">{placeholder}</span>}
            {selectedValues.map((val: string) => {
              const optMatch = options.find(o => typeof o === 'object' && o.value === val);
              const displayLabel = optMatch ? optMatch.label : val;
              return (
                <Badge key={val} variant="secondary" className="text-xs font-normal">
                  {displayLabel}
                </Badge>
              );
            })}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {options.map((opt) => {
              const val = typeof opt === "string" ? opt : opt.value;
              const label = typeof opt === "string" ? opt : opt.label;
              const isChecked = selectedValues.includes(val);
              return (
                <div key={val} className="flex items-center justify-between p-1 hover:bg-muted rounded group">
                  <div className="flex items-center space-x-2 flex-1 overflow-hidden">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const nextValues = checked
                          ? [...selectedValues, val]
                          : selectedValues.filter((v) => v !== val);
                        setLocalValue(nextValues);
                        onSave(nextValues);
                      }}
                    />
                    <label className="text-sm cursor-pointer truncate select-none flex-1">{label}</label>
                  </div>
                  {onDeleteOption && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-destructive/70 hover:text-destructive z-10 relative"
                      onClick={(e) => { 
                        e.preventDefault(); 
                        e.stopPropagation(); 
                        if(confirm(`Hapus opsi "${label}" secara permanen?`)) onDeleteOption(val); 
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Footer Tambah Baru */}
          {onAddOption && (
            <div className="mt-2 pt-2 border-t">
              {isAdding ? (
                <div className="flex items-center gap-1">
                  <Input autoFocus placeholder="Nama baru..." value={newOptionText} onChange={(e) => setNewOptionText(e.target.value)} className="h-7 text-xs" onKeyDown={(e) => { if (e.key === "Enter") handleAddNew(e as any); }} />
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={handleAddNew}><Check className="h-4 w-4"/></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setIsAdding(false)}><X className="h-4 w-4"/></Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-muted-foreground" onClick={(e) => { e.preventDefault(); setIsAdding(true); }}>
                  <Plus className="mr-2 h-3.5 w-3.5" /> Tambah Baru
                </Button>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  }

  // 2. RENDER SINGLE SELECT (Status, Kategori, Area)
  if (type === "select") {
    const selectedOpt = options.find(o => (typeof o === "string" ? o : o.value) === localValue);
    const displayValue = selectedOpt ? (typeof selectedOpt === "string" ? selectedOpt : selectedOpt.label) : "";

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          <div className={cn("cursor-pointer min-h-[32px] flex items-center px-1 hover:bg-muted/50 rounded w-full text-sm", disabled && "opacity-50 cursor-not-allowed hover:bg-transparent", className)}>
            {displayValue || <span className="text-muted-foreground">{placeholder}</span>}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {options.map((opt) => {
              const val = typeof opt === "string" ? opt : opt.value;
              const lbl = typeof opt === "string" ? opt : opt.label;
              const isSelected = localValue === val;
              return (
                <div 
                  key={val} 
                  className={cn("flex items-center justify-between p-1.5 hover:bg-muted rounded cursor-pointer group text-sm relative", isSelected && "bg-muted font-medium")}
                  onClick={(e) => {
                    // Cek apakah klik berasal dari tombol tong sampah
                    if ((e.target as HTMLElement).closest('.delete-btn')) return;
                    setLocalValue(val);
                    onSave(val);
                    setIsOpen(false); // Tutup popover hanya jika bukan klik hapus
                  }}
                >
                  <span className="truncate flex-1 pointer-events-none">{lbl}</span>
                  {onDeleteOption && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="delete-btn h-6 w-6 text-destructive/70 hover:text-destructive z-10"
                      onClick={(e) => { 
                        e.preventDefault(); 
                        e.stopPropagation(); 
                        if(confirm(`Hapus opsi "${lbl}" secara permanen?`)) onDeleteOption(val); 
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Tambah Baru */}
          {onAddOption && (
            <div className="mt-2 pt-2 border-t">
              {isAdding ? (
                <div className="flex items-center gap-1">
                  <Input autoFocus placeholder="Nama baru..." value={newOptionText} onChange={(e) => setNewOptionText(e.target.value)} className="h-7 text-xs" onKeyDown={(e) => { if (e.key === "Enter") handleAddNew(e as any); }} />
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={handleAddNew}><Check className="h-4 w-4"/></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setIsAdding(false)}><X className="h-4 w-4"/></Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-muted-foreground" onClick={(e) => { e.preventDefault(); setIsAdding(true); }}>
                  <Plus className="mr-2 h-3.5 w-3.5" /> Tambah Baru
                </Button>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  }

  // 3. RENDER INPUT STANDAR (Text, Number, Date, Time, Datetime)
  return (
    <Input
      value={localValue ?? ""}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      type={type}
      placeholder={placeholder}
      disabled={disabled}
      className={cn("w-full border-none bg-transparent hover:bg-muted/50 focus-visible:ring-1 focus-visible:ring-ring shadow-none h-8 px-1 text-sm disabled:opacity-100", className)}
    />
  );
};
