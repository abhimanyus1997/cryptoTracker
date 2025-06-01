"use client"

import { useState } from "react"
import { Plus, TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3, Settings, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AddHoldingDialog } from "@/components/add-holding-dialog"
import { PriceChart } from "@/components/price-chart"

interface Holding {
  id: string
  symbol: string
  name: string
  amount: number
  currentPrice: number
  purchasePrice: number
  change24h: number
}

const mockHoldings: Holding[] = [
  {
    id: "1",
    symbol: "BTC",
    name: "Bitcoin",
    amount: 0.5,
    currentPrice: 43250,
    purchasePrice: 40000,
    change24h: 2.5,
  },
  {
    id: "2",
    symbol: "ETH",
    name: "Ethereum",
    amount: 2.3,
    currentPrice: 2650,
    purchasePrice: 2400,
    change24h: -1.2,
  },
  {
    id: "3",
    symbol: "ADA",
    name: "Cardano",
    amount: 1000,
    currentPrice: 0.48,
    purchasePrice: 0.52,
    change24h: 3.8,
  },
  {
    id: "4",
    symbol: "SOL",
    name: "Solana",
    amount: 15,
    currentPrice: 98.5,
    purchasePrice: 85,
    change24h: -0.8,
  },
]

export function CryptoDashboard() {
  const [holdings, setHoldings] = useState<Holding[]>(mockHoldings)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const totalValue = holdings.reduce((sum, holding) => sum + holding.amount * holding.currentPrice, 0)
  const totalCost = holdings.reduce((sum, holding) => sum + holding.amount * holding.purchasePrice, 0)
  const totalGainLoss = totalValue - totalCost
  const totalGainLossPercent = (totalGainLoss / totalCost) * 100

  const addHolding = (newHolding: Omit<Holding, "id">) => {
    const holding: Holding = {
      ...newHolding,
      id: Date.now().toString(),
    }
    setHoldings([...holdings, holding])
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-bold">CryptoTracker</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Bell className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Holding
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Portfolio Overview */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+$2,350 from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
              {totalGainLoss >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalGainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                {totalGainLoss >= 0 ? "+" : ""}${totalGainLoss.toLocaleString()}
              </div>
              <p className={`text-xs ${totalGainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                {totalGainLoss >= 0 ? "+" : ""}
                {totalGainLossPercent.toFixed(2)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Holdings</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{holdings.length}</div>
              <p className="text-xs text-muted-foreground">Different cryptocurrencies</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Best Performer</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">ADA</div>
              <p className="text-xs text-green-600">+3.8% today</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="holdings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="holdings">Holdings</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
            <TabsTrigger value="allocation">Allocation</TabsTrigger>
          </TabsList>

          <TabsContent value="holdings" className="space-y-6">
            {/* Holdings Table */}
            <Card>
              <CardHeader>
                <CardTitle>Your Holdings</CardTitle>
                <CardDescription>Track your cryptocurrency investments and performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {holdings.map((holding) => {
                    const currentValue = holding.amount * holding.currentPrice
                    const costBasis = holding.amount * holding.purchasePrice
                    const gainLoss = currentValue - costBasis
                    const gainLossPercent = (gainLoss / costBasis) * 100

                    return (
                      <div key={holding.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {holding.symbol.slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{holding.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {holding.amount} {holding.symbol}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-medium">${currentValue.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">
                            ${holding.currentPrice.toLocaleString()} per {holding.symbol}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`font-medium ${gainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {gainLoss >= 0 ? "+" : ""}${gainLoss.toLocaleString()}
                          </div>
                          <div className={`text-sm ${gainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {gainLoss >= 0 ? "+" : ""}
                            {gainLossPercent.toFixed(2)}%
                          </div>
                        </div>

                        <Badge variant={holding.change24h >= 0 ? "default" : "destructive"}>
                          {holding.change24h >= 0 ? "+" : ""}
                          {holding.change24h}%
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="charts" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio Performance</CardTitle>
                  <CardDescription>7-day price history</CardDescription>
                </CardHeader>
                <CardContent>
                  <PriceChart />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Bitcoin Price</CardTitle>
                  <CardDescription>24-hour price movement</CardDescription>
                </CardHeader>
                <CardContent>
                  <PriceChart />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="allocation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Allocation</CardTitle>
                <CardDescription>Distribution of your cryptocurrency holdings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {holdings.map((holding) => {
                    const value = holding.amount * holding.currentPrice
                    const percentage = (value / totalValue) * 100

                    return (
                      <div key={holding.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {holding.symbol.slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{holding.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{percentage.toFixed(1)}%</div>
                            <div className="text-sm text-muted-foreground">${value.toLocaleString()}</div>
                          </div>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AddHoldingDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} onAddHolding={addHolding} />
    </div>
  )
}
