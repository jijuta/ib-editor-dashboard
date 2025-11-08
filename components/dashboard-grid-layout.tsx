"use client"

import * as React from "react"
import Masonry from "react-masonry-css"
import { Responsive, WidthProvider } from "react-grid-layout"
import { Button } from "@/components/ui/button"
import { IconRefresh, IconEdit, IconCheck } from "@tabler/icons-react"

const ResponsiveGridLayout = WidthProvider(Responsive)

type DashboardGridLayoutProps = {
  children: React.ReactNode[]
  onEditModeChange?: (isEditMode: boolean) => void
}

const defaultLayouts = {
  xl: [
    // Row 1 - Charts (4 columns, varying heights)
    { i: "0", x: 0, y: 0, w: 1, h: 3 },  // ChartAreaInteractive
    { i: "1", x: 1, y: 0, w: 1, h: 3 },  // ChartBar
    { i: "2", x: 2, y: 0, w: 1, h: 3 },  // ChartPie
    { i: "3", x: 3, y: 0, w: 1, h: 3 },  // ChartRadialSimple

    // Row 2 - More Charts
    { i: "4", x: 0, y: 3, w: 1, h: 3 },  // ChartRadar
    { i: "5", x: 1, y: 3, w: 1, h: 3 },  // ChartRadarLabelCustom
    { i: "6", x: 2, y: 3, w: 1, h: 3 },  // ChartRadialLabel
    { i: "7", x: 3, y: 3, w: 1, h: 3 },  // ChartRadialShape

    // Row 3 - Table and Widgets (wider items)
    { i: "8", x: 0, y: 6, w: 1, h: 3 },  // ChartPieLabelList
    { i: "9", x: 1, y: 6, w: 2, h: 4 },  // SimpleTable (wider)
    { i: "10", x: 3, y: 6, w: 1, h: 4 }, // ChatWidget (taller)

    // Row 4 - Calendar and Team
    { i: "11", x: 0, y: 9, w: 2, h: 4 }, // CalendarWidget (wider)
    { i: "12", x: 2, y: 10, w: 2, h: 4 }, // TeamMembersWidget (wider)

    // Row 5 - Activity and Progress
    { i: "13", x: 0, y: 13, w: 2, h: 3 }, // ActivityWidget (wider)
    { i: "14", x: 2, y: 14, w: 1, h: 3 }, // ProgressWidget
    { i: "15", x: 3, y: 14, w: 1, h: 3 }, // StatsWidget
  ],
  lg: [
    // 3 columns
    { i: "0", x: 0, y: 0, w: 1, h: 3 },
    { i: "1", x: 1, y: 0, w: 1, h: 3 },
    { i: "2", x: 2, y: 0, w: 1, h: 3 },
    { i: "3", x: 0, y: 3, w: 1, h: 3 },
    { i: "4", x: 1, y: 3, w: 1, h: 3 },
    { i: "5", x: 2, y: 3, w: 1, h: 3 },
    { i: "6", x: 0, y: 6, w: 1, h: 3 },
    { i: "7", x: 1, y: 6, w: 1, h: 3 },
    { i: "8", x: 2, y: 6, w: 1, h: 3 },
    { i: "9", x: 0, y: 9, w: 2, h: 4 },
    { i: "10", x: 2, y: 9, w: 1, h: 4 },
    { i: "11", x: 0, y: 13, w: 2, h: 4 },
    { i: "12", x: 2, y: 13, w: 1, h: 4 },
    { i: "13", x: 0, y: 17, w: 2, h: 3 },
    { i: "14", x: 2, y: 17, w: 1, h: 3 },
    { i: "15", x: 0, y: 20, w: 1, h: 3 },
  ],
  md: [
    // 2 columns
    { i: "0", x: 0, y: 0, w: 1, h: 3 },
    { i: "1", x: 1, y: 0, w: 1, h: 3 },
    { i: "2", x: 0, y: 3, w: 1, h: 3 },
    { i: "3", x: 1, y: 3, w: 1, h: 3 },
    { i: "4", x: 0, y: 6, w: 1, h: 3 },
    { i: "5", x: 1, y: 6, w: 1, h: 3 },
    { i: "6", x: 0, y: 9, w: 1, h: 3 },
    { i: "7", x: 1, y: 9, w: 1, h: 3 },
    { i: "8", x: 0, y: 12, w: 1, h: 3 },
    { i: "9", x: 1, y: 12, w: 1, h: 4 },
    { i: "10", x: 0, y: 15, w: 1, h: 4 },
    { i: "11", x: 1, y: 16, w: 1, h: 4 },
    { i: "12", x: 0, y: 19, w: 2, h: 4 },
    { i: "13", x: 0, y: 23, w: 2, h: 3 },
    { i: "14", x: 0, y: 26, w: 1, h: 3 },
    { i: "15", x: 1, y: 26, w: 1, h: 3 },
  ],
  sm: [
    // 1 column
    { i: "0", x: 0, y: 0, w: 1, h: 3 },
    { i: "1", x: 0, y: 3, w: 1, h: 3 },
    { i: "2", x: 0, y: 6, w: 1, h: 3 },
    { i: "3", x: 0, y: 9, w: 1, h: 3 },
    { i: "4", x: 0, y: 12, w: 1, h: 3 },
    { i: "5", x: 0, y: 15, w: 1, h: 3 },
    { i: "6", x: 0, y: 18, w: 1, h: 3 },
    { i: "7", x: 0, y: 21, w: 1, h: 3 },
    { i: "8", x: 0, y: 24, w: 1, h: 3 },
    { i: "9", x: 0, y: 27, w: 1, h: 4 },
    { i: "10", x: 0, y: 31, w: 1, h: 4 },
    { i: "11", x: 0, y: 35, w: 1, h: 4 },
    { i: "12", x: 0, y: 39, w: 1, h: 4 },
    { i: "13", x: 0, y: 43, w: 1, h: 3 },
    { i: "14", x: 0, y: 46, w: 1, h: 3 },
    { i: "15", x: 0, y: 49, w: 1, h: 3 },
  ],
}

const breakpointColumnsObj = {
  default: 4,
  1280: 4,
  1024: 3,
  768: 2,
  640: 1
}

export function DashboardGridLayout({ children, onEditModeChange }: DashboardGridLayoutProps) {
  const [isEditMode, setIsEditMode] = React.useState(false)
  const masonryRef = React.useRef<HTMLDivElement>(null)
  const childrenArray = React.useMemo(() => React.Children.toArray(children), [children])
  const [layoutInitialized, setLayoutInitialized] = React.useState(false)

  const [layouts, setLayouts] = React.useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("dashboard-layouts")
      return saved ? JSON.parse(saved) : null
    }
    return null
  })

  // Masonry에서 실제 위치를 파악하여 Grid 레이아웃 생성
  const generateLayoutFromMasonry = React.useCallback(() => {
    if (!masonryRef.current) return defaultLayouts

    const container = masonryRef.current
    const columns = container.querySelectorAll('.masonry-column')
    const columnCount = columns.length

    // 각 열의 아이템들을 수집
    const columnItems: { index: number; height: number; top: number }[][] = Array.from(columns).map(column => {
      const items = column.querySelectorAll('.masonry-item')
      return Array.from(items).map(item => {
        const el = item as HTMLElement
        return {
          index: parseInt(el.getAttribute('data-index') || '0'),
          height: el.offsetHeight,
          top: el.offsetTop
        }
      })
    })

    // Grid 레이아웃 생성
    const newLayout: any[] = []

    columnItems.forEach((items, colIndex) => {
      items.forEach((item) => {
        // 높이를 rowHeight(120px) 단위로 변환
        const h = Math.max(2, Math.ceil(item.height / 120))

        newLayout.push({
          i: item.index.toString(),
          x: colIndex,
          y: 0, // y는 나중에 계산
          w: 1,
          h: h
        })
      })
    })

    // y 좌표 계산 (각 열별로 순서대로 쌓기)
    const colHeights = Array(columnCount).fill(0)
    newLayout.sort((a, b) => {
      const aCol = a.x
      const bCol = b.x
      if (aCol !== bCol) return aCol - bCol
      return parseInt(a.i) - parseInt(b.i)
    })

    newLayout.forEach(item => {
      item.y = colHeights[item.x]
      colHeights[item.x] += item.h
    })

    // 모든 breakpoint에 같은 레이아웃 적용
    return {
      xl: newLayout,
      lg: newLayout.map(item => ({...item})),
      md: newLayout.map(item => ({...item})),
      sm: newLayout.map(item => ({...item, x: 0})) // sm은 1열
    }
  }, [])

  const handleLayoutChange = (_: any, allLayouts: any) => {
    setLayouts(allLayouts)
    if (typeof window !== "undefined") {
      localStorage.setItem("dashboard-layouts", JSON.stringify(allLayouts))
    }
  }

  const handleReset = () => {
    const newLayouts = generateLayoutFromMasonry()
    setLayouts(newLayouts)
    if (typeof window !== "undefined") {
      localStorage.setItem("dashboard-layouts", JSON.stringify(newLayouts))
    }
  }

  const toggleEditMode = () => {
    const newMode = !isEditMode
    setIsEditMode(newMode)
    onEditModeChange?.(newMode)
  }

  // 첫 로드 시 Masonry 위치에서 레이아웃 초기화 (한 번만)
  React.useEffect(() => {
    if (!layoutInitialized && !isEditMode && masonryRef.current && !layouts) {
      // Masonry가 렌더링된 후 레이아웃 생성
      setTimeout(() => {
        const masonryLayouts = generateLayoutFromMasonry()
        setLayouts(masonryLayouts)
        setLayoutInitialized(true)
        if (typeof window !== "undefined") {
          localStorage.setItem("dashboard-layouts", JSON.stringify(masonryLayouts))
        }
      }, 500)
    }
  }, [layoutInitialized, isEditMode, layouts, generateLayoutFromMasonry])

  // 외부에서 편집 모드를 토글할 수 있도록 함수 노출
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).toggleDashboardEditMode = toggleEditMode
    }
  }, [isEditMode])

  // Grid 레이아웃 순서에 따라 children 정렬
  const sortedChildren = React.useMemo(() => {
    if (!layouts || !layouts.xl) return childrenArray

    // xl 레이아웃을 y, x 순서로 정렬
    const sortedLayout = [...layouts.xl].sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y
      return a.x - b.x
    })

    // 정렬된 순서대로 children 재배치
    return sortedLayout.map(item => {
      const index = parseInt(item.i)
      return childrenArray[index]
    }).filter(Boolean)
  }, [layouts, childrenArray])

  // Masonry 모드 (기본)
  if (!isEditMode) {
    return (
      <div className="w-full" ref={masonryRef}>
        <Masonry
          breakpointCols={breakpointColumnsObj}
          className="flex -ml-4 w-auto"
          columnClassName="pl-4 bg-clip-padding masonry-column"
        >
          {sortedChildren.map((child, displayIndex) => {
            // 원래 index 찾기
            const originalIndex = childrenArray.indexOf(child)
            return (
              <div
                key={originalIndex}
                className="mb-4 masonry-item"
                data-index={originalIndex}
              >
                {child}
              </div>
            )
          })}
        </Masonry>
      </div>
    )
  }

  // Grid 편집 모드
  return (
    <div className="w-full">
      <div className="flex justify-end gap-2 mb-4">
        <Button onClick={handleReset} variant="outline" size="sm">
          <IconRefresh className="h-4 w-4 mr-2" />
          Reset Layout
        </Button>
      </div>
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ xl: 1280, lg: 1024, md: 768, sm: 640 }}
        cols={{ xl: 4, lg: 3, md: 2, sm: 1 }}
        rowHeight={120}
        onLayoutChange={handleLayoutChange}
        isDraggable={true}
        isResizable={true}
        compactType="vertical"
        preventCollision={false}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        style={{ width: '100%' }}
      >
        {childrenArray.map((child, index) => (
          <div key={index.toString()} style={{ overflow: 'hidden' }}>
            {child}
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  )
}

