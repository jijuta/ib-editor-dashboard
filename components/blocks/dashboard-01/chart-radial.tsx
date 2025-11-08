"use client"

import * as React from "react"
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export const description = "A radar chart with custom labels"

const chartData = [
  { metric: "Performance", value: 186 },
  { metric: "Security", value: 305 },
  { metric: "Reliability", value: 237 },
  { metric: "Scalability", value: 273 },
  { metric: "Usability", value: 209 },
]

const chartConfig = {
  value: {
    label: "Score",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function ChartRadar() {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>System Metrics</CardTitle>
        <CardDescription>Performance analysis</CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <RadarChart data={chartData}>
            <PolarGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Radar
              dataKey="value"
              fill="var(--color-value)"
              fillOpacity={0.3}
              stroke="var(--color-value)"
              strokeWidth={2}
            />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
