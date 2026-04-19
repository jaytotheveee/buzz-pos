"use client";

import { Order } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface OrderCardProps {
  order: Order;
  onStatusUpdate?: (orderId: string, newStatus: Order["status"]) => void;
}

export default function OrderCard({ order, onStatusUpdate }: OrderCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "preparing":
        return "bg-blue-500";
      case "ready":
        return "bg-green-500";
      case "out-for-delivery":
        return "bg-purple-500";
      case "delivered":
        return "bg-slate-500";
      default:
        return "bg-slate-500";
    }
  };

  const getNextStatus = (
    currentStatus: Order["status"]
  ): Order["status"] | null => {
    switch (currentStatus) {
      case "pending":
        return "preparing";
      case "preparing":
        return "ready";
      case "ready":
        return "out-for-delivery";
      case "out-for-delivery":
        return "delivered";
      case "delivered":
        return null;
      default:
        return null;
    }
  };

  const nextStatus = getNextStatus(order.status);

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{order.customerName}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {order.customerPhone}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {order.customerAddress}
            </p>
          </div>
          <div className="text-right">
            <Badge className={getStatusColor(order.status)}>
              {order.status.replace("-", " ")}
            </Badge>
            <p className="text-lg font-bold mt-2">₱{order.totalAmount}</p>
            <p className="text-xs text-muted-foreground">
              {order.createdAt.toDate().toLocaleString()}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2 mb-4">
          {order.items.map((item, index) => (
            <div
              key={index}
              className="flex justify-between items-center text-sm"
            >
              <div>
                <span className="font-medium">
                  {item.quantity}x {item.productName}
                  {item.size === "large" && (
                    <Badge variant="outline" className="ml-1 text-[10px]">
                      Large
                    </Badge>
                  )}
                  {item.drinkName && (
                    <span className="text-buzz-orange ml-1">
                      ({item.drinkName})
                    </span>
                  )}
                </span>
                {item.addons.length > 0 && (
                  <div className="text-xs text-muted-foreground ml-2">
                    + {item.addons.map((addon) => addon.name).join(", ")}
                  </div>
                )}
              </div>
              <span>
                ₱
                {item.unitPrice * item.quantity +
                  item.addons.reduce((sum, addon) => sum + addon.price, 0) *
                    item.quantity}
              </span>
            </div>
          ))}
        </div>

        {order.notes && (
          <div className="bg-muted p-3 rounded-md mb-4">
            <p className="text-sm text-foreground">
              <strong>Notes:</strong> {order.notes}
            </p>
          </div>
        )}

        {onStatusUpdate && nextStatus && (
          <Button
            onClick={() => onStatusUpdate(order.id, nextStatus)}
            className="w-full"
            variant={order.status === "delivered" ? "outline" : "default"}
          >
            {nextStatus === "preparing" && "Start Preparing"}
            {nextStatus === "ready" && "Mark Ready"}
            {nextStatus === "out-for-delivery" && "Out for Delivery"}
            {nextStatus === "delivered" && "Mark Delivered"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
