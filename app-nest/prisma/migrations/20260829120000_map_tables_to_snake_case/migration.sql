-- Map every model to a snake_case, plural table name (@@map). No data change:
-- tables, their indexes / primary keys / unique constraints / foreign keys and
-- the SERIAL sequences are renamed in place so the schema stays drift-free.

-- Tables
ALTER TABLE "User" RENAME TO "users";
ALTER TABLE "Session" RENAME TO "sessions";
ALTER TABLE "Category" RENAME TO "categories";
ALTER TABLE "Manufacturer" RENAME TO "manufacturers";
ALTER TABLE "Product" RENAME TO "products";
ALTER TABLE "Order" RENAME TO "orders";
ALTER TABLE "OrderItem" RENAME TO "order_items";
ALTER TABLE "Post" RENAME TO "posts";

-- Primary keys / unique constraints / indexes (renaming the index also renames
-- the constraint backed by it for PRIMARY KEY / UNIQUE)
ALTER INDEX "User_pkey" RENAME TO "users_pkey";
ALTER INDEX "User_login_key" RENAME TO "users_login_key";
ALTER INDEX "User_email_key" RENAME TO "users_email_key";

ALTER INDEX "Session_pkey" RENAME TO "sessions_pkey";
ALTER INDEX "Session_tokenHash_key" RENAME TO "sessions_tokenHash_key";
ALTER INDEX "Session_userId_idx" RENAME TO "sessions_userId_idx";

ALTER INDEX "Category_pkey" RENAME TO "categories_pkey";
ALTER INDEX "Category_name_key" RENAME TO "categories_name_key";

ALTER INDEX "Manufacturer_pkey" RENAME TO "manufacturers_pkey";
ALTER INDEX "Manufacturer_name_key" RENAME TO "manufacturers_name_key";

ALTER INDEX "Product_pkey" RENAME TO "products_pkey";
ALTER INDEX "Product_code_key" RENAME TO "products_code_key";
ALTER INDEX "Product_ownerId_idx" RENAME TO "products_ownerId_idx";
ALTER INDEX "Product_categoryId_idx" RENAME TO "products_categoryId_idx";
ALTER INDEX "Product_manufacturerId_idx" RENAME TO "products_manufacturerId_idx";

ALTER INDEX "Order_pkey" RENAME TO "orders_pkey";
ALTER INDEX "Order_code_key" RENAME TO "orders_code_key";
ALTER INDEX "Order_customerId_idx" RENAME TO "orders_customerId_idx";
ALTER INDEX "Order_supplierId_idx" RENAME TO "orders_supplierId_idx";

ALTER INDEX "OrderItem_pkey" RENAME TO "order_items_pkey";
ALTER INDEX "OrderItem_orderId_idx" RENAME TO "order_items_orderId_idx";

ALTER INDEX "Post_pkey" RENAME TO "posts_pkey";

-- Foreign keys
ALTER TABLE "sessions" RENAME CONSTRAINT "Session_userId_fkey" TO "sessions_userId_fkey";
ALTER TABLE "products" RENAME CONSTRAINT "Product_categoryId_fkey" TO "products_categoryId_fkey";
ALTER TABLE "products" RENAME CONSTRAINT "Product_manufacturerId_fkey" TO "products_manufacturerId_fkey";
ALTER TABLE "products" RENAME CONSTRAINT "Product_ownerId_fkey" TO "products_ownerId_fkey";
ALTER TABLE "orders" RENAME CONSTRAINT "Order_customerId_fkey" TO "orders_customerId_fkey";
ALTER TABLE "orders" RENAME CONSTRAINT "Order_supplierId_fkey" TO "orders_supplierId_fkey";
ALTER TABLE "order_items" RENAME CONSTRAINT "OrderItem_orderId_fkey" TO "order_items_orderId_fkey";
ALTER TABLE "order_items" RENAME CONSTRAINT "OrderItem_productId_fkey" TO "order_items_productId_fkey";
ALTER TABLE "posts" RENAME CONSTRAINT "Post_authorId_fkey" TO "posts_authorId_fkey";

-- SERIAL sequences
ALTER SEQUENCE "User_id_seq" RENAME TO "users_id_seq";
ALTER SEQUENCE "Category_id_seq" RENAME TO "categories_id_seq";
ALTER SEQUENCE "Manufacturer_id_seq" RENAME TO "manufacturers_id_seq";
ALTER SEQUENCE "Product_id_seq" RENAME TO "products_id_seq";
ALTER SEQUENCE "Order_id_seq" RENAME TO "orders_id_seq";
ALTER SEQUENCE "OrderItem_id_seq" RENAME TO "order_items_id_seq";
ALTER SEQUENCE "Post_id_seq" RENAME TO "posts_id_seq";
