"use client"

import * as React from "react"
import { type DateRange } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type PresetRange = "today" | "2days" | "3days" | "1week" | "1month" | "2months" | "3months"

export function CalendarWidget() {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(new Date().setDate(new Date().getDate() + 7)),
  })
  const [activePreset, setActivePreset] = React.useState<PresetRange | null>("1week")

  const handlePresetClick = (preset: PresetRange) => {
    const today = new Date()
    const from = new Date(today)
    let to = new Date(today)

    switch (preset) {
      case "today":
        to = new Date(today)
        break
      case "2days":
        to = new Date(today.setDate(today.getDate() + 1))
        break
      case "3days":
        to = new Date(today.setDate(today.getDate() + 2))
        break
      case "1week":
        to = new Date(today.setDate(today.getDate() + 6))
        break
      case "1month":
        to = new Date(today.setMonth(today.getMonth() + 1))
        break
      case "2months":
        to = new Date(today.setMonth(today.getMonth() + 2))
        break
      case "3months":
        to = new Date(today.setMonth(today.getMonth() + 3))
        break
    }

    setDateRange({ from, to })
    setActivePreset(preset)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar</CardTitle>
        <CardDescription>
          {dateRange?.from && dateRange?.to
            ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
            : "Select a date range"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={activePreset === "today" ? "default" : "outline"}
            onClick={() => handlePresetClick("today")}
          >
            Today
          </Button>
          <Button
            size="sm"
            variant={activePreset === "2days" ? "default" : "outline"}
            onClick={() => handlePresetClick("2days")}
          >
            2 Days
          </Button>
          <Button
            size="sm"
            variant={activePreset === "3days" ? "default" : "outline"}
            onClick={() => handlePresetClick("3days")}
          >
            3 Days
          </Button>
          <Button
            size="sm"
            variant={activePreset === "1week" ? "default" : "outline"}
            onClick={() => handlePresetClick("1week")}
          >
            1 Week
          </Button>
          <Button
            size="sm"
            variant={activePreset === "1month" ? "default" : "outline"}
            onClick={() => handlePresetClick("1month")}
          >
            1 Month
          </Button>
          <Button
            size="sm"
            variant={activePreset === "2months" ? "default" : "outline"}
            onClick={() => handlePresetClick("2months")}
          >
            2 Months
          </Button>
          <Button
            size="sm"
            variant={activePreset === "3months" ? "default" : "outline"}
            onClick={() => handlePresetClick("3months")}
          >
            3 Months
          </Button>
        </div>
        <Calendar
          mode="range"
          defaultMonth={dateRange?.from}
          selected={dateRange}
          onSelect={(range) => {
            setDateRange(range)
            setActivePreset(null)
          }}
          className="rounded-md border w-full"
        />
      </CardContent>
    </Card>
  )
}
