import { View, Text, Pressable, ScrollView, Alert, Platform, Linking, Modal } from 'react-native'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { styles } from './styles'
import { rw } from '../../utils/responsive'
import AppText from '../../components/AppText/AppText'
import FastImage from 'react-native-fast-image'
import { BuyOrderIcon, CalenderAddIcon, CalenderIcon, CrossIcon, OrderBoxIcon, OrderHistoryIcon } from '../../assets/svgs/SvgsFile'
import { colors } from '../../utils/Colors'
import { getOpenCheckinApi, useGetCustomerData, useGetSecondaryCustomerData, useGetSubmitCheckIN } from '../../api/query/CustomerApi'
import { resolveWorkingMediaUrl } from '../../api/AxiosClient'
import MediaImage from '../../components/atoms/MediaImage'
import CustomerVisitHistory from '../../components/atoms/CustomerVisitHistory'
import MechanicCategoryBadge, { isMechanicCustomer, mechanicCategoryColour } from '../../components/atoms/MechanicCategoryBadge'
import { CheckIcon, EmailIcon, LocationIcon, PhoneICon, WhatsappICon } from '../../assets/svgs/HomePageSvgs'
import Toast from 'react-native-toast-message'
import Geolocation from '@react-native-community/geolocation'
import { useFocusEffect } from '@react-navigation/native'
import useLocationHook from '../../api/hooks/uselocationhook'
import Gallery, { GalleryRef } from 'react-native-awesome-gallery'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { formatMobileNumberList, normalizeIndianMobileNumber } from '../../utils/phone'

type CustomerDetailsProps = {
  navigation: any
  route: any
}

const CustomerDetails = ({ navigation, route }: CustomerDetailsProps) => {
  const routePunchInOut = route?.params?.isPunchedIn
  const [activeTab, setactiveTab] = useState(1)
  const [loader, setLoader] = useState<boolean>(false)
  const [checkInLoading, setCheckInLoading] = useState<boolean>(false)
  const [customerData, setCustomerData] = useState<any>(null)
  const [activeCheckin, setActiveCheckin] = useState<any>(null)
  const [data, setData] = useState<any>(null)
  const [checkInHanlde, seCheckInHandle] = useState<any>(null)
  const [modalVisible, setModalVisible] = useState(false);
  const [visitHistoryVisible, setVisitHistoryVisible] = useState(false);
  const [images, setImages] = useState<string[]>([]); // always array
  const galleryRef = useRef<GalleryRef>(null);
  const [initialIndex, setInitialIndex] = useState(0);
  // ── New states for location ────────────────────────────────

  const [locationError, setLocationError] = useState<string | null>(null)

  const routeItem = route?.params?.item

  // Optional: better typing
  const { mutateAsync: mutateCustomerData } = useGetCustomerData()
  const { mutateAsync: mutateSecondaryCustomerData } = useGetSecondaryCustomerData()
  const { mutateAsync: submitCheckIn } = useGetSubmitCheckIN()

  // Get customer data + location on mount
  useFocusEffect(
    useCallback(() => {
      handleGetCustomerData(routeItem?.customer_id || routeItem?.id)
    }, [])
  )

  // ── Fetch current location once ─────────────────────────────
  const { coords } = useLocationHook();

  // Access as
  const currentLat = coords?.latitude;
  const currentLng = coords?.longitude;

  function isCheckoutBeforeCheckin(checkinDatetime: any, checkoutDatetime: any) {
    // Using Date objects (most reliable)
    const checkin: any = new Date(checkinDatetime);
    const checkout: any = new Date(checkoutDatetime);

    // If either date is invalid → treat as not before (safe default)
    if (isNaN(checkin) || isNaN(checkout)) {
      return false;
    }

    return checkout < checkin;
  }

  const handleGetCustomerData = async (id: any) => {
    setLoader(true)

    try {
      const customerId = routeItem?.customer_id || id;
      const res = route?.params?.type
        ? await mutateSecondaryCustomerData({ customer_id: customerId })
        : await mutateCustomerData(id)

      if (res?.data?.status === true || res?.data?.status === 'success') {
        // Gajra getCustomerInfo has no check_status; derive it from the user's open check-in
        let checkStatus = res?.data?.check_status
        if (!checkStatus) {
          const open = await getOpenCheckinApi().catch(() => null)
          setActiveCheckin(open)
          checkStatus = open && String(open.entity_id) === String(customerId)
            ? { last_checkin: { checkin_id: open.checkin_id, checkin_datetime: open.checkin_datetime } }
            : null
        }
        if (route?.params?.type) {
          const raw = res?.data?.data
          const details = raw?.customerdetails
          const address = raw?.customeraddress
          // Gajra getCustomerInfo: name/first_name/last_name, customeraddress.address1/address2,
          // customertypes.customertype_name, no lat/long (the list row may carry gps_location)
          const addressLine = [address?.address1, address?.address2].filter(Boolean).join(', ')
          const ownerName = [raw?.first_name, raw?.last_name].filter(Boolean).join(' ')
          const data = {
            ...raw,
            shop_name: raw?.shop_name || raw?.name,
            owner_name: raw?.owner_name || ownerName,
            address_line: raw?.address_line || addressLine,
            type: raw?.type || raw?.customer_type || raw?.customertypes?.customertype_name,
            gps_location: raw?.gps_location || routeItem?.gps_location || '',
            pincode: raw?.pincode || address?.pincodename?.pincode || address?.zipcode || '',
            shop_image: raw?.shop_image || details?.shop_image,
            profile_image: raw?.profile_image,
          }
          const customerDocuments = Array.isArray(data?.customerdocuments)
            ? data.customerdocuments.reduce((documentsByName: Record<string, string>, document: any) => {
              const name = String(document?.document_name || '').toLowerCase().replace(/[\s_-]/g, '')
              const path = document?.file_path || document?.document_path || document?.path || document?.url
              if (name && path) documentsByName[name] = path
              return documentsByName
            }, {})
            : {}
          setData(data)
          const distributorNames = res?.data?.distributors
            ?.map((d: any) => d.shop_name)
            .filter(Boolean)
            .join(', ') || null;
          setCustomerData({
            shop_image: data?.shop_photo || details?.shop_image,
            legal_name: data?.shop_name,
            billing_address: data?.address_line || address?.full_address,
            billing_city: data?.city?.city_name || address?.cityname?.city_name,
            contact_person: data?.owner_name,
            mobile: data?.mobile_number || data?.mobile,
            billing_pincode: data?.pincode?.pincode || address?.pincodename?.pincode,
            registration_type: data?.type || data?.customer_type,
            owner_photo: data?.owner_photo || data?.profile_image,
            check_status: checkStatus,
            state: data?.state?.state_name || address?.statename?.state_name || '',
            district: data?.district?.district_name || address?.districtname?.district_name || '',
            city: data?.city?.city_name || address?.cityname?.city_name || '',
            distributor_name: distributorNames || '',
            beat_id: data?.beat_id || '',
            beat_name: data?.beat?.beat_name || '',
            belt_area_market_name: data?.belt_area_market_name || '',
            gps_location: data?.gps_location || '',
            gst_number: data?.gst_number || details?.gstin_no || '',
            status: data?.status || '',
            pan_number: data?.pan_number || details?.pan_no || '',
            bank_account_type: data?.bank_account_type || '',
            bank_account_number: data?.bank_account_number || details?.account_number || '',
            bank_name: data?.bank_name || details?.bank_name || '',
            ifsc_code: data?.ifsc_code || details?.ifsc_code || '',
            account_holder_name: data?.account_holder_name || details?.account_holder || '',
            gst_attachment: data?.gst_attachment || customerDocuments.gstin || customerDocuments.gst || null,
            pan_attachment: data?.pan_attachment || customerDocuments.pan || null,
            bank_proof: data?.bank_proof || customerDocuments.bankpass || customerDocuments.bankproof || null,
            aadhar: data?.aadhar || details?.aadhar || customerDocuments.aadhar || customerDocuments.aadhaar || null,
            aadhar_back: customerDocuments.aadharback || customerDocuments.aadhaarback || null,
            remark: data?.remark || '',
            created_by: data?.created_by || '',
            creator: data?.creator?.name || '',
            is_mechanic: !!data?.is_mechanic,
            mechanic_category: data?.mechanic_category || null,
            total_order_value: data?.total_order_value,
            last_visited: data?.last_visited || '',
            last_order_date: data?.last_order_date || '',
            total_points: data?.total_points,
            total_coupon_scan: data?.total_coupon_scan,
          });

        } else {
          setData(res?.data?.data)
          setCustomerData({ ...res?.data?.data, check_status: checkStatus })
        }
        seCheckInHandle(
          !!checkStatus?.last_checkin?.checkin_datetime &&
          !checkStatus?.last_checkin?.checkout_datetime
        )

        const checkInDate = checkStatus?.last_checkin?.checkin_datetime
        const checkOutdate = checkStatus?.last_checkout?.checkout_datetime
        if (checkInDate && checkOutdate) {
          const result: any = isCheckoutBeforeCheckin(
            checkInDate,
            checkOutdate,
          );

          if (result != "NA") {
            seCheckInHandle(result)
          }

        } else {
          seCheckInHandle(!!checkInDate &&
            !checkOutdate)
        }
      }
    } catch (error) {
      console.log('handleGetCustomerData error:', error)
    } finally {
      setLoader(false)
    }
  }

  const handleCheckInOut = async () => {
    if (checkInLoading) return
    // Check if we have location
    if (currentLat === null || currentLng === null) {
      Toast.show({
        type: 'error',
        text1: 'Location not available',
        text2: locationError || 'Please enable location and try again',
        position: 'top',
        visibilityTime: 3500,
      })
      // Optional: try to fetch again
      // getCurrentLocation()
      return
    }

    if (checkInHanlde) {
      // Toast.show({
      //   type: 'error',
      //   text1: 'check in not available',
      //   text2: locationError || 'Please enable location and try again',
      //   position: 'top',
      //   visibilityTime: 3500,
      // })
      navigation.navigate('VisitReport', {
        checkin_id: customerData?.check_status?.last_checkin?.checkin_id,
        entity_type: 'customer',
        entity_id: routeItem?.customer_id || routeItem?.id,
        customerData: customerData, // pass full customer data if needed in report
        latitude: currentLat,
        longitude: currentLng,
      });
      return
    } else {
      if (activeCheckin && String(activeCheckin.entity_id) !== String(routeItem?.customer_id || routeItem?.id)) {
        Toast.show({
          type: 'error',
          text1: 'Already checked in',
          text2: `Please check out from ${activeCheckin.entity_name || 'the current customer'} first`,
          position: 'top',
        })
        return
      }
      setCheckInLoading(true)
      const payload = {
        entity_type: 'customer',
        entity_id: routeItem?.customer_id || routeItem?.id,
        checkin_latitude: currentLat,
        checkin_longitude: currentLng,
      }

      try {
        const res: any = await submitCheckIn(payload)

        if (res?.data?.status === true || res?.data?.status == "success") {

          Toast.show({
            type: 'success',
            text1: checkInHanlde ? 'Checked out successfully' : 'Checked in successfully',
            position: 'top',
            visibilityTime: 2500,
          })

          // Refresh data to update button text / status
          handleGetCustomerData(routeItem?.id)
        } else {
          Toast.show({
            type: 'error',
            text1: res || 'Operation failed',
            text2: res?.data?.message || 'Please try again',
            position: 'top',
          })
        }
      } catch (error: any) {
        console.log('Check-in/out error:', error?.response)
        Toast.show({
          type: 'error',
          text1: 'Failed',
          text2: error?.response?.data?.message || 'Could not complete action',
          position: 'top',
        })
      } finally {
        setCheckInLoading(false)
      }
    }
  }

  const closeModal = () => {
    setModalVisible(false);
  };


  const hasOpenCheckIn =
    !!customerData?.check_status?.last_checkin?.checkin_datetime &&
    !customerData?.check_status?.last_checkin?.checkout_datetime

  const documents = customerData?.documents ? JSON.parse(customerData.documents) : []
  const customerPrimaryImage = customerData?.shop_image || customerData?.owner_photo
  const customerAttachments = [
    { key: 'shop-photo', label: 'Shop Photo', value: customerData?.shop_image },
    { key: 'owner-photo', label: 'Owner Photo', value: customerData?.owner_photo },
    { key: 'gst', label: 'GST Attachment', value: customerData?.gst_attachment },
    { key: 'pan', label: 'PAN Attachment', value: customerData?.pan_attachment },
    { key: 'bank', label: 'Bank Proof', value: customerData?.bank_proof },
    { key: 'aadhar-front', label: 'Aadhaar Card', value: customerData?.aadhar },
    { key: 'aadhar-back', label: 'Aadhaar Card Back', value: customerData?.aadhar_back },
  ]
    .filter(attachment => Boolean(attachment.value))

  // Images may be on S3 or on server storage; open the viewer with the URL that exists
  const openImageViewer = async (path?: string | null) => {
    if (!path) return
    setImages([await resolveWorkingMediaUrl(path)])
    setInitialIndex(0)
    setModalVisible(true)
  }
  const nameOf = (value: any, key: string) =>
    (value && typeof value === 'object' ? value?.[key] : value) || ''
  const cityName = nameOf(customerData?.city, 'city_name') || nameOf(customerData?.billing_city, 'city_name')
  const pincode = nameOf(customerData?.billing_pincode, 'pincode')
  const customerAddress = [customerData?.billing_address || customerData?.address_line, cityName, pincode]
    .map(part => String(part || '').trim().replace(/,+$/, ''))
    .filter(Boolean)
    .join(', ')
  const customerStatus = String(customerData?.status || '')
  const statusColor = /reject/i.test(customerStatus)
    ? '#D64545'
    : /approv|active/i.test(customerStatus)
      ? '#339D4F'
      : '#C98A00'
  const lastCheckinDatetime = customerData?.check_status?.last_checkin?.checkin_datetime
  const lastCheckinText = lastCheckinDatetime && !isNaN(new Date(lastCheckinDatetime).getTime())
    ? new Date(lastCheckinDatetime).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : ''
  const primaryMobile = customerData?.mobile
    ? formatMobileNumberList(customerData.mobile)[0] || normalizeIndianMobileNumber(customerData.mobile)
    : ''
  const dashboardInfo = [
    { label: 'Owner / Contact', value: customerData?.contact_person || customerData?.owner_name },
    { label: 'Mobile', value: primaryMobile ? `+91 ${primaryMobile}` : '' },
    { label: 'City', value: cityName },
    { label: 'State', value: nameOf(customerData?.state, 'state_name') },
    { label: route?.params?.type ? 'Beat' : 'Customer Code', value: route?.params?.type ? customerData?.beat_name : customerData?.distributor_code },
    { label: route?.params?.type ? 'Distributor' : 'GSTIN', value: route?.params?.type ? customerData?.distributor_name : customerData?.gst_number },
  ]

  const isMechanic = isMechanicCustomer(customerData) || isMechanicCustomer(data) || isMechanicCustomer(routeItem)
  const mechanicCategory = customerData?.mechanic_category || data?.mechanic_category || routeItem?.mechanic_category || null
  const formatNumber = (value: any) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
  const formatDate = (value: any) => {
    const date = value ? new Date(value) : null
    return date && !isNaN(date.getTime())
      ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : ''
  }
  // getCustomerInfo order / visit figures; shown only when the API sends them
  const activityInfo = [
    { label: 'Total Order Value', value: customerData?.total_order_value != null ? `₹ ${formatNumber(customerData.total_order_value)}` : '' },
    { label: 'Last Order', value: formatDate(customerData?.last_order_date) },
    { label: 'Last Visit', value: formatDate(customerData?.last_visited) },
    { label: 'Total Points', value: !isMechanic && customerData?.total_points != null ? formatNumber(customerData.total_points) : '' },
  ].filter(info => !!info.value)

  const handleCall = () => {
    const phone = normalizeIndianMobileNumber(customerData?.mobile)
    if (!phone || phone.length < 10) {
      Alert.alert('Invalid Number', 'No valid phone number available.')
      return
    }
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Error', 'Unable to open dialer'))
  }

  const handleWhatsApp = () => {
    const phone = normalizeIndianMobileNumber(customerData?.mobile)
    if (!phone || phone.length < 10) {
      Alert.alert('Invalid Number', 'No valid phone or WhatsApp number available.')
      return
    }
    Linking.openURL(`whatsapp://send?phone=91${phone}`).catch(() =>
      Alert.alert('WhatsApp Not Installed', 'WhatsApp is required to send a message.'),
    )
  }

  const handleEmail = () => {
    if (!customerData?.email) {
      Alert.alert('No Email', 'Email id is not available for this customer.')
      return
    }
    Linking.openURL(`mailto:${customerData.email}`).catch(() =>
      Alert.alert('No email app found', 'Please set up an email client'),
    )
  }

  const handleLocation = async () => {
    const gps = customerData?.gps_location?.trim();
    const addr = (customerData?.address_line || customerData?.billing_address)?.trim();

    let query = '';

    // Prefer coordinates if available
    if (gps && gps.includes(',')) {
      const [lat, lng] = gps.split(',').map((s: any) => s.trim());
      if (lat && lng) {
        query = `${lat},${lng}`;
      }
    }

    // Fallback to address
    if (!query && addr) {
      query = encodeURIComponent(addr);
    }

    if (!query) {
      Alert.alert('No Location', 'No GPS or address available.');
      return;
    }

    // ────────────────────────────────────────────────
    // Android: try geo: URI first (works with most map apps)
    // iOS: use maps://
    // Fallback: browser
    // ────────────────────────────────────────────────

    const scheme = Platform.OS === 'android' ? 'geo:0,0?q=' : 'maps://?q=';
    const nativeUrl = scheme + query;
    const webUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;

    try {
      // Try native map app first
      if (await Linking.canOpenURL(nativeUrl)) {
        await Linking.openURL(nativeUrl);
        return;
      }

      // If native fails → open in browser
      await Linking.openURL(webUrl);
    } catch (err) {
      console.log('Map open failed:', err);

      Alert.alert(
        'Cannot Open Map',
        'No map application is available.\n\nThe location will open in your browser instead.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open in Browser',
            onPress: () => Linking.openURL(webUrl).catch(() => { }),
          },
        ]
      );
    }
  };

  return (
    <View style={[styles.container, { marginTop: 14 }]}>
      <ScrollView
        style={[styles.container, { paddingHorizontal: rw(20) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.tabBarView, styles.row, { marginTop: 14 }]}>
          <Pressable
            style={[
              styles.firstTab,
              styles.center,
              activeTab == 1 && styles.activeTab,
              activeTab == 2 && { width: '40%' },
            ]}
            onPress={() => setactiveTab(1)}
          >
            <AppText
              color={activeTab == 1 ? 'white' : 'black'}
              size={activeTab == 1 ? 15 : 14}
              family={activeTab == 1 ? 'InterSemiBold' : 'InterMedium'}
            >
              Dashboard
            </AppText>
          </Pressable>
          <Pressable
            style={[
              styles.firstTab,
              styles.center,
              activeTab == 2 && styles.activeTab,
              activeTab == 2 && { width: '60%' },
            ]}
            onPress={() => setactiveTab(2)}
          >
            <AppText
              color={activeTab == 2 ? 'white' : 'black'}
              size={activeTab == 2 ? 15 : 14}
              family={activeTab == 2 ? 'InterSemiBold' : 'InterMedium'}
            >
              Customer Information
            </AppText>
          </Pressable>
        </View>

        {activeTab == 1 && (
          <View style={styles.activeInnerContainer}>
            <View style={styles.dashCard}>
              <Pressable
                disabled={!customerPrimaryImage}
                onPress={() => openImageViewer(customerPrimaryImage)}
              >
                <MediaImage
                  path={customerPrimaryImage}
                  style={styles.firstImage}
                  resizeMode="cover"
                />
              </Pressable>

              <View style={styles.textHeading}>
                <AppText color="black" size={18} family="InterSemiBold" style={{ textTransform: 'capitalize' }}>
                  {customerData?.legal_name || '-'}
                </AppText>
                {!!customerAddress && (
                  <View style={[styles.row, { gap: 6, alignItems: 'flex-start' }]}>
                    <View style={{ marginTop: 1 }}>
                      <LocationIcon color={colors.gray} width={16} height={16} />
                    </View>
                    <AppText color="black" size={13} family="InterRegular" opacity={0.6} style={{ flex: 1 }}>
                      {customerAddress}
                    </AppText>
                  </View>
                )}
              </View>

              {(!!customerData?.registration_type || !!customerStatus || isMechanic) && (
                <View style={[styles.row, styles.chipRow]}>
                  {isMechanic && <MechanicCategoryBadge category={mechanicCategory?.category} />}
                  {!!customerData?.registration_type && (
                    <View style={[styles.chip, { backgroundColor: colors.goldSoft }]}>
                      <AppText size={12} color={colors.blue} family="InterSemiBold">
                        {customerData.registration_type}
                      </AppText>
                    </View>
                  )}
                  {!!customerStatus && (
                    <View style={[styles.chip, { backgroundColor: statusColor + '1A' }]}>
                      <AppText size={12} color={statusColor} family="InterSemiBold" style={{ textTransform: 'capitalize' }}>
                        {customerStatus.toLowerCase()}
                      </AppText>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.divider} />

              <View style={[styles.row, styles.quickActions]}>
                {[
                  { key: 'call', label: 'Call', icon: <PhoneICon />, onPress: handleCall },
                  { key: 'whatsapp', label: 'WhatsApp', icon: <WhatsappICon />, onPress: handleWhatsApp },
                  { key: 'email', label: 'Email', icon: <EmailIcon />, onPress: handleEmail },
                  { key: 'map', label: 'Location', icon: <LocationIcon />, onPress: handleLocation },
                ].map(action => (
                  <Pressable key={action.key} style={styles.quickAction} onPress={action.onPress}>
                    <View style={styles.quickActionIcon}>{action.icon}</View>
                    <AppText size={12} color="#2B2B2B" family="InterMedium">
                      {action.label}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            </View>

            {
              customerData && (
                <Pressable
                  style={[
                    styles.checkInButton,
                    styles.row,
                    { backgroundColor: checkInHanlde ? '#D64545' : colors.blue },
                    (checkInLoading) ? { opacity: 0.7 } : null,
                  ]}
                  onPress={() => {
                    if (customerData?.status == "REJECTED") {
                      Toast.show({
                        type: 'error',
                        text1: "Your customer is Rejected, you cannot check in this Customer"
                      })
                      return
                    }
                    if (routePunchInOut == true) {
                      handleCheckInOut()
                    } else {
                      if (routePunchInOut == false) {
                        Toast.show({ type: "error", text1: "Please Punch in your attendance" })
                      } else {
                        Toast.show({ type: "error", text1: "Your Today shift is end" })
                      }
                    }
                  }}
                  disabled={checkInLoading || loader}
                >
                  <CheckIcon color="white" />
                  <AppText size={15} color="#FDFDFD" family="InterSemiBold">
                    {checkInLoading
                      ? 'Processing...'
                      : checkInHanlde
                        ? 'Check Out'
                        : 'Check In'}
                  </AppText>
                </Pressable>
              )
            }
            {checkInHanlde && !!lastCheckinText && (
              <AppText size={12} color="black" family="InterRegular" opacity={0.6} align="center" style={{ marginTop: 8 }}>
                Checked in since {lastCheckinText}
              </AppText>
            )}

            {/* Who checked in / out at this customer and when */}
            <Pressable style={[styles.visitHistoryButton, styles.row]} onPress={() => setVisitHistoryVisible(true)}>
              <CalenderIcon />
              <AppText size={15} color={colors.blue} family="InterSemiBold">
                Visit History
              </AppText>
            </Pressable>
            <CustomerVisitHistory
              visible={visitHistoryVisible}
              customerId={routeItem?.customer_id || routeItem?.id}
              customerName={customerData?.legal_name}
              onClose={() => setVisitHistoryVisible(false)}
            />

            {isMechanic && (
              <View style={[styles.dashCard, { marginTop: 16 }]}>
                <View style={[styles.row, styles.headerRow]}>
                  <AppText size={16} color="black" family="InterSemiBold">
                    Mechanic Category
                  </AppText>
                  <MechanicCategoryBadge category={mechanicCategory?.category} />
                </View>
                {mechanicCategory ? (
                  <>
                    <View style={[styles.categoryBanner, { backgroundColor: mechanicCategoryColour(mechanicCategory.category) + '14' }]}>
                      <AppText size={22} color={mechanicCategoryColour(mechanicCategory.category)} family="InterBold">
                        {mechanicCategory.category}
                      </AppText>
                      <AppText size={12} color="#5C5C5C" family="InterMedium">
                        {mechanicCategory.level_code} · {mechanicCategory.period}
                      </AppText>
                    </View>
                    <View style={styles.infoGrid}>
                      {[
                        { label: 'Points (12 months)', value: formatNumber(mechanicCategory.points) },
                        { label: 'Coupon Scans', value: formatNumber(mechanicCategory.scans) },
                        { label: 'Months Scanned', value: `${mechanicCategory.active_months ?? 0} of 12` },
                        { label: 'Quarters Active', value: `${mechanicCategory.active_quarters ?? 0} of 4` },
                      ].map(info => (
                        <View key={info.label} style={styles.infoTile}>
                          <AppText size={12} color="#5C5C5C" family="InterMedium">
                            {info.label}
                          </AppText>
                          <AppText size={14} color="black" family="InterSemiBold" style={{ marginTop: 4 }}>
                            {info.value}
                          </AppText>
                        </View>
                      ))}
                    </View>
                  </>
                ) : (
                  <AppText size={13} color="black" family="InterRegular" opacity={0.6} style={{ marginTop: 10 }}>
                    No Gajra Gro coupon scan in the last 12 months, so this mechanic has no category yet.
                  </AppText>
                )}
              </View>
            )}

            {activityInfo.length > 0 && (
              <View style={[styles.dashCard, { marginTop: 16 }]}>
                <AppText size={16} color="black" family="InterSemiBold">
                  Orders & Visits
                </AppText>
                <View style={styles.infoGrid}>
                  {activityInfo.map(info => (
                    <View key={info.label} style={styles.infoTile}>
                      <AppText size={12} color="#5C5C5C" family="InterMedium">
                        {info.label}
                      </AppText>
                      <AppText size={14} color="black" family="InterSemiBold" style={{ marginTop: 4 }}>
                        {info.value}
                      </AppText>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={[styles.dashCard, { marginTop: 16 }]}>
              <AppText size={16} color="black" family="InterSemiBold">
                Overview
              </AppText>
              <View style={styles.infoGrid}>
                {dashboardInfo.map(info => (
                  <View key={info.label} style={styles.infoTile}>
                    <AppText size={12} color="#5C5C5C" family="InterMedium">
                      {info.label}
                    </AppText>
                    <AppText size={14} color="black" family="InterSemiBold" numLines={2} style={{ marginTop: 4 }}>
                      {info.value || '-'}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ height: 40 }} />
          </View>
        )
        }

        {
          activeTab == 2 && !route?.params?.type && (
            <View style={styles.activeInnerContainer}>
              <View style={styles.imageView}>
                <AppText size={16} color="black" family="InterSemiBold">
                  Customer Details
                </AppText>
                <View style={styles.detailsView}>
                  <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                    Shop Name
                  </AppText>
                  <View style={{ height: 10 }} />
                  <AppText color="black" size={14} family="InterBold">
                    {customerData?.legal_name || '-'}
                  </AppText>
                </View>

                <View style={[styles.row, styles.detailsRow]}>
                  <View style={styles.detailsFirstRow}>
                    <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                      Person Name
                    </AppText>
                    <View style={{ height: 10 }} />
                    <AppText color="black" size={14} family="InterBold">
                      {customerData?.contact_person || '-'}
                    </AppText>
                  </View>
                  <View style={styles.detailsSecondRow}>
                    <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                      Phone Number
                    </AppText>
                    <View style={{ height: 10 }} />
                    <AppText color="black" size={14} family="InterBold">
                      {customerData?.mobile ? `+91 ${formatMobileNumberList(customerData.mobile)[0] || normalizeIndianMobileNumber(customerData.mobile)}` : '+91 ---'}
                    </AppText>
                  </View>
                </View>

                <View style={[styles.row, styles.detailsRow]}>
                  <View style={styles.detailsFirstRow}>
                    <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                      Email Id
                    </AppText>
                    <View style={{ height: 10 }} />
                    <AppText color="black" size={14} family="InterBold">
                      {customerData?.email || '-'}
                    </AppText>
                  </View>
                  <View style={styles.detailsSecondRow}>
                    <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                      Customer Code
                    </AppText>
                    <View style={{ height: 10 }} />
                    <AppText color="black" size={14} family="InterBold">
                      {customerData?.distributor_code || '-'}
                    </AppText>
                  </View>
                </View>
              </View>

              <View style={[styles.imageView, { marginTop: 20 }]}>
                <View style={[styles.row, styles.headerRow]}>
                  <AppText size={16} color="black" family="InterSemiBold">
                    Location Details
                  </AppText>
                  <Pressable style={styles.button} onPress={handleLocation}>
                    <AppText size={12} color="#FDFDFD" family="InterSemiBold">
                      View Location
                    </AppText>
                  </Pressable>
                </View>

                <View style={[styles.detailsView, { marginTop: 15 }]}>
                  <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                    Shop Address
                  </AppText>
                  <View style={{ height: 10 }} />
                  <AppText color="black" size={14} family="InterBold">
                    {customerData?.billing_address || 'Indian Water Technology.com'}
                  </AppText>
                </View>

                <View style={[styles.row, styles.detailsRow]}>
                  <View style={styles.detailsFirstRow}>
                    <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                      Town Name
                    </AppText>
                    <View style={{ height: 10 }} />
                    <AppText color="black" size={14} family="InterBold">
                      {customerData?.billing_city?.city_name || '-'}
                    </AppText>
                  </View>
                  <View style={styles.detailsSecondRow}>
                    <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                      Pin Code
                    </AppText>
                    <View style={{ height: 10 }} />
                    <AppText color="black" size={14} family="InterBold">
                      {customerData?.billing_pincode?.pincode || '-'}
                    </AppText>
                  </View>
                </View>

                <View style={[styles.row, styles.detailsRow]}>
                  <View style={styles.detailsFirstRow}>
                    <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                      Type
                    </AppText>
                    <View style={{ height: 10 }} />
                    <AppText color="black" size={14} family="InterBold">
                      {customerData?.registration_type || '-'}
                    </AppText>
                  </View>
                </View>
              </View>

              <View style={[styles.imageView, { marginTop: 20 }]}>
                <AppText size={16} color="black" family="InterSemiBold">
                  Attachments
                </AppText>
                <View style={[styles.row, { flex: 1, gap: 27, marginTop: 20 }]}>
                  <Pressable style={styles.firstAttachemnt} onPress={() => {
                    openImageViewer(customerData?.shop_image)
                  }}>
                    <MediaImage
                      style={styles.attImg}
                      path={customerData?.shop_image}
                    />
                    <AppText align="center" size={14} color="black" family="InterBold">
                      Outlet Image
                    </AppText>
                  </Pressable>

                  <View style={styles.firstAttachemnt}>
                    {
                      route?.params?.type ?
                        <MediaImage
                          style={styles.attImg}
                          path={customerData?.owner_photo}
                        />
                        : (
                          <>
                            {
                              documents && Array.isArray(documents) && (
                                <MediaImage
                                  style={styles.attImg}
                                  path={documents[0]}
                                />
                              )
                            }
                          </>
                        )
                    }


                    <AppText align="center" size={14} color="black" family="InterBold">
                      Visiting Card
                    </AppText>
                  </View>
                </View>
              </View>

              <View style={[styles.imageView, { marginTop: 20 }]}>
                <AppText size={16} color="black" family="InterSemiBold">
                  Additional Information
                </AppText>

                <View style={[styles.row, styles.detailsRow]}>
                  <View style={styles.detailsFirstRow}>
                    <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                      GSTIN No.
                    </AppText>
                    <View style={{ height: 10 }} />
                    <AppText color="black" size={14} family="InterBold">
                      {customerData?.gst_number || '-'}
                    </AppText>
                  </View>
                  <View style={styles.detailsSecondRow}>
                    <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                      PAN No.
                    </AppText>
                    <View style={{ height: 10 }} />
                    <AppText color="black" size={14} family="InterBold">
                      {customerData?.pan_number || '-'}
                    </AppText>
                  </View>
                </View>

                <View style={[styles.row, styles.detailsRow]}>
                  <View style={styles.detailsFirstRow}>
                    <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                      Aadhar Card No.
                    </AppText>
                    <View style={{ height: 10 }} />
                    <AppText color="black" size={14} family="InterBold">
                      -
                    </AppText>
                  </View>
                  <View style={styles.detailsSecondRow}>
                    <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                      Other
                    </AppText>
                    <View style={{ height: 10 }} />
                    <AppText color="black" size={14} family="InterBold">
                      -
                    </AppText>
                  </View>
                </View>
              </View>
              {
                route?.params?.type && (
                  <Pressable style={styles.edit} onPress={() => {
                    if (!route?.params?.type) {
                      navigation.navigate('AddCustomer', { customer: customerData })
                    } else {
                      navigation.navigate('AddSecondaryCustomer', {
                        customer: data,
                        type: data?.type || data?.customer_type || routeItem?.type,
                        customerTypeId: data?.customer_type_id || data?.customertype || routeItem?.customer_type_id,
                        customerTypeName: data?.customer_type || data?.type || routeItem?.customer_type,
                      })
                    }
                  }}>
                    <AppText color='white' family='InterSemiBold' size={16}>Edit</AppText>
                  </Pressable>
                )
              }


              <View style={{ height: 80 }} />
            </View>
          )
        }
        {
          activeTab == 2 && route?.params?.type && (
            <View style={{flex: 1, }}>
              {/* i want to show create_by name  */}
              <View style={{}}>
                <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                  Created By
                </AppText>
                <View style={{ height: 6 }} />
                <AppText color="black" size={14} family="InterBold">
                  {customerData?.creator || '-'}
                </AppText>
              </View>
            </View>
          )
        }
        {activeTab === 2 && route?.params?.type && (
          <View style={styles.activeInnerContainer}>
            <View style={styles.imageView}>
              <AppText size={16} color="black" family="InterSemiBold">
                Customer Details
              </AppText>

              {/* Shop & Owner Info */}
              <View style={styles.detailsView}>
                <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                  Shop Name
                </AppText>
                <View style={{ height: 6 }} />
                <AppText color="black" size={14} family="InterBold">
                  {customerData?.legal_name || customerData?.shop_name || '-'}
                </AppText>
              </View>

              <View style={styles.detailsView}>
                <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                  Owner Name
                </AppText>
                <View style={{ height: 6 }} />
                <AppText color="black" size={14} family="InterBold">
                  {customerData?.contact_person || customerData?.owner_name || '-'}
                </AppText>
              </View>

              <View style={styles.detailsView}>
                <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                  Mobile Numbers
                </AppText>
                <View style={{ height: 6 }} />

                {(() => {
                  if (!customerData?.mobile || !customerData.mobile.trim()) {
                    return (
                      <AppText color="black" size={14} family="InterBold">
                        -
                      </AppText>
                    );
                  }

                  const numbers = formatMobileNumberList(customerData.mobile);

                  if (numbers.length === 0) {
                    return (
                      <AppText color="black" size={14} family="InterBold">
                        -
                      </AppText>
                    );
                  }

                  return numbers.map((num: any, index: number) => (
                    <AppText
                      key={index}
                      color="black"
                      size={14}
                      family="InterBold"
                      style={{ marginBottom: 2 }} // optional spacing between lines
                    >
                      {index + 1}. +91 {num}
                    </AppText>
                  ));
                })()}
              </View>
            </View>

            {/* Address */}
            <View style={[styles.imageView, { marginTop: 20 }]}>
              <View style={[styles.row, styles.headerRow]}>
                <AppText size={16} color="black" family="InterSemiBold">
                  Location Details
                </AppText>
                <Pressable style={styles.button} onPress={handleLocation}>
                  <AppText size={12} color="#FDFDFD" family="InterSemiBold">
                    View Location
                  </AppText>
                </Pressable>
              </View>

              <View style={styles.detailsView}>
                <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                  Address Line
                </AppText>
                <View style={{ height: 6 }} />
                <AppText color="black" size={14} family="InterBold">
                  {customerData?.billing_address || customerData?.address_line || '-'}
                </AppText>
              </View>

              <View style={[styles.row, styles.detailsRow]}>
                <View style={styles.detailsFirstRow}>
                  <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                    State
                  </AppText>
                  <View style={{ height: 6 }} />
                  <AppText color="black" size={14} family="InterBold">
                    {customerData?.state || '-'}
                  </AppText>
                </View>
                <View style={styles.detailsSecondRow}>
                  <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                    District
                  </AppText>
                  <View style={{ height: 6 }} />
                  <AppText color="black" size={14} family="InterBold">
                    {customerData?.district || '-'}
                  </AppText>
                </View>
              </View>

              <View style={[styles.row, styles.detailsRow]}>
                <View style={styles.detailsFirstRow}>
                  <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                    City
                  </AppText>
                  <View style={{ height: 6 }} />
                  <AppText color="black" size={14} family="InterBold">
                    {customerData?.city || customerData?.billing_city || '-'}
                  </AppText>
                </View>
                <View style={styles.detailsSecondRow}>
                  <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                    Pincode
                  </AppText>
                  <View style={{ height: 6 }} />
                  <AppText color="black" size={14} family="InterBold">
                    {customerData?.billing_pincode || '-'}
                  </AppText>
                </View>
              </View>

              <View style={styles.detailsView}>
                <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                  GPS Location
                </AppText>
                <View style={{ height: 6 }} />
                <AppText color="black" size={14} family="InterBold">
                  {customerData?.gps_location || 'Not available'}
                </AppText>
              </View>
            </View>

            {/* Distributor & Beat */}
            <View style={[styles.imageView, { marginTop: 20 }]}>
              <AppText size={16} color="black" family="InterSemiBold">
                Additional Information
              </AppText>

              <View style={styles.detailsView}>
                <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                  Distributor Name
                </AppText>
                <View style={{ height: 6 }} />
                <AppText color="black" size={14} family="InterBold">
                  {customerData?.distributor_name || '-'}
                </AppText>
              </View>

              <View style={styles.detailsView}>
                <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                  Beat
                </AppText>
                <View style={{ height: 6 }} />
                <AppText color="black" size={14} family="InterBold">
                  {customerData?.beat_name || '-'}
                </AppText>
              </View>

              <View style={styles.detailsView}>
                <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                  Belt / Area / Market Name
                </AppText>
                <View style={{ height: 6 }} />
                <AppText color="black" size={14} family="InterBold">
                  {customerData?.belt_area_market_name || '-'}
                </AppText>
              </View>
            </View>

            {/* Bank & Tax */}
            <View style={[styles.imageView, { marginTop: 20 }]}>
              <AppText size={16} color="black" family="InterSemiBold">
                Bank & Tax Information
              </AppText>

              <View style={[styles.row, styles.detailsRow]}>
                <View style={styles.detailsFirstRow}>
                  <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                    GST Number
                  </AppText>
                  <View style={{ height: 6 }} />
                  <AppText color="black" size={14} family="InterBold">
                    {customerData?.gst_number || '-'}
                  </AppText>
                </View>
                <View style={styles.detailsSecondRow}>
                  <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                    PAN Number
                  </AppText>
                  <View style={{ height: 6 }} />
                  <AppText color="black" size={14} family="InterBold">
                    {customerData?.pan_number || '-'}
                  </AppText>
                </View>
              </View>

              <View style={[styles.row, styles.detailsRow]}>
                <View style={styles.detailsFirstRow}>
                  <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                    Account Holder Name
                  </AppText>
                  <View style={{ height: 6 }} />
                  <AppText color="black" size={14} family="InterBold">
                    {customerData?.account_holder_name || '-'}
                  </AppText>
                </View>
                <View style={styles.detailsSecondRow}>
                  <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                    Bank Account Number
                  </AppText>
                  <View style={{ height: 6 }} />
                  <AppText color="black" size={14} family="InterBold">
                    {customerData?.bank_account_number || '-'}
                  </AppText>
                </View>
              </View>

              <View style={[styles.row, styles.detailsRow]}>
                <View style={styles.detailsFirstRow}>
                  <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                    Bank Name
                  </AppText>
                  <View style={{ height: 6 }} />
                  <AppText color="black" size={14} family="InterBold">
                    {customerData?.bank_name || '-'}
                  </AppText>
                </View>
                <View style={styles.detailsSecondRow}>
                  <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                    IFSC Code
                  </AppText>
                  <View style={{ height: 6 }} />
                  <AppText color="black" size={14} family="InterBold">
                    {customerData?.ifsc_code || '-'}
                  </AppText>
                </View>
              </View>

              <View style={styles.detailsView}>
                <AppText color="black" size={14} family="InterMedium" opacity={0.8}>
                  Account Type
                </AppText>
                <View style={{ height: 6 }} />
                <AppText color="black" size={14} family="InterBold">
                  {customerData?.bank_account_type || '-'}
                </AppText>
              </View>
            </View>

            {/* Attachments */}
            <View style={[styles.imageView, { marginTop: 20 }]}>
              <AppText size={16} color="black" family="InterSemiBold">
                Attachments
              </AppText>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 16 }}>
                {customerAttachments.map(attachment => (
                  <Pressable
                    key={attachment.key}
                    style={{ width: '48%', marginBottom: 16 }}
                    onPress={() => openImageViewer(attachment.value)}
                  >
                    <MediaImage
                      style={{ height: 140, width: '100%', borderRadius: 12 }}
                      path={attachment.value}
                      resizeMode="cover"
                    />
                    <AppText align="center" size={13} color="black" family="InterBold" style={{ marginTop: 6 }}>
                      {attachment.label}
                    </AppText>
                  </Pressable>
                ))}

                {customerAttachments.length === 0 && (
                  <AppText size={14} color="black" family="InterRegular" opacity={0.6}>
                    No attachments available
                  </AppText>
                )}
              </View>
            </View>

            {/* Edit Button */}
            {
              route?.params?.type && (
                <Pressable
                  style={styles.edit}
                  onPress={() => {
                    if (!route?.params?.type) {
                      navigation.navigate('AddCustomer', { customer: customerData });
                    } else {
                      navigation.navigate('AddSecondaryCustomer', {
                        customer: data,
                        type: data?.type || data?.customer_type || routeItem?.type,
                        customerTypeId: data?.customer_type_id || data?.customertype || routeItem?.customer_type_id,
                        customerTypeName: data?.customer_type || data?.type || routeItem?.customer_type,
                      });
                    }
                  }}
                >
                  <AppText color="white" family="InterSemiBold" size={16}>
                    Edit
                  </AppText>
                </Pressable>
              )
            }


            <View style={{ height: 60 }} />
          </View>
        )}


        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={closeModal}
          statusBarTranslucent
        // supportedOrientations={['portrait', 'landscape']}
        >
          <View style={styles.modalContainer}>

            <Pressable style={{ height: 55, width: 55, marginTop: useSafeAreaInsets()?.top, justifyContent: 'center', alignItems: 'center', alignSelf: "flex-end", marginRight: 8 }} onPress={() => {
              setImages([]);
              setModalVisible(false)
            }}>
              <CrossIcon size={30} color="white" />
            </Pressable>
            <Gallery
              data={images} // already an array
              ref={galleryRef}
              initialIndex={initialIndex}
              style={{ flex: 1 }}
              pinchEnabled={true}
              doubleTapEnabled={true}
              doubleTapScale={2.5}
              maxScale={6}
              minScale={0.8}
              disableSwipeUp
              disableVerticalSwipe
              loop={false}
              onScaleChange={(scale) => console.log('Current zoom scale:', scale)}
              onIndexChange={(idx) => console.log('Swiped to image:', idx + 1)}


            />
          </View>
        </Modal>
      </ScrollView >

    </View >
  )
}

export default CustomerDetails
