import { useState } from "react"
import { Plus, Edit2, Trash2, Clock, FileText, CalendarDays } from "lucide-react"
import { MonthCalendarGrid } from "@/components/ui/month-calendar-grid"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import {
  useCalendarEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  usePrefetchAdjacentMonths,
  type CalendarEvent,
  type CreateEventInput,
} from "@/hooks/use-calendar-queries"

const colors = [
  { value: "blue", label: "Blue" },
  { value: "red", label: "Red" },
  { value: "green", label: "Green" },
  { value: "yellow", label: "Yellow" },
  { value: "purple", label: "Purple" },
  { value: "pink", label: "Pink" },
  { value: "orange", label: "Orange" },
  { value: "teal", label: "Teal" },
  { value: "indigo", label: "Indigo" },
  { value: "gray", label: "Gray" },
]

function toLocalISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export default function Calendar() {
  const { toast } = useToast()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  // Form state
  const [eventForm, setEventForm] = useState<CreateEventInput>({
    event_date: "",
    title: "",
    description: "",
    color: "blue",
    all_day: true,
    start_time: "",
    end_time: "",
  })

  // Calculate date range for the current month
  const startDate = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-01`
  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  const endDate = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`

  // Queries and mutations
  const { data: events = [], isLoading } = useCalendarEvents(startDate, endDate)
  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent()
  const deleteEvent = useDeleteEvent()

  // OPTIMIZATION: Prefetch adjacent months for instant navigation
  usePrefetchAdjacentMonths(currentMonth)

  // Get events for selected date
  const selectedDateStr = selectedDate ? toLocalISODate(selectedDate) : undefined
  const eventsForSelectedDate = events.filter((e) => e.event_date === selectedDateStr)

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setEventForm({
      event_date: event.event_date,
      title: event.title,
      description: event.description || "",
      color: event.color,
      all_day: event.all_day,
      start_time: event.start_time || "",
      end_time: event.end_time || "",
    })
    setIsEditDialogOpen(true)
  }

  const handleCreateClick = () => {
    const dateStr = selectedDate ? toLocalISODate(selectedDate) : toLocalISODate(new Date())
    setEventForm({
      event_date: dateStr,
      title: "",
      description: "",
      color: "blue",
      all_day: true,
      start_time: "",
      end_time: "",
    })
    setIsCreateDialogOpen(true)
  }

  const handleCreateSubmit = async () => {
    if (!eventForm.title || !eventForm.event_date) {
      toast({
        title: "Validation Error",
        description: "Title and date are required",
        variant: "destructive",
      })
      return
    }

    try {
      await createEvent.mutateAsync(eventForm)
      toast({
        title: "Success",
        description: "Event created successfully",
      })
      setIsCreateDialogOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      })
    }
  }

  const handleUpdateSubmit = async () => {
    if (!selectedEvent || !eventForm.title) {
      toast({
        title: "Validation Error",
        description: "Title is required",
        variant: "destructive",
      })
      return
    }

    try {
      await updateEvent.mutateAsync({
        id: selectedEvent.id,
        updates: eventForm,
      })
      toast({
        title: "Success",
        description: "Event updated successfully",
      })
      setIsEditDialogOpen(false)
      setSelectedEvent(null)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!selectedEvent) return

    try {
      await deleteEvent.mutateAsync(selectedEvent.id)
      toast({
        title: "Success",
        description: "Event deleted successfully",
      })
      setIsEditDialogOpen(false)
      setSelectedEvent(null)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-[clamp(1.25rem,2.4vw,2.25rem)]">
      <div data-reveal className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-h1 text-foreground">My Calendar</h1>
          <p className="text-muted-foreground">
            Manage your personal events and activities
          </p>
        </div>
        <Button onClick={handleCreateClick}>
          <Plus className="mr-2 h-4 w-4" />
          Add Event
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <div className="md:col-span-3">
          <Card>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-muted-foreground">Loading calendar...</div>
                </div>
              ) : (
                <MonthCalendarGrid
                  events={events}
                  currentMonth={currentMonth}
                  onMonthChange={setCurrentMonth}
                  onDateSelect={handleDateSelect}
                  onEventClick={handleEventClick}
                  selectedDate={selectedDate}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Event List Sidebar */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedDate
                  ? selectedDate.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "Select a date"}
              </CardTitle>
              <CardDescription>
                {eventsForSelectedDate.length} event{eventsForSelectedDate.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedDate ? (
                <div className="text-sm text-muted-foreground">
                  Click on a date to see events
                </div>
              ) : eventsForSelectedDate.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No events for this date
                </div>
              ) : (
                <div className="space-y-3">
                  {eventsForSelectedDate.map((event) => (
                    <div
                      key={event.id}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => handleEventClick(event)}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className={`w-3 h-3 rounded-full mt-1 bg-${event.color}-500`}
                          style={{ backgroundColor: `var(--${event.color})` }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{event.title}</div>
                          {event.description && (
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {event.description}
                            </div>
                          )}
                          {!event.all_day && event.start_time && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Clock className="h-3 w-3" />
                              {event.start_time}
                              {event.end_time && ` - ${event.end_time}`}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upcoming Events Timeline Section */}
      <div className="mt-12 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#008631]/10 rounded-lg">
            <CalendarDays className="h-6 w-6 text-[#008631]" />
          </div>
          <h2 className="font-display text-2xl font-bold text-[#008631]">Upcoming Tasks & Events</h2>
        </div>
        
        <Card className="border-[#008631]/20 shadow-sm">
          <CardContent className="p-6">
            {events.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center">
                <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p>No tasks or events scheduled for this month.</p>
                <p className="text-sm mt-1">Click 'Add Event' to get started!</p>
              </div>
            ) : (
              <div className="relative border-l-2 border-[#008631]/20 ml-3 md:ml-6 space-y-8 py-2">
                {/* Sort events by date ascending */}
                {[...events]
                  .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
                  .map((event) => (
                  <div key={`timeline-${event.id}`} className="relative pl-8 md:pl-10">
                    {/* Timeline dot */}
                    <div 
                      className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-background shadow-sm"
                      style={{ backgroundColor: event.color === 'blue' || event.color === 'green' ? '#008631' : `var(--${event.color})` }}
                    />
                    
                    {/* Event Content Card */}
                    <div 
                      className="bg-card border border-border/50 hover:border-[#008631]/50 hover:bg-accent/5 transition-all duration-200 rounded-xl p-4 shadow-sm cursor-pointer" 
                      onClick={() => handleEventClick(event)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                        <h3 className="font-bold text-lg text-foreground">{event.title}</h3>
                        
                        <div className="flex items-center gap-2 text-sm font-medium px-3 py-1 bg-[#ffea00]/30 text-[#008631] rounded-full w-fit">
                          <CalendarDays className="h-4 w-4" />
                          {new Date(event.event_date).toLocaleDateString("en-GB", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </div>
                      </div>
                      
                      {event.description && (
                        <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                          {event.description}
                        </p>
                      )}
                      
                      {!event.all_day && event.start_time && (
                        <div className="flex items-center gap-2 text-sm text-[#008631] font-medium bg-[#008631]/5 px-3 py-1.5 rounded-lg w-fit">
                          <Clock className="h-4 w-4" />
                          {event.start_time} {event.end_time && `— ${event.end_time}`}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Event Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px] border-2 border-t-8 border-[#008631]">
          <DialogHeader>
            <DialogTitle className="text-[#008631] text-xl font-bold">Create New Event</DialogTitle>
            <DialogDescription className="text-[#008631]/80">Add a new event to your calendar</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                placeholder="Event title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={eventForm.event_date}
                onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                placeholder="Event description (optional)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="color">Color</Label>
              <Select value={eventForm.color} onValueChange={(value) => setEventForm({ ...eventForm, color: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colors.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      {color.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="all-day"
                checked={eventForm.all_day}
                onCheckedChange={(checked) => setEventForm({ ...eventForm, all_day: checked })}
              />
              <Label htmlFor="all-day">All day event</Label>
            </div>
            {!eventForm.all_day && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={eventForm.start_time}
                    onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={eventForm.end_time}
                    onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="border-[#008631] text-[#008631] hover:bg-[#008631]/10">
              Cancel
            </Button>
            <Button onClick={handleCreateSubmit} disabled={createEvent.isPending} className="bg-[#008631] text-[#ffea00] font-bold transition-colors hover:bg-[#ffea00] hover:text-[#008631]">
              {createEvent.isPending ? "Creating..." : "Create Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] border-2 border-t-8 border-[#008631]">
          <DialogHeader>
            <DialogTitle className="text-[#008631] text-xl font-bold">Edit Event</DialogTitle>
            <DialogDescription className="text-[#008631]/80">Update or delete this event</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                placeholder="Event title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-date">Date *</Label>
              <Input
                id="edit-date"
                type="date"
                value={eventForm.event_date}
                onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                placeholder="Event description (optional)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-color">Color</Label>
              <Select value={eventForm.color} onValueChange={(value) => setEventForm({ ...eventForm, color: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colors.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      {color.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-all-day"
                checked={eventForm.all_day}
                onCheckedChange={(checked) => setEventForm({ ...eventForm, all_day: checked })}
              />
              <Label htmlFor="edit-all-day">All day event</Label>
            </div>
            {!eventForm.all_day && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-start-time">Start Time</Label>
                  <Input
                    id="edit-start-time"
                    type="time"
                    value={eventForm.start_time}
                    onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-end-time">End Time</Label>
                  <Input
                    id="edit-end-time"
                    type="time"
                    value={eventForm.end_time}
                    onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="destructive" onClick={handleDelete} disabled={deleteEvent.isPending} className="bg-destructive hover:bg-destructive/90 text-white font-bold">
              <Trash2 className="mr-2 h-4 w-4" />
              {deleteEvent.isPending ? "Deleting..." : "Delete"}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="border-[#008631] text-[#008631] hover:bg-[#008631]/10">
                Cancel
              </Button>
              <Button onClick={handleUpdateSubmit} disabled={updateEvent.isPending} className="bg-[#008631] text-[#ffea00] font-bold transition-colors hover:bg-[#ffea00] hover:text-[#008631]">
                {updateEvent.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
