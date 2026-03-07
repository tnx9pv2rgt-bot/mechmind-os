/**
 * MechMind OS v10 - Customer Lookup Tools
 * 
 * Backend integration for customer data:
 * - Phone number lookup
 * - Vehicle history retrieval
 * - Service records
 * - Customer preferences
 * 
 * @module tools/customer-lookup
 */

const { sendSMS } = require('../twilio/sms');

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const customerCache = new Map();

/**
 * Lookup customer by phone number
 * @param {string} phoneNumber - Phone number in E.164 format
 * @param {string} shopId - Shop ID
 * @param {Object} options - Lookup options
 */
async function lookupCustomerByPhone(phoneNumber, shopId, options = {}) {
  const cacheKey = `${shopId}:${phoneNumber}`;
  
  // Check cache
  if (!options.skipCache && customerCache.has(cacheKey)) {
    const cached = customerCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log('[CustomerLookup] Cache hit:', phoneNumber);
      return cached.data;
    }
    customerCache.delete(cacheKey);
  }

  try {
    const response = await fetch(
      `${process.env.BACKEND_API_URL}/customers/lookup?phone=${encodeURIComponent(phoneNumber)}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`,
          'X-Shop-ID': shopId,
          'Content-Type': 'application/json'
        }
      }
    );

    // Handle 404 - new customer
    if (response.status === 404) {
      const result = {
        found: false,
        isNewCustomer: true,
        phoneNumber,
        message: 'Nuovo cliente - richiede registrazione',
        suggestedActions: ['collect_customer_info', 'offer_registration']
      };
      
      // Cache negative result briefly
      customerCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      
      return result;
    }

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const customer = await response.json();

    // Enrich customer data
    const enrichedCustomer = {
      found: true,
      isNewCustomer: false,
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        fullName: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
        phone: customer.phone,
        phoneNumber: customer.phone,
        gdprConsent: customer.gdprConsent || false,
        gdprConsentDate: customer.gdprConsentDate,
        preferredContact: customer.preferredContact || 'phone',
        notes: customer.notes,
        customerSince: customer.createdAt,
        loyaltyPoints: customer.loyaltyPoints || 0,
        isVIP: customer.isVIP || false
      },
      vehicles: customer.vehicles?.map(v => ({
        id: v.id,
        licensePlate: v.licensePlate,
        make: v.make,
        model: v.model,
        year: v.year,
        vin: v.vin,
        mileage: v.mileage,
        lastService: v.lastService,
        nextServiceDue: v.nextServiceDue,
        serviceIntervalKm: v.serviceIntervalKm,
        serviceIntervalMonths: v.serviceIntervalMonths,
        insuranceExpiry: v.insuranceExpiry,
        inspectionDue: v.inspectionDue
      })) || [],
      stats: {
        totalBookings: customer.totalBookings || 0,
        totalSpent: customer.totalSpent || 0,
        lastVisit: customer.lastVisit,
        averageRating: customer.averageRating
      },
      activeBookings: customer.activeBookings || [],
      message: `Cliente trovato: ${customer.firstName} ${customer.lastName}`
    };

    // Cache result
    customerCache.set(cacheKey, {
      data: enrichedCustomer,
      timestamp: Date.now()
    });

    console.log('[CustomerLookup] Found customer:', enrichedCustomer.customer.fullName);

    return enrichedCustomer;

  } catch (error) {
    console.error('[CustomerLookup] Error:', error);
    
    // Return graceful error
    return {
      found: false,
      error: true,
      errorMessage: error.message,
      phoneNumber,
      message: 'Errore nella ricerca cliente',
      fallback: true
    };
  }
}

/**
 * Get vehicle history and service records
 * @param {string} customerId - Customer ID
 * @param {string} vehicleId - Vehicle ID (optional)
 * @param {string} shopId - Shop ID
 */
async function getVehicleHistory(customerId, vehicleId, shopId) {
  try {
    let url = `${process.env.BACKEND_API_URL}/customers/${customerId}/vehicles`;
    if (vehicleId) {
      url += `/${vehicleId}`;
    }
    url += `/history`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`,
        'X-Shop-ID': shopId
      }
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();

    return {
      found: true,
      vehicles: data.vehicles?.map(v => ({
        id: v.id,
        licensePlate: v.licensePlate,
        make: v.make,
        model: v.model,
        year: v.year,
        currentMileage: v.mileage,
        
        lastService: v.lastService ? {
          date: v.lastService.date,
          type: v.lastService.type,
          mileage: v.lastService.mileage,
          description: v.lastService.description,
          cost: v.lastService.cost,
          technician: v.lastService.technician
        } : null,
        
        nextServiceDue: v.nextServiceDue,
        nextServiceMileage: v.nextServiceMileage,
        
        serviceHistory: v.serviceHistory?.slice(0, 5).map(h => ({
          date: h.date,
          type: h.type,
          description: h.description,
          cost: h.cost,
          mileage: h.mileage
        })) || [],
        
        recurringIssues: v.recurringIssues || [],
        warrantyInfo: v.warrantyInfo,
        
        upcomingMaintenance: v.upcomingMaintenance?.map(m => ({
          type: m.type,
          dueDate: m.dueDate,
          dueMileage: m.dueMileage,
          priority: m.priority
        })) || []
      })) || [],
      
      summary: {
        totalServices: data.totalServices || 0,
        totalSpent: data.totalSpent || 0,
        averageServiceCost: data.averageServiceCost || 0,
        lastVisit: data.lastVisit,
        customerSince: data.customerSince
      }
    };

  } catch (error) {
    console.error('[CustomerLookup] Vehicle history error:', error);
    
    return {
      found: false,
      error: true,
      message: 'Errore nel recupero storico veicolo'
    };
  }
}

/**
 * Register new customer
 * @param {Object} customerData - Customer registration data
 */
async function registerNewCustomer(customerData) {
  const { phoneNumber, firstName, lastName, email, shopId, gdprConsent } = customerData;

  try {
    const response = await fetch(`${process.env.BACKEND_API_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`,
        'X-Shop-ID': shopId
      },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        phone: phoneNumber,
        gdprConsent: gdprConsent || false,
        gdprConsentDate: gdprConsent ? new Date().toISOString() : null,
        source: 'voice-ai',
        createdAt: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Registration failed: ${response.status}`);
    }

    const newCustomer = await response.json();

    // Send welcome SMS if consent given
    if (gdprConsent) {
      await sendSMS({
        to: phoneNumber,
        body: `Benvenuto in ${customerData.shopName}! Grazie per la registrazione. Riceverai promemoria e offerte esclusive.`,
        shopId,
        tenantId: customerData.tenantId
      }).catch(err => console.error('Welcome SMS failed:', err));
    }

    // Invalidate cache
    const cacheKey = `${shopId}:${phoneNumber}`;
    customerCache.delete(cacheKey);

    return {
      success: true,
      customer: newCustomer,
      message: `Cliente registrato: ${firstName} ${lastName}`
    };

  } catch (error) {
    console.error('[CustomerLookup] Registration error:', error);
    
    return {
      success: false,
      error: true,
      message: 'Errore nella registrazione cliente'
    };
  }
}

/**
 * Update customer preferences
 * @param {string} customerId - Customer ID
 * @param {Object} preferences - Updated preferences
 */
async function updateCustomerPreferences(customerId, preferences) {
  try {
    const response = await fetch(
      `${process.env.BACKEND_API_URL}/customers/${customerId}/preferences`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`
        },
        body: JSON.stringify(preferences)
      }
    );

    if (!response.ok) {
      throw new Error(`Update failed: ${response.status}`);
    }

    // Invalidate cache
    for (const [key, value] of customerCache.entries()) {
      if (value.data.customer?.id === customerId) {
        customerCache.delete(key);
        break;
      }
    }

    return {
      success: true,
      message: 'Preferenze aggiornate'
    };

  } catch (error) {
    console.error('[CustomerLookup] Preference update error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get customer loyalty status
 * @param {string} customerId - Customer ID
 * @param {string} shopId - Shop ID
 */
async function getLoyaltyStatus(customerId, shopId) {
  try {
    const response = await fetch(
      `${process.env.BACKEND_API_URL}/customers/${customerId}/loyalty`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`,
          'X-Shop-ID': shopId
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();

    return {
      points: data.points || 0,
      tier: data.tier || 'bronze',
      tierName: getTierName(data.tier),
      nextTier: data.nextTier,
      pointsToNextTier: data.pointsToNextTier || 0,
      availableRewards: data.availableRewards || [],
      lifetimeValue: data.lifetimeValue || 0,
      discounts: data.activeDiscounts || []
    };

  } catch (error) {
    console.error('[CustomerLookup] Loyalty error:', error);
    return null;
  }
}

/**
 * Get tier name in Italian
 */
function getTierName(tier) {
  const names = {
    'bronze': 'Bronzo',
    'silver': 'Argento',
    'gold': 'Oro',
    'platinum': 'Platino'
  };
  return names[tier] || tier;
}

/**
 * Clear customer cache
 */
function clearCustomerCache(phoneNumber, shopId) {
  if (phoneNumber && shopId) {
    const cacheKey = `${shopId}:${phoneNumber}`;
    customerCache.delete(cacheKey);
  } else {
    customerCache.clear();
  }
}

/**
 * Get cache statistics
 */
function getCacheStats() {
  return {
    size: customerCache.size,
    entries: Array.from(customerCache.keys())
  };
}

module.exports = {
  lookupCustomerByPhone,
  getVehicleHistory,
  registerNewCustomer,
  updateCustomerPreferences,
  getLoyaltyStatus,
  clearCustomerCache,
  getCacheStats
};
