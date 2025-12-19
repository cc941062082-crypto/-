
export interface OrderItem {
  name: string;
  spec: string;
  price: number;
  qty: number;
  img: string;
  snapshotUrl?: string;
}

export interface Order {
  id: string;
  buyer: string;
  status: string;
  contact: string;
  phone: string;
  address: string;
  purchaseId?: string;
  purchaseCost: number;
  purchaseStatus?: string; // normal, increase, decrease, not_purchased
  purchaseDiff?: number; // Price difference amount
  purchaseNote?: string; // Reason or remark
  sellPrice: number;
  items: OrderItem[];
  orderTime: string;
  purchaseLogisticsId?: string;
  purchasePlatform?: string;
  shopName: string;
  tag?: string;
}

export interface Shop {
  id: number;
  name: string;
  companyName?: string; // Was account, now Company Name
  shopPassword?: string; // New field for shop login password
  note?: string;
}

export interface AfterSale {
  id: number;
  order_id: string;
  type: string;
  status: string;
  refund_amount: number;
  upstream_refund_amount: number;
  upstream_status: string;
  reason: string;
  logistics_company?: string;
  logistics_id?: string;
  created_at: string;
  shopName?: string;
  sellPrice?: number;
  purchaseCost?: number;
  purchaseId?: string;
  tag?: string; // Include tag from Order
  purchaseStatus?: string; // Include purchaseStatus from Order
}

export interface AfterSaleFilters {
  search: string;
  status: string;
  type: string;
  shopName: string;
  tag?: string;
  purchaseStatus?: string;
}

export interface ProductStat {
  name: string;
  img: string;
  sales: number;
  revenue: number;
  trend: 'up' | 'down' | 'flat';
}

export interface AppSettings {
  overduePenalty: number; // Amount to deduct for overdue orders
  overdueHours: number; // Hours threshold for overdue
  riskHours: number; // Hours threshold for risk
  defaultPurchasePlatform: string;
  defaultShippingCost: number; // New: Global estimated shipping cost per order
}

export interface DashboardStats {
  kpi: {
    total_orders: number;
    orders_growth: number; // percentage
    total_sales: number;
    sales_growth: number;
    total_cost: number; // New: Purchase Cost
    cost_growth: number;
    net_profit: number;
    profit_growth: number;
    profit_margin: number; // New: Profit Margin %
    margin_growth: number;
    pending_ship: number;
    refund_rate: number;
    refund_growth: number;
    overdue_orders: number; // New: > 48h
    timeout_risk: number;   // New: > 24h & < 48h
    unpurchased_orders: number; // New: Pending ship & not purchased
  };
  daily_trend: Array<{
    date: string;
    orders: number;
    sales: number;
    cost: number; // New: Daily Cost
    profit: number;
    refunds: number; // New: Daily Refunds Count
  }>;
  shop_ranking: Array<{
    shopName: string;
    count: number;
    gross_profit: number;
  }>;
  best_sellers: ProductStat[];
  platform_distribution: Array<{
    name: string;
    value: number;
  }>;
}

export interface OrderFilters {
  page: number;
  pageSize: number;
  status: string;
  search: string;
  tag: string;
  startDate: string;
  endDate: string;
  shopName?: string;
  purchaseStatus?: string;
  timeFilter?: string; // 'overdue' | 'risk'
  deepSearch?: boolean; // 深度检索：搜索更多字段（地址/商品/采购/物流等）
}

export interface OrderResponse {
  items: Order[];
  total: number;
  page: number;
  pageSize: number;
}

export type UserRole = 'admin' | 'user';

export interface UserPermissions {
  manageOrders: boolean;      // 分配的店铺订单管理
  viewDashboard: boolean;     // 分配的店铺经营概括
  manageSettings: boolean;    // 订单履约规则 (Settings)
  viewAllShops: boolean;      // New: View data from ALL shops (overrides assignment)
}

export interface User {
  username: string;
  name: string;
  role: UserRole;
  avatar?: string;
  password?: string; // Optional for transfer, strictly used in backend
  assignedShopIds?: number[]; // IDs of shops this user can access
  permissions?: UserPermissions;
}