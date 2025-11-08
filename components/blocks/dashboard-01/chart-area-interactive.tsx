"use client"

import * as React from "react"
import { Bar, BarChart, XAxis, YAxis } from "recharts"

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

export const description = "A horizontal bar chart"

const chartData = [
  { category: "Security", value: 486 },
  { category: "Networking", value: 305 },
  { category: "Storage", value: 237 },
  { category: "Analytics", value: 373 },
  { category: "Database", value: 209 },
  { category: "Compute", value: 214 },
]

const chartConfig = {
  value: {
    label: "Usage",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function ChartAreaInteractive() {

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Resource Usage</CardTitle>
        <CardDescription>By category</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 0, right: 12 }}
          >
            <XAxis type="number" hide />
            <YAxis
              dataKey="category"
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
