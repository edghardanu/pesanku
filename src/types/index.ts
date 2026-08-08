// ============================================================
//  src/types/index.ts
//  Shared TypeScript types untuk seluruh project Pesanku
// ============================================================

export interface SellerProfile {
  id?: string;
  storeName?: string | null;
  address?: string | null;
  category?: string | null;
  bankAccount?: string | null;
  logoUrl?: string | null;
  phone?: string | null;
  approvalStatus?: string | null;
}

export interface OrderItem {
  id: string;
  buyerId?: string;
  sellerId?: string;
  productId?: string;
  qty: number;
  totalPrice: number;
  status: string | null;
  notes?: string | null;
  createdAt?: string | Date | null;
  paymentProofUrl?: string | null;
  proofUrl?: string | null;
  deliveryProofUrl?: string | null;
  buyerName?: string;
  buyerPhone?: string | null;
  buyerAddress?: string | null;
  productName?: string;
  productPrice?: number;
  productImageUrl?: string | null;
}

export interface UmkmItem {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: string | null;
  storeName?: string | null;
  address?: string | null;
  category?: string | null;
  createdAt?: string | Date | null;
}

export interface TicketItem {
  id: string;
  category: string;
  customCategory?: string | null;
  notes: string;
  status: string;
  createdAt?: string | Date | null;
  userName?: string;
  userPhone?: string;
  userRole?: string;
}

export interface PayoutItem {
  id: string;
  storeName: string;
  rekening: string;
  diajukan: string;
  potongan: string;
  total: string;
}

export interface VerificationItem {
  id: string;
  pembeli: string;
  totalBayar: string;
  waktu: string;
}

export interface ChatMessage {
  id?: string;
  role?: string;
  sender?: string;
  text: string;
  time?: string;
  createdAt?: string | null;
  isRead?: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  address?: string | null;
  profileImageUrl?: string | null;
}

export interface ProductItem {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  description?: string | null;
  status?: string | null;
  stock?: number | null;
  currentQty?: number | null;
  preorderMinQty?: number | null;
  minQty?: number | null;
  minOrderQty?: number | null;
  maxOrderQty?: number | null;
  deadlineDate?: Date | string | null;
  processingTime?: string | null;
  batchCategory?: string | null;
  sellerId?: string;
  createdAt?: Date | string | null;
  storeName?: string | null;
  sellerName?: string | null;
  sellerAddress?: string | null;
  storeAddress?: string | null;
  sellerLogoUrl?: string | null;
  sellerAvatar?: string | null;
  totalSold?: number;
}

export interface BuyerOrderViewItem {
  orderId: string;
  qty: number;
  totalPrice: number;
  status: string | null;
  notes?: string | null;
  createdAt: string | Date | null;
  productName: string;
  productImageUrl?: string | null;
  storeName?: string | null;
  minQty?: number | null;
  maxQty?: number | null;
  stock?: number | null;
  currentQty?: number | null;
  processingTime?: string | null;
  paymentId?: string | null;
  paymentStatus?: string | null;
  deliveryProofUrl?: string | null;
}

export interface InvoiceOrder {
  id: string;
  status: string | null;
  qty: number;
  totalPrice: number;
  notes?: string | null;
  createdAt: string | Date | null;
  productName: string;
  productPrice: number;
  sellerName?: string | null;
  sellerAddress?: string | null;
  buyerName?: string | null;
  buyerEmail?: string | null;
  buyerPhone?: string | null;
  buyerAddress?: string | null;
}
