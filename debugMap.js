var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
require('dotenv').config({ path: '.env.local' });
var admin = require('firebase-admin');
// Initialize Firebase Admin
if (!admin.apps.length) {
    var cert = void 0;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        try {
            var jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
            // It looks like it's a JSON string inside env, maybe with literal \n escapes. 
            // We parse it. If it fails, maybe we have to remove newlines.
            cert = JSON.parse(jsonStr.replace(/\\n/g, '\n'));
        }
        catch (e) {
            try {
                cert = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
            }
            catch (err2) {
                console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON", err2);
            }
        }
    }
    admin.initializeApp({
        credential: cert ? admin.credential.cert(cert) : admin.credential.applicationDefault()
    });
}
var db = admin.firestore();
function run() {
    return __awaiter(this, void 0, void 0, function () {
        function getDeptCoords(dept, country) {
            if ((country || 'HN').toUpperCase() !== 'HN' || !dept)
                return null;
            var key = dept.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            var match = Object.entries(HN_DEPT_COORDS_1).find(function (_a) {
                var k = _a[0];
                return k.startsWith(key) || key.startsWith(k);
            });
            return match ? match[1] : null;
        }
        var businessesSnap, usersSnap, businesses, users, logs, HN_DEPT_COORDS_1, _i, businesses_1, data, lat, lng, hasLocation, isFallback, fb, plan, planSource, isVip, isTrialExpired, trialEndMs, recordInfo, _a, users_1, data, isExcludedByDeduplication, loc, hasLocation, willBeMapped, isVip, subStatus, trialEndAt, isTrialExpired, recordInfo, error_1;
        var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
        return __generator(this, function (_t) {
            switch (_t.label) {
                case 0:
                    _t.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, db.collection('businesses_public').get()];
                case 1:
                    businessesSnap = _t.sent();
                    return [4 /*yield*/, db.collection('users').get()];
                case 2:
                    usersSnap = _t.sent();
                    businesses = businessesSnap.docs.map(function (d) { return (__assign({ id: d.id }, d.data())); });
                    users = usersSnap.docs.map(function (d) { return (__assign({ id: d.id }, d.data())); });
                    logs = {
                        totalBusinessesLoaded: businesses.length,
                        totalUsersLoaded: users.length,
                        businessesWithValidGeo: 0,
                        usersWithValidGeo: 0,
                        vipCases: [],
                        expiredCases: [],
                    };
                    HN_DEPT_COORDS_1 = {
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
                    // Analyze businesses
                    for (_i = 0, businesses_1 = businesses; _i < businesses_1.length; _i++) {
                        data = businesses_1[_i];
                        lat = (_c = (_b = data.location) === null || _b === void 0 ? void 0 : _b.lat) !== null && _c !== void 0 ? _c : data.lat;
                        lng = (_e = (_d = data.location) === null || _d === void 0 ? void 0 : _d.lng) !== null && _e !== void 0 ? _e : data.lng;
                        hasLocation = Boolean(lat && lng && lat !== 0 && lng !== 0);
                        isFallback = false;
                        if (!hasLocation) {
                            fb = getDeptCoords(data.department, data.country);
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
                        plan = (_g = (_f = data.planData) === null || _f === void 0 ? void 0 : _f.plan) !== null && _g !== void 0 ? _g : 'free';
                        planSource = (_h = data.planData) === null || _h === void 0 ? void 0 : _h.planSource;
                        isVip = plan === 'vip' || planSource === 'collaborator_beta';
                        isTrialExpired = ((_j = data.planData) === null || _j === void 0 ? void 0 : _j.planStatus) === 'expired';
                        if ((_k = data.planData) === null || _k === void 0 ? void 0 : _k.trialEndDate) {
                            trialEndMs = data.planData.trialEndDate._seconds
                                ? data.planData.trialEndDate._seconds * 1000
                                : (data.planData.trialEndDate.toMillis ? data.planData.trialEndDate.toMillis() : (typeof data.planData.trialEndDate === 'number' ? data.planData.trialEndDate : undefined));
                            if (trialEndMs && trialEndMs < Date.now())
                                isTrialExpired = true;
                        }
                        recordInfo = {
                            id: data.id,
                            type: 'business',
                            name: data.name,
                            country: data.country,
                            hasLocation: hasLocation,
                            isFallbackGeo: isFallback,
                            lat: lat,
                            lng: lng,
                            department: data.department,
                            plan: plan,
                            planSource: planSource,
                            isVip: isVip,
                            planStatus: (_l = data.planData) === null || _l === void 0 ? void 0 : _l.planStatus,
                            isTrialExpired: isTrialExpired,
                        };
                        if (isVip) {
                            logs.vipCases.push(recordInfo);
                        }
                        if (isTrialExpired) {
                            logs.expiredCases.push(recordInfo);
                        }
                    }
                    // Analyze users
                    for (_a = 0, users_1 = users; _a < users_1.length; _a++) {
                        data = users_1[_a];
                        isExcludedByDeduplication = false;
                        if (((_m = data.roles) === null || _m === void 0 ? void 0 : _m.provider) === true && data.isBusinessActive === true && data.businessProfileId) {
                            isExcludedByDeduplication = true;
                        }
                        loc = data.userLocation;
                        hasLocation = Boolean(loc && loc.lat && loc.lng && loc.lat !== 0 && loc.lng !== 0);
                        willBeMapped = hasLocation && !isExcludedByDeduplication;
                        if (willBeMapped) {
                            logs.usersWithValidGeo++;
                        }
                        isVip = data.isVip === true || ((_o = data.subscription) === null || _o === void 0 ? void 0 : _o.plan) === 'vip' || data.selectedPlan === 'vip';
                        subStatus = ((_p = data.subscription) === null || _p === void 0 ? void 0 : _p.status) || 'active';
                        trialEndAt = (_q = data.subscription) === null || _q === void 0 ? void 0 : _q.trialEndAt;
                        isTrialExpired = subStatus === 'expired' || (trialEndAt && trialEndAt < Date.now());
                        recordInfo = {
                            id: data.id,
                            type: 'user',
                            name: data.displayName || ((_r = data.clientProfile) === null || _r === void 0 ? void 0 : _r.fullName) || data.email,
                            country: data.country_code || (loc === null || loc === void 0 ? void 0 : loc.countryCode),
                            hasLocation: hasLocation,
                            willBeMapped: willBeMapped, // enters the dataset?
                            isExcludedByDeduplication: isExcludedByDeduplication,
                            isVip: isVip,
                            isTrialExpired: isTrialExpired,
                            roles: data.roles,
                            isVipFlag: data.isVip,
                            subscriptionPlan: (_s = data.subscription) === null || _s === void 0 ? void 0 : _s.plan,
                            selectedPlan: data.selectedPlan,
                            subStatus: subStatus,
                            trialEndAt: trialEndAt,
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
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _t.sent();
                    console.error("ERROR:", error_1);
                    process.exit(1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
run();
