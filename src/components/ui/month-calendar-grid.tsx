import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function toLocalISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

interface CalendarEvent {
  id: number
  event_date: string
  title: string
  description?: string
  color: string
  all_day: boolean
  start_time?: string
  end_time?: string
}

interface MonthCalendarGridProps {
  events?: CalendarEvent[]
  currentMonth: Date
  onMonthChange: (month: Date) => void
  onDateSelect: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  selectedDate?: Date
  className?: string
}

// Memoized day cell component for performance
const DayCell = React.memo(({
  date,
  dayEvents,
  isToday,
  isSelected,
  onDateSelect,
  onEventClick,
  colorClasses
}: {
  date: Date | null
  dayEvents: CalendarEvent[]
  isToday: boolean
  isSelected: boolean
  onDateSelect: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  colorClasses: Record<string, string>
}) => {
  const handleClick = React.useCallback(() => {
    if (date) onDateSelect(date)
  }, [date, onDateSelect])

  if (!date) {
    return (
      <div className="min-h-[100px] border rounded-lg p-2 bg-muted/20"></div>
    )
  }

  return (
    <div
      className={cn(
        "min-h-[100px] border rounded-lg p-2 cursor-pointer transition-colors",
        "hover:bg-accent",
        isToday && "border-primary border-2",
        isSelected && "bg-accent"
      )}
      onClick={handleClick}
    >
      <div
        className={cn(
          "text-sm font-medium mb-1",
          isToday && "text-primary font-bold"
        )}
      >
        {date.getDate()}
      </div>
      
      {/* Event indicators */}
      <div className="space-y-1">
        {dayEvents.slice(0, 3).map((event) => (
          <div
            key={event.id}
            className={cn(
              "text-xs px-1 py-0.5 rounded truncate cursor-pointer",
              colorClasses[event.color] || colorClasses.blue,
              "text-white hover:opacity-80"
            )}
            onClick={(e) => {
              e.stopPropagation()
              onEventClick?.(event)
            }}
            title={event.title}
          >
            {event.title}
          </div>
        ))}
        {dayEvents.length > 3 && (
          <div className="text-xs text-muted-foreground pl-1">
            +{dayEvents.length - 3} more
          </div>
        )}
      </div>
    </div>
  )
})
DayCell.displayName = "DayCell"

export const MonthCalendarGrid = React.memo(function MonthCalendarGrid({
  events = [],
  currentMonth,
  onMonthChange,
  onDateSelect,
  onEventClick,
  selectedDate,
  className
}: MonthCalendarGridProps) {
  // Memoize color classes (doesn't change)
  const colorClasses = React.useMemo(() => ({
    blue:   'bg-primary',
    red:    'bg-destructive',
    green:  'bg-primary',
    yellow: 'bg-accent',
    purple: 'bg-primary/70',
    pink:   'bg-primary/50',
    orange: 'bg-accent/70',
    teal:   'bg-primary/80',
    indigo: 'bg-primary/60',
    gray:   'bg-muted-foreground/50'
  }), [])

  // Memoize days calculation (only recalculate when month changes)
  const days = React.useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const daysList: (Date | null)[] = []
    
    // Add empty cells for days before the 1st
    for (let i = 0; i < startingDayOfWeek; i++) {
      daysList.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      daysList.push(new Date(year, month, day))
    }
    
    return daysList
  }, [currentMonth])

  // Memoize events by date for O(1) lookup
  const eventsByDate = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    events.forEach(event => {
      const existing = map.get(event.event_date) || []
      existing.push(event)
      map.set(event.event_date, existing)
    })
    return map
  }, [events])

  // Optimized event lookup
  const getEventsForDate = React.useCallback((date: Date | null) => {
    if (!date) return []
    const dateStr = toLocalISODate(date)
    return eventsByDate.get(dateStr) || []
  }, [eventsByDate])

  const monthName = React.useMemo(() => 
    currentMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    [currentMonth]
  )

  const handlePrevMonth = React.useCallback(() => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    onMonthChange(newMonth)
  }, [currentMonth, onMonthChange])

  const handleNextMonth = React.useCallback(() => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    onMonthChange(newMonth)
  }, [currentMonth, onMonthChange])

  const handleToday = React.useCallback(() => {
    onMonthChange(new Date())
  }, [onMonthChange])

  const isToday = React.useCallback((date: Date | null) => {
    if (!date) return false
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }, [])

  const isSelected = React.useCallback((date: Date | null) => {
    if (!date || !selectedDate) return false
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    )
  }, [selectedDate])

  return (
    <div className={cn("w-full", className)}>
      {/* Header with month navigation */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">{monthName}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            onClick={handleToday}
          >
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="text-center text-sm font-semibold text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid - Optimized with memoized DayCell components */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((date, index) => (
          <DayCell
            key={index}
            date={date}
            dayEvents={getEventsForDate(date)}
            isToday={isToday(date)}
            isSelected={isSelected(date)}
            onDateSelect={onDateSelect}
            onEventClick={onEventClick}
            colorClasses={colorClasses}
          />
        ))}
      </div>
    </div>
  )
})

export type { CalendarEvent }
