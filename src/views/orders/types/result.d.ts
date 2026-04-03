/** 管理端订单列表项 */
export type AdminOrderListItem = {
  /** 订单id */
  id: string
  /** 用户头像 */
  userAvatar: string
  /** 用户名 */
  username: string
  /** 商品总付价 */
  totalPayPrice: number
  /** 创建时间 */
  createTime: string
  /** 订单状态 */
  orderState: number
}

/** 管理端订单列表 */
export type AdminOrderListResult = {
  /** 总记录数 */
  counts: number
  /** 当前页码 */
  page: number
  /** 页尺寸 */
  pageSize: number
  /** 总页数 */
  pages: number
  /** 列表数据 */
  items: AdminOrderListItem[]
}

/** 管理端订单详情中的 SKU 项 */
export type AdminOrderDetailSkuItem = {
  /** SKU ID */
  skuId: string
  /** 商品图片快照 */
  picture: string
  /** 商品名称快照 */
  name: string
  /** 商品属性文字快照 */
  attrsText: string
  /** 购买时单价 */
  payPrice: number
  /** 商品数量 */
  quantity: number
  /** 小计金额 */
  totalPayPrice: number
}

/** 管理端订单详情 */
export type AdminOrderDetailResult = {
  /** 订单id */
  id: string
  /** 用户名 */
  username: string
  /** 订单状态 */
  orderState: number
  /** 创建时间 */
  createTime: string
  /** 收货人 */
  receiverContact: string
  /** 收货人手机 */
  receiverMobile: string
  /** 收货完整地址（省市区 + 详细地址） */
  receiverAddress: string
  /** 运费 */
  postFee: number
  /** 实付价格总计 */
  payMoney: number
  /** 商品 SKU 列表 */
  skus: AdminOrderDetailSkuItem[]
}
