/*
 * CG Performance | Service and pricing configuration
 * ---------------------------------------------------
 * This file is the single public source of truth for service names, prices,
 * durations and purchase routing. Prices are written once here in pence and
 * formatted for display by script.js.
 *
 * The prices printed in index.html carry matching data-price attributes.
 * script.js compares them against this file and logs a console warning if the
 * two ever drift apart, so a price only has to be corrected in one place.
 *
 * SECURITY
 *  - Never place a Stripe secret key in this file.
 *  - Never place a promotion code or coupon ID in this file.
 *  - Stripe Price IDs for recurring services live only in server environment
 *    variables and are resolved inside api/create-subscription-checkout.js.
 *    The browser only ever sends a service ID from the list below.
 *
 * ONE TIME PURCHASES
 *  - Paste the Stripe Payment Link URL against the matching service ID in
 *    paymentLinks below. While a link is an empty string the purchase button
 *    is automatically replaced with "Enquire to Purchase" and points at the
 *    enquiry form with the correct service preselected.
 */

window.CG_CONFIG = {
  business: {
    name: 'CG Performance',
    legalName: 'CG Performance Limited',
    coach: 'Christoforos Gkoufas',
    site: 'https://cgperformance.fit',
    // PLACEHOLDER: confirm before launch
    email: 'chrisgkoufas.performance@gmail.com',
    cancellationEmail: 'chrisgkoufas.performance@gmail.com',
    telephone: '',
    instagram: '',
  },

  /*
   * Stripe Payment Links for one time purchases.
   * Create these in the Stripe Dashboard (see STRIPE_SETUP.md) and paste the
   * https://buy.stripe.com/... URL here.
   */
  paymentLinks: {
    // STRIPE_LINK_PT_3_PACK
    'pt-3-pack': '',
    // STRIPE_LINK_PT_10_PACK
    'pt-10-pack': '',
    // STRIPE_LINK_MOVEMENT_ANALYSIS
    'movement-strategy-analysis': '',
  },

  /*
   * Service catalogue.
   * amount and perSession are in pence.
   * type "subscription" routes through the serverless Checkout function.
   * type "one-time" routes through a Stripe Payment Link.
   * enquiryValue matches the value of an option in the enquiry form select.
   */
  services: {
    'pt-4-monthly': {
      name: '4 In Person Sessions Per Month',
      type: 'subscription',
      amount: 50000,
      perSession: 12500,
      sessions: 4,
      minutes: 60,
      enquiryValue: '4 In Person Sessions Per Month',
    },
    'pt-8-monthly': {
      name: '8 In Person Sessions Per Month',
      type: 'subscription',
      amount: 96000,
      perSession: 12000,
      sessions: 8,
      minutes: 60,
      enquiryValue: '8 In Person Sessions Per Month',
    },
    'pt-12-monthly': {
      name: '12 In Person Sessions Per Month',
      type: 'subscription',
      amount: 138000,
      perSession: 11500,
      sessions: 12,
      minutes: 60,
      enquiryValue: '12 In Person Sessions Per Month',
    },
    'pt-3-pack': {
      name: '3 Session In Person Pack',
      type: 'one-time',
      amount: 39000,
      perSession: 13000,
      sessions: 3,
      minutes: 60,
      validity: 'Valid for one month from purchase',
      enquiryValue: '3 Session In Person Pack',
    },
    'pt-10-pack': {
      name: '10 Session In Person Pack',
      type: 'one-time',
      amount: 125000,
      perSession: 12500,
      sessions: 10,
      minutes: 60,
      validity: 'Valid for three months from purchase',
      enquiryValue: '10 Session In Person Pack',
    },
    'movement-strategy-analysis': {
      name: 'Movement Strategy Analysis Consultation',
      type: 'one-time',
      amount: 15000,
      sessions: 1,
      minutes: 60,
      enquiryValue: 'Movement Strategy Analysis Consultation',
    },
    'online-coaching-monthly': {
      name: 'Online Coaching',
      type: 'subscription',
      amount: 35000,
      enquiryValue: 'Online Coaching',
    },
    'virtual-4-monthly': {
      name: '4 Virtual Sessions Per Month',
      type: 'subscription',
      amount: 40000,
      perSession: 10000,
      sessions: 4,
      minutes: 60,
      enquiryValue: '4 Virtual Sessions Per Month',
    },
    'virtual-8-monthly': {
      name: '8 Virtual Sessions Per Month',
      type: 'subscription',
      amount: 80000,
      perSession: 10000,
      sessions: 8,
      minutes: 60,
      enquiryValue: '8 Virtual Sessions Per Month',
    },
    'virtual-12-monthly': {
      name: '12 Virtual Sessions Per Month',
      type: 'subscription',
      amount: 120000,
      perSession: 10000,
      sessions: 12,
      minutes: 60,
      enquiryValue: '12 Virtual Sessions Per Month',
    },
  },

  /* The only Virtual Coaching quantities that may be purchased. */
  virtualOptions: ['virtual-4-monthly', 'virtual-8-monthly', 'virtual-12-monthly'],

  endpoints: {
    checkout: '/api/create-subscription-checkout',
    enquiry: '/api/enquiry',
  },
};
