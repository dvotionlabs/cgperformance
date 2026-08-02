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
 *  - Never place a Stripe Price ID in this file.
 *  - Never place a promotion code or coupon ID in this file.
 *
 * Every service, monthly or one time, is bought through the same serverless
 * function at api/create-checkout.js. The browser only ever sends a service ID
 * from the list below. Stripe Price IDs live in server environment variables,
 * and the terms of each service are shown on the Stripe Checkout page.
 */

window.CG_CONFIG = {
  business: {
    name: 'CG Performance',
    legalName: 'CG Performance Limited',
    coach: 'Christoforos Gkoufas',
    site: 'https://cgperformance.fit',
    email: 'chrisgkoufas.performance@gmail.com',
    cancellationEmail: 'chrisgkoufas.performance@gmail.com',
    telephone: '+447341053760',
    telephoneDisplay: '07341 053760',
    instagram: 'https://www.instagram.com/chrisgkoufaspt/',
  },

  /*
   * Service catalogue.
   * amount and perSession are in pence.
   * type "subscription" is a monthly Bacs Direct Debit, type "one-time" is a
   * single payment. Both open Stripe hosted Checkout through the same function.
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

  endpoints: {
    checkout: '/api/create-checkout',
    enquiry: '/api/enquiry',
  },
};
