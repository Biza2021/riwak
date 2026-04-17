import { PrismaClient, type CustomerType, type OrderStatus } from "@prisma/client";

import { hashSecret } from "../src/lib/auth";
import { computeOrderExpiresAt, slugifyMenuName } from "../src/lib/domain";

const prisma = new PrismaClient();

type MenuSeed = {
  name: string;
  description: string;
  price: number;
  displayOrder: number;
  isActive?: boolean;
  isQualifying?: boolean;
  notesRequired?: boolean;
};

type CustomerSeed = {
  fullName: string;
  phoneNumber: string;
  loyaltyPin: string;
  isDemo?: boolean;
  customerType: CustomerType;
  trustReason?: string | null;
  limitedUntil?: Date | null;
  trustedUntil?: Date | null;
  currentStampCount: number;
  lifetimeStampCount: number;
  availableFreeDrinks: number;
};

type OrderSeed = {
  customerPhoneNumber: string;
  status: OrderStatus;
  itemSlug: string;
  quantity: number;
  pickupMinutes: number;
  placedMinutesAgo: number;
  notes?: string;
};

const menuSeeds: MenuSeed[] = [
  {
    name: "Express",
    description: "Service rapide, format court.",
    price: 12,
    displayOrder: 1,
  },
  {
    name: "Itali",
    description: "Classique dense et simple.",
    price: 14,
    displayOrder: 2,
  },
  {
    name: "Normal",
    description: "L’option standard du comptoir.",
    price: 10,
    displayOrder: 3,
  },
  {
    name: "Mousse Blanche",
    description: "Version douce avec mousse légère.",
    price: 16,
    displayOrder: 4,
  },
  {
    name: "Milke",
    description: "Texture plus douce, service rapide.",
    price: 18,
    displayOrder: 5,
  },
  {
    name: "Coffee",
    description: "Simple, direct, sans détour.",
    price: 8,
    displayOrder: 6,
  },
];

const customerSeeds: CustomerSeed[] = [
  {
    fullName: "Amina El Fassi",
    phoneNumber: "+212600000001",
    loyaltyPin: "111111",
    isDemo: true,
    customerType: "RETURNING",
    currentStampCount: 3,
    lifetimeStampCount: 3,
    availableFreeDrinks: 0,
  },
  {
    fullName: "Youssef Benali",
    phoneNumber: "+212600000002",
    loyaltyPin: "222222",
    isDemo: true,
    customerType: "TRUSTED",
    trustedUntil: null,
    trustReason: "Client régulier",
    currentStampCount: 4,
    lifetimeStampCount: 14,
    availableFreeDrinks: 2,
  },
  {
    fullName: "Salma Ait",
    phoneNumber: "+212600000003",
    loyaltyPin: "333333",
    isDemo: true,
    customerType: "LIMITED",
    limitedUntil: new Date(Date.now() + 72 * 60 * 60 * 1000),
    trustReason: "Limitation temporaire",
    currentStampCount: 0,
    lifetimeStampCount: 2,
    availableFreeDrinks: 0,
  },
  {
    fullName: "Omar Berrada",
    phoneNumber: "+212600000004",
    loyaltyPin: "444444",
    isDemo: true,
    customerType: "RETURNING",
    currentStampCount: 0,
    lifetimeStampCount: 5,
    availableFreeDrinks: 1,
  },
  {
    fullName: "Kenza Amani",
    phoneNumber: "+212600000005",
    loyaltyPin: "555555",
    isDemo: true,
    customerType: "RETURNING",
    currentStampCount: 2,
    lifetimeStampCount: 2,
    availableFreeDrinks: 0,
  },
  {
    fullName: "Anas Idrissi",
    phoneNumber: "+212600000006",
    loyaltyPin: "666666",
    isDemo: true,
    customerType: "RETURNING",
    currentStampCount: 1,
    lifetimeStampCount: 1,
    availableFreeDrinks: 0,
  },
];

const orderSeeds: OrderSeed[] = [
  {
    customerPhoneNumber: "+212600000001",
    status: "RECEIVED",
    itemSlug: "express",
    quantity: 1,
    pickupMinutes: 10,
    placedMinutesAgo: 7,
    notes: "Sans sucre",
  },
  {
    customerPhoneNumber: "+212600000002",
    status: "READY",
    itemSlug: "itali",
    quantity: 2,
    pickupMinutes: 15,
    placedMinutesAgo: 12,
    notes: "À emporter",
  },
  {
    customerPhoneNumber: "+212600000003",
    status: "PREPARING",
    itemSlug: "normal",
    quantity: 1,
    pickupMinutes: 20,
    placedMinutesAgo: 5,
    notes: "Petite tasse",
  },
  {
    customerPhoneNumber: "+212600000004",
    status: "PICKED_UP",
    itemSlug: "coffee",
    quantity: 1,
    pickupMinutes: 0,
    placedMinutesAgo: 35,
    notes: "Commande récupérée",
  },
  {
    customerPhoneNumber: "+212600000005",
    status: "ACCEPTED",
    itemSlug: "mousse-blanche",
    quantity: 1,
    pickupMinutes: 15,
    placedMinutesAgo: 9,
    notes: "Service calme",
  },
  {
    customerPhoneNumber: "+212600000006",
    status: "CANCELLED",
    itemSlug: "milke",
    quantity: 1,
    pickupMinutes: 20,
    placedMinutesAgo: 22,
    notes: "Annulée par le client",
  },
];

async function main() {
  await prisma.authSession.deleteMany();
  await prisma.customerTrustEvent.deleteMany();
  await prisma.loyaltyStampEvent.deleteMany();
  await prisma.reward.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.loyaltyAccount.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.staffUser.deleteMany();
  await prisma.customerProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.storeSettings.deleteMany();
  await prisma.$executeRawUnsafe(
    'ALTER SEQUENCE "CustomerProfile_memberId_seq" RESTART WITH 1',
  );

  await prisma.storeSettings.create({
    data: {
      storeName: "Riwak Coffee",
      pickupAddress: "Boutique principale, médina",
      activeOrderLimitPerCustomer: 1,
      unpaidOrderExpiryMinutes: 30,
      newCustomerMaxItems: 2,
      enableTrustedRegularFlag: true,
    },
  });

  const menuItems = await Promise.all(
    menuSeeds.map((item) =>
      prisma.menuItem.create({
        data: {
          ...item,
          slug: slugifyMenuName(item.name),
        },
      }),
    ),
  );

  const menuBySlug = new Map(menuItems.map((item) => [item.slug, item]));

  const staffPasswordHash = await hashSecret("Riwak123!");
  const adminPasswordHash = await hashSecret("Admin123!");

  await prisma.user.create({
    data: {
      role: "STAFF",
      staffUser: {
        create: {
          fullName: "Sara Barista",
          email: "staff@riwak.ma",
          passwordHash: staffPasswordHash,
          active: true,
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      role: "ADMIN",
      staffUser: {
        create: {
          fullName: "Mounir Owner",
          email: "admin@riwak.ma",
          passwordHash: adminPasswordHash,
          active: true,
        },
      },
    },
  });

  const customerRecords = new Map<
    string,
    {
      id: string;
      fullName: string;
      phoneNumber: string;
      customerType: CustomerType;
    }
  >();

  for (const customerSeed of customerSeeds) {
    const user = await prisma.user.create({
      data: {
        role: "CUSTOMER",
        customerProfile: {
          create: {
            fullName: customerSeed.fullName,
            phoneNumber: customerSeed.phoneNumber,
            loyaltyPin: customerSeed.loyaltyPin,
            isDemo: customerSeed.isDemo ?? false,
            customerType: customerSeed.customerType,
            trustReason: customerSeed.trustReason,
            limitedUntil: customerSeed.limitedUntil,
            trustedUntil: customerSeed.trustedUntil,
            loyaltyAccount: {
              create: {
                currentStampCount: customerSeed.currentStampCount,
                lifetimeStampCount: customerSeed.lifetimeStampCount,
                availableFreeDrinks: customerSeed.availableFreeDrinks,
              },
            },
          },
        },
      },
      include: {
        customerProfile: true,
      },
    });

    if (user.customerProfile) {
      customerRecords.set(customerSeed.phoneNumber, {
        id: user.customerProfile.id,
        fullName: user.customerProfile.fullName,
        phoneNumber: user.customerProfile.phoneNumber,
        customerType: user.customerProfile.customerType,
      });
    }
  }

  const now = new Date();

  const orderRecords = [];
  for (const orderSeed of orderSeeds) {
    const customer = customerRecords.get(orderSeed.customerPhoneNumber);
    const item = menuBySlug.get(orderSeed.itemSlug);

    if (!customer || !item) {
      continue;
    }

    const placedAt = new Date(now.getTime() - orderSeed.placedMinutesAgo * 60_000);
    const pickupTime = new Date(
      placedAt.getTime() + orderSeed.pickupMinutes * 60_000,
    );
    const expiresAt = computeOrderExpiresAt(placedAt, 30);
    const totalAmount = Number(item.price) * orderSeed.quantity;

    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        status: orderSeed.status,
        pickupTime,
        placedAt,
        expiresAt,
        totalAmount,
        isPaidAtShop: true,
        riskState: customer.customerType,
        itemCount: orderSeed.quantity,
        customerNameSnapshot: customer.fullName,
        customerPhoneSnapshot: customer.phoneNumber,
        customerTypeSnapshot: customer.customerType,
        notes: orderSeed.notes,
        loyaltyGrantedAt:
          orderSeed.status === "PICKED_UP" ? placedAt : null,
        orderItems: {
          create: {
            menuItemId: item.id,
            quantity: orderSeed.quantity,
            notes: orderSeed.notes,
            unitPrice: item.price,
          },
        },
      },
      include: {
        orderItems: true,
      },
    });

    orderRecords.push(order);
  }

  const omeOrder = orderRecords.find((order) => order.customerPhoneSnapshot === "+212600000004");

  await prisma.loyaltyStampEvent.createMany({
    data: [
      {
        customerId: customerRecords.get("+212600000001")!.id,
        orderId: null,
        type: "EARNED",
        stampDelta: 3,
        notes: "Seed: progression initiale",
      },
      {
        customerId: customerRecords.get("+212600000002")!.id,
        orderId: null,
        type: "EARNED",
        stampDelta: 4,
        notes: "Seed: progression initiale",
      },
      {
        customerId: customerRecords.get("+212600000002")!.id,
        orderId: null,
        type: "EARNED",
        stampDelta: 10,
        notes: "Seed: récompenses déjà accumulées",
      },
      {
        customerId: customerRecords.get("+212600000004")!.id,
        orderId: omeOrder?.id ?? null,
        type: "EARNED",
        stampDelta: 5,
        notes: "Commande récupérée",
      },
      {
        customerId: customerRecords.get("+212600000005")!.id,
        orderId: null,
        type: "EARNED",
        stampDelta: 2,
        notes: "Seed: progression initiale",
      },
      {
        customerId: customerRecords.get("+212600000006")!.id,
        orderId: null,
        type: "EARNED",
        stampDelta: 1,
        notes: "Seed: progression initiale",
      },
    ],
  });

  await prisma.reward.createMany({
    data: [
      {
        customerId: customerRecords.get("+212600000002")!.id,
        type: "FREE_DRINK",
        status: "AVAILABLE",
      },
      {
        customerId: customerRecords.get("+212600000002")!.id,
        type: "FREE_DRINK",
        status: "AVAILABLE",
      },
      {
        customerId: customerRecords.get("+212600000004")!.id,
        type: "FREE_DRINK",
        status: "AVAILABLE",
        sourceOrderId: omeOrder?.id ?? null,
      },
    ],
  });

  await prisma.customerTrustEvent.createMany({
    data: [
      {
        customerId: customerRecords.get("+212600000002")!.id,
        type: "TRUSTED",
        reason: "Client régulier",
      },
      {
        customerId: customerRecords.get("+212600000003")!.id,
        type: "LIMITED",
        reason: "Limitation temporaire",
        resolvedAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      },
    ],
  });

  console.log("Seed terminé.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
