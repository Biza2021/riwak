import { Badge, Card } from "./ui";
import { orderStatusLabel, orderStatusTone } from "@/lib/presentation";
import type { OrderStatus } from "@/lib/domain";

const steps: OrderStatus[] = [
  "RECEIVED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "PICKED_UP",
];

export function OrderTimeline({ currentStatus }: { currentStatus: OrderStatus }) {
  const currentIndex = steps.indexOf(currentStatus);

  return (
    <Card className="space-y-3 p-4">
      <p className="text-sm font-semibold text-[#533728]">Suivi</p>
      <div className="space-y-2">
        {steps.map((status, index) => {
          const active = currentIndex >= index;
          return (
            <div
              key={status}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${
                active ? "bg-[#fff3d6]" : "bg-[#f7f1e8]"
              }`}
            >
              <div
                className={`h-3 w-3 rounded-full ${
                  active ? "bg-[#8c6239]" : "bg-[#d9c8b4]"
                }`}
              />
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#2d1b12]">
                  {orderStatusLabel(status)}
                </p>
              </div>
              <Badge tone={orderStatusTone(status)}>{index + 1}</Badge>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
