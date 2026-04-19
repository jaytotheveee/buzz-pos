"use client";

import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  Timestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import { markTokenAsUsed } from "@/lib/customer-tokens";
import { formatTrackingUrl } from "@/lib/order-tracking";
import { Product, Addon, OrderItem, CustomerToken, Category } from "@/types";
import { UPSIZE_PRICE, DrinkSize } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

interface CustomerOrderFormProps {
  tokenData: CustomerToken;
  onOrderSuccess: () => void;
}

export default function CustomerOrderForm({
  tokenData,
  onOrderSuccess,
}: CustomerOrderFormProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([]);
  const [selectedSize, setSelectedSize] = useState<DrinkSize>("regular");
  const [quantity, setQuantity] = useState(1);
  const [drinkNames, setDrinkNames] = useState<string[]>([""]);

  const selectedCategory = selectedProduct
    ? categories.find((c) => c.slug === selectedProduct.category)
    : undefined;

  const availableAddonsForSelected = selectedCategory?.hasAddons
    ? selectedCategory.allowedAddonIds === undefined
      ? addons
      : addons.filter((a) =>
          selectedCategory.allowedAddonIds!.includes(a.id)
        )
    : [];

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSelectedAddons([]);
    setSelectedSize("regular");
  };

  // Customer details form
  const [customerName, setCustomerName] = useState(
    tokenData.customerName || ""
  );
  const [customerPhone, setCustomerPhone] = useState(
    tokenData.customerPhone || ""
  );
  const [customerAddress, setCustomerAddress] = useState(
    tokenData.customerAddress || ""
  );
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [orderId, setOrderId] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const db = getFirebaseDb();

      // Fetch products, addons, and categories in parallel
      const [productsSnapshot, addonsSnapshot, categoriesSnapshot] = await Promise.all([
        getDocs(query(collection(db, "products"), where("available", "==", true))),
        getDocs(query(collection(db, "addons"), where("available", "==", true))),
        getDocs(collection(db, "categories"))
      ]);

      const productsData: Product[] = [];
      productsSnapshot.forEach((doc) => {
        productsData.push({ id: doc.id, ...doc.data() } as Product);
      });

      const addonsData: Addon[] = [];
      addonsSnapshot.forEach((doc) => {
        addonsData.push({ id: doc.id, ...doc.data() } as Addon);
      });

      const categoriesData: Category[] = [];
      categoriesSnapshot.forEach((doc) => {
        categoriesData.push({ id: doc.id, ...doc.data() } as Category);
      });

      setProducts(productsData);
      setAddons(addonsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error loading menu. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = () => {
    if (!selectedProduct) return;

    const upsize =
      selectedCategory?.hasSize && selectedSize === "large" ? UPSIZE_PRICE : 0;

    for (let i = 0; i < quantity; i++) {
      const item: Partial<OrderItem> = {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantity: 1,
        unitPrice: selectedProduct.basePrice + upsize,
        addons: selectedAddons.map((addon) => ({
          name: addon.name,
          price: addon.price,
        })),
      };

      if (selectedCategory?.hasSize) {
        item.size = selectedSize;
      }

      const drinkName = drinkNames[i]?.trim();
      if (drinkName) {
        item.drinkName = drinkName;
      }

      addItemToCart(item as OrderItem);
    }

    setSelectedProduct(null);
    setSelectedAddons([]);
    setSelectedSize("regular");
    setQuantity(1);
    setDrinkNames([""]);
    toast.success("Added to cart!");
  };

  const addItemToCart = (item: OrderItem) => {
    setCart((prevCart) => [...prevCart, item]);
  };

  const removeFromCart = (index: number) => {
    setCart((prevCart) => prevCart.filter((_, i) => i !== index));
    toast.success("Removed from cart");
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

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => {
      const addonTotal = item.addons.reduce(
        (sum, addon) => sum + addon.price,
        0
      );
      return total + (item.unitPrice + addonTotal) * item.quantity;
    }, 0);
  };

  const calculateItemTotal = () => {
    if (!selectedProduct) return 0;
    const addonTotal = selectedAddons.reduce(
      (sum, addon) => sum + addon.price,
      0
    );
    const upsize =
      selectedCategory?.hasSize && selectedSize === "large" ? UPSIZE_PRICE : 0;
    return (selectedProduct.basePrice + upsize + addonTotal) * quantity;
  };

  const toggleAddon = (addon: Addon) => {
    setSelectedAddons((prev) =>
      prev.find((a) => a.id === addon.id)
        ? prev.filter((a) => a.id !== addon.id)
        : [...prev, addon]
    );
  };

  const handleSubmitOrder = async () => {
    if (
      cart.length === 0 ||
      !customerName.trim() ||
      !customerPhone.trim() ||
      !customerAddress.trim()
    ) {
      toast.error("Please fill in all required fields and add items to cart");
      return;
    }

    setSubmitting(true);

    try {
      const db = getFirebaseDb();
      const subtotal = calculateSubtotal();

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

      const docRef = await addDoc(collection(db, "orders"), orderData);

      await markTokenAsUsed(tokenData.id, docRef.id);

      setOrderId(docRef.id);
      setOrderSubmitted(true);
      onOrderSuccess();

      toast.success("Order submitted successfully!");
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Error submitting order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (orderSubmitted) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <Card>
          <CardContent className="pt-8">
            <div className="flex justify-center mb-6">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Order Submitted Successfully!
            </h2>
            <p className="text-muted-foreground mb-6">
              Thank you for your order! We&apos;ll contact you shortly to
              confirm the details and final total including any delivery fees.
            </p>
            <div className="bg-muted p-4 rounded-lg mb-6">
              <p className="text-sm font-medium">
                Order ID: #{orderId.slice(-6)}
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                This link has now expired and cannot be used again.
              </p>
              <div className="bg-background p-3 rounded border">
                <p className="text-xs font-medium text-foreground mb-1">
                  Track your order:
                </p>
                <a
                  href={formatTrackingUrl(orderId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-buzz-orange break-all hover:underline"
                >
                  {formatTrackingUrl(orderId)}
                </a>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              For any questions, message us on Instagram @beanbuzzph
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Select Product</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-6">
                {Array.from({ length: 2 }).map((_, categoryIndex) => (
                  <div key={categoryIndex}>
                    <Skeleton className="h-6 w-32 mb-3" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1 flex-1">
                              <Skeleton className="h-4 w-24" />
                              <Skeleton className="h-3 w-32" />
                            </div>
                            <Skeleton className="h-4 w-12" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(
                  products.reduce((acc, product) => {
                    const category = product.category;
                    if (!acc[category]) {
                      acc[category] = [];
                    }
                    acc[category].push(product);
                    return acc;
                  }, {} as Record<string, typeof products>)
                ).map(([categorySlug, categoryProducts]) => (
                  <div key={categorySlug}>
                    <h3 className="text-lg font-semibold text-foreground mb-3">
                      {categories.find((c) => c.slug === categorySlug)?.name ||
                        categorySlug.replace("-", " ")}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {categoryProducts.map((product) => (
                        <div
                          key={product.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedProduct?.id === product.id
                              ? "border-buzz-orange bg-buzz-cream/20 dark:bg-buzz-brown/20"
                              : "border-border hover:border-muted-foreground"
                          }`}
                          onClick={() => handleSelectProduct(product)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium text-foreground">
                                {product.name}
                              </h4>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {product.description}
                              </p>
                            </div>
                            <span className="font-bold text-foreground ml-2">
                              ₱{product.basePrice}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedProduct && selectedCategory?.hasSize && (
          <Card>
            <CardHeader>
              <CardTitle>Size</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {(["regular", "large"] as const).map((size) => {
                  const price =
                    size === "large"
                      ? selectedProduct.basePrice + UPSIZE_PRICE
                      : selectedProduct.basePrice;
                  return (
                    <div
                      key={size}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedSize === size
                          ? "border-buzz-orange bg-buzz-cream/20 dark:bg-buzz-brown/20"
                          : "border-border hover:border-muted-foreground"
                      }`}
                      onClick={() => setSelectedSize(size)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-foreground capitalize">
                          {size}
                        </span>
                        <span className="font-bold text-foreground">
                          ₱{price}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {selectedProduct &&
          selectedCategory?.hasAddons &&
          availableAddonsForSelected.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Add-ons (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableAddonsForSelected.map((addon) => (
                    <div
                      key={addon.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedAddons.find((a) => a.id === addon.id)
                          ? "border-buzz-gold bg-buzz-cream/20 dark:bg-buzz-brown/20"
                          : "border-border hover:border-muted-foreground"
                      }`}
                      onClick={() => toggleAddon(addon)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {addon.name}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {addon.type}
                          </Badge>
                        </div>
                        <span className="font-bold text-foreground">
                          +₱{addon.price}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        {selectedProduct && (
          <Card>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-foreground">Quantity:</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newQty = Math.max(1, quantity - 1);
                        setQuantity(newQty);
                        setDrinkNames((prev) => prev.slice(0, newQty));
                      }}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center">{quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newQty = quantity + 1;
                        setQuantity(newQty);
                        setDrinkNames((prev) => [...prev, ""]);
                      }}
                    >
                      +
                    </Button>
                  </div>
                </div>

                {quantity > 0 && (
                  <div className="space-y-4">
                    <span className="text-foreground font-medium">
                      Drink Names (Optional):
                    </span>
                    <div className="space-y-3 pt-1">
                      {Array.from({ length: quantity }, (_, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Label className="text-sm w-16">
                            Drink {index + 1}:
                          </Label>
                          <Input
                            value={drinkNames[index] || ""}
                            onChange={(e) => {
                              const newNames = [...drinkNames];
                              newNames[index] = e.target.value;
                              setDrinkNames(newNames);
                            }}
                            placeholder="e.g., John, Mary"
                            className="flex-1"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-border pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-medium text-foreground">
                      Item Total:
                    </span>
                    <span className="text-xl font-bold text-foreground">
                      ₱{calculateItemTotal().toLocaleString()}
                    </span>
                  </div>

                  <Button onClick={addToCart} className="w-full" size="lg">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Cart
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Order</CardTitle>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No items in cart
              </p>
            ) : (
              <div className="space-y-4">
                {cart.map((item, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium">
                          {item.productName}
                          {item.size === "large" && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Large
                            </Badge>
                          )}
                        </p>
                        {item.addons.length > 0 && (
                          <p className="text-sm text-muted-foreground">
                            +{" "}
                            {item.addons.map((addon) => addon.name).join(", ")}
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
                          className="text-red-600 hover:text-red-600/80"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`drink-name-${index}`}
                        className="text-sm w-20"
                      >
                        Name:
                      </Label>
                      <Input
                        id={`drink-name-${index}`}
                        value={item.drinkName || ""}
                        onChange={(e) => updateDrinkName(index, e.target.value)}
                        placeholder="e.g., John"
                        className="flex-1"
                      />
                    </div>
                  </div>
                ))}

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Subtotal:</span>
                    <span>₱{calculateSubtotal().toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Delivery fees (if any) will be added after review
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="customerName">Full Name *</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerPhone">Contact Number *</Label>
              <Input
                id="customerPhone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="09XXXXXXXXX"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerAddress">Complete Address *</Label>
              <Input
                id="customerAddress"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Complete address with landmarks"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Special Instructions (Optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Extra hot, ground floor apartment"
              />
            </div>

            <Button
              onClick={handleSubmitOrder}
              className="w-full"
              size="lg"
              disabled={
                submitting ||
                cart.length === 0 ||
                !customerName.trim() ||
                !customerPhone.trim() ||
                !customerAddress.trim()
              }
            >
              {submitting
                ? "Submitting Order..."
                : `Submit Order - ₱${calculateSubtotal().toLocaleString()}`}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              By submitting, you agree that we may contact you to confirm order
              details and delivery fees.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
