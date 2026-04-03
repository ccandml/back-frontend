<script setup lang="ts">
interface Props {
  label: string
  value: string
  loading?: boolean
}

defineProps<Props>()
</script>

<template>
  <article class="stat-card">
    <p class="card-title">{{ label }}</p>
    <p class="card-value" :class="{ 'is-loading': loading }">
      {{ loading ? '加载中...' : value }}
    </p>
  </article>
</template>

<style scoped lang="scss">
.stat-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px 14px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
}

.card-title {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
}

.card-value {
  margin: 8px 0 0;
  color: #111827;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.1;
}

.card-value.is-loading {
  font-weight: normal;
  font-size: medium;
  color: #94a3b8;
  opacity: 0.72;
}
</style>
