import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { api } from "@/lib/api"

export interface CalendarEvent {
  id: number
  user_id: number
  event_date: string
  title: string
  description?: string
  color: string
  all_day: boolean
  start_time?: string
  end_time?: string
  created_at?: string
  updated_at?: string
}

export interface CreateEventInput {
  event_date: string
  title: string
  description?: string
  color?: string
  all_day?: boolean
  start_time?: string
  end_time?: string
}

export interface UpdateEventInput {
  event_date?: string
  title?: string
  description?: string
  color?: string
  all_day?: boolean
  start_time?: string
  end_time?: string
}

// Query keys
export const calendarKeys = {
  all: ['calendar'] as const,
  events: (startDate: string, endDate: string) => 
    [...calendarKeys.all, 'events', startDate, endDate] as const,
}

/**
 * Fetch calendar events for a date range
 * OPTIMIZED: Longer stale time, aggressive caching, prefetching adjacent months
 */
export function useCalendarEvents(startDate: string, endDate: string) {
  return useQuery({
    queryKey: calendarKeys.events(startDate, endDate),
    queryFn: async () => {
      const response = await api.get<{ events: CalendarEvent[]; count: number; etag: string }>(
        `/api/calendar/events?start_date=${startDate}&end_date=${endDate}`
      )
      return response.events
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - calendar data doesn't change that often
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in memory longer
    refetchOnWindowFocus: false, // Don't refetch on every focus (performance)
    refetchOnMount: false, // Don't refetch if data exists
    retry: 1, // Only retry once on failure
  })
}

/**
 * Prefetch adjacent months for instant navigation
 * Call this from the Calendar page to prefetch next/previous months
 */
export function usePrefetchAdjacentMonths(currentMonth: Date) {
  const queryClient = useQueryClient()
  
  useEffect(() => {
    // Calculate prev and next month date ranges
    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    
    const getMonthRange = (date: Date) => {
      const year = date.getFullYear()
      const month = date.getMonth()
      const lastDay = new Date(year, month + 1, 0).getDate()
      return {
        start: `${year}-${(month + 1).toString().padStart(2, '0')}-01`,
        end: `${year}-${(month + 1).toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`
      }
    }
    
    const prevRange = getMonthRange(prevMonth)
    const nextRange = getMonthRange(nextMonth)
    
    // Prefetch in background
    queryClient.prefetchQuery({
      queryKey: calendarKeys.events(prevRange.start, prevRange.end),
      queryFn: async () => {
        const response = await api.get<{ events: CalendarEvent[] }>(
          `/api/calendar/events?start_date=${prevRange.start}&end_date=${prevRange.end}`
        )
        return response.events
      },
      staleTime: 2 * 60 * 1000,
    })
    
    queryClient.prefetchQuery({
      queryKey: calendarKeys.events(nextRange.start, nextRange.end),
      queryFn: async () => {
        const response = await api.get<{ events: CalendarEvent[] }>(
          `/api/calendar/events?start_date=${nextRange.start}&end_date=${nextRange.end}`
        )
        return response.events
      },
      staleTime: 2 * 60 * 1000,
    })
  }, [currentMonth, queryClient])
}

/**
 * Create a new calendar event
 */
export function useCreateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (event: CreateEventInput) => {
      const response = await api.post<CalendarEvent>('/api/calendar/events', event)
      return response
    },
    onSuccess: (newEvent) => {
      // Invalidate all event queries to refetch
      queryClient.invalidateQueries({ queryKey: calendarKeys.all })
      
      // Optionally: Add optimistic update for immediate UI response
      // (current approach: invalidate and refetch is simpler)
    },
    onError: (error: unknown) => {
      console.error('Failed to create event:', error)
      throw error
    }
  })
}

/**
 * Update an existing calendar event
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: UpdateEventInput }) => {
      const response = await api.put<CalendarEvent>(`/api/calendar/events/${id}`, updates)
      return response
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: calendarKeys.all })

      // Snapshot previous values
      const previousEvents = queryClient.getQueriesData({ queryKey: calendarKeys.all })

      // Optimistically update all relevant queries
      queryClient.setQueriesData<CalendarEvent[]>(
        { queryKey: calendarKeys.all },
        (old) => {
          if (!old) return old
          return old.map(event =>
            event.id === id ? { ...event, ...updates } : event
          )
        }
      )

      return { previousEvents }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousEvents) {
        context.previousEvents.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      console.error('Failed to update event:', err)
    },
    onSettled: () => {
      // Refetch to ensure sync with server
      queryClient.invalidateQueries({ queryKey: calendarKeys.all })
    }
  })
}

/**
 * Delete a calendar event
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete<{ success: boolean; message: string }>(`/api/calendar/events/${id}`)
      return response
    },
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: calendarKeys.all })

      // Snapshot previous values
      const previousEvents = queryClient.getQueriesData({ queryKey: calendarKeys.all })

      // Optimistically remove the event
      queryClient.setQueriesData<CalendarEvent[]>(
        { queryKey: calendarKeys.all },
        (old) => {
          if (!old) return old
          return old.filter(event => event.id !== id)
        }
      )

      return { previousEvents }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousEvents) {
        context.previousEvents.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      console.error('Failed to delete event:', err)
    },
    onSettled: () => {
      // Refetch to ensure sync with server
      queryClient.invalidateQueries({ queryKey: calendarKeys.all })
    }
  })
}
