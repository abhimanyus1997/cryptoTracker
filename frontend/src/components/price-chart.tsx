"use client"

import { useMemo } from "react"

export function PriceChart() {
  // Generate mock chart data
  const chartData = useMemo(() => {
    const points = []
    let basePrice = 100

    for (let i = 0; i < 30; i++) {
      const change = (Math.random() - 0.5) * 10
      basePrice += change
      points.push({
        x: i * 10,
        y: Math.max(20, basePrice),
      })
    }

    return points
  }, [])

  const maxY = Math.max(...chartData.map((p) => p.y))
  const minY = Math.min(...chartData.map((p) => p.y))
  const range = maxY - minY

  // Create SVG path
  const pathData = chartData
    .map((point, index) => {
      const x = (point.x / 290) * 300
      const y = 150 - ((point.y - minY) / range) * 120
      return `${index === 0 ? "M" : "L"} ${x} ${y}`
    })
    .join(" ")

  return (
    <div className="w-full h-40">
      <svg width="100%" height="100%" viewBox="0 0 300 150" className="overflow-visible">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <g stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3">
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={i} x1="0" y1={i * 30} x2="300" y2={i * 30} />
          ))}
        </g>

        {/* Area under curve */}
        <path d={`${pathData} L 300 150 L 0 150 Z`} fill="url(#gradient)" />

        {/* Price line */}
        <path
          d={pathData}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {chartData.map((point, index) => {
          const x = (point.x / 290) * 300
          const y = 150 - ((point.y - minY) / range) * 120

          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="2"
              fill="hsl(var(--primary))"
              className="opacity-0 hover:opacity-100 transition-opacity"
            />
          )
        })}
      </svg>
    </div>
  )
}
