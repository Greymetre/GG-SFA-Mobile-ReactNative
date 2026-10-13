import { BASE_URL } from '../../api/AxiosClient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { ArrowDownIcon } from '../../assets/svgs/SvgsFile';
import AppText from '../../components/AppText/AppText';
import { styles } from './styles';
import { rw } from '../../utils/responsive';
import MediaImage from '../../components/atoms/MediaImage';
import { AddCartMiunsIcon, PlaceOrderIcon, PlusIcon } from '../../assets/svgs/HomePageSvgs';
import { colors } from '../../utils/Colors';
import { Dropdown } from 'react-native-element-dropdown';
import Toast from 'react-native-toast-message';
import store from '../../components/redux/Store';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';


type ProductCatalogueProps = {
    navigation: any;
    route: any
}

interface CartItem {
    productId: number | string;
    productName: string;
    quantity: number;
    price: number;
    ggNo?: string; // product_no, shown under the product on Submit Order
}

interface DropdownItem {
    label: string;
    value: number | string;
}

interface ProductItem extends DropdownItem {
    ggNo: string;
    subcategory_id?: number | string;
    subcategory_name?: string;
    category_id?: number | string;
    category_name?: string;
}
const ProductCatalogue = ({ navigation, route }: ProductCatalogueProps) => {
    const [segmentList, setSegmentList] = useState<DropdownItem[]>([]);
    const [allProducts, setAllProducts] = useState<ProductItem[]>([]);
    const [selectedSegmentId, setSelectedSegmentId] = useState<number | string | null>(null);

    const [products, setProducts] = useState<any[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [productDetails, setProductDetails] = useState<any | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [isEditingQty, setIsEditingQty] = useState(false);
    const [tempQuantity, setTempQuantity] = useState<string>('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const token = store.getState().auth?.token;

    // products of the selected category (all products when no category is picked)
    const productList = useMemo(
        () => selectedSegmentId
            ? allProducts.filter((p) => String(p.category_id) === String(selectedSegmentId))
            : allProducts,
        [allProducts, selectedSegmentId]
    );

    // GG No dropdown: one entry per product that has a GG No, value = product id
    const ggList = useMemo(
        () => productList
            .filter((p) => p.ggNo)
            .map((p) => ({ label: p.ggNo, value: p.value })),
        [productList]
    );

    const selectProduct = (item: ProductItem) => {
        setSelectedProduct(item);
        if (item.category_id) {
            setSelectedSegmentId(item.category_id);
        }
        fetchProductDetails(item.value);
    };

    const resetPageState = useCallback(() => {
        setSelectedSegmentId(null);
        setSelectedProduct(null);
        setQuantity(1);
        setCart([]);                    // ← clear cart (remove if you want to keep it)
        // reset any other form-related state here
    }, []);



    useFocusEffect(
        useCallback(() => {
            const unsubscribe = navigation.addListener('beforeRemove', (e) => {
                // Prevent default back action
                e.preventDefault();
                resetPageState();
                navigation.dispatch(e.data.action);
                // navigation.goBack();
                // Show confirmation alert
                // Alert.alert(
                //     'Confirm',
                //     'Are you sure you want to leave Product Catalogue?',
                //     [
                //         {
                //             text: 'Cancel',
                //             style: 'cancel',
                //             // Do nothing → stay on screen
                //         },
                //         {
                //             text: "Yes, I'm sure",
                //             style: 'destructive',
                //             onPress: () => {
                //                 // User confirmed → reset + actually go back
                //                 resetPageState();
                //                 navigation.dispatch(e.data.action); // proceed with back
                //             },
                //         },
                //     ],
                //     { cancelable: true }
                // );
            });

            // Also handle Android hardware back button (extra safety)
            const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
                // Trigger the same alert logic
                resetPageState();
                navigation.goBack();
                // Alert.alert(
                //     'Confirm',
                //     'Are you sure you want to leave Product Catalogue?',
                //     [
                //         { text: 'Cancel', style: 'cancel' },
                //         {
                //             text: "Yes, I'm sure",
                //             onPress: () => {
                //                 resetPageState();
                //                 navigation.goBack();
                //             },
                //         },
                //     ]
                // );
                return true; // prevent default back
            });

            return () => {
                unsubscribe();
                backHandler.remove();
            };
        }, [navigation, resetPageState])
    );

    useEffect(() => {
        fetchSegments();
    }, []);


    const fetchSegments = async () => {
        try {
            const res = await fetch(
                `${BASE_URL}api/getCategoryList`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                    },
                }
            );

            const json = await res.json();

            const segmentData = json?.data?.map((item: any) => ({
                label: item.category_name,
                value: item.id,
            }));

            setSegmentList(segmentData || []);
        } catch (error) {
            console.log('Segment error', error);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoadingProducts(true);

        try {
            const res = await fetch(`${BASE_URL}api/getProductList`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const json = await res.json();

            const productData: ProductItem[] = json?.data?.map((item: any) => ({
                label: item.product_name,
                value: item.id,
                ggNo: item.product_no || item.product_code || '',
                subcategory_id: item.subcategory_id,
                subcategory_name: item.subcategory_name,
                category_id: item.category_id,
                category_name: item.category_name,
            }));

            setAllProducts(productData || []);
        } catch (error) {
            console.log("Product error", error);
        } finally {
            setLoadingProducts(false);
        }
    };
    /*
    --------------------------
    PRODUCT DETAILS API
    --------------------------
    */

    const fetchProductDetails = async (productId: number | string) => {
        try {
            const res = await fetch(
                `${BASE_URL}api/getProductDetails?product_id=${productId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const json = await res.json();

            setProductDetails(json?.data || null);
        } catch (error) {
            console.log('Product details error', error);
        }
    };


    const resetForm = () => {
        if (!selectedProduct) {
            Toast.show({
                type: 'info',
                text1: 'Please add product',
                position: 'top',
            });
            return;
        }
        setSelectedProduct(null);
        setSelectedSegmentId(null)
        setProductDetails(null)
        setQuantity(1);
        setIsEditingQty(false);
        setTempQuantity('');
    };
    const addToCart = () => {
        if (!selectedProduct) {
            Toast.show({
                type: 'info',
                text1: 'Please select product',
                position: 'top',
            });
            return;
        }

        if (!productDetails?.mrp) {
            Toast.show({
                type: 'error',
                text1: 'Product price not available',
                position: 'top',
            });
            return;
        }

        const itemPrice = Number(productDetails.mrp); // or productDetails.selling_price if you have it

        const cartItem: CartItem = {
            productId: selectedProduct.value,
            productName: selectedProduct.label,
            quantity: quantity,
            price: itemPrice,
            ggNo: productDetails?.product_no || '',
        };
        const alreadyInCart = cart.some((item) => item.productId === cartItem.productId);

        setCart((prevCart) =>
            prevCart.some((item) => item.productId === cartItem.productId)
                ? prevCart.map((item) => item.productId === cartItem.productId ? { ...item, ...cartItem } : item)
                : [...prevCart, cartItem]
        );

        Toast.show({
            type: 'success',
            text1: alreadyInCart ? 'Quantity updated' : 'Added to cart',
            position: 'top',
        });
    };

    const getTotalCartItems = () => {
        return cart?.length;
    };

    const goToPlaceOrder = () => {
        if (cart.length === 0) {
            Toast.show({ type: 'info', text1: 'Cart is empty', position: 'top' });
            return;
        }

        // Optional: check if current selected product is in cart with correct qty
        if (selectedProduct) {
            const currentInCart = cart.find(item => item.productId === selectedProduct.value);
            if (currentInCart && currentInCart.quantity !== quantity) {
                Toast.show({
                    type: 'info',
                    text1: 'You have unsaved quantity changes',
                    text2: 'Press "Add to Cart" first',
                    position: 'top',
                });
                return;
            }
        }

        navigation.navigate('SubmitOrder', {
            cartItems: cart,
            routeData: route?.params,
            updateCart: (updatedCart: CartItem[]) => setCart(updatedCart),
        });
    };



    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <KeyboardAwareScrollView
                style={[styles.container, { paddingHorizontal: rw(18) }]} keyboardDismissMode='on-drag' showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bottomOffset={50}
                contentContainerStyle={{ paddingBottom: rw(24) }}


            >
                {/* <ScrollView style={[styles.container, { paddingHorizontal: rw(18) }]} keyboardDismissMode='on-drag' showsVerticalScrollIndicator={false}> */}
                <View style={[styles.row, { gap: 10, marginTop: 12, marginBottom: 10 }]}>
                    <View style={{ flex: 1, gap: 6 }}>
                        <AppText size={14} color='black' family='InterBold' opacity={0.8}>Category</AppText>

                        <Dropdown
                            style={styles.selectUser}
                            placeholderStyle={{ color: '#718096', fontSize: 14 }}
                            selectedTextStyle={{ color: colors.black, fontSize: 14 }}
                            inputSearchStyle={{ height: 40, fontSize: 14 }}
                            data={segmentList}

                            search
                            maxHeight={300}
                            labelField="label"
                            valueField="value"
                            placeholder="Select category"
                            searchPlaceholder="Search category..."
                            value={selectedSegmentId}
                            onChange={(item) => {
                                setSelectedSegmentId(item.value);
                                setSelectedProduct(null);
                                setProductDetails(null);
                            }}
                            renderRightIcon={() => <ArrowDownIcon />}
                        />


                    </View>
                </View>
                <View style={[styles.row, { gap: 10, marginBottom: 10 }]}>
                    <View style={{ flex: 1, gap: 6 }}>
                        <AppText size={14} color='black' family='InterBold' opacity={0.8}>GG No</AppText>
                        <Dropdown
                            style={styles.selectUser}
                            placeholderStyle={{ color: '#718096', fontSize: 14 }}
                            selectedTextStyle={{ color: colors.black, fontSize: 14 }}
                            inputSearchStyle={{ height: 40, fontSize: 14 }}
                            data={ggList}
                            search
                            maxHeight={300}
                            labelField="label"
                            valueField="value"
                            placeholder={loadingProducts ? 'Loading...' : 'Select GG No'}
                            searchPlaceholder="Search GG No..."
                            value={selectedProduct?.value ?? null}
                            onChange={(item) => {
                                const product = allProducts.find((p) => p.value === item.value);
                                if (product) selectProduct(product);
                            }}
                            renderRightIcon={() => <ArrowDownIcon />}
                        />


                    </View>
                </View>

                <View style={{ flex: 1, gap: 6 }}>
                    <AppText size={14} color='black' family='InterBold' opacity={0.8}>Product Name</AppText>
                    <Dropdown
                        style={styles.selectUser}
                        placeholderStyle={{ color: '#718096', fontSize: 14 }}
                        selectedTextStyle={{ color: colors.black, fontSize: 14 }}
                        inputSearchStyle={{ height: 40, fontSize: 14 }}
                        data={productList.length > 0 ? productList : [{label: 'Loading...', value: 1}]}
                        search
                        maxHeight={300}
                        labelField="label"
                        valueField="value"
                        placeholder="Select Product"
                        searchPlaceholder="Select Product..."
                        value={selectedProduct}
                        // disable={loadingProducts}
                        onChange={(item) => {
                            if(loadingProducts && productList.length == 0) return
                            selectProduct(item);
                        }}
                        renderRightIcon={() =>
                            <ArrowDownIcon />
                        }

                    />
                    {selectedSegmentId && !loadingProducts && productList?.length === 0 && (
                        <AppText
                            size={13}
                            color="#e74c3c"
                            family="InterMedium"
                            style={{ marginTop: rw(8), textAlign: 'center' }}
                        >
                            No products found in this category
                        </AppText>
                    )}
                </View>
                {
                    productDetails && (
                        <View style={detailStyles.card}>
                            <View style={detailStyles.header}>
                                <View style={detailStyles.imageBox}>
                                    {/* tries S3 then server storage; "No Image" box when there is none */}
                                    <MediaImage
                                        style={styles.productImage}
                                        path={productDetails?.product_image}
                                        resizeMode='cover'
                                    />
                                </View>
                                <View style={detailStyles.headerInfo}>
                                    <AppText size={15} color='black' family='InterBold' numLines={3}>
                                        {productDetails?.product_name}
                                    </AppText>
                                    <View style={detailStyles.ggChip}>
                                        <AppText size={12} color='black' family='InterSemiBold'>
                                            {productDetails?.product_no || productDetails?.product_code || '-'}
                                        </AppText>
                                    </View>
                                    <AppText size={18} color='black' family='InterBold'>
                                        ₹ {productDetails?.mrp}
                                    </AppText>
                                </View>
                            </View>

                            <View style={detailStyles.grid}>
                                {[
                                    { label: 'Subcategory', value: productDetails?.subcategory_name },
                                    { label: 'Brand', value: productDetails?.brand_name || productDetails?.brand?.name || productDetails?.brand },
                                    { label: 'OE Number', value: productDetails?.oe_number || productDetails?.oe_no },
                                    { label: 'Specification', value: productDetails?.specification || productDetails?.specifications },
                                ].map((field) => (
                                    <View key={field.label} style={detailStyles.gridCell}>
                                        <AppText size={12} color='#718096' family='InterMedium'>
                                            {field.label}
                                        </AppText>
                                        <AppText size={13} color='black' family='InterSemiBold' opacity={0.85}>
                                            {field.value || '-'}
                                        </AppText>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )
                }

                <View style={[styles.quantityRow, { marginTop: 14 }]}>
                    <View style={styles.quantityControls}>
                        <TouchableOpacity onPress={() => {
                            setQuantity((q) => Math.max(1, q - 1));
                        }}>
                            <AddCartMiunsIcon />
                        </TouchableOpacity>
                        <View style={[{ width: 60 }]}>
                            <TextInput
                                style={{
                                    flex: 1,
                                    fontSize: 15,
                                    fontFamily: 'InterBold',
                                    color: '#2B2B2B',
                                    textAlign: 'center',
                                    paddingHorizontal: 4,
                                }}
                                value={isEditingQty ? tempQuantity : String(quantity)}  // ← key part
                                onChangeText={(text) => {
                                    const cleaned = text.replace(/[^0-9]/g, '');

                                    setTempQuantity(cleaned);
                                    setQuantity(cleaned == '' ? 1 : Number(cleaned)); // update main qty only with valid number
                                }}
                                keyboardType="number-pad"

                                maxLength={6}
                                onFocus={() => {
                                    setIsEditingQty(true);
                                    setTempQuantity(String(quantity)); // start with current value
                                }}
                                onBlur={() => {
                                    setIsEditingQty(false);
                                    const num = tempQuantity === '' ? 1 : Number(tempQuantity);
                                    setQuantity(isNaN(num) || num < 1 ? 1 : num);
                                    setTempQuantity(''); // clean up
                                }}

                            />
                        </View>
                        <TouchableOpacity onPress={() => {
                            Keyboard.dismiss();
                            setQuantity((q) => q + 1);
                        }}>
                            <PlusIcon />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.placeOrderBtn} onPress={goToPlaceOrder}>
                        <PlaceOrderIcon color={'white'} />
                        <View style={styles.cartBadge}>
                            <AppText size={10} color="white" family="InterBold">
                                {getTotalCartItems()}
                            </AppText>
                        </View>
                        <AppText size={15} color="white" family="InterBold">
                            Place Order
                        </AppText>
                    </TouchableOpacity>
                </View>
                <View style={[styles.row, { justifyContent: 'space-between', marginTop: 16 }]}>
                    <Pressable style={[styles.chatButton, { backgroundColor: colors.blue }]} onPress={resetForm}>
                        <AppText size={14} color={colors.white} family='InterBold' >Add More Product</AppText>
                    </Pressable>
                    <Pressable style={[styles.chatButton, { backgroundColor: '#D2DAEE' }]} onPress={addToCart}>
                        <PlaceOrderIcon />
                        <AppText size={14} color={'#2B2B2B'} family='InterBold' >Add to Cart</AppText>
                    </Pressable>
                </View>
                {/* </ScrollView> */}
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}


const detailStyles = StyleSheet.create({
    card: {
        marginTop: rw(14),
        backgroundColor: colors.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E1DEDF',
        padding: rw(12),
    },
    header: {
        flexDirection: 'row',
        gap: rw(12),
    },
    imageBox: {
        height: 90,
        width: 90,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: colors.blue,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerInfo: {
        flex: 1,
        justifyContent: 'space-between',
        gap: 6,
    },
    ggChip: {
        alignSelf: 'flex-start',
        backgroundColor: '#F1ECE0',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: rw(12),
        borderTopWidth: 1,
        borderTopColor: '#E1DEDF',
    },
    gridCell: {
        width: '50%',
        paddingVertical: rw(8),
        paddingRight: rw(8),
        gap: 2,
    },
});

export default ProductCatalogue;
