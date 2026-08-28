import { OrderStatus, PaymentStatus, PrismaClient, Product, Role } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import * as dotenv from 'dotenv'
import * as bcrypt from 'bcryptjs'

dotenv.config()

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL as string) })

const PASSWORD = '11111111'

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10)

  // --- Users ---------------------------------------------------------------
  const admin = await prisma.user.upsert({
    where: { login: 'admin' },
    update: {},
    create: {
      login: 'admin',
      email: 'admin@pharmacy.test',
      name: 'Platform Admin',
      passwordHash,
      role: Role.ADMIN,
      approved: true,
    },
  })

  const supplier1 = await prisma.user.upsert({
    where: { login: 'supplier1' },
    update: {},
    create: {
      login: 'supplier1',
      email: 'supplier1@pharmacy.test',
      name: 'Nordic Pharma Distribution',
      passwordHash,
      role: Role.SUPPLIER,
      approved: true,
    },
  })

  const supplier2 = await prisma.user.upsert({
    where: { login: 'supplier2' },
    update: {},
    create: {
      login: 'supplier2',
      email: 'supplier2@pharmacy.test',
      name: 'MediSource Wholesale',
      passwordHash,
      role: Role.SUPPLIER,
      approved: true,
    },
  })

  const customer1 = await prisma.user.upsert({
    where: { login: 'customer1' },
    update: {},
    create: {
      login: 'customer1',
      email: 'customer1@pharmacy.test',
      name: 'Downtown Pharmacy LLC',
      passwordHash,
      role: Role.CUSTOMER,
      approved: true,
      phone: '+1 555 100 2000',
      taxId: 'TAX-100200',
      managerName: 'Alice Reed',
      address: '14 Market Street, Springfield',
    },
  })

  await prisma.user.upsert({
    where: { login: 'customer2' },
    update: {},
    create: {
      login: 'customer2',
      email: 'customer2@pharmacy.test',
      name: 'Green Valley Drugstore',
      passwordHash,
      role: Role.CUSTOMER,
      approved: true,
      phone: '+1 555 300 4000',
      taxId: 'TAX-300400',
      managerName: 'Bob Carter',
      address: '9 Valley Road, Greenfield',
    },
  })

  await prisma.user.upsert({
    where: { login: 'customer3' },
    update: {},
    create: {
      login: 'customer3',
      email: 'customer3@pharmacy.test',
      name: 'Harbor Health Pharmacy',
      passwordHash,
      role: Role.CUSTOMER,
      approved: false, // left pending on purpose to demo the approval flow
      phone: '+1 555 500 6000',
      taxId: 'TAX-500600',
      managerName: 'Carol Nguyen',
      address: '2 Harbor Ave, Portside',
    },
  })

  // --- Categories & manufacturers ----------------------------------------
  const categoryNames = [
    'Analgesics',
    'Antibiotics',
    'Vitamins & Supplements',
    'Cardiovascular',
    'Dermatology',
    'First Aid',
  ]
  const manufacturerNames = ['Bayer', 'Pfizer', 'Novartis', 'Sandoz', 'Teva', 'GlaxoSmithKline']

  const categories = await Promise.all(
    categoryNames.map((name) => prisma.category.upsert({ where: { name }, update: {}, create: { name } })),
  )
  const manufacturers = await Promise.all(
    manufacturerNames.map((name) => prisma.manufacturer.upsert({ where: { name }, update: {}, create: { name } })),
  )

  // --- Products ---------------------------------------------------------
  const pick = <T>(arr: T[], i: number) => arr[i % arr.length]
  const productSpecs: Array<{ name: string; price: number; qty: number }> = [
    { name: 'Ibuprofen 200mg (100 tabs)', price: 8.5, qty: 320 },
    { name: 'Paracetamol 500mg (50 tabs)', price: 5.2, qty: 540 },
    { name: 'Amoxicillin 500mg (21 caps)', price: 14.9, qty: 120 },
    { name: 'Azithromycin 250mg (6 tabs)', price: 19.75, qty: 0 },
    { name: 'Vitamin D3 2000IU (90 caps)', price: 11.3, qty: 260 },
    { name: 'Vitamin C 1000mg (60 tabs)', price: 9.1, qty: 400 },
    { name: 'Omega-3 Fish Oil (120 caps)', price: 17.4, qty: 150 },
    { name: 'Atorvastatin 20mg (30 tabs)', price: 22.6, qty: 90 },
    { name: 'Amlodipine 5mg (30 tabs)', price: 12.0, qty: 110 },
    { name: 'Hydrocortisone Cream 1% (30g)', price: 6.75, qty: 210 },
    { name: 'Antiseptic Wound Spray (100ml)', price: 7.9, qty: 175 },
    { name: 'Adhesive Bandages (Box of 100)', price: 4.25, qty: 600 },
    { name: 'Aspirin 100mg (100 tabs)', price: 6.4, qty: 380 },
    { name: 'Cephalexin 500mg (20 caps)', price: 16.2, qty: 60 },
    { name: 'Magnesium Citrate (100 tabs)', price: 10.5, qty: 240 },
    { name: 'Metoprolol 50mg (30 tabs)', price: 13.8, qty: 0 },
    { name: 'Salicylic Acid Gel 2% (40g)', price: 8.95, qty: 130 },
    { name: 'Sterile Gauze Pads (25 pack)', price: 5.6, qty: 300 },
    { name: 'Loratadine 10mg (30 tabs)', price: 7.15, qty: 260 },
    { name: 'Ciprofloxacin 500mg (14 tabs)', price: 18.4, qty: 75 },
    { name: 'Zinc 50mg (100 tabs)', price: 8.2, qty: 190 },
    { name: 'Losartan 50mg (30 tabs)', price: 15.5, qty: 95 },
    { name: 'Calamine Lotion (120ml)', price: 5.95, qty: 160 },
    { name: 'Instant Cold Pack (10 pack)', price: 9.4, qty: 140 },
  ]

  const existingProducts = await prisma.product.count()
  const products: Product[] = []
  if (existingProducts === 0) {
    for (let i = 0; i < productSpecs.length; i++) {
      const spec = productSpecs[i]
      const owner = i % 2 === 0 ? supplier1 : supplier2
      products.push(
        await prisma.product.create({
          data: {
            name: spec.name,
            code: `SKU-${String(1000 + i)}`,
            price: spec.price,
            quantity: spec.qty,
            description: `${spec.name}. Wholesale pharmacy stock supplied by ${owner.name}.`,
            categoryId: pick(categories, i).id,
            manufacturerId: pick(manufacturers, i).id,
            ownerId: owner.id,
          },
        }),
      )
    }
  } else {
    products.push(...(await prisma.product.findMany()))
  }

  // --- Posts ----------------------------------------------------------
  if ((await prisma.post.count()) === 0) {
    await prisma.post.createMany({
      data: [
        {
          title: 'Welcome to the new ordering portal',
          content:
            'We have moved to a new platform. Browse the catalog, add items to your cart and place orders per supplier. Your account manager will follow up on delivery.',
          authorId: admin.id,
        },
        {
          title: 'Holiday delivery schedule',
          content:
            'Orders placed before noon on Fridays ship the same day. During public holidays, please allow one extra business day.',
          authorId: admin.id,
        },
        {
          title: 'New suppliers onboarded',
          content:
            'Nordic Pharma Distribution and MediSource Wholesale have expanded their catalogs with additional first-aid and cardiovascular lines.',
          authorId: admin.id,
        },
      ],
    })
  }

  // --- Sample orders ------------------------------------------------
  if ((await prisma.order.count()) === 0) {
    const s1Products = products.filter((p) => p.ownerId === supplier1.id).slice(0, 2)
    const s2Products = products.filter((p) => p.ownerId === supplier2.id).slice(0, 2)

    const mkItems = (rows: typeof products, qty: number) =>
      rows.map((p) => ({
        productId: p.id,
        quantity: qty,
        price: Number(p.price),
        totalPrice: Number((Number(p.price) * qty).toFixed(2)),
      }))

    const order1Items = mkItems(s1Products, 10)
    const order1 = await prisma.order.create({
      data: {
        code: 'TMP-1',
        customerId: customer1.id,
        supplierId: supplier1.id,
        status: OrderStatus.PROCESSING,
        paymentStatus: PaymentStatus.PAID,
        totalPrice: order1Items.reduce((s, i) => s + i.totalPrice, 0),
        note: 'Please deliver to the back entrance.',
        items: { create: order1Items },
      },
    })
    await prisma.order.update({
      where: { id: order1.id },
      data: { code: `${String(supplier1.id).padStart(3, '0')}-${String(order1.id).padStart(5, '0')}` },
    })

    const order2Items = mkItems(s2Products, 5)
    const order2 = await prisma.order.create({
      data: {
        code: 'TMP-2',
        customerId: customer1.id,
        supplierId: supplier2.id,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        totalPrice: order2Items.reduce((s, i) => s + i.totalPrice, 0),
        items: { create: order2Items },
      },
    })
    await prisma.order.update({
      where: { id: order2.id },
      data: { code: `${String(supplier2.id).padStart(3, '0')}-${String(order2.id).padStart(5, '0')}` },
    })
  }

  console.log('Seed complete. Logins (password "11111111"):')

  console.log('  admin / supplier1 / supplier2 / customer1 / customer2 / customer3 (pending)')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
