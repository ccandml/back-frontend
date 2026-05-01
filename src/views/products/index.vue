<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Ref } from 'vue'
import { ElMessage } from 'element-plus'

import { getCategories } from '@/service/category'
import {
  getProductDetail,
  getProducts,
  updateSkuProduct,
  type UpdateSkuPayload,
} from '@/service/products'
import type { GoodsItems } from '@/types/global'
import SkuEditDialog from '@/views/products/components/SkuEditDialog.vue'
import type { ClassifyResult } from '@/views/products/types/category'
import type { SkuItem } from '@/views/products/types/result'

type ProductStatus = '上架' | '下架'
type SortField = 'price' | 'stock' | 'orderNum'
type SortOrder = 'ASC' | 'DESC'

type ProductRow = GoodsItems & {
  status: ProductStatus
}

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

type EditableSkuSnapshot = Pick<EditableSkuRow, 'available' | 'inventory' | 'oldPrice' | 'price'>
type EditableSkuSnapshotMap = Record<string, EditableSkuSnapshot>

type CategoryCascaderOption = {
  id: string
  name: string
  children: CategoryCascaderOption[]
}

// 表格固定分页大小（保持原有行为）
const pageSize = 5

// 将后端商品结构映射为页面展示结构。
const buildProductRow = (item: GoodsItems): ProductRow => {
  return {
    ...item,
    status: item.available === false ? '下架' : '上架',
  }
}

// 规范化分类数据，适配级联组件结构。
const normalizeCategoryOptions = (categories: ClassifyResult[]): CategoryCascaderOption[] => {
  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    children: category.children.map((child) => ({
      id: child.id,
      name: child.name,
      children: [],
    })),
  }))
}

// 将 SKU 详情映射为弹窗中的可编辑行。
const mapEditableSku = (sku: SkuItem): EditableSkuRow => {
  return {
    id: sku.id,
    skuCode: sku.skuCode,
    picture: sku.picture,
    specs: sku.specs,
    inventory: sku.inventory,
    oldPrice: sku.oldPrice,
    price: sku.price,
    available: sku.available,
  }
}

// 仅保存可编辑字段快照，用于保存前做 diff。
const createSkuSnapshot = (skus: EditableSkuRow[]) => {
  const snapshotMap: EditableSkuSnapshotMap = {}

  for (const sku of skus) {
    snapshotMap[sku.id] = {
      available: sku.available,
      inventory: sku.inventory,
      oldPrice: sku.oldPrice,
      price: sku.price,
    }
  }

  return snapshotMap
}

const formatPrice = (value: string) => {
  const amount = Number(value)
  return Number.isFinite(amount) ? `¥${amount.toFixed(2)}` : value
}

// 查询筛选逻辑：关键词、状态、分类、排序、页码。
const useProductFilters = () => {
  const keyword = ref('') // 商品关键词：支持 ID / 名称
  const status = ref<'all' | ProductStatus>('all') // 上下架状态，all 表示不筛选
  const categoryId = ref('') // 分类筛选值（仅二级分类 id）
  const sortField = ref<SortField | ''>('') // 当前排序字段
  const sortOrder = ref<SortOrder | ''>('') // 当前排序方向
  const currentPage = ref(1) // 当前页

  const getSortLabel = (field: SortField) => {
    if (sortField.value !== field || !sortOrder.value) {
      return '未排序'
    }
    return sortOrder.value === 'ASC' ? '升序' : '降序'
  }

  // 只允许一个排序字段生效：点击同一字段在升序/降序/不排序间切换。
  const toggleSort = (field: SortField) => {
    if (sortField.value !== field) {
      sortField.value = field
      sortOrder.value = 'ASC'
      return
    }

    if (sortOrder.value === 'ASC') {
      sortOrder.value = 'DESC'
      return
    }

    if (sortOrder.value === 'DESC') {
      sortField.value = ''
      sortOrder.value = ''
      return
    }

    sortOrder.value = 'ASC'
  }

  const resetFilters = () => {
    keyword.value = ''
    status.value = 'all'
    categoryId.value = ''
    sortField.value = ''
    sortOrder.value = ''
    currentPage.value = 1
  }

  return {
    keyword,
    status,
    categoryId,
    sortField,
    sortOrder,
    currentPage,
    getSortLabel,
    toggleSort,
    resetFilters,
  }
}

// 分类选项逻辑：加载分类并提供级联配置。
const useCategoryOptions = () => {
  const categoryOptions = ref<CategoryCascaderOption[]>([])

  const categoryCascaderProps = {
    value: 'id',
    label: 'name',
    children: 'children',
    emitPath: false,
  }

  const fetchCategories = async () => {
    try {
      const data = await getCategories()
      categoryOptions.value = normalizeCategoryOptions(data)
    } catch (error) {
      console.error('获取分类列表失败：', error)
      categoryOptions.value = []
    }
  }

  return {
    categoryOptions,
    categoryCascaderProps,
    fetchCategories,
  }
}

// 商品表格逻辑：列表请求、查询动作、分页。
const useProductTable = (
  filters: {
    keyword: Ref<string>
    status: Ref<'all' | ProductStatus>
    categoryId: Ref<string>
    sortField: Ref<SortField | ''>
    sortOrder: Ref<SortOrder | ''>
    currentPage: Ref<number>
    resetFilters: () => void
  },
  size: number,
) => {
  const loading = ref(false)
  const products = ref<ProductRow[]>([])
  const total = ref(0)

  const hasData = computed(() => products.value.length > 0)

  const fetchProducts = async () => {
    loading.value = true
    try {
      const response = await getProducts({
        page: filters.currentPage.value,
        pageSize: size,
        keyword: filters.keyword.value.trim() || undefined,
        // 仅传递二级分类 id；未选择分类时不传该参数。
        categoryId: filters.categoryId.value || undefined,
        sortBy: filters.sortField.value || undefined,
        sortOrder: filters.sortOrder.value || undefined,
        // 后端约定：available 仅接收 1/0，不筛选时不传。
        available:
          filters.status.value === 'all' ? undefined : filters.status.value === '上架' ? 1 : 0,
      })
      products.value = response.items.map(buildProductRow)
      total.value = response.counts
    } catch (error) {
      console.error('获取商品列表失败：', error)
      products.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  // 查询由按钮触发，避免输入变化时频繁请求后端。
  const handleSearch = () => {
    filters.currentPage.value = 1
    void fetchProducts()
  }

  const handleReset = () => {
    filters.resetFilters()
    void fetchProducts()
  }

  const handlePageChange = (page: number) => {
    filters.currentPage.value = page
    void fetchProducts()
  }

  return {
    loading,
    products,
    total,
    hasData,
    fetchProducts,
    handleSearch,
    handleReset,
    handlePageChange,
  }
}

// SKU 编辑逻辑：详情拉取、差异检测、保存回写。
const useSkuEditor = (products: Ref<ProductRow[]>) => {
  const editVisible = ref(false)
  const editLoading = ref(false)
  const saveLoading = ref(false)
  const activeProductId = ref('') // 当前正在编辑的商品 id
  const editableSkus = ref<EditableSkuRow[]>([]) // 弹窗中可编辑 SKU
  const originalEditableSkus = ref<EditableSkuSnapshotMap>({})

  const isSkuChanged = (sku: EditableSkuRow) => {
    const original = originalEditableSkus.value[sku.id]
    // 如果没有快照（理论上不应发生），按“有变更”处理，避免漏提交。
    if (!original) {
      return true
    }

    return (
      original.available !== sku.available ||
      original.inventory !== sku.inventory ||
      original.oldPrice !== sku.oldPrice ||
      original.price !== sku.price
    )
  }

  // 仅保留变更字段，减少无效写入。
  const buildSkuUpdatePayload = (sku: EditableSkuRow): UpdateSkuPayload => {
    const original = originalEditableSkus.value[sku.id]
    if (!original) {
      return {
        id: sku.id,
        available: sku.available,
        inventory: sku.inventory,
        oldPrice: sku.oldPrice,
        price: sku.price,
      }
    }

    const payload: UpdateSkuPayload = { id: sku.id }
    if (original.available !== sku.available) {
      payload.available = sku.available
    }
    if (original.inventory !== sku.inventory) {
      payload.inventory = sku.inventory
    }
    if (original.oldPrice !== sku.oldPrice) {
      payload.oldPrice = sku.oldPrice
    }
    if (original.price !== sku.price) {
      payload.price = sku.price
    }
    return payload
  }

  const handleEdit = async (id: string) => {
    activeProductId.value = id
    editableSkus.value = []
    originalEditableSkus.value = {}
    editVisible.value = true
    editLoading.value = true

    try {
      const skus = await getProductDetail(id)
      const mappedSkus = skus.map(mapEditableSku)
      editableSkus.value = mappedSkus
      // 打开弹窗时保存一份“初始快照”，后续保存前用它做逐字段 diff。
      originalEditableSkus.value = createSkuSnapshot(mappedSkus)
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '获取商品详情失败')
    } finally {
      editLoading.value = false
    }
  }

  // 保存策略：只提交发生变更的 SKU，未变更项不发请求。
  const handleSaveSkus = async () => {
    if (!activeProductId.value || editableSkus.value.length === 0) {
      return
    }

    // 与快照做 diff，筛出本次真正修改过的 SKU。
    const changedSkus = editableSkus.value.filter(isSkuChanged)
    const updatePayloads = changedSkus
      .map(buildSkuUpdatePayload)
      .filter((payload) => Object.keys(payload).length > 1)
    if (updatePayloads.length === 0) {
      ElMessage.info('未检测到 SKU 变更')
      editVisible.value = false
      return
    }

    saveLoading.value = true
    try {
      // 批量提交变化字段，减少无意义请求与后端写入。
      await updateSkuProduct(updatePayloads)

      // 同步更新列表中的聚合信息，确保弹层关闭后页面可见最新编辑结果。
      const target = products.value.find((item) => item.id === activeProductId.value)
      if (target) {
        target.stock = editableSkus.value.reduce((sum, sku) => sum + sku.inventory, 0)
        target.price = Math.min(...editableSkus.value.map((sku) => sku.price)).toFixed(2)
        target.status = editableSkus.value.some((sku) => sku.available) ? '上架' : '下架'
        target.available = target.status === '上架'
      }

      ElMessage.success('SKU 修改成功')
      // 保存成功后刷新快照，作为下一次编辑的对比基准。
      originalEditableSkus.value = createSkuSnapshot(editableSkus.value)
      editVisible.value = false
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '保存 SKU 失败')
    } finally {
      saveLoading.value = false
    }
  }

  return {
    editVisible,
    editLoading,
    saveLoading,
    editableSkus,
    handleEdit,
    handleSaveSkus,
  }
}

const {
  keyword,
  status,
  categoryId,
  sortField,
  sortOrder,
  currentPage,
  getSortLabel,
  toggleSort,
  resetFilters,
} = useProductFilters()

const { categoryOptions, categoryCascaderProps, fetchCategories } = useCategoryOptions()

const {
  loading,
  products,
  total,
  hasData,
  fetchProducts,
  handleSearch,
  handleReset,
  handlePageChange,
} = useProductTable(
  {
    keyword,
    status,
    categoryId,
    sortField,
    sortOrder,
    currentPage,
    resetFilters,
  },
  pageSize,
)

const { editVisible, editLoading, saveLoading, editableSkus, handleEdit, handleSaveSkus } =
  useSkuEditor(products)

onMounted(() => {
  // 页面初始化：并行加载分类与商品列表。
  void fetchCategories()
  void fetchProducts()
})
</script>

<template>
  <section class="product-page">
    <div class="filter-bar">
      <el-input
        v-model="keyword"
        class="filter-keyword"
        clearable
        placeholder="请输入商品ID或商品名称"
      />

      <el-select v-model="status" class="filter-status" placeholder="请选择状态">
        <el-option label="全部状态" value="all" />
        <el-option label="上架" value="上架" />
        <el-option label="下架" value="下架" />
      </el-select>

      <el-cascader
        v-model="categoryId"
        class="filter-category"
        :options="categoryOptions"
        :props="categoryCascaderProps"
        clearable
        placeholder="请选择商品分类"
      />

      <div class="sort-actions">
        <el-button
          :type="sortField === 'price' ? 'primary' : 'default'"
          plain
          @click="toggleSort('price')"
        >
          商品价格（{{ getSortLabel('price') }}）
        </el-button>
        <el-button
          :type="sortField === 'stock' ? 'primary' : 'default'"
          plain
          @click="toggleSort('stock')"
        >
          库存（{{ getSortLabel('stock') }}）
        </el-button>
        <el-button
          :type="sortField === 'orderNum' ? 'primary' : 'default'"
          plain
          @click="toggleSort('orderNum')"
        >
          销量（{{ getSortLabel('orderNum') }}）
        </el-button>
      </div>

      <div class="filter-actions">
        <el-button @click="handleReset">重置</el-button>
        <el-button type="primary" @click="handleSearch">搜索</el-button>
      </div>
    </div>

    <div class="table-shell">
      <el-table
        v-loading="loading"
        :data="products"
        class="product-table"
        empty-text="暂无商品数据"
        stripe
      >
        <el-table-column label="商品ID" min-width="170">
          <template #default="{ row }">
            <span class="mono">{{ row.id }}</span>
          </template>
        </el-table-column>

        <el-table-column label="商品主图" width="120" align="center">
          <template #default="{ row }">
            <img
              class="product-image"
              :src="row.picture"
              :alt="row.name"
              loading="lazy"
              referrerpolicy="no-referrer"
            />
          </template>
        </el-table-column>

        <el-table-column prop="name" label="商品名称" min-width="240" show-overflow-tooltip />

        <el-table-column label="商品价格" width="130">
          <template #default="{ row }">{{ formatPrice(row.price) }}</template>
        </el-table-column>

        <el-table-column prop="stock" label="库存" width="110" />
        <el-table-column prop="orderNum" label="销量" width="110" />

        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="row.status === '上架' ? 'success' : 'danger'" effect="light">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row.id)">编辑</el-button>
          </template>
        </el-table-column>

        <template #append>
          <div class="table-bottom-slot">
            <div v-if="!loading && hasData" class="footer-tip">共 {{ total }} 条商品</div>
            <el-pagination
              v-model:current-page="currentPage"
              :page-size="pageSize"
              :total="total"
              size="small"
              layout="prev, pager, next, jumper, total"
              background
              @current-change="handlePageChange"
            />
          </div>
        </template>
      </el-table>
    </div>

    <SkuEditDialog
      v-model="editVisible"
      :loading="editLoading"
      :save-loading="saveLoading"
      :skus="editableSkus"
      @save="handleSaveSkus"
    />
  </section>
</template>

<style scoped lang="scss">
.product-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-bar {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  padding: 10px;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
}

.filter-keyword {
  width: 220px;
}

.filter-status {
  width: 120px;
}

.filter-category {
  width: 180px;
}

.sort-actions {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px;
}

.sort-actions :deep(.el-button) {
  padding: 7px 10px;
  font-size: 12px;
}

.filter-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.filter-actions :deep(.el-button) {
  padding: 7px 12px;
}

.page-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.page-title {
  margin: 0;
  font-size: 20px;
  color: #111827;
}

.page-desc {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}

.table-shell {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
}

.product-table {
  height: 100%;
}

.mono {
  font-family: Consolas, Monaco, 'Courier New', monospace;
  color: #334155;
}

.product-image {
  width: 76px;
  height: 76px;
  border-radius: 10px;
  object-fit: cover;
  display: block;
  border: 1px solid #e2e8f0;
}

.footer-tip {
  font-size: 13px;
  color: #64748b;
}

.table-bottom-slot {
  padding: 10px 14px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: flex-end;
  border-top: 1px solid #f1f5f9;
}

.table-bottom-slot .footer-tip {
  margin-right: auto;
}

@media (max-width: 900px) {
  .product-page {
    gap: 10px;
  }

  .filter-bar {
    flex-wrap: wrap;
    overflow-x: visible;
  }

  .page-title {
    font-size: 18px;
  }

  .filter-keyword,
  .filter-status,
  .filter-category {
    width: 100%;
  }

  .filter-actions {
    margin-left: 0;
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
