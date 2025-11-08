"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/blocks/dashboard-01/chart-area-interactive"
import { ChartBar } from "@/components/blocks/dashboard-01/chart-bar"
import { ChartPie } from "@/components/blocks/dashboard-01/chart-pie"
import { ChartPieLabelList } from "@/components/blocks/dashboard-01/chart-pie-label-list"
import { ChartRadar } from "@/components/blocks/dashboard-01/chart-radial"
import { ChartRadarLabelCustom } from "@/components/blocks/dashboard-01/chart-radar-label-custom"
import { ChartRadialLabel } from "@/components/blocks/dashboard-01/chart-radial-label"
import { ChartRadialShape } from "@/components/blocks/dashboard-01/chart-radial-shape"
import { ChartRadialSimple } from "@/components/blocks/dashboard-01/chart-radial-simple"
import { EnhancedDataTable } from "@/components/blocks/dashboard-01/enhanced-data-table"
import { SimpleTable } from "@/components/blocks/dashboard-01/simple-table"
import { SectionCards } from "@/components/blocks/dashboard-01/section-cards"
import { ChatWidget } from "@/components/blocks/dashboard-01/chat-widget"
import { CalendarWidget } from "@/components/blocks/dashboard-01/calendar-widget"
import { TeamMembersWidget } from "@/components/blocks/dashboard-01/team-members-widget"
import { ActivityWidget } from "@/components/blocks/dashboard-01/activity-widget"
import { ProgressWidget } from "@/components/blocks/dashboard-01/progress-widget"
import { StatsWidget } from "@/components/blocks/dashboard-01/stats-widget"
import { NotificationDrawer } from "@/components/blocks/dashboard-01/notification-drawer"
import { DashboardGridLayout } from "@/components/dashboard-grid-layout"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

import data from "./dashboard/data.json"
import { IconEdit, IconCheck } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"

export default function Page() {
  const [isEditMode, setIsEditMode] = React.useState(false)

  const handleEditModeToggle = () => {
    if (typeof window !== "undefined" && (window as any).toggleDashboardEditMode) {
      (window as any).toggleDashboardEditMode()
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-x-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4 flex-1">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Overview</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-2 px-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleEditModeToggle}
              title={isEditMode ? "완료" : "레이아웃 수정"}
            >
              {isEditMode ? (
                <IconCheck className="h-5 w-5" />
              ) : (
                <IconEdit className="h-5 w-5" />
              )}
            </Button>
            <NotificationDrawer />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 md:gap-6 md:p-6 md:pt-0">
          <SectionCards />
          <DashboardGridLayout onEditModeChange={setIsEditMode}>
            <ChartAreaInteractive />
            <ChartBar />
            <ChartPie />
            <ChartRadialSimple />
            <ChartRadar />
            <ChartRadarLabelCustom />
            <ChartRadialLabel />
            <ChartRadialShape />
            <ChartPieLabelList />
            <SimpleTable />
            <ChatWidget />
            <CalendarWidget />
            <TeamMembersWidget />
            <ActivityWidget />
            <ProgressWidget />
            <StatsWidget />
          </DashboardGridLayout>
          <EnhancedDataTable data={data} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
