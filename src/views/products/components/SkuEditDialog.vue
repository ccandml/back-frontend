<script setup lang="ts">
import { computed } from 'vue'
import type { SkuItem } from '@/views/products/types/result'

type EditableSkuRow = {
  id: string
  skuCode: string
  picture: string
  specs: SkuItem['specs']
  inventory: number
  oldPrice: number
  price: number
  available: boolean
}

const props = defineProps<{
  modelValue: boolean
  loading: boolean
  saveLoading: boolean
  skus: EditableSkuRow[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const allAvailable = computed(
  () => props.skus.length > 0 && props.skus.every((item) => item.available),
)

const partiallyAvailable = computed(() => {
  if (props.skus.length === 0 || allAvailable.value) {
    return false
  }
  return props.skus.some((item) => item.available)
})

const handleToggleAllAvailable = (checked: boolean) => {
  props.skus.forEach((item) => {
    item.available = checked
  })
}

const formatSpec = (spec: SkuItem['specs'][number]) => `${spec.name}: ${spec.valueName}`

const handleSave = () => {
  emit('save')
}
</script>

<template>
  <el-dialog
    v-model="visible"
    width="1100px"
    destroy-on-close
    :close-on-click-modal="false"
    class="sku-edit-dialog"
  >
    <template #header>
      <div class="dialog-header">
        <h3 class="dialog-title">编辑 SKU</h3>
      </div>
    </template>

    <el-table
      v-loading="loading"
      :data="skus"
      border
      size="small"
      class="sku-table"
      empty-text="暂无 SKU 数据"
      max-height="60vh"
      stripe="true"
    >
      <el-table-column label="SKU ID" width="140" show-overflow-tooltip>
        <template #default="{ row }">
          <el-tooltip :content="row.id" placement="top" :show-after="300">
            <span class="mono sku-id-text">{{ row.id }}</span>
          </el-tooltip>
        </template>
      </el-table-column>

      <el-table-column label="SKU 图片" width="100" align="center">
        <template #default="{ row }">
          <img class="sku-image" :src="row.picture" :alt="row.id" loading="lazy" />
        </template>
      </el-table-column>

      <el-table-column prop="inventory" label="库存" width="150">
        <template #default="{ row }">
          <el-input-number
            v-model="row.inventory"
            class="compact-number"
            size="small"
            :min="0"
            :step="1"
            :precision="0"
          />
        </template>
      </el-table-column>

      <el-table-column label="规格" min-width="150">
        <template #default="{ row }">
          <div v-if="row.specs.length > 0" class="spec-lines">
            <div v-for="(item, index) in row.specs" :key="`${row.id}-${index}`" class="spec-line">
              {{ formatSpec(item) }}
            </div>
          </div>
          <span v-else>-</span>
        </template>
      </el-table-column>

      <el-table-column prop="oldPrice" label="原价（划线价）" width="140">
        <template #default="{ row }">
          <el-input-number
            v-model="row.oldPrice"
            class="compact-number"
            size="small"
            :min="0"
            :step="0.1"
            :precision="2"
            controls-position="right"
          />
        </template>
      </el-table-column>

      <el-table-column prop="price" label="销售价" width="140">
        <template #default="{ row }">
          <el-input-number
            v-model="row.price"
            class="compact-number"
            size="small"
            :min="0"
            :step="0.1"
            :precision="2"
            controls-position="right"
          />
        </template>
      </el-table-column>

      <el-table-column label="是否上架" width="110" align="center">
        <template #header>
          <el-checkbox
            :model-value="allAvailable"
            :indeterminate="partiallyAvailable"
            :disabled="skus.length === 0"
            @change="handleToggleAllAvailable"
          >
            是否上架
          </el-checkbox>
        </template>
        <template #default="{ row }">
          <el-switch v-model="row.available" size="small" />
        </template>
      </el-table-column>
    </el-table>

    <template #footer>
      <div class="dialog-footer">
        <el-button size="small" @click="visible = false">取消</el-button>
        <el-button type="primary" size="small" :loading="saveLoading" @click="handleSave">
          保存
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
:deep(.sku-edit-dialog) {
  .el-dialog {
    max-height: 88vh;
    display: flex;
    flex-direction: column;
  }

  .el-dialog__body {
    overflow-y: auto;
    padding-top: 10px;
  }
}

.dialog-header {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.dialog-title {
  margin: 0;
  font-size: 16px;
  color: #0f172a;
}

.sku-table {
  margin-top: 2px;
}

.sku-id-text {
  display: inline-block;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.spec-lines {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.4;
}

.spec-line {
  white-space: normal;
  word-break: break-word;
}

.compact-number {
  width: 104px;
}

.mono {
  font-family: Consolas, Monaco, 'Courier New', monospace;
  color: #334155;
}

.sku-image {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  object-fit: cover;
  border: 1px solid #e2e8f0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
