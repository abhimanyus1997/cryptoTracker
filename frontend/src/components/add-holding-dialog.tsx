"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AddHoldingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddHolding: (holding: {
    symbol: string
    name: string
    amount: number
    currentPrice: number
    purchasePrice: number
    change24h: number
  }) => void
}

const cryptoOptions = [
  { symbol: "BTC", name: "Bitcoin", price: 43250 },
  { symbol: "ETH", name: "Ethereum", price: 2650 },
  { symbol: "ADA", name: "Cardano", price: 0.48 },
  { symbol: "SOL", name: "Solana", price: 98.5 },
  { symbol: "DOT", name: "Polkadot", price: 7.2 },
  { symbol: "LINK", name: "Chainlink", price: 14.8 },
  { symbol: "MATIC", name: "Polygon", price: 0.85 },
  { symbol: "AVAX", name: "Avalanche", price: 36.5 },
]

export function AddHoldingDialog({ open, onOpenChange, onAddHolding }: AddHoldingDialogProps) {
  const [selectedCrypto, setSelectedCrypto] = useState<string>("")
  const [amount, setAmount] = useState<string>("")
  const [purchasePrice, setPurchasePrice] = useState<string>("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const crypto = cryptoOptions.find((c) => c.symbol === selectedCrypto)
    if (!crypto || !amount || !purchasePrice) return

    onAddHolding({
      symbol: crypto.symbol,
      name: crypto.name,
      amount: Number.parseFloat(amount),
      currentPrice: crypto.price,
      purchasePrice: Number.parseFloat(purchasePrice),
      change24h: Math.random() * 10 - 5, // Random change for demo
    })

    // Reset form
    setSelectedCrypto("")
    setAmount("")
    setPurchasePrice("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Holding</DialogTitle>
          <DialogDescription>Add a new cryptocurrency to your portfolio.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="crypto">Cryptocurrency</Label>
            <Select value={selectedCrypto} onValueChange={setSelectedCrypto}>
              <SelectTrigger>
                <SelectValue placeholder="Select a cryptocurrency" />
              </SelectTrigger>
              <SelectContent>
                {cryptoOptions.map((crypto) => (
                  <SelectItem key={crypto.symbol} value={crypto.symbol}>
                    <div className="flex items-center justify-between w-full">
                      <span>
                        {crypto.name} ({crypto.symbol})
                      </span>
                      <span className="text-muted-foreground ml-2">${crypto.price.toLocaleString()}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchase-price">Purchase Price (USD)</Label>
            <Input
              id="purchase-price"
              type="number"
              step="any"
              placeholder="0.00"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Holding</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
