import { useState } from "react";
import { CalendarDays, ChevronDown, Leaf } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  DashboardAreaOption,
  DashboardDateRange,
  DashboardSiklusFilter,
  DashboardTimeFilter,
} from "@/types/dashboard";

interface DashboardFiltersProps {
  areas: DashboardAreaOption[];
  areaId: string;
  setAreaId: (value: string) => void;
  siklus: DashboardSiklusFilter;
  setSiklus: (value: DashboardSiklusFilter) => void;
  timeFilter: DashboardTimeFilter;
  setTimeFilter: (value: DashboardTimeFilter) => void;
  customDateRange: DashboardDateRange | null;
  setCustomDateRange: (value: DashboardDateRange | null) => void;
}

const QUICK_TIME_FILTERS: DashboardTimeFilter[] = ["Semua Waktu", "7 Hari", "30 Hari"];
const ADVANCED_TIME_FILTERS: DashboardTimeFilter[] = ["90 Hari"];

const formatYmd = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().split("T")[0];
};

export function DashboardFilters({
  areas,
  areaId,
  setAreaId,
  siklus,
  setSiklus,
  timeFilter,
  setTimeFilter,
  customDateRange,
  setCustomDateRange,
}: DashboardFiltersProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [tempRange, setTempRange] = useState<{ from?: Date; to?: Date }>({});

  const chooseTimeFilter = (value: DashboardTimeFilter) => {
    setTimeFilter(value);
    if (value !== "Kustom") setCustomDateRange(null);
  };

  const openCustomRange = () => {
    setTempRange({
      from: customDateRange?.start ? new Date(`${customDateRange.start}T00:00:00`) : undefined,
      to: customDateRange?.end ? new Date(`${customDateRange.end}T00:00:00`) : undefined,
    });
    setIsCustomOpen(true);
  };

  const applyCustomRange = () => {
    if (!tempRange.from) {
      setIsCustomOpen(false);
      return;
    }

    const end = tempRange.to ?? tempRange.from;
    setCustomDateRange({ start: formatYmd(tempRange.from), end: formatYmd(end) });
    setTimeFilter("Kustom");
    setIsCustomOpen(false);
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-[1.25rem] border border-border/50 bg-card/60 p-3 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center rounded-xl border border-border/30 bg-muted/30 p-1">
            {(["aktif", "selesai", "semua"] as DashboardSiklusFilter[]).map((item) => (
              <button
                key={item}
                onClick={() => setSiklus(item)}
                className={cn(
                  "rounded-lg px-3 py-2 text-[11px] font-semibold capitalize transition-all duration-300",
                  siklus === item
                    ? "border border-border/50 bg-background text-primary shadow-[0_2px_10px_rgba(0,0,0,0.06)]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item}
              </button>
            ))}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center justify-center rounded-xl border border-border/30 p-2.5 transition-all duration-300",
                  ["90 Hari", "Kustom"].includes(timeFilter)
                    ? "bg-primary text-primary-foreground shadow-[0_4px_15px_-4px_rgba(0,0,0,0.16)]"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                )}
                aria-label="Pilih periode dashboard"
              >
                <CalendarDays className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 rounded-[1.25rem] border-border/50 bg-card/90 p-2 shadow-[0_12px_40px_-4px_rgba(0,0,0,0.12)] backdrop-blur-xl"
            >
              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Periode waktu
              </div>
              {ADVANCED_TIME_FILTERS.map((item) => (
                <DropdownMenuItem
                  key={item}
                  onSelect={() => chooseTimeFilter(item)}
                  className={cn(
                    "cursor-pointer rounded-xl px-3 py-2.5 text-xs font-bold",
                    timeFilter === item ? "bg-primary/10 text-primary" : "text-foreground focus:bg-muted"
                  )}
                >
                  {item}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="my-1.5 border-border/40" />
              <DropdownMenuItem
                onSelect={openCustomRange}
                className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold text-foreground focus:bg-muted"
              >
                <span>Kustom</span>
                <ChevronDown className="h-3 w-3 -rotate-90 opacity-50" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {QUICK_TIME_FILTERS.map((item) => (
            <button
              key={item}
              onClick={() => chooseTimeFilter(item)}
              className={cn(
                "shrink-0 rounded-xl border px-4 py-2 text-[12px] font-medium transition-all duration-300",
                timeFilter === item
                  ? "border-primary/30 bg-primary/10 text-primary shadow-[0_2px_10px_rgba(0,0,0,0.04)]"
                  : "border-transparent bg-transparent text-muted-foreground hover:bg-muted/40"
              )}
            >
              {item}
            </button>
          ))}

          {["90 Hari", "Kustom"].includes(timeFilter) && (
            <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5">
              <CalendarDays className="h-3 w-3 text-primary" />
              <span className="text-[11px] font-bold text-primary">
                {timeFilter === "Kustom" && customDateRange
                  ? `${customDateRange.start.slice(5)} s/d ${customDateRange.end.slice(5)}`
                  : timeFilter}
              </span>
            </div>
          )}
        </div>

        <div className="mt-3 border-t border-border/30 pt-3">
          <Select value={areaId} onValueChange={setAreaId}>
            <SelectTrigger className="h-10 w-full rounded-xl border-border/30 bg-background/70 px-3 text-xs font-semibold shadow-none focus:ring-0 sm:w-[220px]">
              <Leaf className="mr-2 h-3.5 w-3.5 text-primary" />
              <SelectValue placeholder="Pilih area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-semibold">Semua Area</SelectItem>
              {areas.map((area) => (
                <SelectItem key={area.id} value={area.id} className="text-xs font-semibold">
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isCustomOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-start bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="flex max-h-[85vh] flex-col rounded-b-[2rem] border-b border-border/50 bg-card/95 shadow-[0_10px_40px_rgba(0,0,0,0.15)] backdrop-blur-md animate-in slide-in-from-top-full duration-300 ease-out">
            <div className="flex items-center justify-between border-b border-border/30 p-4">
              <button
                onClick={() => setIsCustomOpen(false)}
                className="px-2 text-sm font-semibold text-primary/80 hover:text-primary"
              >
                Batal
              </button>
              <div className="text-[15px] font-bold tracking-tight">
                {tempRange.from
                  ? tempRange.to
                    ? `${tempRange.from.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} - ${tempRange.to.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`
                    : tempRange.from.toLocaleDateString("id-ID", { day: "numeric", month: "short" })
                  : "Pilih Tanggal"}
              </div>
              <button onClick={applyCustomRange} className="px-2 text-sm font-bold text-primary">
                Update
              </button>
            </div>

            <div className="flex justify-center p-4 pb-12 sm:p-6">
              <Calendar
                mode="range"
                selected={{ from: tempRange.from, to: tempRange.to }}
                onSelect={(range) => setTempRange({ from: range?.from, to: range?.to })}
                className={cn(
                  "h-auto w-full max-w-sm rounded-[1.5rem] border border-border/30 bg-background/50 p-4 pb-6 shadow-inner",
                  "[&_td]:aspect-auto [&_button]:aspect-auto [&_button]:h-[42px] sm:[&_button]:h-[48px]"
                )}
              />
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsCustomOpen(false)} />
        </div>
      )}
    </div>
  );
}
