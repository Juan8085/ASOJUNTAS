import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";
import { useAuthStore } from "../../lib/auth-store";
import { MarketUnit, DeliveryMethod, PaymentMethod } from "@conectajac/shared";
import {
  ShoppingBag,
  Plus,
  Search,
  CheckCircle2,
  Package,
  MapPin,
  X,
  ClipboardList,
  MessageCircle,
  Clock,
} from "lucide-react-native";

interface ProductItem {
  id: string;
  producerId?: string;
  title?: string;
  name?: string;
  description?: string;
  category?: any;
  price: number;
  unit: MarketUnit;
  stockQuantity?: number;
  stock?: number;
  images?: string[];
  producer?: {
    id?: string;
    farmName?: string;
    veredaName?: string;
    vereda?: string;
    whatsappContact?: string;
    user?: {
      firstName?: string;
      lastName?: string;
      phone?: string;
    };
  };
}

export default function MarketplaceScreen() {
  const queryClient = useQueryClient();
  const { user, currentMembership } = useAuthStore();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [mainTab, setMainTab] = useState<"CATALOG" | "MY_ORDERS">("CATALOG");
  const [orderModalProduct, setOrderModalProduct] = useState<ProductItem | null>(null);
  const [orderQuantity, setOrderQuantity] = useState("1");
  const [orderDelivery, setOrderDelivery] = useState<DeliveryMethod>(DeliveryMethod.PICKUP_AT_FARM);
  const [orderNotes, setOrderNotes] = useState("");

  // Publish product modal
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    category: "FRUITS_VEGETABLES",
    price: "",
    unit: MarketUnit.KG,
    stock: "10",
  });

  const categories = [
    { id: "ALL", label: "Todos" },
    { id: "FRUITS_VEGETABLES", label: "Frutas & Verduras" },
    { id: "DAIRY_EGGS", label: "Lácteos & Huevos" },
    { id: "GRAINS_COFFEE", label: "Café, Cacao & Granos" },
    { id: "MEAT_POULTRY", label: "Carnes de Granja" },
    { id: "ARTISANAL", label: "Artesanías & Panela" },
  ];

  const { data: productsData, isLoading, refetch } = useQuery<{
    data: ProductItem[];
  }>({
    queryKey: ["marketplace-products", currentMembership?.jacId, search, selectedCategory],
    queryFn: () =>
      apiClient.get(
        `/marketplace/products?search=${search}&category=${
          selectedCategory === "ALL" ? "" : selectedCategory
        }`
      ),
    enabled: !!currentMembership?.jacId,
  });

  const products = productsData?.data || [];

  // Query for buyer's orders
  const {
    data: myOrders = [],
    isLoading: loadingOrders,
    refetch: refetchOrders,
  } = useQuery<any[]>({
    queryKey: ["my-buyer-orders", user?.id],
    queryFn: () => apiClient.get("/marketplace/orders/buyer"),
    enabled: !!user?.id,
  });

  // Mutation to create order
  const orderMutation = useMutation({
    mutationFn: (payload: any) => apiClient.post<any>("/marketplace/orders", payload),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-products"] });
      queryClient.invalidateQueries({ queryKey: ["my-buyer-orders"] });

      const targetProduct = orderModalProduct;
      const whatsappUrl = res?.producer?.whatsappUrl;
      const farmerName =
        res?.producer?.name ||
        targetProduct?.producer?.farmName ||
        "el productor campesino";

      setOrderModalProduct(null);
      setOrderQuantity("1");
      setOrderNotes("");

      if (whatsappUrl) {
        Alert.alert(
          "¡Encargo Confirmado!",
          `Tu encargo de ${targetProduct?.title || targetProduct?.name || "cosecha"} fue enviado a ${farmerName} y registrado en el sistema comunal.\n\n¿Deseas abrir WhatsApp para enviar el detalle al campesino y coordinar la entrega?`,
          [
            { text: "Ver en la App", style: "cancel" },
            {
              text: "Abrir WhatsApp",
              onPress: () => {
                Linking.openURL(whatsappUrl).catch(() => {
                  Alert.alert(
                    "WhatsApp",
                    "No fue posible abrir WhatsApp. Comunícate al número del campesino."
                  );
                });
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "¡Encargo Confirmado!",
          `El productor ${farmerName} ha recibido tu encargo y el stock fue actualizado. Te contactará pronto para coordinar la entrega en la vereda.`
        );
      }
    },
    onError: (err: any) => {
      Alert.alert("Error al solicitar", err.message || "No fue posible procesar la orden.");
    },
  });

  // Mutation to publish harvest
  const publishMutation = useMutation({
    mutationFn: (payload: any) => apiClient.post("/marketplace/products", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-products"] });
      setPublishModalOpen(false);
      setNewProduct({
        name: "",
        description: "",
        category: "FRUITS_VEGETABLES",
        price: "",
        unit: MarketUnit.KG,
        stock: "10",
      });
      Alert.alert("¡Cosecha Publicada!", "Tu producto ya está visible para los vecinos de la vereda.");
    },
    onError: (err: any) => {
      Alert.alert("Error al publicar", err.message || "No fue posible publicar el producto.");
    },
  });

  const handleCreateOrder = () => {
    if (!orderModalProduct) return;
    const qty = parseInt(orderQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert("Cantidad inválida", "Ingresa una cantidad mayor a 0.");
      return;
    }

    const availableStock =
      orderModalProduct.stockQuantity ?? (orderModalProduct as any).stock ?? 999;
    if (qty > availableStock) {
      Alert.alert(
        "Stock insuficiente",
        `Solo hay disponibles ${availableStock} ${orderModalProduct.unit}. Por favor ajusta la cantidad.`
      );
      return;
    }

    orderMutation.mutate({
      productId: orderModalProduct.id,
      producerId: orderModalProduct.producerId || orderModalProduct.producer?.id,
      items: [
        {
          productId: orderModalProduct.id,
          quantity: qty,
        },
      ],
      deliveryMethod: orderDelivery,
      deliveryNotes: orderNotes.trim() || undefined,
      customerNotes: orderNotes.trim() || undefined,
      paymentMethod: PaymentMethod.CASH,
      buyerName: user ? `${user.firstName} ${user.lastName}`.trim() : undefined,
      buyerPhone: user?.phone || undefined,
    });
  };

  const handlePublishSubmit = () => {
    const priceNum = parseFloat(newProduct.price);
    const stockNum = parseInt(newProduct.stock, 10);

    if (!newProduct.name.trim() || isNaN(priceNum) || isNaN(stockNum)) {
      Alert.alert("Datos incompletos", "Por favor completa el nombre, precio y cantidad disponible.");
      return;
    }

    publishMutation.mutate({
      title: newProduct.name.trim(),
      name: newProduct.name.trim(),
      description: newProduct.description.trim() || undefined,
      category: newProduct.category,
      price: priceNum,
      unit: newProduct.unit,
      stockQuantity: stockNum,
      stock: stockNum,
      images: [],
    });
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header Tabs: Catálogo vs Mis Encargos */}
      <View className="bg-white px-4 pt-3 pb-2 border-b border-slate-100 flex-row space-x-2">
        <TouchableOpacity
          onPress={() => setMainTab("CATALOG")}
          className={`flex-1 py-2 rounded-xl flex-row items-center justify-center space-x-1.5 ${
            mainTab === "CATALOG" ? "bg-amber-600" : "bg-slate-100"
          }`}
        >
          <ShoppingBag color={mainTab === "CATALOG" ? "#ffffff" : "#64748b"} size={16} />
          <Text
            className={`text-xs font-bold ml-1.5 ${
              mainTab === "CATALOG" ? "text-white" : "text-slate-600"
            }`}
          >
            Cosechas del Campo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMainTab("MY_ORDERS")}
          className={`flex-1 py-2 rounded-xl flex-row items-center justify-center space-x-1.5 ml-2 ${
            mainTab === "MY_ORDERS" ? "bg-amber-600" : "bg-slate-100"
          }`}
        >
          <ClipboardList color={mainTab === "MY_ORDERS" ? "#ffffff" : "#64748b"} size={16} />
          <Text
            className={`text-xs font-bold ml-1.5 ${
              mainTab === "MY_ORDERS" ? "text-white" : "text-slate-600"
            }`}
          >
            Mis Encargos ({myOrders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {mainTab === "MY_ORDERS" ? (
        <ScrollView
          className="flex-1 px-4 py-4"
          contentContainerStyle={{ paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={loadingOrders} onRefresh={refetchOrders} />}
        >
          {loadingOrders ? (
            <ActivityIndicator color="#d97706" className="py-8" />
          ) : myOrders.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 border border-slate-200/80 items-center text-center mt-4">
              <ClipboardList color="#d97706" size={40} />
              <Text className="text-slate-800 font-bold text-base mt-3">
                No tienes encargos registrados
              </Text>
              <Text className="text-slate-400 text-xs text-center mt-1 leading-relaxed">
                Cuando encargues cosechas campesinas a tus vecinos de la vereda, aparecerán aquí con su estado y canal de contacto directo.
              </Text>
            </View>
          ) : (
            <View className="space-y-3 pb-20">
              {myOrders.map((ord: any) => {
                const rawPhone = (ord.producer?.whatsappContact || "").replace(/\D/g, "");
                const waUrl = rawPhone ? `https://wa.me/57${rawPhone.slice(-10)}` : null;

                const statusLabel =
                  ord.status === "PENDING_CONFIRMATION"
                    ? "⏳ Pendiente"
                    : ord.status === "CONFIRMED"
                    ? "✅ Confirmado"
                    : ord.status === "DELIVERED"
                    ? "🎉 Entregado"
                    : "Activo";

                const statusColor =
                  ord.status === "DELIVERED"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : ord.status === "CONFIRMED"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-amber-50 text-amber-700 border-amber-200";

                return (
                  <View
                    key={ord.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm mb-3"
                  >
                    <View className="flex-row justify-between items-start mb-2">
                      <View>
                        <Text className="text-xs font-black text-slate-800">
                          Pedido #{ord.orderNumber}
                        </Text>
                        <Text className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(ord.createdAt).toLocaleDateString("es-CO", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      </View>
                      <View className={`px-2 py-0.5 rounded-full border ${statusColor}`}>
                        <Text className="text-[10px] font-bold">{statusLabel}</Text>
                      </View>
                    </View>

                    <View className="bg-slate-50 rounded-xl p-3 my-2 border border-slate-100">
                      <Text className="text-xs font-bold text-slate-700 mb-1">
                        🌾 {ord.producer?.farmName || "Finca Campesina"} ({ord.producer?.veredaName || "Vereda"})
                      </Text>
                      {ord.items?.map((it: any) => (
                        <View key={it.id} className="flex-row justify-between py-0.5">
                          <Text className="text-xs text-slate-600">
                            • {it.quantity}x {it.productTitle}
                          </Text>
                          <Text className="text-xs font-bold text-slate-800">
                            ${Number(it.subtotal).toLocaleString("es-CO")}
                          </Text>
                        </View>
                      ))}
                      <View className="border-t border-slate-200/60 mt-2 pt-1 flex-row justify-between">
                        <Text className="text-xs font-extrabold text-slate-900">Total:</Text>
                        <Text className="text-xs font-black text-emerald-700">
                          ${Number(ord.totalAmount).toLocaleString("es-CO")} COP
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row justify-between items-center mt-1">
                      <Text className="text-[11px] text-slate-500">
                        {ord.deliveryMethod === "PICKUP_AT_FARM" ? "🏡 Recoger en finca" : "🚚 Entrega en vereda"}
                      </Text>

                      {waUrl && (
                        <TouchableOpacity
                          onPress={() => Linking.openURL(waUrl)}
                          className="bg-emerald-600 active:bg-emerald-700 px-3 py-1.5 rounded-xl flex-row items-center"
                        >
                          <MessageCircle color="#ffffff" size={14} />
                          <Text className="text-white font-bold text-xs ml-1">WhatsApp</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      ) : (
        <>
          {/* Search & Categories Bar */}
          <View className="bg-white px-4 pt-3 pb-2 border-b border-slate-200">
            <View className="flex-row items-center bg-slate-100 rounded-xl px-3 py-2 mb-3">
              <Search color="#64748b" size={18} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar cosechas, café, queso, plátano..."
                className="flex-1 ml-2 text-slate-800 text-sm"
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row pb-1">
              {categories.map((c) => {
                const active = selectedCategory === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setSelectedCategory(c.id)}
                    className={`mr-2 px-3 py-1.5 rounded-full ${
                      active ? "bg-amber-600" : "bg-slate-100"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        active ? "text-white" : "text-slate-600"
                      }`}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Product List */}
          <ScrollView
            className="flex-1 px-4 py-4"
            contentContainerStyle={{ paddingBottom: 60 }}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
          >
            {isLoading ? (
              <ActivityIndicator color="#d97706" className="py-8" />
            ) : products.length === 0 ? (
              <View className="bg-white rounded-2xl p-8 border border-slate-200/80 items-center text-center mt-4">
                <ShoppingBag color="#d97706" size={40} />
                <Text className="text-slate-800 font-bold text-base mt-3">
                  No hay cosechas publicadas aún
                </Text>
                <Text className="text-slate-400 text-xs text-center mt-1 leading-relaxed">
                  Sé el primer productor de la vereda en publicar café, plátano, cítricos o lácteos.
                </Text>
              </View>
            ) : (
              <View className="space-y-3 pb-20">
                {products.map((item) => (
                  <View
                    key={item.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex-row justify-between items-center mb-3"
                  >
                    <View className="flex-1 mr-3">
                      <View className="flex-row items-center space-x-1.5 mb-1">
                        <Text className="text-amber-700 bg-amber-50 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md">
                          {item.unit}
                        </Text>
                        <Text className="text-slate-400 text-xs">
                          • Disp: {item.stockQuantity ?? item.stock ?? 1} {item.unit.toLowerCase()}s
                        </Text>
                      </View>
                      <Text className="text-base font-bold text-slate-900">{item.title || item.name}</Text>
                      {item.description ? (
                        <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : null}

                      <View className="flex-row items-center mt-2 space-x-1">
                        <MapPin color="#94a3b8" size={13} />
                        <Text className="text-[11px] text-slate-400">
                          {item.producer?.farmName || "Finca Campesina"} ({item.producer?.veredaName || item.producer?.vereda || "Vereda"})
                        </Text>
                      </View>

                      <Text className="text-emerald-700 font-black text-base mt-1.5">
                        ${item.price.toLocaleString("es-CO")}{" "}
                        <Text className="text-xs text-slate-400 font-normal">/ {item.unit}</Text>
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => {
                        setOrderModalProduct(item);
                        setOrderQuantity("1");
                      }}
                      className="bg-amber-600 active:bg-amber-700 px-4 py-2.5 rounded-xl flex-row items-center space-x-1 shadow-sm"
                    >
                      <ShoppingBag color="#ffffff" size={16} />
                      <Text className="text-white font-bold text-xs ml-1">Pedir</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Floating Action Button: Publish Harvest */}
          <TouchableOpacity
            onPress={() => setPublishModalOpen(true)}
            className="absolute bottom-6 right-6 bg-emerald-600 active:bg-emerald-700 rounded-full px-5 py-3.5 flex-row items-center shadow-lg shadow-emerald-600/40"
          >
            <Plus color="#ffffff" size={20} />
            <Text className="text-white font-bold text-sm ml-2">Publicar Cosecha</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Order Modal */}
      <Modal visible={!!orderModalProduct} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 space-y-4">
            <View className="flex-row justify-between items-center pb-2 border-b border-slate-100">
              <Text className="text-lg font-bold text-slate-900">
                Encargar {orderModalProduct?.title || orderModalProduct?.name}
              </Text>
              <TouchableOpacity onPress={() => setOrderModalProduct(null)}>
                <X color="#64748b" size={20} />
              </TouchableOpacity>
            </View>

            <View>
              <Text className="text-xs font-semibold text-slate-600 mb-1">
                Cantidad a encargar ({orderModalProduct?.unit})
              </Text>
              <TextInput
                value={orderQuantity}
                onChangeText={setOrderQuantity}
                keyboardType="numeric"
                className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-base font-bold text-slate-900"
              />
              <Text className="text-xs text-amber-700 font-bold mt-1.5">
                Total estimado: ${((parseInt(orderQuantity || "0", 10) || 0) * (orderModalProduct?.price || 0)).toLocaleString("es-CO")} COP
              </Text>
            </View>

            <View>
              <Text className="text-xs font-semibold text-slate-600 mb-1">
                Método de Entrega
              </Text>
              <View className="flex-row space-x-2">
                <TouchableOpacity
                  onPress={() => setOrderDelivery(DeliveryMethod.PICKUP_AT_FARM)}
                  className={`flex-1 p-3 rounded-xl border ${
                    orderDelivery === DeliveryMethod.PICKUP_AT_FARM
                      ? "bg-amber-50 border-amber-600"
                      : "bg-slate-50 border-slate-200"
                  } items-center`}
                >
                  <Text className="text-xs font-bold text-slate-800">Recoger en Finca</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setOrderDelivery(DeliveryMethod.LOCAL_DELIVERY)}
                  className={`flex-1 p-3 rounded-xl border ml-2 ${
                    orderDelivery === DeliveryMethod.LOCAL_DELIVERY
                      ? "bg-amber-50 border-amber-600"
                      : "bg-slate-50 border-slate-200"
                  } items-center`}
                >
                  <Text className="text-xs font-bold text-slate-800">Entrega en Vereda</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View>
              <Text className="text-xs font-semibold text-slate-600 mb-1">
                Instrucciones para el vecino (Opcional)
              </Text>
              <TextInput
                value={orderNotes}
                onChangeText={setOrderNotes}
                placeholder="Ej. Llevar a la tienda comunal el sábado por la mañana"
                className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900"
              />
            </View>

            <TouchableOpacity
              onPress={handleCreateOrder}
              disabled={orderMutation.isPending}
              className="bg-amber-600 active:bg-amber-700 py-3.5 rounded-2xl flex-row items-center justify-center space-x-2 mt-2 shadow-sm"
            >
              {orderMutation.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <CheckCircle2 color="#ffffff" size={20} />
                  <Text className="text-white font-bold text-base ml-2">Confirmar Encargo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Publish Harvest Modal */}
      <Modal visible={publishModalOpen} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 space-y-4 max-h-[90%]">
            <View className="flex-row justify-between items-center pb-2 border-b border-slate-100">
              <Text className="text-lg font-bold text-slate-900">
                Publicar Cosecha o Producto
              </Text>
              <TouchableOpacity onPress={() => setPublishModalOpen(false)}>
                <X color="#64748b" size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView className="space-y-3">
              <View>
                <Text className="text-xs font-semibold text-slate-600 mb-1">
                  Nombre del Producto o Cosecha *
                </Text>
                <TextInput
                  value={newProduct.name}
                  onChangeText={(val) => setNewProduct({ ...newProduct, name: val })}
                  placeholder="Ej. Leche cruda, Cacao, Queso campesino..."
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm"
                />
              </View>

              <View className="mt-2">
                <Text className="text-xs font-semibold text-slate-600 mb-1">
                  Categoría del Producto
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
                  {[
                    { id: "FRUITS_VEGETABLES", label: "Frutas & Verduras" },
                    { id: "DAIRY_EGGS", label: "Lácteos & Huevos" },
                    { id: "GRAINS_COFFEE", label: "Café & Granos" },
                    { id: "ARTISANAL", label: "Artesanías / Panela" },
                  ].map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setNewProduct({ ...newProduct, category: cat.id })}
                      className={`mr-2 px-3 py-1.5 rounded-full border ${
                        newProduct.category === cat.id
                          ? "bg-amber-600 border-amber-600"
                          : "bg-slate-100 border-slate-200"
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          newProduct.category === cat.id ? "text-white" : "text-slate-700"
                        }`}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View className="mt-2">
                <Text className="text-xs font-semibold text-slate-600 mb-1">
                  Unidad de Medida
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
                  {[
                    { unit: MarketUnit.KG, label: "Kilo (Kg)" },
                    { unit: MarketUnit.ARROBA, label: "Arroba (@)" },
                    { unit: MarketUnit.BULTO, label: "Bulto / Saco" },
                    { unit: MarketUnit.UNIDAD, label: "Unidad" },
                    { unit: MarketUnit.LITRO, label: "Litro" },
                    { unit: MarketUnit.LIBRA, label: "Libra (Lb)" },
                  ].map((u) => (
                    <TouchableOpacity
                      key={u.unit}
                      onPress={() => setNewProduct({ ...newProduct, unit: u.unit })}
                      className={`mr-2 px-3 py-1.5 rounded-full border ${
                        newProduct.unit === u.unit
                          ? "bg-emerald-600 border-emerald-600"
                          : "bg-slate-100 border-slate-200"
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          newProduct.unit === u.unit ? "text-white" : "text-slate-700"
                        }`}
                      >
                        {u.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View className="mt-2">
                <Text className="text-xs font-semibold text-slate-600 mb-1">
                  Descripción / Detalles de la Cosecha
                </Text>
                <TextInput
                  value={newProduct.description}
                  onChangeText={(val) => setNewProduct({ ...newProduct, description: val })}
                  placeholder="Cosecha fresca sin agroquímicos de la finca..."
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm"
                />
              </View>

              <View className="mt-2 flex-row space-x-2">
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-slate-600 mb-1">
                    Precio ($ COP) *
                  </Text>
                  <TextInput
                    value={newProduct.price}
                    onChangeText={(val) => setNewProduct({ ...newProduct, price: val })}
                    placeholder="Ej. 18000"
                    keyboardType="numeric"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </View>

                <View className="flex-1 ml-2">
                  <Text className="text-xs font-semibold text-slate-600 mb-1">
                    Cantidad Disponible *
                  </Text>
                  <TextInput
                    value={newProduct.stock}
                    onChangeText={(val) => setNewProduct({ ...newProduct, stock: val })}
                    placeholder="Ej. 25"
                    keyboardType="numeric"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </View>
              </View>

              {/* Informative compliance text */}
              <View className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl mt-3">
                <Text className="text-[11px] text-amber-900 leading-relaxed">
                  ⚖️ <Text className="font-bold">Control Legal & Sanitario (Ley 2166):</Text> La directiva de tu JAC supervisa que todos los productos ofertados cumplan con las normas legales y estatutarias veredales.
                </Text>
              </View>

              <TouchableOpacity
                onPress={handlePublishSubmit}
                disabled={publishMutation.isPending}
                className="bg-emerald-600 active:bg-emerald-700 py-3.5 rounded-2xl flex-row items-center justify-center space-x-2 mt-4 shadow-sm"
              >
                {publishMutation.isPending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Package color="#ffffff" size={20} />
                    <Text className="text-white font-bold text-base ml-2">
                      Poner a la Venta en la JAC
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
