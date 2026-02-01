<template>
  <div>
    <h1>Home</h1>
    <button @click="increment">Count: {{ count }}</button>
    <button @click="loadLazy">Load Lazy</button>
    <Lazy v-if="showLazy" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useCounterStore } from '../stores/counter'

const count = ref(0)
const showLazy = ref(false)
const store = useCounterStore()

const increment = () => {
  count.value++
  store.increment()
}

const loadLazy = async () => {
  const { default: Lazy } = await import('../components/Lazy.vue')
  showLazy.value = true
}
</script>