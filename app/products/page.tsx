"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Product, Addon, Category } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import MainNavigation from "@/components/MainNavigation";
import ConfirmModal from "@/components/ConfirmModal";
import { toast } from "sonner";

export default function ProductsPage() {
  const [, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [showNewAddon, setShowNewAddon] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        fetchData();
      } else {
        router.push("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const fetchData = async () => {
    try {
      const productsSnapshot = await getDocs(collection(db, "products"));
      const productsData: Product[] = [];
      productsSnapshot.forEach((doc) => {
        productsData.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(productsData);

      const addonsSnapshot = await getDocs(collection(db, "addons"));
      const addonsData: Addon[] = [];
      addonsSnapshot.forEach((doc) => {
        addonsData.push({ id: doc.id, ...doc.data() } as Addon);
      });
      setAddons(addonsData);

      const categoriesSnapshot = await getDocs(collection(db, "categories"));
      const categoriesData: Category[] = [];
      categoriesSnapshot.forEach((doc) => {
        categoriesData.push({ id: doc.id, ...doc.data() } as Category);
      });

      // If no categories exist, add default ones
      if (categoriesData.length === 0) {
        const defaults = [
          { name: "Espresso-Based", slug: "espresso-based" },
          { name: "No Caffeine", slug: "no-caffeine" },
        ];
        for (const cat of defaults) {
          const docRef = await addDoc(collection(db, "categories"), cat);
          categoriesData.push({ id: docRef.id, ...cat });
        }
      }
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleSaveCategory = async (categoryData: Omit<Category, "id">) => {
    try {
      if (editingCategory) {
        const categoryRef = doc(db, "categories", editingCategory.id);
        await updateDoc(categoryRef, categoryData);

        setCategories((prev) =>
          prev.map((c) =>
            c.id === editingCategory.id
              ? { ...editingCategory, ...categoryData }
              : c
          )
        );
        toast.success("Category updated successfully!");
      } else {
        const docRef = await addDoc(collection(db, "categories"), categoryData);
        setCategories((prev) => [...prev, { id: docRef.id, ...categoryData }]);
        toast.success("Category created successfully!");
      }

      setEditingCategory(null);
      setShowNewCategory(false);
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("Error saving category. Please try again.");
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await deleteDoc(doc(db, "categories", categoryId));
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
      toast.success("Category deleted successfully!");
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Error deleting category. Please try again.");
    }
  };

  const handleSaveProduct = async (
    productData: Omit<Product, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      if (editingProduct) {
        const productRef = doc(db, "products", editingProduct.id);
        await updateDoc(productRef, {
          ...productData,
          updatedAt: Timestamp.now(),
        });

        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingProduct.id
              ? {
                  ...editingProduct,
                  ...productData,
                  updatedAt: Timestamp.now(),
                }
              : p
          )
        );
        toast.success("Product updated successfully!");
      } else {
        const newProduct = {
          ...productData,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        const docRef = await addDoc(collection(db, "products"), newProduct);
        setProducts((prev) => [...prev, { id: docRef.id, ...newProduct }]);
        toast.success("Product created successfully!");
      }

      setEditingProduct(null);
      setShowNewProduct(false);
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Error saving product. Please try again.");
    }
  };

  const handleSaveAddon = async (addonData: Omit<Addon, "id">) => {
    try {
      if (editingAddon) {
        const addonRef = doc(db, "addons", editingAddon.id);
        await updateDoc(addonRef, addonData);

        setAddons((prev) =>
          prev.map((a) =>
            a.id === editingAddon.id ? { ...editingAddon, ...addonData } : a
          )
        );
        toast.success("Add-on updated successfully!");
      } else {
        const docRef = await addDoc(collection(db, "addons"), addonData);
        setAddons((prev) => [...prev, { id: docRef.id, ...addonData }]);
        toast.success("Add-on created successfully!");
      }

      setEditingAddon(null);
      setShowNewAddon(false);
    } catch (error) {
      console.error("Error saving addon:", error);
      toast.error("Error saving addon. Please try again.");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteDoc(doc(db, "products", productId));
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      toast.success("Product deleted successfully!");
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Error deleting product. Please try again.");
    }
  };

  const handleDeleteAddon = async (addonId: string) => {
    try {
      await deleteDoc(doc(db, "addons", addonId));
      setAddons((prev) => prev.filter((a) => a.id !== addonId));
      toast.success("Add-on deleted successfully!");
    } catch (error) {
      console.error("Error deleting addon:", error);
      toast.error("Error deleting addon. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold text-buzz-brown dark:text-buzz-cream">
            Product Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your coffee menu items and add-ons
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Products Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Products</CardTitle>
                  <Button onClick={() => setShowNewProduct(true)}>
                    Add New Product
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="p-4 border border-border rounded-lg"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Skeleton className="h-5 w-32" />
                              <Skeleton className="h-5 w-16" />
                              <Skeleton className="h-5 w-20" />
                            </div>
                            <Skeleton className="h-4 w-48 mb-2" />
                            <Skeleton className="h-6 w-16" />
                          </div>
                          <div className="flex gap-2">
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="p-6 border border-border rounded-lg"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-foreground">
                                {product.name}
                              </h3>
                              <Badge variant="outline">
                                {categories.find((c) => c.slug === product.category)
                                  ?.name || product.category}
                              </Badge>
                              <Badge
                                variant={
                                  product.available ? "default" : "secondary"
                                }
                              >
                                {product.available
                                  ? "Available"
                                  : "Unavailable"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {product.description}
                            </p>
                            <p className="font-bold text-lg mt-2 text-foreground">
                              ₱{product.basePrice}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingProduct(product)}
                            >
                              Edit
                            </Button>
                            <ConfirmModal
                              title="Delete Product"
                              description={`Are you sure you want to delete "${product.name}"? This action cannot be undone.`}
                              onConfirm={() => handleDeleteProduct(product.id)}
                              confirmText="Delete Product"
                            >
                              <Button variant="outline" size="sm">
                                Delete
                              </Button>
                            </ConfirmModal>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Add-ons Section */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Add-ons</CardTitle>
                  <Button onClick={() => setShowNewAddon(true)}>
                    Add New Add-on
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="p-4 border border-border rounded-lg"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Skeleton className="h-5 w-24" />
                              <Skeleton className="h-5 w-12" />
                              <Skeleton className="h-5 w-20" />
                            </div>
                            <Skeleton className="h-6 w-16" />
                          </div>
                          <div className="flex gap-2">
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {addons.map((addon) => (
                      <div
                        key={addon.id}
                        className="p-6 border border-border rounded-lg"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-foreground">
                                {addon.name}
                              </h3>
                              <Badge variant="outline">{addon.type}</Badge>
                              <Badge
                                variant={
                                  addon.available ? "default" : "secondary"
                                }
                              >
                                {addon.available ? "Available" : "Unavailable"}
                              </Badge>
                            </div>
                            <p className="font-bold text-lg mt-2 text-foreground">
                              +₱{addon.price}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingAddon(addon)}
                            >
                              Edit
                            </Button>
                            <ConfirmModal
                              title="Delete Add-on"
                              description={`Are you sure you want to delete "${addon.name}"? This action cannot be undone.`}
                              onConfirm={() => handleDeleteAddon(addon.id)}
                              confirmText="Delete Add-on"
                            >
                              <Button variant="outline" size="sm">
                                Delete
                              </Button>
                            </ConfirmModal>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Categories Section */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Categories</CardTitle>
                  <Button onClick={() => setShowNewCategory(true)}>
                    Add New Category
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 2 }).map((_, index) => (
                      <div
                        key={index}
                        className="p-4 border border-border rounded-lg"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <Skeleton className="h-5 w-24 mb-2" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                          <div className="flex gap-2">
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        className="p-6 border border-border rounded-lg"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">
                              {category.name}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              slug: {category.slug}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingCategory(category)}
                            >
                              Edit
                            </Button>
                            <ConfirmModal
                              title="Delete Category"
                              description={`Are you sure you want to delete "${category.name}"? This may affect products in this category.`}
                              onConfirm={() => handleDeleteCategory(category.id)}
                              confirmText="Delete Category"
                            >
                              <Button variant="outline" size="sm">
                                Delete
                              </Button>
                            </ConfirmModal>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Product Form Modal */}
      {(showNewProduct || editingProduct) && (
        <ProductForm
          product={editingProduct}
          categories={categories}
          onSave={handleSaveProduct}
          onCancel={() => {
            setShowNewProduct(false);
            setEditingProduct(null);
          }}
        />
      )}

      {/* Addon Form Modal */}
      {(showNewAddon || editingAddon) && (
        <AddonForm
          addon={editingAddon}
          onSave={handleSaveAddon}
          onCancel={() => {
            setShowNewAddon(false);
            setEditingAddon(null);
          }}
        />
      )}

      {/* Category Form Modal */}
      {(showNewCategory || editingCategory) && (
        <CategoryForm
          category={editingCategory}
          onSave={handleSaveCategory}
          onCancel={() => {
            setShowNewCategory(false);
            setEditingCategory(null);
          }}
        />
      )}
    </div>
  );
}

function CategoryForm({
  category,
  onSave,
  onCancel,
}: {
  category: Category | null;
  onSave: (data: Omit<Category, "id">) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: category?.name || "",
    slug: category?.slug || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("Please fill in all required fields");
      return;
    }
    // Auto-generate slug if empty
    const finalData = {
      ...formData,
      slug:
        formData.slug ||
        formData.name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, ""),
    };
    onSave(finalData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>{category ? "Edit Category" : "Add New Category"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Category Name *</Label>
              <Input
                id="cat-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cat-slug">Slug (URL friendly name)</Label>
              <Input
                id="cat-slug"
                value={formData.slug}
                placeholder="e.g. espresso-based"
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, slug: e.target.value }))
                }
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" className="flex-1">
                {category ? "Update" : "Create"} Category
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ProductForm({
  product,
  categories,
  onSave,
  onCancel,
}: {
  product: Product | null;
  categories: Category[];
  onSave: (data: Omit<Product, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: product?.name || "",
    basePrice: product?.basePrice || 0,
    category: product?.category || categories[0]?.slug || "",
    available: product?.available ?? true,
    description: product?.description || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.basePrice <= 0 || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>{product ? "Edit Product" : "Add New Product"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="basePrice">Base Price *</Label>
              <Input
                id="basePrice"
                type="number"
                min="0"
                step="0.01"
                value={formData.basePrice}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    basePrice: parseFloat(e.target.value) || 0,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.slug}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="available"
                checked={formData.available}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    available: e.target.checked,
                  }))
                }
              />
              <Label htmlFor="available">Available</Label>
            </div>

            <div className="flex gap-4">
              <Button type="submit" className="flex-1">
                {product ? "Update" : "Create"} Product
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function AddonForm({
  addon,
  onSave,
  onCancel,
}: {
  addon: Addon | null;
  onSave: (data: Omit<Addon, "id">) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: addon?.name || "",
    price: addon?.price || 0,
    type: addon?.type || ("syrup" as const),
    available: addon?.available ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.price <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>{addon ? "Edit Add-on" : "Add New Add-on"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Add-on Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    price: parseFloat(e.target.value) || 0,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: "shot" | "syrup") =>
                  setFormData((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="syrup">Syrup</SelectItem>
                  <SelectItem value="shot">Shot</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="available"
                checked={formData.available}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    available: e.target.checked,
                  }))
                }
              />
              <Label htmlFor="available">Available</Label>
            </div>

            <div className="flex gap-4">
              <Button type="submit" className="flex-1">
                {addon ? "Update" : "Create"} Add-on
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
