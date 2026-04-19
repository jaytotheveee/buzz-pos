"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import { Order, Product, Addon, OrderItem } from "@/types";
import ProtectedRoute from "@/components/ProtectedRoute";
import MainNavigation from "@/components/MainNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ConfirmModal from "@/components/ConfirmModal";
import GenerateCustomerLinkModal from "@/components/GenerateCustomerLinkModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Eye, UserPlus, Copy } from "lucide-react";
import { toast } from "sonner";
import { formatTrackingUrl } from "@/lib/order-tracking";

function OrdersContent() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(10);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (statusFilter === "all") {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(
        orders.filter((order) => order.status === statusFilter)
      );
    }
  }, [orders, statusFilter]);

  const fetchOrders = async () => {
    try {
      const db = getFirebaseDb();
      const ordersQuery = query(
        collection(db, "orders"),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(ordersQuery);
      const ordersData: Order[] = [];

      querySnapshot.forEach((doc) => {
        ordersData.push({ id: doc.id, ...doc.data() } as Order);
      });

      setOrders(ordersData);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (
    orderId: string,
    newStatus: Order["status"]
  ) => {
    try {
      const db = getFirebaseDb();
      const orderRef = doc(db, "orders", orderId);

      const currentOrder = orders.find((order) => order.id === orderId);
      const statusHistory = currentOrder?.statusHistory || [];

      const newStatusChange = {
        status: newStatus,
        timestamp: Timestamp.now(),
      };

      await updateDoc(orderRef, {
        status: newStatus,
        statusHistory: [...statusHistory, newStatusChange],
      });

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: newStatus,
                statusHistory: [...statusHistory, newStatusChange],
              }
            : order
        )
      );
      toast.success(`Order status updated to ${newStatus.replace("-", " ")}`);
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Error updating order status. Please try again.");
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const db = getFirebaseDb();
      const orderRef = doc(db, "orders", orderId);
      await deleteDoc(orderRef);

      setOrders((prevOrders) =>
        prevOrders.filter((order) => order.id !== orderId)
      );
      toast.success("Order deleted successfully");
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("Error deleting order. Please try again.");
    }
  };

  const handleCopyTrackingLink = (orderId: string) => {
    const trackingUrl = formatTrackingUrl(orderId);
    navigator.clipboard
      .writeText(trackingUrl)
      .then(() => {
        toast.success("Tracking link copied to clipboard");
      })
      .catch(() => {
        toast.error("Failed to copy tracking link");
      });
  };

  const getStatusCounts = () => {
    const counts = {
      all: orders.length,
      pending: 0,
      preparing: 0,
      ready: 0,
      "out-for-delivery": 0,
      delivered: 0,
    };

    orders.forEach((order) => {
      counts[order.status]++;
    });

    return counts;
  };

  const statusCounts = getStatusCounts();

  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(
    indexOfFirstOrder,
    indexOfLastOrder
  );
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-heading font-bold text-buzz-brown dark:text-buzz-cream">
              All Orders
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage and track all your coffee orders
            </p>
          </div>
          <div className="flex gap-3">
            <GenerateCustomerLinkModal>
              <Button variant="outline" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Generate Customer Link
              </Button>
            </GenerateCustomerLinkModal>
            <Button onClick={() => router.push("/orders/new")}>
              Create New Order
            </Button>
          </div>
        </div>
        {/* Status Filter and Counts */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Order Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="text-center">
                    <Skeleton className="h-8 w-8 mx-auto mb-2" />
                    <Skeleton className="h-4 w-16 mx-auto" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {statusCounts.all}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    All Orders
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {statusCounts.pending}
                  </div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {statusCounts.preparing}
                  </div>
                  <div className="text-sm text-muted-foreground">Preparing</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {statusCounts.ready}
                  </div>
                  <div className="text-sm text-muted-foreground">Ready</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {statusCounts["out-for-delivery"]}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Out for Delivery
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-muted-foreground">
                    {statusCounts.delivered}
                  </div>
                  <div className="text-sm text-muted-foreground">Delivered</div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-foreground">
                Filter by status:
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="preparing">Preparing</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="out-for-delivery">
                    Out for Delivery
                  </SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer Info</TableHead>
                    <TableHead>Order Details</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-3 w-28" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-24" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  {statusFilter === "all"
                    ? "No orders found"
                    : `No ${statusFilter} orders found`}
                </p>
                {statusFilter === "all" && (
                  <Button
                    onClick={() => router.push("/orders/new")}
                    className="mt-4"
                  >
                    Create First Order
                  </Button>
                )}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer Info</TableHead>
                      <TableHead>Order Details</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">
                          #{order.id.slice(-6)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {order.customerName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {order.customerPhone}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 max-w-xs truncate">
                              {order.customerAddress}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium mb-1">
                              {order.items.length} item
                              {order.items.length > 1 ? "s" : ""}
                            </div>
                            {order.items.slice(0, 3).map((item, idx) => (
                              <div
                                key={idx}
                                className="text-xs text-muted-foreground"
                              >
                                {item.quantity}x {item.productName}
                                {item.size === "large" && (
                                  <Badge
                                    variant="outline"
                                    className="ml-1 text-[10px]"
                                  >
                                    Large
                                  </Badge>
                                )}
                                {item.drinkName && (
                                  <span className="text-buzz-orange ml-1">
                                    ({item.drinkName})
                                  </span>
                                )}
                                {item.addons.length > 0 && (
                                  <span className="ml-1">
                                    (+
                                    {item.addons.map((a) => a.name).join(", ")})
                                  </span>
                                )}
                              </div>
                            ))}
                            {order.items.length > 3 && (
                              <div className="text-xs text-muted-foreground">
                                +{order.items.length - 3} more items
                              </div>
                            )}
                            {order.notes && (
                              <div className="text-xs text-blue-600 mt-2 font-medium">
                                Note: {order.notes}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground mt-2">
                              {order.createdAt.toDate().toLocaleDateString()} at{" "}
                              {order.createdAt.toDate().toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-lg">
                          ₱{order.totalAmount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={order.status}
                            onValueChange={(newStatus: Order["status"]) =>
                              handleStatusUpdate(order.id, newStatus)
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="preparing">
                                Preparing
                              </SelectItem>
                              <SelectItem value="ready">Ready</SelectItem>
                              <SelectItem value="out-for-delivery">
                                Out for Delivery
                              </SelectItem>
                              <SelectItem value="delivered">
                                Delivered
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setViewingOrder(order)}
                              title="View Order Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyTrackingLink(order.id)}
                              title="Copy Tracking Link"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingOrder(order)}
                              title="Edit Order"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <ConfirmModal
                              title="Delete Order"
                              description={`Are you sure you want to delete order #${order.id.slice(
                                -6
                              )} for ${
                                order.customerName
                              }? This action cannot be undone.`}
                              onConfirm={() => handleDeleteOrder(order.id)}
                              confirmText="Delete Order"
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                title="Delete Order"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </ConfirmModal>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-muted-foreground">
                      Showing {indexOfFirstOrder + 1} to{" "}
                      {Math.min(indexOfLastOrder, filteredOrders.length)} of{" "}
                      {filteredOrders.length} orders
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(
                          (page) =>
                            page === 1 ||
                            page === totalPages ||
                            Math.abs(page - currentPage) <= 1
                        )
                        .map((page, idx, arr) => (
                          <div key={page} className="flex items-center">
                            {idx > 0 && arr[idx - 1] !== page - 1 && (
                              <span className="mx-1">...</span>
                            )}
                            <Button
                              variant={
                                page === currentPage ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => handlePageChange(page)}
                            >
                              {page}
                            </Button>
                          </div>
                        ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* View Order Modal */}
        {viewingOrder && (
          <ViewOrderModal
            order={viewingOrder}
            onClose={() => setViewingOrder(null)}
          />
        )}

        {/* Edit Order Modal */}
        {editingOrder && (
          <EditOrderModal
            order={editingOrder}
            onSave={(updatedOrder) => {
              setOrders((prevOrders) =>
                prevOrders.map((order) =>
                  order.id === updatedOrder.id ? updatedOrder : order
                )
              );
              setEditingOrder(null);
            }}
            onCancel={() => setEditingOrder(null)}
          />
        )}
      </div>
    </div>
  );
}

function ViewOrderModal({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const subtotal =
    order.subtotal ||
    order.items.reduce((total, item) => {
      const addonTotal = item.addons.reduce(
        (sum, addon) => sum + addon.price,
        0
      );
      return total + (item.unitPrice + addonTotal) * item.quantity;
    }, 0);
  const deliveryFee = order.deliveryFee || 0;
  const totalAmount = subtotal + deliveryFee;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl">
                Order Details #{order.id.slice(-6)}
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                Created: {order.createdAt.toDate().toLocaleDateString()} at{" "}
                {order.createdAt.toDate().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Name
                  </Label>
                  <p className="font-medium">{order.customerName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Phone
                  </Label>
                  <p className="font-medium">{order.customerPhone}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Delivery Address
                  </Label>
                  <p className="font-medium">{order.customerAddress}</p>
                </div>
                {order.notes && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Special Instructions
                    </Label>
                    <p className="font-medium text-blue-600">{order.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Status
                  </Label>
                  <p className="font-medium capitalize">
                    {order.status.replace("-", " ")}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Total Items
                  </Label>
                  <p className="font-medium">
                    {order.items.length} item{order.items.length > 1 ? "s" : ""}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Total Amount
                  </Label>
                  <p className="text-2xl font-bold text-green-600">
                    ₱{totalAmount.toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Items Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Order Items</CardTitle>
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
                          <div>
                            <div className="font-medium">
                              {item.productName}
                              {item.size === "large" && (
                                <Badge
                                  variant="outline"
                                  className="ml-2 text-xs"
                                >
                                  Large
                                </Badge>
                              )}
                              {item.drinkName && (
                                <span className="text-buzz-orange ml-2">
                                  ({item.drinkName})
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            ₱{item.unitPrice.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.addons.length > 0 ? (
                            <div className="space-y-1">
                              {item.addons.map((addon, addonIndex) => (
                                <div key={addonIndex} className="text-sm">
                                  <span className="font-medium">
                                    {addon.name}
                                  </span>
                                  <span className="text-muted-foreground ml-2">
                                    +₱{addon.price}
                                  </span>
                                </div>
                              ))}
                              <div className="text-sm font-medium border-t pt-1">
                                Add-ons Total: +₱{addonTotal.toLocaleString()}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              No add-ons
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-medium text-lg">
                            {item.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-bold text-lg">
                            ₱{itemSubtotal.toLocaleString()}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Order Total */}
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
        </CardContent>
      </Card>
    </div>
  );
}

function EditOrderModal({
  order,
  onSave,
  onCancel,
}: {
  order: Order;
  onSave: (order: Order) => void;
  onCancel: () => void;
}) {
  const [customerName, setCustomerName] = useState(order.customerName);
  const [customerPhone, setCustomerPhone] = useState(order.customerPhone);
  const [customerAddress, setCustomerAddress] = useState(order.customerAddress);
  const [notes, setNotes] = useState(order.notes || "");
  const [deliveryFee, setDeliveryFee] = useState(order.deliveryFee || 0);
  const [items, setItems] = useState(order.items);
  const [products, setProducts] = useState<Product[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    fetchProductsAndAddons();
  }, []);

  const fetchProductsAndAddons = async () => {
    try {
      const db = getFirebaseDb();

      const productsSnapshot = await getDocs(collection(db, "products"));
      const productsData: Product[] = [];
      productsSnapshot.forEach((doc) => {
        productsData.push({ id: doc.id, ...doc.data() } as Product);
      });

      const addonsSnapshot = await getDocs(collection(db, "addons"));
      const addonsData: Addon[] = [];
      addonsSnapshot.forEach((doc) => {
        addonsData.push({ id: doc.id, ...doc.data() } as Addon);
      });

      setProducts(productsData.filter((p) => p.available));
      setAddons(addonsData.filter((a) => a.available));
    } catch (error) {
      console.error("Error fetching products and addons:", error);
      toast.error("Error loading products. Please try again.");
    } finally {
      setLoadingData(false);
    }
  };

  const calculateSubtotal = () => {
    return items.reduce((total, item) => {
      const addonTotal = item.addons.reduce(
        (sum: number, addon: { name: string; price: number }) =>
          sum + addon.price,
        0
      );
      return total + (item.unitPrice + addonTotal) * item.quantity;
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + deliveryFee;
  };

  const updateItemDrinkName = (index: number, drinkName: string) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item };
          const trimmedName = drinkName.trim();
          if (trimmedName) {
            updatedItem.drinkName = trimmedName;
          } else {
            delete updatedItem.drinkName;
          }
          return updatedItem;
        }
        return item;
      })
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleAddon = (itemIndex: number, addon: Addon) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== itemIndex) return item;

        const hasAddon = item.addons.find(
          (a: { name: string; price: number }) => a.name === addon.name
        );
        if (hasAddon) {
          return {
            ...item,
            addons: item.addons.filter(
              (a: { name: string; price: number }) => a.name !== addon.name
            ),
          };
        } else {
          return {
            ...item,
            addons: [...item.addons, { name: addon.name, price: addon.price }],
          };
        }
      })
    );
  };

  const addNewItem = () => {
    if (products.length === 0) return;

    const firstProduct = products[0];
    setItems((prev) => [
      ...prev,
      {
        productId: firstProduct.id,
        productName: firstProduct.name,
        quantity: 1,
        unitPrice: firstProduct.basePrice,
        addons: [],
      },
    ]);
  };

  const updateItemProduct = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          const updatedItem: Partial<OrderItem> = {
            productId: product.id,
            productName: product.name,
            unitPrice: product.basePrice,
            quantity: item.quantity,
            addons: [],
          };

          if (item.drinkName) {
            updatedItem.drinkName = item.drinkName;
          }

          return updatedItem as OrderItem;
        }
        return item;
      })
    );
  };

  const handleSave = async () => {
    if (items.length === 0) {
      toast.error("Order must have at least one item");
      return;
    }

    setLoading(true);
    try {
      const db = getFirebaseDb();
      const orderRef = doc(db, "orders", order.id);

      const updatedData = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        notes: notes.trim(),
        items: items,
        subtotal: calculateSubtotal(),
        deliveryFee: deliveryFee,
        totalAmount: calculateTotal(),
      };

      await updateDoc(orderRef, updatedData);

      const updatedOrder = {
        ...order,
        ...updatedData,
      };

      onSave(updatedOrder);
      toast.success("Order updated successfully");
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Error updating order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-4xl mx-4">
          <CardContent className="text-center py-12">
            <p>Loading products...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-auto">
        <CardHeader>
          <CardTitle className="text-xl">
            Edit Order #{order.id.slice(-6)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerPhone">Phone Number</Label>
              <Input
                id="customerPhone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="customerAddress">Delivery Address</Label>
              <Input
                id="customerAddress"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Enter delivery address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special instructions"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliveryFee">Delivery Fee (₱)</Label>
              <Input
                id="deliveryFee"
                type="number"
                min="0"
                step="0.01"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(Number(e.target.value) || 0)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Add delivery fee based on location distance
              </p>
            </div>
          </div>

          {/* Order Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Order Items</CardTitle>
              <Button onClick={addNewItem} size="sm">
                Add Item
              </Button>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No items in order
                </p>
              ) : (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <Card key={index} className="p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                        {/* Product Selection */}
                        <div>
                          <Label className="text-sm font-medium">Product</Label>
                          <Select
                            value={item.productId}
                            onValueChange={(productId) =>
                              updateItemProduct(index, productId)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} - ₱{product.basePrice}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Drink Name */}
                        <div>
                          <Label className="text-sm font-medium">
                            Drink Name (Optional)
                          </Label>
                          <Input
                            value={item.drinkName || ""}
                            onChange={(e) =>
                              updateItemDrinkName(index, e.target.value)
                            }
                            placeholder="e.g., John"
                            className="mt-2"
                          />
                        </div>

                        {/* Add-ons */}
                        <div>
                          <Label className="text-sm font-medium">Add-ons</Label>
                          <div className="mt-2 space-y-1">
                            {addons.map((addon) => (
                              <div
                                key={addon.id}
                                className="flex items-center space-x-2"
                              >
                                <input
                                  type="checkbox"
                                  id={`addon-${index}-${addon.id}`}
                                  checked={item.addons.some(
                                    (a: { name: string; price: number }) =>
                                      a.name === addon.name
                                  )}
                                  onChange={() => toggleAddon(index, addon)}
                                  className="rounded"
                                />
                                <Label
                                  htmlFor={`addon-${index}-${addon.id}`}
                                  className="text-xs cursor-pointer"
                                >
                                  {addon.name} (+₱{addon.price})
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Price & Remove */}
                        <div className="text-right">
                          <Label className="text-sm font-medium">Price</Label>
                          <div className="font-bold text-lg mt-2">
                            ₱
                            {(
                              item.unitPrice +
                              item.addons.reduce(
                                (
                                  sum: number,
                                  addon: { name: string; price: number }
                                ) => sum + addon.price,
                                0
                              )
                            ).toLocaleString()}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="mt-2 text-buzz-burgundy hover:text-buzz-burgundy/80"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Total */}
              <div className="border-t mt-6 pt-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-lg">Subtotal:</span>
                  <span className="text-lg font-medium">
                    ₱{calculateSubtotal().toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-lg">Delivery Fee:</span>
                  <span className="text-lg font-medium">
                    ₱{deliveryFee.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-xl font-bold">Total Amount:</span>
                  <span className="text-2xl font-bold text-green-600">
                    ₱{calculateTotal().toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="w-24"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                loading ||
                !customerName.trim() ||
                !customerPhone.trim() ||
                !customerAddress.trim() ||
                items.length === 0
              }
              className="w-32"
            >
              {loading ? "Updating..." : "Update Order"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <ProtectedRoute>
      <OrdersContent />
    </ProtectedRoute>
  );
}
