"use client";

import { Order } from "@/types";
import { getEstimatedDeliveryMessage } from "@/lib/order-tracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import OrderStatusTimeline from "./OrderStatusTimeline";
import { MapPin, Phone, User, Clock, Receipt } from "lucide-react";

interface OrderTrackerProps {
  order: Order;
}

export default function OrderTracker({ order }: OrderTrackerProps) {
  const calculateSubtotal = () => {
    return order.items.reduce((total, item) => {
      const addonTotal = item.addons.reduce(
        (sum, addon) => sum + addon.price,
        0
      );
      return total + (item.unitPrice + addonTotal) * item.quantity;
    }, 0);
  };

  const subtotal = order.subtotal || calculateSubtotal();
  const deliveryFee = order.deliveryFee || 0;
  const totalAmount = subtotal + deliveryFee;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">
                Order #{order.id.slice(-6)}
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                Placed on {order.createdAt.toDate().toLocaleDateString()} at{" "}
                {order.createdAt.toDate().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <Badge variant="outline" className="text-sm">
              {order.status.replace("-", " ").toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 text-sm text-buzz-orange">
            <Clock className="h-4 w-4" />
            <span>{getEstimatedDeliveryMessage(order)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderStatusTimeline order={order} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{order.customerName}</span>
            </div>

            <div className="flex items-center space-x-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{order.customerPhone}</span>
            </div>

            <div className="flex items-start space-x-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span className="text-sm">{order.customerAddress}</span>
            </div>

            {order.notes && (
              <div className="mt-4 p-3 bg-buzz-cream/20 dark:bg-buzz-brown/20 rounded-lg">
                <p className="text-sm text-buzz-brown dark:text-buzz-cream">
                  <strong>Special Instructions:</strong> {order.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Receipt className="h-5 w-5" />
            <span>Order Items</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Add-ons</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item, index) => {
                const addonTotal = item.addons.reduce(
                  (sum, addon) => sum + addon.price,
                  0
                );
                const itemSubtotal =
                  (item.unitPrice + addonTotal) * item.quantity;

                return (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="font-medium">
                        {item.productName}
                        {item.size === "large" && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Large
                          </Badge>
                        )}
                        {item.drinkName && (
                          <span className="text-buzz-orange ml-2">
                            ({item.drinkName})
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>₱{item.unitPrice.toLocaleString()}</TableCell>
                    <TableCell>
                      {item.addons.length > 0 ? (
                        <div className="space-y-1">
                          {item.addons.map((addon, addonIndex) => (
                            <div key={addonIndex} className="text-sm">
                              <span>{addon.name}</span>
                              <span className="text-muted-foreground ml-2">
                                +₱{addon.price}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          No add-ons
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₱{itemSubtotal.toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="border-t mt-4 pt-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-lg">Subtotal:</span>
              <span className="text-lg font-medium">
                ₱{subtotal.toLocaleString()}
              </span>
            </div>
            {deliveryFee > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-lg">Delivery Fee:</span>
                <span className="text-lg font-medium">
                  ₱{deliveryFee.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center border-t pt-2">
              <span className="text-xl font-bold">Total Amount:</span>
              <span className="text-2xl font-bold text-green-600">
                ₱{totalAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            Need help with your order? Message us on Instagram{" "}
            <span className="font-medium">@beanbuzzph</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
