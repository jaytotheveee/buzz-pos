"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { OrderItem } from "@/types";
import ProductSelector from "@/components/ProductSelector";
import MainNavigation from "@/components/MainNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function NewOrderPage() {
  const [, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const addToCart = (item: OrderItem) => {
    setCart((prevCart) => [...prevCart, item]);
  };

  const removeFromCart = (index: number) => {
    setCart((prevCart) => prevCart.filter((_, i) => i !== index));
  };

  const updateDrinkName = (index: number, name: string) => {
    setCart((prevCart) => {
      const updatedCart = [...prevCart];
      const trimmedName = name.trim();
      if (trimmedName) {
        updatedCart[index].drinkName = trimmedName;
      } else {
        delete updatedCart[index].drinkName;
      }
      return updatedCart;
    });
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      const addonTotal = item.addons.reduce(
        (sum, addon) => sum + addon.price,
        0
      );
      return total + (item.unitPrice + addonTotal) * item.quantity;
    }, 0);
  };

  const handleSubmitOrder = async () => {
    if (
      cart.length === 0 ||
      !customerName ||
      !customerPhone ||
      !customerAddress
    ) {
      toast.error("Please fill in all required fields and add items to cart");
      return;
    }

    setSubmitting(true);

    try {
      const subtotal = calculateTotal();
      const orderData = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        subtotal: subtotal,
        deliveryFee: 0,
        totalAmount: subtotal,
        status: "pending" as const,
        createdAt: Timestamp.now(),
        notes: notes.trim() || "",
        items: cart,
        statusHistory: [
          {
            status: "pending" as const,
            timestamp: Timestamp.now(),
          },
        ],
      };

      await addDoc(collection(db, "orders"), orderData);

      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      setNotes("");

      toast.success("Order created successfully!");
      router.push("/orders");
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Error creating order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold text-buzz-brown dark:text-buzz-cream">
            New Order
          </h1>
          <p className="text-muted-foreground mt-2">
            Create a new delivery order for a customer
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Selection */}
          <div>
            <ProductSelector onAddToCart={addToCart} />
          </div>

          {/* Order Summary and Customer Details */}
          <div className="space-y-6">
            {/* Cart */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No items in cart
                  </p>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item, index) => (
                      <div
                        key={index}
                        className="p-4 border rounded-lg space-y-4"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">
                              {item.productName}
                              {item.size === "large" && (
                                <Badge
                                  variant="outline"
                                  className="ml-2 text-xs"
                                >
                                  Large
                                </Badge>
                              )}
                            </p>
                            {item.addons.length > 0 && (
                              <p className="text-sm text-muted-foreground">
                                +{" "}
                                {item.addons
                                  .map((addon) => addon.name)
                                  .join(", ")}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold">
                              ₱
                              {(
                                item.unitPrice +
                                item.addons.reduce(
                                  (sum, addon) => sum + addon.price,
                                  0
                                )
                              ).toLocaleString()}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromCart(index)}
                              className="text-buzz-burgundy hover:text-buzz-burgundy/80"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor={`staff-drink-name-${index}`}
                            className="text-sm w-20"
                          >
                            Name:
                          </Label>
                          <Input
                            id={`staff-drink-name-${index}`}
                            value={item.drinkName || ""}
                            onChange={(e) =>
                              updateDrinkName(index, e.target.value)
                            }
                            placeholder="e.g., John"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    ))}

                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total:</span>
                        <span>₱{calculateTotal().toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Details */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Phone Number *</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="09XXXXXXXXX"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerAddress">Delivery Address *</Label>
                  <Input
                    id="customerAddress"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Full delivery address with landmarks"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Special Instructions (Optional)</Label>
                  <Input
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g., Extra hot, 2nd floor apartment"
                  />
                </div>

                <Button
                  onClick={handleSubmitOrder}
                  className="w-full"
                  size="lg"
                  disabled={
                    submitting ||
                    cart.length === 0 ||
                    !customerName ||
                    !customerPhone ||
                    !customerAddress
                  }
                >
                  {submitting
                    ? "Creating Order..."
                    : `Create Order - ₱${calculateTotal().toLocaleString()}`}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
