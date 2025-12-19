import { OrderResponse, OrderFilters, Order, Shop, AfterSale, DashboardStats, AfterSaleFilters, ProductStat, AppSettings, User } from '../types';

const BASE_URL = '/api';

// --- MOCK DATA FOR FALLBACK ---
const MOCK_SHOPS: Shop[] = [
  { id: 1, name: 'Nexus Shopify 美国站', companyName: 'Nexus Tech LLC', shopPassword: 'password123', note: '主营店铺' },
  { id: 2, name: 'Amazon 欧洲站', companyName: 'Global Trade Ltd', shopPassword: 'securepass', note: '电子产品类目' },
  { id: 3, name: 'Ebay 折扣店', companyName: 'Outlet Deals Inc', shopPassword: 'ebay2024', note: '清仓商品' },
];

let MOCK_SETTINGS: AppSettings = {
  overduePenalty: 5,
  overdueHours: 48,
  riskHours: 24,
  defaultPurchasePlatform: '拼多多',
  defaultShippingCost: 0 // Default shipping cost is 0
};

// Mutable Users List
let MOCK_USERS: User[] = [
  {
    username: 'admin',
    password: 'admin', 
    name: '超级管理员',
    role: 'admin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    assignedShopIds: [], 
    permissions: { manageOrders: true, viewDashboard: true, manageSettings: true, viewAllShops: true }
  },
  {
    username: 'user',
    password: 'user',
    name: '运营专员(演示)',
    role: 'user',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user',
    assignedShopIds: [1], // Only Shop 1
    permissions: { manageOrders: true, viewDashboard: true, manageSettings: false, viewAllShops: false }
  },
  {
    username: 'manager',
    password: 'manager',
    name: '店铺主管',
    role: 'user',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=manager',
    assignedShopIds: [1], 
    permissions: { manageOrders: true, viewDashboard: true, manageSettings: true, viewAllShops: true } // Can see everything despite assignment
  }
];

// Helper to generate dynamic dates relative to today
const getDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().replace('T', ' ').substring(0, 19);
};

const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-2024-001',
    buyer: 'Alice Smith',
    status: '待发货',
    contact: 'Alice',
    phone: '+1 555-0101',
    address: '123 Maple Ave, Springfield, IL',
    purchaseId: 'PDD-882930102',
    purchaseCost: 45.00,
    sellPrice: 120.00,
    shopName: 'Nexus Shopify 美国站',
    tag: 'blue',
    purchaseStatus: 'normal',
    orderTime: getDate(3), // Overdue (>48h)
    items: [{ name: '无线降噪耳机', spec: '黑色 / 主动降噪', price: 120.00, qty: 1, img: 'https://picsum.photos/seed/p1/100' }]
  },
  {
    id: 'ORD-2024-002',
    buyer: 'Bob Jones',
    status: '已发货',
    contact: 'Bob',
    phone: '+1 555-0102',
    address: '456 Oak Dr, Austin, TX',
    purchaseId: 'TB-12345678',
    purchaseCost: 20.00,
    sellPrice: 55.00,
    shopName: 'Amazon 欧洲站',
    tag: 'green',
    purchaseStatus: 'normal',
    orderTime: getDate(1), // Normal
    items: [{ name: '手机保护壳', spec: 'iPhone 15 / 透明', price: 55.00, qty: 1, img: 'https://picsum.photos/seed/p2/100' }]
  },
  {
    id: 'ORD-2024-003',
    buyer: 'Charlie Day',
    status: '售后中',
    contact: 'Charlie',
    phone: '+1 555-0103',
    address: '789 Pine Ln, Seattle, WA',
    purchaseId: '1688-99887766',
    purchaseCost: 80.00,
    sellPrice: 80.00,
    shopName: 'Ebay 折扣店',
    tag: 'red',
    purchaseStatus: 'increase',
    orderTime: getDate(4),
    items: [{ name: '机械键盘', spec: '青轴 / RGB背光', price: 80.00, qty: 1, img: 'https://picsum.photos/seed/p3/100' }]
  },
  {
    id: 'ORD-2024-004',
    buyer: 'Diana Prince',
    status: '已完成',
    contact: 'Diana',
    phone: '+1 555-0104',
    address: '101 Wonder Blvd, Metropolis, NY',
    purchaseId: 'DY-55667788',
    purchaseCost: 150.00,
    sellPrice: 300.00,
    shopName: 'Nexus Shopify 美国站',
    tag: 'purple',
    purchaseStatus: 'normal',
    orderTime: getDate(5),
    items: [{ name: '智能手表', spec: 'Series 9 / 银色', price: 300.00, qty: 1, img: 'https://picsum.photos/seed/p4/100' }]
  },
  {
    id: 'ORD-2024-005',
    buyer: 'Evan Stone',
    status: '待发货',
    contact: 'Evan',
    phone: '+1 555-0105',
    address: '202 Cedar St, Miami, FL',
    purchaseId: 'TB-87654321',
    purchaseCost: 25.00,
    sellPrice: 60.00,
    shopName: 'Nexus Shopify 美国站',
    tag: 'blue',
    orderTime: getDate(1.5), // Risk (>24h but <48h)
    items: [{ name: 'Type-C 数据线', spec: '2米 / 编织', price: 60.00, qty: 2, img: 'https://picsum.photos/seed/p5/100' }]
  },
  {
    id: 'ORD-2024-006',
    buyer: 'Fiona Gallagher',
    status: '已发货',
    contact: 'Fiona',
    phone: '+1 555-0106',
    address: '303 Birch Rd, Chicago, IL',
    purchaseId: 'PDD-11223344',
    purchaseCost: 100.00,
    sellPrice: 220.00,
    shopName: 'Amazon 欧洲站',
    orderTime: getDate(2),
    items: [{ name: '蓝牙音箱', spec: '防水 / 黑色', price: 220.00, qty: 1, img: 'https://picsum.photos/seed/p6/100' }]
  },
  {
    id: 'ORD-2024-007',
    buyer: 'George Lucas',
    status: '待发货',
    contact: 'George',
    phone: '+1 555-0107',
    address: '404 Error Way, Internet, CA',
    purchaseId: '',
    purchaseCost: 0,
    sellPrice: 45.00,
    shopName: 'Nexus Shopify 美国站',
    tag: 'orange',
    purchaseStatus: 'not_purchased', // Explicitly unpurchased
    orderTime: getDate(0.5),
    items: [{ name: 'USB-C 扩展坞', spec: '5合1', price: 45.00, qty: 1, img: 'https://picsum.photos/seed/p7/100' }]
  }
];

const MOCK_AFTERSALES: AfterSale[] = [
  {
    id: 101,
    order_id: 'ORD-2024-003',
    type: '退货退款',
    status: '处理中',
    refund_amount: 80.00,
    upstream_refund_amount: 75.00,
    upstream_status: '已同意',
    reason: '商品收到时已损坏',
    created_at: getDate(1),
    shopName: 'Ebay 折扣店',
    purchaseId: '1688-99887766'
  }
];

// Helper to delay response for realism
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to check if a user has access to a shop name
const hasShopAccess = (user: User | null, shopName: string): boolean => {
  if (!user) return false;
  if (user.role === 'admin' || user.permissions?.viewAllShops) return true;
  if (!user.assignedShopIds || user.assignedShopIds.length === 0) return false; 
  
  const shop = MOCK_SHOPS.find(s => s.name === shopName);
  if (!shop) return false;
  return user.assignedShopIds.includes(shop.id);
};

export const api = {
  async checkConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/stats`);
      return res.ok;
    } catch {
      console.warn("API Connection Failed - Switching to Mock Mode");
      return false;
    }
  },

  // --- AUTH API ---
  async login(username: string, password: string): Promise<User> {
    await delay(600);
    const user = MOCK_USERS.find(u => u.username === username);
    if (user && user.password === password) {
        const { password, ...safeUser } = user;
        // Simulate session storage
        localStorage.setItem('nexus_user', JSON.stringify(safeUser));
        return safeUser;
    }
    throw new Error('用户名或密码错误');
  },

  async logout(): Promise<void> {
    localStorage.removeItem('nexus_user');
    await delay(200);
  },

  getCurrentUser(): User | null {
    const stored = localStorage.getItem('nexus_user');
    return stored ? JSON.parse(stored) : null;
  },

  // --- USER MANAGEMENT API ---
  async getUsersByShop(shopId: number): Promise<User[]> {
    await delay(300);
    // Find users who have this shop ID in their assignments (excluding pure admins usually, but here we just list sub-users)
    return MOCK_USERS.filter(u => u.role === 'user' && u.assignedShopIds?.includes(shopId));
  },

  async saveUser(user: User): Promise<void> {
    await delay(400);
    // Check if user exists
    const existingIndex = MOCK_USERS.findIndex(u => u.username === user.username);
    if (existingIndex > -1) {
      // Update
      MOCK_USERS[existingIndex] = { ...MOCK_USERS[existingIndex], ...user };
    } else {
      // Create new
      MOCK_USERS.push({
        ...user,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`
      });
    }
  },

  async deleteUser(username: string): Promise<void> {
    await delay(300);
    MOCK_USERS = MOCK_USERS.filter(u => u.username !== username);
  },

  // --- SETTINGS API ---
  async getSettings(): Promise<AppSettings> {
    try {
      const res = await fetch(`${BASE_URL}/settings`);
      if (!res.ok) throw new Error("Fetch failed");
      return await res.json();
    } catch {
      await delay(200);
      return { ...MOCK_SETTINGS };
    }
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      const res = await fetch(`${BASE_URL}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (!res.ok) throw new Error("API Failed");
    } catch {
      console.log("Mock save settings:", settings);
      MOCK_SETTINGS = { ...settings };
      await delay(300);
    }
  },

  async getOrders(params: OrderFilters): Promise<OrderResponse> {
    const currentUser = api.getCurrentUser();

    try {
      const qs = new URLSearchParams({
        page: params.page.toString(),
        pageSize: params.pageSize.toString(),
        status: params.status,
        search: params.search,
        tag: params.tag,
        startDate: params.startDate,
        endDate: params.endDate,
        shopName: params.shopName || '',
        purchaseStatus: params.purchaseStatus || '',
        timeFilter: params.timeFilter || '',
        deepSearch: params.deepSearch ? '1' : '0'
      }).toString();
      const res = await fetch(`${BASE_URL}/orders?${qs}`);
      if (!res.ok) throw new Error("Fetch failed");
      return await res.json();
    } catch (e) {
      await delay(400);
      // Client-side filtering for mock data
      let filtered = [...MOCK_ORDERS];

      // Security: Filter by user's assigned shops UNLESS they have global view permission
      const hasGlobalAccess = currentUser?.role === 'admin' || currentUser?.permissions?.viewAllShops;
      
      if (currentUser && !hasGlobalAccess && currentUser.assignedShopIds) {
         filtered = filtered.filter(o => {
            const shop = MOCK_SHOPS.find(s => s.name === o.shopName);
            return shop && currentUser.assignedShopIds!.includes(shop.id);
         });
      }

      if (params.shopName) filtered = filtered.filter(o => o.shopName === params.shopName);
      if (params.status) filtered = filtered.filter(o => o.status === params.status);
      if (params.tag) filtered = filtered.filter(o => o.tag === params.tag);
      if (params.purchaseStatus) filtered = filtered.filter(o => o.purchaseStatus === params.purchaseStatus);
      if (params.search) {
        const query = params.search.trim().toLowerCase();
        const tokens = query.split(/\s+/).filter(Boolean);

        const matchToken = (o: any, t: string) => {
          // Field-specific search: id:xxx buyer:xxx phone:xxx addr:xxx item:xxx shop:xxx status:xxx
          const [maybeKey, ...rest] = t.split(':');
          const hasKey = rest.length > 0 && ['id','buyer','contact','phone','addr','address','item','shop','status','tag','purchase','logistics'].includes(maybeKey);
          const term = (hasKey ? rest.join(':') : t).trim();
          if (!term) return true;

          const includes = (v: any) => (v ?? '').toString().toLowerCase().includes(term);

          if (hasKey) {
            switch (maybeKey) {
              case 'id': return includes(o.id);
              case 'buyer': return includes(o.buyer);
              case 'contact': return includes(o.contact);
              case 'phone': return includes(o.phone);
              case 'addr':
              case 'address': return includes(o.address);
              case 'item':
                return (o.items || []).some((it: any) => includes(it.name) || includes(it.spec));
              case 'shop': return includes(o.shopName);
              case 'status': return includes(o.status);
              case 'tag': return includes(o.tag);
              case 'purchase':
                return includes(o.purchaseId) || includes(o.purchasePlatform) || includes(o.purchaseNote);
              case 'logistics':
                return includes(o.purchaseLogisticsId);
              default: return false;
            }
          }

          // Default mode: basic vs deep
          if (!params.deepSearch) {
            return includes(o.id) || includes(o.buyer) || includes(o.phone);
          }

          // Deep search: expand to more fields + item info
          return (
            includes(o.id) ||
            includes(o.buyer) ||
            includes(o.contact) ||
            includes(o.phone) ||
            includes(o.address) ||
            includes(o.status) ||
            includes(o.shopName) ||
            includes(o.tag) ||
            includes(o.purchaseId) ||
            includes(o.purchasePlatform) ||
            includes(o.purchaseLogisticsId) ||
            includes(o.purchaseNote) ||
            (o.items || []).some((it: any) => includes(it.name) || includes(it.spec))
          );
        };

        filtered = filtered.filter(o => tokens.every(t => matchToken(o, t)));
      }

      // Handle timeFilter (Mock Logic)
      if (params.timeFilter) {
        const now = new Date();
        filtered = filtered.filter(o => {
            // Time filter primarily applies to Pending Orders in this context, or all if not specified
            if (o.status !== '待发货') return false; 
            
            const orderDate = new Date(o.orderTime.replace(' ', 'T'));
            const diffMs = now.getTime() - orderDate.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);

            if (params.timeFilter === 'overdue') return diffHours > MOCK_SETTINGS.overdueHours;
            if (params.timeFilter === 'risk') return diffHours > MOCK_SETTINGS.riskHours && diffHours <= MOCK_SETTINGS.overdueHours;
            return true;
        });
      }

      return {
        items: filtered,
        total: filtered.length,
        page: params.page,
        pageSize: params.pageSize
      };
    }
  },

  async getOrder(id: string): Promise<Order | undefined> {
    try {
      const res = await fetch(`${BASE_URL}/orders?search=${id}`);
      if (!res.ok) throw new Error("Fetch failed");
      const data: OrderResponse = await res.json();
      return data.items.find(o => o.id === id);
    } catch {
      await delay(200);
      return MOCK_ORDERS.find(o => o.id === id);
    }
  },

  async saveOrder(order: Partial<Order>): Promise<void> {
    try {
      const res = await fetch(`${BASE_URL}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([order])
      });
      if (!res.ok) throw new Error("API Failed");
    } catch {
      console.log("Mock save order (Updating in-memory):", order);
      if (order.id) {
        const index = MOCK_ORDERS.findIndex(o => o.id === order.id);
        if (index !== -1) {
          MOCK_ORDERS[index] = { ...MOCK_ORDERS[index], ...order };
        }
      }
      await delay(300);
    }
  },

  async updateOrderTag(orderId: string, tag: string): Promise<void> {
     try {
       const res = await fetch(`${BASE_URL}/orders/${orderId}/tag`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ tag })
       });
       if (!res.ok) throw new Error("API Failed");
     } catch {
        console.log("Mock update tag:", orderId, tag);
        const index = MOCK_ORDERS.findIndex(o => o.id === orderId);
        if (index !== -1) {
           MOCK_ORDERS[index] = { ...MOCK_ORDERS[index], tag };
        }
        await delay(200);
     }
  },

  async deleteOrder(id: string): Promise<void> {
    try {
      const res = await fetch(`${BASE_URL}/orders/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("API Failed");
    } catch {
      console.log("Mock delete order:", id);
      const idx = MOCK_ORDERS.findIndex(o => o.id === id);
      if (idx > -1) MOCK_ORDERS.splice(idx, 1);
      await delay(300);
    }
  },

  async getShops(): Promise<Shop[]> {
    try {
      const res = await fetch(`${BASE_URL}/shops`);
      if (!res.ok) throw new Error("Failed to fetch shops");
      return await res.json();
    } catch (e) {
      console.warn("Using Mock Shops due to API error");
      await delay(300);
      
      const currentUser = api.getCurrentUser();
      const hasGlobalAccess = currentUser?.role === 'admin' || currentUser?.permissions?.viewAllShops;

      // Filter shops for dropdowns/management
      if (currentUser && !hasGlobalAccess && currentUser.assignedShopIds) {
          return MOCK_SHOPS.filter(s => currentUser.assignedShopIds!.includes(s.id));
      }
      return [...MOCK_SHOPS];
    }
  },

  async saveShop(shop: Partial<Shop>): Promise<void> {
    try {
      const url = shop.id ? `${BASE_URL}/shops/${shop.id}` : `${BASE_URL}/shops`;
      const method = shop.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shop)
      });
      if (!res.ok) throw new Error("API Failed");
    } catch {
      console.log("Mock save shop:", shop);
      if (shop.id) {
        const idx = MOCK_SHOPS.findIndex(s => s.id === shop.id);
        if (idx > -1) MOCK_SHOPS[idx] = { ...MOCK_SHOPS[idx], ...shop };
      } else {
        const newId = Math.max(0, ...MOCK_SHOPS.map(s => s.id)) + 1;
        MOCK_SHOPS.push({ ...shop, id: newId } as Shop);
      }
    }
  },

  async deleteShop(id: number): Promise<void> {
    try {
      const res = await fetch(`${BASE_URL}/shops/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("API Failed");
    } catch {
      console.log("Mock delete shop:", id);
      const idx = MOCK_SHOPS.findIndex(s => s.id === id);
      if (idx > -1) MOCK_SHOPS.splice(idx, 1);
    }
  },

  async getAfterSales(filters?: AfterSaleFilters): Promise<AfterSale[]> {
    const currentUser = api.getCurrentUser();

    try {
      const qs = filters ? '?' + new URLSearchParams(filters as any).toString() : '';
      const res = await fetch(`${BASE_URL}/aftersales${qs}`);
      if (!res.ok) throw new Error("Fetch failed");
      return await res.json();
    } catch {
      await delay(300);
      let result = MOCK_AFTERSALES.map(as => {
         const order = MOCK_ORDERS.find(o => o.id === as.order_id);
         return { ...as, tag: order?.tag || '', purchaseStatus: order?.purchaseStatus || '' };
      });

      // Security Filter for AfterSales (Requirement 2)
      const hasGlobalAccess = currentUser?.role === 'admin' || currentUser?.permissions?.viewAllShops;
      
      if (currentUser && !hasGlobalAccess && currentUser.assignedShopIds) {
         result = result.filter(as => {
            // Find shop name from order or directly from aftersale record
            // MOCK_AFTERSALES usually has shopName populated
            const shopName = as.shopName;
            if (!shopName) return false;
            const shop = MOCK_SHOPS.find(s => s.name === shopName);
            return shop && currentUser.assignedShopIds!.includes(shop.id);
         });
      }

      if (filters) {
        if (filters.shopName) result = result.filter(a => a.shopName === filters.shopName);
        if (filters.status) result = result.filter(a => a.status === filters.status);
        if (filters.type) result = result.filter(a => a.type === filters.type);
        if (filters.tag) result = result.filter(a => a.tag === filters.tag);
        if (filters.purchaseStatus) result = result.filter(a => a.purchaseStatus === filters.purchaseStatus);
        if (filters.search) {
           const low = filters.search.toLowerCase();
           result = result.filter(a => 
             a.order_id.toLowerCase().includes(low) || 
             (a.purchaseId && a.purchaseId.toLowerCase().includes(low)) ||
             a.reason.toLowerCase().includes(low) ||
             (a.shopName && a.shopName.toLowerCase().includes(low))
           );
        }
      }
      return result;
    }
  },

  async saveAfterSale(data: Partial<AfterSale>): Promise<void> {
    try {
      const url = data.id ? `${BASE_URL}/aftersales/${data.id}` : `${BASE_URL}/aftersales`;
      const method = data.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("API Failed");
    } catch {
      console.log("Mock save aftersale:", data);
      if (data.id) {
         const idx = MOCK_AFTERSALES.findIndex(a => a.id === data.id);
         if (idx > -1) MOCK_AFTERSALES[idx] = { ...MOCK_AFTERSALES[idx], ...data };
      } else {
        const newId = Math.max(0, ...MOCK_AFTERSALES.map(a => a.id)) + 1;
        MOCK_AFTERSALES.push({ ...data, id: newId } as AfterSale);
      }
    }
  },

  async deleteAfterSale(id: number): Promise<void> {
    try {
      const res = await fetch(`${BASE_URL}/aftersales/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("API Failed");
    } catch {
      console.log("Mock delete aftersale:", id);
      const idx = MOCK_AFTERSALES.findIndex(a => a.id === id);
      if (idx > -1) MOCK_AFTERSALES.splice(idx, 1);
    }
  },

  // Dynamically calculate stats based on MOCK_ORDERS to support filtering
  async getDashboardStats(shopName?: string): Promise<DashboardStats> {
    const currentUser = api.getCurrentUser();

    try {
      const qs = shopName ? `?shopName=${encodeURIComponent(shopName)}` : '';
      const res = await fetch(`${BASE_URL}/dashboard/stats${qs}`);
      if (!res.ok) throw new Error("Fetch failed");
      return await res.json();
    } catch {
      await delay(400);
      
      // 1. Filter Orders
      let orders = [...MOCK_ORDERS];
      let afterSales = [...MOCK_AFTERSALES];

      // Security Filter for Dashboard Stats
      const hasGlobalAccess = currentUser?.role === 'admin' || currentUser?.permissions?.viewAllShops;

      if (currentUser && !hasGlobalAccess && currentUser.assignedShopIds) {
         orders = orders.filter(o => {
            const shop = MOCK_SHOPS.find(s => s.name === o.shopName);
            return shop && currentUser.assignedShopIds!.includes(shop.id);
         });
         // Also filter aftersales if needed, though they follow orders
      }
      
      if (shopName) {
        orders = orders.filter(o => o.shopName === shopName);
        afterSales = afterSales.filter(a => a.shopName === shopName);
      }

      const now = new Date();
      
      // 2. Helper to calculate single order profit including Penalty using MOCK_SETTINGS
      const calculateOrderProfit = (o: Order) => {
          let p = o.sellPrice - (o.purchaseCost || 0);
          
          // Deduct Global Default Shipping Cost
          p -= (MOCK_SETTINGS.defaultShippingCost || 0);

          // Apply penalty for overdue orders
          if (o.status === '待发货') {
             const orderDate = new Date(o.orderTime.replace(' ', 'T'));
             const diffHours = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
             if (diffHours > MOCK_SETTINGS.overdueHours) {
                 p -= MOCK_SETTINGS.overduePenalty; 
             }
          }
          return p;
      };

      // 3. Calculate Aggregates
      const total_orders = orders.length;
      const total_sales = orders.reduce((sum, o) => sum + o.sellPrice, 0);
      const total_cost = orders.reduce((sum, o) => sum + (o.purchaseCost || 0), 0);
      
      // Calculate Net Profit considering penalty
      const net_profit = orders.reduce((sum, o) => sum + calculateOrderProfit(o), 0);
      
      const profit_margin = total_sales > 0 ? (net_profit / total_sales) * 100 : 0;
      
      const pending_ship = orders.filter(o => o.status === '待发货').length;
      const refund_rate = total_orders > 0 ? (afterSales.length / total_orders) * 100 : 0;

      // 4. Calculate Timeout/Risk/Unpurchased metrics
      let overdue_orders = 0;
      let timeout_risk = 0;
      let unpurchased_orders = 0;

      orders.forEach(o => {
          if (o.status === '待发货') {
             const orderDate = new Date(o.orderTime.replace(' ', 'T'));
             const diffMs = now.getTime() - orderDate.getTime();
             const diffHours = diffMs / (1000 * 60 * 60);
             
             if (diffHours > MOCK_SETTINGS.overdueHours) {
                 overdue_orders++;
             } else if (diffHours > MOCK_SETTINGS.riskHours) {
                 timeout_risk++;
             }

             const isPurchased = o.purchaseStatus === 'increase' || o.purchaseStatus === 'decrease' || 
                                 o.purchaseStatus === 'normal' || (o.purchaseId && String(o.purchaseId).trim().length > 0);
             
             if (!isPurchased || o.purchaseStatus === 'not_purchased') {
                 unpurchased_orders++;
             }
          }
      });

      // 5. Calculate Daily Trend
      const trendMap = new Map<string, {orders: number, sales: number, cost: number, profit: number, refunds: number}>();
      const today = new Date();
      for (let i = 4; i >= 0; i--) {
         const d = new Date(today);
         d.setDate(d.getDate() - i);
         const dateStr = d.toISOString().substring(0, 10);
         trendMap.set(dateStr, {orders: 0, sales: 0, cost: 0, profit: 0, refunds: 0});
      }

      orders.forEach(o => {
          const date = o.orderTime.substring(0, 10);
          if (trendMap.has(date)) {
              const curr = trendMap.get(date)!;
              const profit = calculateOrderProfit(o);
              
              trendMap.set(date, {
                  ...curr,
                  orders: curr.orders + 1,
                  sales: curr.sales + o.sellPrice,
                  cost: curr.cost + (o.purchaseCost || 0),
                  profit: curr.profit + profit
              });
          }
      });
      
      afterSales.forEach(a => {
        const date = a.created_at.substring(0, 10);
        if (trendMap.has(date)) {
            const curr = trendMap.get(date)!;
            trendMap.set(date, {
                ...curr,
                refunds: (curr.refunds || 0) + 1
            });
        }
      });

      const daily_trend = Array.from(trendMap.entries())
         .sort((a, b) => a[0].localeCompare(b[0]))
         .map(([date, val]) => ({ date, ...val }));

      // 6. Calculate Shop Ranking
      let shop_ranking = MOCK_SHOPS.map(shop => {
           // Filter check for shop ranking visibility (Only include if user has access)
           // If user doesn't have global access AND shop is not assigned, skip
           if (currentUser && !hasGlobalAccess && currentUser.assignedShopIds && !currentUser.assignedShopIds.includes(shop.id)) {
               return null;
           }

           const shopOrders = MOCK_ORDERS.filter(o => o.shopName === shop.name);
           const profit = shopOrders.reduce((acc, o) => acc + calculateOrderProfit(o), 0);
           return {
               shopName: shop.name,
               count: shopOrders.length,
               gross_profit: profit
           };
      }).filter(Boolean) as Array<{shopName: string; count: number; gross_profit: number}>;
      
      shop_ranking.sort((a, b) => b.gross_profit - a.gross_profit);
      
      if (shopName) {
          shop_ranking = shop_ranking.filter(s => s.shopName === shopName);
      }

      // 7. Calculate Best Sellers
      const productMap = new Map<string, ProductStat>();
      orders.forEach(o => {
          o.items.forEach(item => {
              if (productMap.has(item.name)) {
                  const p = productMap.get(item.name)!;
                  p.sales += item.qty;
                  p.revenue += (item.price * item.qty);
              } else {
                  productMap.set(item.name, {
                      name: item.name,
                      img: item.img,
                      sales: item.qty,
                      revenue: item.price * item.qty,
                      trend: 'flat'
                  });
              }
          });
      });
      const best_sellers = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue);

      // 8. Calculate Platform Distribution
      const platformCounts: Record<string, number> = {};
      orders.forEach(o => {
        const shop = MOCK_SHOPS.find(s => s.name === o.shopName);
        // Fallback platform string if platform key is removed, but we still have platform data distribution logic. 
        // We might want to remove this chart or just use 'Unknown' if we deleted platform from Shop type.
        // Or assume "platform" is implicit from shop name for now.
        const platform = 'Store'; 
        platformCounts[platform] = (platformCounts[platform] || 0) + 1;
      });
      
      const platform_distribution = Object.entries(platformCounts).map(([name, count]) => ({
        name,
        value: Math.round((count / (orders.length || 1)) * 100)
      }));

      return {
        kpi: {
            total_orders,
            orders_growth: Math.floor(Math.random() * 20) - 5,
            total_sales,
            sales_growth: Math.floor(Math.random() * 20) - 5,
            total_cost,
            cost_growth: Math.floor(Math.random() * 20) - 5,
            net_profit,
            profit_growth: Math.floor(Math.random() * 20) - 5,
            profit_margin,
            margin_growth: Math.floor(Math.random() * 10) - 3,
            pending_ship,
            refund_rate,
            refund_growth: 0,
            overdue_orders,
            timeout_risk,
            unpurchased_orders
        },
        daily_trend,
        shop_ranking,
        best_sellers,
        platform_distribution
      };
    }
  }
};