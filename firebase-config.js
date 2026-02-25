/* ============================================
   THE FIT SHOP — Firebase Cloud Sync
   Connects checkout + dashboard to Firestore
   so orders sync across all devices in real time.
   ============================================ */

// ── Firebase project config ──────────────────
var firebaseConfig = {
  apiKey:            "AIzaSyBjBhiOTOiFLUOZDcwLjgIfG4fUDcoxHkE",
  authDomain:        "thefitshop-19e78.firebaseapp.com",
  projectId:         "thefitshop-19e78",
  storageBucket:     "thefitshop-19e78.firebasestorage.app",
  messagingSenderId: "709892472456",
  appId:             "1:709892472456:web:d114dd1e002c4a728c693d"
};

// ── Initialise Firebase ──────────────────────
var _fbReady = false;
try {
  if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== 'YOUR_API_KEY') {
    firebase.initializeApp(firebaseConfig);
    var db = firebase.firestore();
    _fbReady = true;
    console.log('[FitShop] Firebase initialised OK');
  } else {
    console.warn('[FitShop] Firebase SDK not loaded — typeof firebase:', typeof firebase);
  }
} catch (e) {
  console.warn('[FitShop] Firebase init failed:', e.message);
}

// ── Save a single order to Firestore ─────────
function saveOrderToCloud(order) {
  if (!_fbReady) return Promise.resolve();
  return db.collection('fitshop_orders').doc(order.id).set(order)
    .catch(function (e) { console.error('[Firebase] Save order failed:', e); });
}

// ── Save delivery status to Firestore ────────
function saveStatusToCloud(orderId, status) {
  if (!_fbReady) return Promise.resolve();
  return db.collection('fitshop_order_statuses').doc(orderId).set({ status: status })
    .catch(function (e) { console.error('[Firebase] Save status failed:', e); });
}

// ── Save stock levels to Firestore ───────────
function saveStockToCloud(stock) {
  if (!_fbReady) return Promise.resolve();
  return db.collection('fitshop_settings').doc('stock').set(stock)
    .catch(function (e) { console.error('[Firebase] Save stock failed:', e); });
}

// ── Save cost prices to Firestore ────────────
function saveCostsToCloud(costs) {
  if (!_fbReady) return Promise.resolve();
  return db.collection('fitshop_settings').doc('costs').set(costs)
    .catch(function (e) { console.error('[Firebase] Save costs failed:', e); });
}

// ── One-time fetch: orders → localStorage ────
function syncOrdersFromCloud() {
  if (!_fbReady) return Promise.resolve([]);
  return db.collection('fitshop_orders').get().then(function (snap) {
    var orders = [];
    snap.forEach(function (doc) { orders.push(doc.data()); });
    orders.sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
    localStorage.setItem('fitshop_orders', JSON.stringify(orders));
    return orders;
  }).catch(function (e) {
    console.error('[Firebase] Sync orders failed:', e);
    return JSON.parse(localStorage.getItem('fitshop_orders')) || [];
  });
}

// ── One-time fetch: statuses → localStorage ──
function syncStatusesFromCloud() {
  if (!_fbReady) return Promise.resolve({});
  return db.collection('fitshop_order_statuses').get().then(function (snap) {
    var statuses = {};
    snap.forEach(function (doc) { statuses[doc.id] = doc.data().status; });
    localStorage.setItem('fitshop_order_statuses', JSON.stringify(statuses));
    return statuses;
  }).catch(function (e) {
    console.error('[Firebase] Sync statuses failed:', e);
    return JSON.parse(localStorage.getItem('fitshop_order_statuses')) || {};
  });
}

// ── One-time fetch: stock → localStorage ─────
function syncStockFromCloud() {
  if (!_fbReady) return Promise.resolve({});
  return db.collection('fitshop_settings').doc('stock').get().then(function (doc) {
    if (doc.exists) {
      localStorage.setItem('fitshop_stock', JSON.stringify(doc.data()));
      return doc.data();
    }
    return JSON.parse(localStorage.getItem('fitshop_stock')) || {};
  }).catch(function (e) {
    console.error('[Firebase] Sync stock failed:', e);
    return JSON.parse(localStorage.getItem('fitshop_stock')) || {};
  });
}

// ── One-time fetch: costs → localStorage ─────
function syncCostsFromCloud() {
  if (!_fbReady) return Promise.resolve({});
  return db.collection('fitshop_settings').doc('costs').get().then(function (doc) {
    if (doc.exists) {
      localStorage.setItem('fitshop_costs', JSON.stringify(doc.data()));
      return doc.data();
    }
    return JSON.parse(localStorage.getItem('fitshop_costs')) || {};
  }).catch(function (e) {
    console.error('[Firebase] Sync costs failed:', e);
    return JSON.parse(localStorage.getItem('fitshop_costs')) || {};
  });
}

// ── Real-time listener: auto-refresh dashboard when orders change ──
var _ordersUnsub = null;
function listenOrdersRealtime(onUpdate) {
  if (!_fbReady) return;
  if (_ordersUnsub) _ordersUnsub();           // prevent duplicate listeners
  _ordersUnsub = db.collection('fitshop_orders').onSnapshot(function (snap) {
    var orders = [];
    snap.forEach(function (doc) { orders.push(doc.data()); });
    orders.sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
    localStorage.setItem('fitshop_orders', JSON.stringify(orders));
    if (typeof onUpdate === 'function') onUpdate(orders);
  }, function (e) {
    console.error('[Firebase] Real-time orders listener error:', e);
  });
}

// ── Real-time listener: statuses ─────────────
var _statusesUnsub = null;
function listenStatusesRealtime(onUpdate) {
  if (!_fbReady) return;
  if (_statusesUnsub) _statusesUnsub();
  _statusesUnsub = db.collection('fitshop_order_statuses').onSnapshot(function (snap) {
    var statuses = {};
    snap.forEach(function (doc) { statuses[doc.id] = doc.data().status; });
    localStorage.setItem('fitshop_order_statuses', JSON.stringify(statuses));
    if (typeof onUpdate === 'function') onUpdate(statuses);
  }, function (e) {
    console.error('[Firebase] Real-time statuses listener error:', e);
  });
}

// ── Real-time listener: stock ────────────────
var _stockUnsub = null;
function listenStockRealtime(onUpdate) {
  if (!_fbReady) return;
  if (_stockUnsub) _stockUnsub();
  _stockUnsub = db.collection('fitshop_settings').doc('stock').onSnapshot(function (doc) {
    if (doc.exists) {
      localStorage.setItem('fitshop_stock', JSON.stringify(doc.data()));
      if (typeof onUpdate === 'function') onUpdate(doc.data());
    }
  }, function (e) {
    console.error('[Firebase] Real-time stock listener error:', e);
  });
}

// ── Save tracking number to Firestore ────────
function saveTrackingToCloud(orderId, trackingNumber) {
  if (!_fbReady) return Promise.resolve();
  return db.collection('fitshop_order_tracking').doc(orderId).set({
    trackingNumber: trackingNumber,
    updatedAt: new Date().toISOString()
  }).catch(function (e) { console.error('[Firebase] Save tracking failed:', e); });
}

// ── One-time fetch: tracking → localStorage ──
function syncTrackingFromCloud() {
  if (!_fbReady) return Promise.resolve({});
  return db.collection('fitshop_order_tracking').get().then(function (snap) {
    var tracking = {};
    snap.forEach(function (doc) {
      tracking[doc.id] = doc.data().trackingNumber || '';
    });
    localStorage.setItem('fitshop_order_tracking', JSON.stringify(tracking));
    return tracking;
  }).catch(function (e) {
    console.error('[Firebase] Sync tracking failed:', e);
    return JSON.parse(localStorage.getItem('fitshop_order_tracking')) || {};
  });
}

// ── Real-time listener: tracking ─────────────
var _trackingUnsub = null;
function listenTrackingRealtime(onUpdate) {
  if (!_fbReady) return;
  if (_trackingUnsub) _trackingUnsub();
  _trackingUnsub = db.collection('fitshop_order_tracking').onSnapshot(function (snap) {
    var tracking = {};
    snap.forEach(function (doc) {
      tracking[doc.id] = doc.data().trackingNumber || '';
    });
    localStorage.setItem('fitshop_order_tracking', JSON.stringify(tracking));
    if (typeof onUpdate === 'function') onUpdate(tracking);
  }, function (e) {
    console.error('[Firebase] Real-time tracking listener error:', e);
  });
}

// ── Get tracking for a single order (customer-facing) ──
function getTrackingFromCloud(orderId) {
  if (!_fbReady) return Promise.resolve(null);
  return db.collection('fitshop_order_tracking').doc(orderId).get().then(function (doc) {
    if (doc.exists) return doc.data();
    return null;
  }).catch(function (e) {
    console.error('[Firebase] Get tracking failed:', e);
    return null;
  });
}

// ── Save a single product to Firestore products collection ──
function saveProductToCloud(product) {
  if (!_fbReady) return Promise.resolve();
  return db.collection('fitshop_products').doc(String(product.id)).set(product)
    .catch(function (e) { console.error('[Firebase] Save product failed:', e); });
}

// ── Fetch all products from Firestore products collection ──
function syncProductsFromCloud() {
  if (!_fbReady) {
    console.warn('[FitShop] Firestore fetch skipped — Firebase not ready (_fbReady=false)');
    return Promise.resolve({});
  }
  console.log('[FitShop] Fetching products from Firestore...');
  return db.collection('fitshop_products').get().then(function (snap) {
    var products = {};
    snap.forEach(function (doc) { products[doc.id] = doc.data(); });
    console.log('[FitShop] Firestore fetch OK —', Object.keys(products).length, 'products loaded');
    return products;
  }).catch(function (e) {
    console.error('[FitShop] Firestore fetch failed:', e);
    return {};
  });
}

// ── Get Royal Mail submission status ─────────
function getRoyalMailStatusFromCloud(orderId) {
  if (!_fbReady) return Promise.resolve(null);
  return db.collection('fitshop_order_royal_mail').doc(orderId).get().then(function (doc) {
    if (doc.exists) return doc.data();
    return null;
  }).catch(function (e) {
    console.error('[Firebase] Get RM status failed:', e);
    return null;
  });
}

// ── One-time fetch: Royal Mail statuses → localStorage ──
function syncRoyalMailFromCloud() {
  if (!_fbReady) return Promise.resolve({});
  return db.collection('fitshop_order_royal_mail').get().then(function (snap) {
    var rmStatuses = {};
    snap.forEach(function (doc) {
      rmStatuses[doc.id] = doc.data();
    });
    localStorage.setItem('fitshop_order_royal_mail', JSON.stringify(rmStatuses));
    return rmStatuses;
  }).catch(function (e) {
    console.error('[Firebase] Sync RM statuses failed:', e);
    return JSON.parse(localStorage.getItem('fitshop_order_royal_mail')) || {};
  });
}
