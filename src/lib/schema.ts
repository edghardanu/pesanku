import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Global System Settings
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'penjual', 'pembeli'] }).notNull(),
  status: text('status', { enum: ['active', 'inactive', 'pending'] }).default('active'),
  address: text('address'),
  profileImageUrl: text('profile_image_url'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

// Seller Profile table
export const sellerProfiles = sqliteTable('seller_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  storeName: text('store_name').notNull(),
  address: text('address'),
  category: text('category'),
  bankAccount: text('bank_account'),
  logoUrl: text('logo_url'),
  description: text('description'),
  approvalStatus: text('approval_status', { enum: ['pending', 'approved', 'rejected'] }).default('pending'),
});

// Product table
export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  sellerId: text('seller_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  description: text('description'),
  price: integer('price').notNull(),
  imageUrl: text('image_url'),
  preorderMinQty: integer('preorder_min_qty').default(10),
  currentQty: integer('current_qty').default(0),
  stock: integer('stock').default(0),
  minOrderQty: integer('min_order_qty').default(1),
  maxOrderQty: integer('max_order_qty'),
  processingTime: text('processing_time'),
  batchCategory: text('batch_category'),
  variantsJson: text('variants_json'),
  deadlineDate: integer('deadline_date', { mode: 'timestamp' }),
  status: text('status', { enum: ['draft', 'active', 'quota_reached', 'closed', 'processing', 'completed'] }).default('draft'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

// Promotion packages created by admins and offered to sellers.
export const promotionOffers = sqliteTable('promotion_offers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  price: integer('price').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

// A seller chooses one product and requests placement in the promoted catalogue.
export const productPromotions = sqliteTable('product_promotions', {
  id: text('id').primaryKey(),
  promotionId: text('promotion_id').notNull().references(() => promotionOffers.id),
  productId: text('product_id').notNull().references(() => products.id),
  sellerId: text('seller_id').notNull().references(() => users.id),
  status: text('status', { enum: ['pending', 'approved', 'rejected', 'cancelled'] }).default('pending'),
  requestedAt: integer('requested_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
  reviewedBy: text('reviewed_by').references(() => users.id),
});

// Orders table
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id),
  buyerId: text('buyer_id').notNull().references(() => users.id),
  qty: integer('qty').notNull(),
  totalPrice: integer('total_price').notNull(),
  notes: text('notes'),
  selectedVariant: text('selected_variant'),
  selectedVariantPrice: integer('selected_variant_price'),
  adminSplitAmount: integer('admin_split_amount'),
  sellerSplitAmount: integer('seller_split_amount'),
  status: text('status', { enum: ['waiting_verification', 'verified', 'preorder_running', 'failed', 'processing', 'completed', 'cancelled', 'chat_only'] }).default('waiting_verification'),
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  deliveryProofUrl: text('delivery_proof_url'),
  dispatchReceiptUrl: text('dispatch_receipt_url'),
  deliveryDate: text('delivery_date'),
  deliveryAddress: text('delivery_address'),
  cancelReason: text('cancel_reason'),
  rating: integer('rating'),
  ratedAt: integer('rated_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

// Payments table
export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id),
  proofUrl: text('proof_url').notNull(),
  verificationStatus: text('verification_status', { enum: ['pending', 'approved', 'rejected'] }).default('pending'),
  verifiedBy: text('verified_by').references(() => users.id),
  verifiedAt: integer('verified_at', { mode: 'timestamp' }),
});

// Admin QRIS table
export const adminQris = sqliteTable('admin_qris', {
  id: text('id').primaryKey(),
  imageUrl: text('image_url').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

// Seller Balance
export const sellerBalances = sqliteTable('seller_balances', {
  id: text('id').primaryKey(),
  sellerId: text('seller_id').notNull().references(() => users.id),
  retainedBalance: integer('retained_balance').default(0), // Saldo tertahan
  availableBalance: integer('available_balance').default(0), // Saldo yang bisa ditarik
});

// Payouts
export const payouts = sqliteTable('payouts', {
  id: text('id').primaryKey(),
  sellerId: text('seller_id').notNull().references(() => users.id),
  amountRequested: integer('amount_requested').notNull(),
  appFee: integer('app_fee').default(1500),
  adminFee: integer('admin_fee').default(2500),
  serviceFee: integer('service_fee').default(5000),
  totalDeduction: integer('total_deduction').default(9000),
  netAmount: integer('net_amount').notNull(),
  status: text('status', { enum: ['pending', 'processed', 'failed'] }).default('pending'),
  processedBy: text('processed_by').references(() => users.id),
  processedAt: integer('processed_at', { mode: 'timestamp' }),
});

// Chat Messages
export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id),
  senderId: text('sender_id').notNull().references(() => users.id),
  text: text('text').notNull(),
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

// Tickets / Reports
export const tickets = sqliteTable('tickets', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  category: text('category').notNull(),
  customCategory: text('custom_category'),
  notes: text('notes').notNull(),
  status: text('status', { enum: ['open', 'in_progress', 'resolved', 'closed'] }).default('open'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

