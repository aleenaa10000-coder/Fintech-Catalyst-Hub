import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarDays, Clock, X, CalendarClock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface SchedulePickerProps {
  value: string;
  onChange: (value: string) => void;
  mode?: "create" | "edit";
  id?: string;
  "data-testid"?: string;
}

function buildDateTimeLocal(date: Date, time: string): string {
  const [h = "00", m = "00"] = time.split(":");
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}T${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

function parseTimeFromDatetimeLocal(dtl: string): string {
  const parts = dtl.split("T");
  return parts[1] ?? "09:00";
}

function parseDateFromDatetimeLocal(dtl: string): Date | undefined {
  if (!dtl) return undefined;
  const parts = dtl.split("T");
  if (!parts[0]) return undefined;
  const [y, mo, d] = parts[0].split("-").map(Number);
  if (!y || !mo || !d) return undefined;
  return new Date(y, mo - 1, d);
}

function getPresetDate(daysFromNow: number, hour = 9): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function getNextWeekday(weekday: number, hour = 9): Date {
  const d = new Date();
  const current = d.getDay();
  const daysUntil = ((weekday - current + 7) % 7) || 7;
  d.setDate(d.getDate() + daysUntil);
  d.setHours(hour, 0, 0, 0);
  return d;
}

const QUICK_PRESETS: { label: string; getDate: () => Date }[] = [
  { label: "Tomorrow 9am", getDate: () => getPresetDate(1) },
  { label: "In 3 days",    getDate: () => getPresetDate(3) },
  { label: "Next Monday",  getDate: () => getNextWeekday(1) },
  { label: "In 1 week",    getDate: () => getPresetDate(7) },
];

export function SchedulePicker({
  value,
  onChange,
  mode = "create",
  id,
  "data-testid": dataTestId,
}: SchedulePickerProps) {
  const isScheduled = Boolean(value);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    () => parseDateFromDatetimeLocal(value),
  );
  const [selectedTime, setSelectedTime] = useState<string>(
    () => parseTimeFromDatetimeLocal(value) || "09:00",
  );

  useEffect(() => {
    setSelectedDate(parseDateFromDatetimeLocal(value));
    if (value) {
      setSelectedTime(parseTimeFromDatetimeLocal(value));
    }
  }, [value]);

  function handleDateSelect(date: Date | undefined) {
    setSelectedDate(date);
    setCalendarOpen(false);
    if (date) {
      onChange(buildDateTimeLocal(date, selectedTime));
    }
  }

  function handleTimeChange(time: string) {
    setSelectedTime(time);
    if (selectedDate) {
      onChange(buildDateTimeLocal(selectedDate, time));
    }
  }

  function applyPreset(presetDate: Date) {
    const time = `${String(presetDate.getHours()).padStart(2, "0")}:${String(presetDate.getMinutes()).padStart(2, "0")}`;
    setSelectedDate(presetDate);
    setSelectedTime(time);
    onChange(buildDateTimeLocal(presetDate, time));
  }

  function activateSchedule() {
    const base = selectedDate ?? (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d;
    })();
    if (!selectedDate) setSelectedDate(base);
    onChange(buildDateTimeLocal(base, selectedTime));
  }

  function clearSchedule() {
    onChange("");
  }

  const isFuture = value ? new Date(value).getTime() > Date.now() : false;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  function isActivePreset(presetDate: Date): boolean {
    if (!value || !isFuture) return false;
    const presetStr = buildDateTimeLocal(
      presetDate,
      `${String(presetDate.getHours()).padStart(2, "0")}:${String(presetDate.getMinutes()).padStart(2, "0")}`,
    );
    return value === presetStr;
  }

  return (
    <div className="space-y-2" id={id} data-testid={dataTestId}>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={!isScheduled ? "default" : "outline"}
          className="gap-1.5"
          onClick={clearSchedule}
        >
          <Zap className="w-3.5 h-3.5" />
          {mode === "edit" ? "Publish now" : "Publish immediately"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isScheduled ? "default" : "outline"}
          className="gap-1.5"
          onClick={activateSchedule}
        >
          <CalendarClock className="w-3.5 h-3.5" />
          Schedule
        </Button>
      </div>

      {!isScheduled && (
        <p className="text-xs text-muted-foreground">
          {mode === "edit"
            ? <>Post is live. Click <strong>Schedule</strong> to move it to a future publish time.</>
            : <>Post goes live as soon as you save. Click <strong>Schedule</strong> to pick a future time.</>}
        </p>
      )}

      {isScheduled && (
        <div className="rounded-md border bg-muted/30 p-3 space-y-3">

          {/* One-click presets */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Quick schedule</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PRESETS.map((preset) => {
                const presetDate = preset.getDate();
                const active = isActivePreset(presetDate);
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPreset(presetDate)}
                    className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer",
                      active
                        ? "border-transparent bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-muted",
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom date + time */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[190px] space-y-1">
              <Label className="text-xs">Custom date</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {selectedDate
                      ? format(selectedDate, "EEE, MMM d, yyyy")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={(d) => d < todayStart}
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Time</Label>
              <div className="relative flex items-center">
                <Clock className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="pl-9 w-[130px]"
                />
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={clearSchedule}
              title="Remove schedule — publish immediately"
              className="shrink-0 self-end"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear schedule</span>
            </Button>
          </div>

          <div
            className={cn(
              "flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs",
              isFuture
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                : "bg-destructive/10 text-destructive",
            )}
          >
            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
            {isFuture
              ? `Scheduled — goes live on ${new Date(value).toLocaleString()}`
              : mode === "edit"
                ? "This date is in the past — save to make the post live immediately, or pick a future date."
                : "This date is in the past — post will publish immediately when saved."}
          </div>
        </div>
      )}
    </div>
  );
}
