<script setup lang="ts">
import { ref, computed } from 'vue'

interface CurrencyPair {
  value: string
  label: string
  baseToJPY: number | null
  quoteToJPY: number | null
}

const currencyPairs: CurrencyPair[] = [
  { value: 'USDJPY', label: 'USD/JPY', baseToJPY: 150.0, quoteToJPY: null },
  { value: 'EURJPY', label: 'EUR/JPY', baseToJPY: 163.5, quoteToJPY: null },
  { value: 'GBPJPY', label: 'GBP/JPY', baseToJPY: 190.2, quoteToJPY: null },
  { value: 'AUDJPY', label: 'AUD/JPY', baseToJPY: 97.8, quoteToJPY: null },
  { value: 'NZDJPY', label: 'NZD/JPY', baseToJPY: 89.5, quoteToJPY: null },
  { value: 'CADJPY', label: 'CAD/JPY', baseToJPY: 109.2, quoteToJPY: null },
  { value: 'CHFJPY', label: 'CHF/JPY', baseToJPY: 168.7, quoteToJPY: null },
  { value: 'EURUSD', label: 'EUR/USD', baseToJPY: 163.5, quoteToJPY: 150.0 },
  { value: 'GBPUSD', label: 'GBP/USD', baseToJPY: 190.2, quoteToJPY: 150.0 },
  { value: 'AUDUSD', label: 'AUD/USD', baseToJPY: 97.8, quoteToJPY: 150.0 },
  { value: 'NZDUSD', label: 'NZD/USD', baseToJPY: 89.5, quoteToJPY: 150.0 },
  { value: 'USDCAD', label: 'USD/CAD', baseToJPY: 150.0, quoteToJPY: 109.2 },
  { value: 'USDCHF', label: 'USD/CHF', baseToJPY: 150.0, quoteToJPY: 168.7 }
]

const selectedPair = ref('USDJPY')
const leverage = ref(25)
const lotSize = ref(1)

const calculateMargin = (): number => {
  const pair = currencyPairs.find(p => p.value === selectedPair.value)
  if (!pair) return 0

  const contractSize = 100000
  const lotSizeValue = lotSize.value
  const leverageValue = leverage.value

  let marginInJPY = 0

  if (pair.value.endsWith('JPY')) {
    marginInJPY = (contractSize * lotSizeValue) / leverageValue
  } else {
    const baseToJPY = pair.baseToJPY || 150.0
    marginInJPY = (contractSize * lotSizeValue * baseToJPY) / leverageValue
  }

  return marginInJPY
}

const margin = computed(() => calculateMargin())
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8 px-4">
    <div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h1 class="text-2xl font-bold text-center text-gray-800 mb-8">
        FX必要証拠金計算機
      </h1>

      <div class="space-y-6">
        <div>
          <label for="currencyPair" class="block text-sm font-medium text-gray-700 mb-2">
            通貨ペア
          </label>
          <select 
            id="currencyPair" 
            v-model="selectedPair"
            class="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
          >
            <option 
              v-for="pair in currencyPairs" 
              :key="pair.value" 
              :value="pair.value"
            >
              {{ pair.label }}
            </option>
          </select>
        </div>

        <div>
          <label for="leverage" class="block text-sm font-medium text-gray-700 mb-2">
            レバレッジ
          </label>
          <input 
            id="leverage"
            v-model.number="leverage"
            type="number"
            min="1"
            max="1000"
            class="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="25"
          >
        </div>

        <div>
          <label for="lotSize" class="block text-sm font-medium text-gray-700 mb-2">
            ロット数
          </label>
          <input 
            id="lotSize"
            v-model.number="lotSize"
            type="number"
            min="0.01"
            step="0.01"
            class="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="1"
          >
        </div>

        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 class="text-lg font-semibold text-blue-800 mb-2">必要証拠金</h2>
          <div class="text-3xl font-bold text-blue-600">
            ¥{{ margin.toLocaleString() }}
          </div>
        </div>
      </div>

      <div class="mt-6 text-xs text-gray-500 text-center">
        ※固定為替レートを使用した計算です<br>
        実際の取引では最新のレートをご確認ください
      </div>
    </div>
  </div>
</template>
