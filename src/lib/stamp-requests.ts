import { Prisma } from "@prisma/client";

import { prisma } from "./db";
import { applyLoyaltyPurchase } from "./domain";

function isSerializableTransactionConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

export type CustomerStampRequestSnapshot = {
  id: string;
  customerId: string;
  customerName: string;
  memberId: number;
  createdAt: Date;
};

type CreateStampRequestResult =
  | {
      status: "CREATED" | "ALREADY_PENDING";
      request: CustomerStampRequestSnapshot;
    }
  | {
      status: "NOT_FOUND";
    };

export type ApproveStampRequestResult =
  | {
      status: "APPROVED";
      requestId: string;
      customerId: string;
      customerName: string;
      memberId: number;
      customerUserId: string;
      currentStampCount: number;
      lifetimeStampCount: number;
      availableFreeDrinks: number;
      rewardsCreated: number;
      rewardIds: string[];
    }
  | {
      status: "NOT_FOUND" | "ALREADY_HANDLED";
      customerId?: string;
    };

function toSnapshot(input: {
  id: string;
  customerId: string;
  createdAt: Date;
  customer: {
    fullName: string;
    memberId: number;
  };
}): CustomerStampRequestSnapshot {
  return {
    id: input.id,
    customerId: input.customerId,
    customerName: input.customer.fullName,
    memberId: input.customer.memberId,
    createdAt: input.createdAt,
  };
}

export async function createStampRequestForCustomer(
  customerId: string,
): Promise<CreateStampRequestResult> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const existing = await tx.stampRequest.findFirst({
            where: {
              customerId,
              status: "PENDING",
            },
            orderBy: {
              createdAt: "desc",
            },
            select: {
              id: true,
              customerId: true,
              createdAt: true,
              customer: {
                select: {
                  fullName: true,
                  memberId: true,
                },
              },
            },
          });

          if (existing) {
            return {
              status: "ALREADY_PENDING" as const,
              request: toSnapshot(existing),
            };
          }

          const customer = await tx.customerProfile.findUnique({
            where: { id: customerId },
            select: {
              id: true,
              fullName: true,
              memberId: true,
            },
          });

          if (!customer) {
            return {
              status: "NOT_FOUND" as const,
            };
          }

          const created = await tx.stampRequest.create({
            data: {
              customerId,
            },
            select: {
              id: true,
              customerId: true,
              createdAt: true,
              customer: {
                select: {
                  fullName: true,
                  memberId: true,
                },
              },
            },
          });

          return {
            status: "CREATED" as const,
            request: toSnapshot(created),
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (isSerializableTransactionConflict(error)) {
        continue;
      }

      throw error;
    }
  }

  const existing = await prisma.stampRequest.findFirst({
    where: {
      customerId,
      status: "PENDING",
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      customerId: true,
      createdAt: true,
      customer: {
        select: {
          fullName: true,
          memberId: true,
        },
      },
    },
  });

  if (existing) {
    return {
      status: "ALREADY_PENDING",
      request: toSnapshot(existing),
    };
  }

  return {
    status: "NOT_FOUND",
  };
}

export async function approveStampRequest(
  requestId: string,
  staffUserId: string,
): Promise<ApproveStampRequestResult> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const request = await tx.stampRequest.findUnique({
            where: {
              id: requestId,
            },
            select: {
              id: true,
              customerId: true,
              status: true,
              customer: {
                select: {
                  fullName: true,
                  memberId: true,
                  userId: true,
                  customerType: true,
                  loyaltyAccount: {
                    select: {
                      currentStampCount: true,
                      lifetimeStampCount: true,
                      availableFreeDrinks: true,
                    },
                  },
                },
              },
            },
          });

          if (!request) {
            return {
              status: "NOT_FOUND" as const,
            };
          }

          if (request.status !== "PENDING") {
            return {
              status: "ALREADY_HANDLED" as const,
              customerId: request.customerId,
            };
          }

          const claim = await tx.stampRequest.updateMany({
            where: {
              id: requestId,
              status: "PENDING",
            },
            data: {
              status: "APPROVED",
              resolvedAt: new Date(),
              resolvedByStaffUserId: staffUserId,
            },
          });

          if (claim.count !== 1) {
            return {
              status: "ALREADY_HANDLED" as const,
              customerId: request.customerId,
            };
          }

          const current = request.customer.loyaltyAccount ?? {
            currentStampCount: 0,
            lifetimeStampCount: 0,
            availableFreeDrinks: 0,
          };
          const loyaltyResult = applyLoyaltyPurchase({
            currentStampCount: current.currentStampCount,
            lifetimeStampCount: current.lifetimeStampCount,
            availableFreeDrinks: current.availableFreeDrinks,
            stampsEarned: 1,
          });

          if (request.customer.loyaltyAccount) {
            await tx.loyaltyAccount.update({
              where: {
                customerId: request.customerId,
              },
              data: {
                currentStampCount: loyaltyResult.currentStampCount,
                lifetimeStampCount: loyaltyResult.lifetimeStampCount,
                availableFreeDrinks: loyaltyResult.availableFreeDrinks,
              },
            });
          } else {
            await tx.loyaltyAccount.create({
              data: {
                customerId: request.customerId,
                currentStampCount: loyaltyResult.currentStampCount,
                lifetimeStampCount: loyaltyResult.lifetimeStampCount,
                availableFreeDrinks: loyaltyResult.availableFreeDrinks,
              },
            });
          }

          if (request.customer.customerType === "NEW") {
            await tx.customerProfile.update({
              where: { id: request.customerId },
              data: {
                customerType: "RETURNING",
              },
            });
          }

          const loyaltyEvent = await tx.loyaltyStampEvent.create({
            data: {
              customerId: request.customerId,
              orderId: null,
              type: "ADJUSTED",
              stampDelta: 1,
              notes: "Point fidélité validé depuis votre demande",
            },
            select: {
              id: true,
            },
          });

          const rewardIds: string[] = [];
          for (let index = 0; index < loyaltyResult.rewardsCreated; index += 1) {
            const reward = await tx.reward.create({
              data: {
                customerId: request.customerId,
                type: "FREE_DRINK",
                status: "AVAILABLE",
              },
              select: {
                id: true,
              },
            });
            rewardIds.push(reward.id);
          }

          await tx.stampRequest.update({
            where: { id: requestId },
            data: {
              loyaltyEventId: loyaltyEvent.id,
            },
          });

          return {
            status: "APPROVED" as const,
            requestId,
            customerId: request.customerId,
            customerName: request.customer.fullName,
            memberId: request.customer.memberId,
            customerUserId: request.customer.userId,
            currentStampCount: loyaltyResult.currentStampCount,
            lifetimeStampCount: loyaltyResult.lifetimeStampCount,
            availableFreeDrinks: loyaltyResult.availableFreeDrinks,
            rewardsCreated: loyaltyResult.rewardsCreated,
            rewardIds,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (isSerializableTransactionConflict(error)) {
        continue;
      }

      throw error;
    }
  }

  const existing = await prisma.stampRequest.findUnique({
    where: {
      id: requestId,
    },
    select: {
      customerId: true,
      status: true,
    },
  });

  if (!existing) {
    return {
      status: "NOT_FOUND",
    };
  }

  return {
    status: "ALREADY_HANDLED",
    customerId: existing.customerId,
  };
}
