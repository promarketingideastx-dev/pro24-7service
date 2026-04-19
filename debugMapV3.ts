require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

try {
  let certStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '';
  certStr = certStr.replace(/\\n/g, '\n');
  const cert = JSON.parse(certStr);

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: 'service-marketplace-mvp-28884',
      clientEmail: cert.client_email,
      privateKey: cert.private_key,
    })
  });
} catch (e) {
  console.log("fallback init...");
  // fallback if needed
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

async function run() {
  try {
    const businessesSnap = await db.collection('businesses_public').get();
    const usersSnap = await db.collection('users').get();

    const businesses = businessesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    const users = usersSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    const logs = {
      totalBusinessesLoaded: businesses.length,
      totalUsersLoaded: users.length,
      businessesWithValidGeo: 0,
      usersWithValidGeo: 0,
      vipCases: [] as any[],
      expiredCases: [] as any[],
    };

    const HN_DEPT_COORDS = {
        'atlantida': [15.7697, -86.7862], 'choluteca': [13.2999, -87.1919],
        'colon': [15.8620, -86.0205], 'comayagua': [14.4532, -87.6376],
        'copan': [14.8380, -89.1465], 'cortes': [15.5031, -88.0255],
        'el paraiso': [13.7791, -86.3631], 'francisco morazan': [14.0899, -87.2021],
        'gracias a dios': [15.9264, -84.5311], 'intibuca': [14.3154, -88.1769],
        'islas de la bahia': [16.3350, -86.5291], 'la paz': [14.3200, -87.6738],
        'lempira': [14.4338, -88.5727], 'ocotepeque': [14.4365, -89.1832],
        'olancho': [14.7870, -86.2395], 'santa barbara': [14.9196, -88.2348],
        'valle': [13.4441, -87.7311], 'yoro': [15.1400, -87.1259],
    };

    function getDeptCoords(Object: any, dept: any, country: any) {
        if ((country || 'HN').toUpperCase() !== 'HN' || !dept) return null;
        const key = String(dept).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const match = Object.entries(HN_DEPT_COORDS).find(([k]) =>
            k.startsWith(key) || key.startsWith(k)
        );
        return match ? match[1] : null;
    }

    // Analyze businesses
    for (const data of businesses) {
      let lat = data.location?.lat ?? data.lat;
      let lng = data.location?.lng ?? data.lng;
      
      let hasLocation = Boolean(lat && lng && lat !== 0 && lng !== 0);
      let isFallback = false;
      if (!hasLocation) {
         const fb = getDeptCoords(Object, data.department, data.country);
         if (fb) {
             lat = fb[0];
             lng = fb[1];
             hasLocation = true;
             isFallback = true;
         }
      }

      if (hasLocation) {
        logs.businessesWithValidGeo++;
      }

      const plan = data.planData?.plan ?? 'free';
      const planSource = data.planData?.planSource;
      const isVip = plan === 'vip' || planSource === 'collaborator_beta';
      
      let isTrialExpired = data.planData?.planStatus === 'expired';
      if (data.planData?.trialEndDate) {
        const trialEndMs = data.planData.trialEndDate._seconds 
          ? data.planData.trialEndDate._seconds * 1000 
          : (data.planData.trialEndDate.toMillis ? data.planData.trialEndDate.toMillis() : (typeof data.planData.trialEndDate === 'number' ? data.planData.trialEndDate : undefined));
        if (trialEndMs && trialEndMs < Date.now()) isTrialExpired = true;
      }

      const recordInfo = {
        id: data.id,
        type: 'business',
        name: data.name,
        country: data.country,
        hasLocation,
        isFallbackGeo: isFallback,
        lat, lng,
        department: data.department,
        plan, planSource,
        isVip,
        planStatus: data.planData?.planStatus,
        isTrialExpired,
      };

      if (isVip) {
        logs.vipCases.push(recordInfo);
      }

      if (isTrialExpired) {
        logs.expiredCases.push(recordInfo);
      }
    }

    // Analyze users
    for (const data of users) {
      // Deduplication like in UI
      let isExcludedByDeduplication = false;
      if (data.roles?.provider === true && data.isBusinessActive === true && data.businessProfileId) {
        isExcludedByDeduplication = true;
      }

      const loc = data.userLocation;
      const hasLocation = Boolean(loc && loc.lat && loc.lng && loc.lat !== 0 && loc.lng !== 0);

      const willBeMapped = hasLocation && !isExcludedByDeduplication;
      if (willBeMapped) {
        logs.usersWithValidGeo++;
      }

      const isVip = data.isVip === true || data.subscription?.plan === 'vip' || data.selectedPlan === 'vip';
      
      const subStatus = data.subscription?.status || 'active';
      const trialEndAt = data.subscription?.trialEndAt;
      const isTrialExpired = subStatus === 'expired' || (trialEndAt && trialEndAt < Date.now());

      const recordInfo = {
        id: data.id,
        type: 'user',
        name: data.displayName || data.clientProfile?.fullName || data.email,
        country: data.country_code || loc?.countryCode,
        hasLocation,
        willBeMapped, 
        isExcludedByDeduplication,
        isVip,
        isTrialExpired,
        roles: data.roles,
        isVipFlag: data.isVip,
        subscriptionPlan: data.subscription?.plan,
        selectedPlan: data.selectedPlan,
        subStatus,
        trialEndAt,
      };

      if (isVip) {
        logs.vipCases.push(recordInfo);
      }

      if (isTrialExpired) {
        logs.expiredCases.push(recordInfo);
      }
    }

    console.log(JSON.stringify(logs, null, 2));
    process.exit(0);
  } catch (error: any) {
    console.error("ERROR:", error);
    process.exit(1);
  }
}

run();
