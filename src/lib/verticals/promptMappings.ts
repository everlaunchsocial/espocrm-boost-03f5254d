// Prompt Mapping Layer for Top 20 EverLaunch Verticals
// Maps Brain Rules, Config, Skills, and Channel Behaviors to prompt-ready data

import { VerticalPromptConfig } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// GENERIC LOCAL BUSINESS FALLBACK (ID: 0)
// Used when verticalId is missing, unknown, or not mapped
// ═══════════════════════════════════════════════════════════════════════════
export const GENERIC_LOCAL_BUSINESS_CONFIG: VerticalPromptConfig = {
  verticalId: 0,
  verticalName: 'Generic Local Business',
  brainRules: {
    urgencyClassification: 'medium',
    alwaysCollect: ['callback_number', 'name', 'reason_for_contact'],
    neverDo: [
      'provide_medical_diagnosis_or_advice',
      'provide_legal_advice',
      'guarantee_outcomes_or_pricing',
      'make_commitments_on_behalf_of_owner'
    ],
    escalationTriggers: ['request_for_human', 'complaint', 'emergency_mentioned'],
    toneGuidance: 'Calm, concise, and professional. Be helpful without overcommitting. Ask minimal qualifying questions and capture lead information.',
    complianceNotes: [
      'Never provide medical diagnosis or health advice - recommend consulting a professional',
      'Never provide legal advice - recommend consulting an attorney',
      'Never guarantee pricing - offer to have someone follow up with details',
      'Always encourage professional consultation for specialized questions'
    ]
  },
  featureConfig: {
    appointmentBooking: 'OPTIONAL',
    emergencyEscalation: 'OFF',
    afterHoursHandling: 'ON',
    leadCapture: 'ON',
    callbackScheduling: 'ON',
    insuranceInfoCollection: 'OFF',
    priceQuoting: 'OFF',
    locationVerification: 'OPTIONAL',
    smsFollowUp: 'OPTIONAL',
    transferToHuman: 'ON'
  },
  workflowPermissions: {
    allowed: [
      'capture_contact_info',
      'capture_intent',
      'provide_hours_and_location',
      'request_callback',
      'transfer_to_human',
      'answer_basic_faq'
    ],
    forbidden: [
      'provide_medical_diagnosis',
      'provide_legal_advice',
      'quote_specific_prices',
      'make_binding_commitments',
      'diagnose_technical_issues'
    ],
    requiresConfirmation: ['schedule_appointment', 'escalate_to_owner']
  },
  channelOverrides: {
    phone: {
      primaryAction: 'Capture caller intent and contact info, offer callback',
      greetingStyle: 'professional',
      responseLength: 'brief',
      canShowVisuals: false,
      canSendLinks: false,
      interruptionHandling: 'Allow natural conversation flow',
      fallbackBehavior: 'Capture callback number and promise follow-up'
    },
    web_chat: {
      primaryAction: 'Qualify inquiry and capture lead information',
      greetingStyle: 'warm',
      responseLength: 'moderate',
      canShowVisuals: true,
      canSendLinks: true,
      interruptionHandling: 'Queue and respond in order',
      fallbackBehavior: 'Offer contact form or callback request'
    },
    web_voice: {
      primaryAction: 'Conversational intake with visual support',
      greetingStyle: 'professional',
      responseLength: 'brief',
      canShowVisuals: true,
      canSendLinks: true,
      interruptionHandling: 'Natural conversation flow',
      fallbackBehavior: 'Switch to chat or capture callback'
    },
    sms: {
      primaryAction: 'Brief responses, direct to call for complex inquiries',
      greetingStyle: 'professional',
      responseLength: 'brief',
      canShowVisuals: false,
      canSendLinks: true,
      interruptionHandling: 'Async processing',
      fallbackBehavior: 'Suggest calling for detailed assistance'
    }
  }
};

// Compliance-aware verticals that require extra safety guardrails
export const MEDICAL_VERTICAL_IDS = [17, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92];
export const LEGAL_VERTICAL_IDS = [14, 15, 16, 66, 67, 68, 69, 70];

export const COMPLIANCE_MODIFIERS = {
  medical: [
    'NEVER provide medical diagnosis, treatment recommendations, or health advice',
    'ALWAYS recommend consulting with a licensed healthcare professional',
    'Do NOT interpret symptoms or suggest conditions',
    'Capture intake information only and schedule appointments',
    'For emergencies, advise calling 911 immediately'
  ],
  legal: [
    'NEVER provide legal advice or interpret laws',
    'ALWAYS recommend consulting with a licensed attorney',
    'Do NOT guarantee case outcomes or settlement amounts',
    'Capture case details for attorney review only',
    'Maintain strict confidentiality in all communications'
  ]
};

export const verticalPromptMappings: Record<number, VerticalPromptConfig> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // 0. GENERIC LOCAL BUSINESS (FALLBACK)
  // ═══════════════════════════════════════════════════════════════════════════
  0: GENERIC_LOCAL_BUSINESS_CONFIG,

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. PLUMBING
  // ═══════════════════════════════════════════════════════════════════════════
  1: {
    verticalId: 1,
    verticalName: 'Plumbing',
    brainRules: {
      urgencyClassification: 'critical',
      alwaysCollect: ['issue_type', 'address', 'callback_number', 'water_shutoff_status'],
      neverDo: ['provide_diy_instructions_for_gas_lines', 'quote_prices_without_inspection', 'diagnose_over_phone'],
      escalationTriggers: ['gas_smell', 'sewage_backup', 'flooding', 'no_water'],
      toneGuidance: 'Calm and reassuring during emergencies. Efficient and professional for routine calls.',
      complianceNotes: ['Never advise on gas line work', 'Always recommend shutting off water for active leaks']
    },
    featureConfig: {
      appointmentBooking: 'ON',
      emergencyEscalation: 'ON',
      afterHoursHandling: 'ON',
      leadCapture: 'ON',
      callbackScheduling: 'ON',
      insuranceInfoCollection: 'OPTIONAL',
      priceQuoting: 'OFF',
      locationVerification: 'ON',
      smsFollowUp: 'ON',
      transferToHuman: 'ON'
    },
    workflowPermissions: {
      allowed: ['triage_emergency', 'book_appointment', 'capture_lead', 'send_confirmation', 'escalate_to_dispatch'],
      forbidden: ['provide_repair_instructions', 'guarantee_pricing', 'diagnose_issue'],
      requiresConfirmation: ['emergency_dispatch', 'after_hours_callout']
    },
    channelOverrides: {
      phone: {
        primaryAction: 'Triage urgency and book or dispatch',
        greetingStyle: 'urgent',
        responseLength: 'brief',
        canShowVisuals: false,
        canSendLinks: false,
        interruptionHandling: 'Allow interruption for emergency details',
        fallbackBehavior: 'Capture callback number and promise return call within 15 minutes'
      },
      web_chat: {
        primaryAction: 'Qualify issue and capture lead info',
        greetingStyle: 'professional',
        responseLength: 'moderate',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Queue responses, process in order',
        fallbackBehavior: 'Offer callback request form'
      },
      web_voice: {
        primaryAction: 'Mirror phone behavior with visual support',
        greetingStyle: 'urgent',
        responseLength: 'brief',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Allow interruption for emergency details',
        fallbackBehavior: 'Switch to chat or capture callback'
      },
      sms: {
        primaryAction: 'Confirm appointments and send reminders',
        greetingStyle: 'professional',
        responseLength: 'brief',
        canShowVisuals: false,
        canSendLinks: true,
        interruptionHandling: 'Async processing',
        fallbackBehavior: 'Prompt to call for urgent issues'
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. HVAC
  // ═══════════════════════════════════════════════════════════════════════════
  2: {
    verticalId: 2,
    verticalName: 'HVAC',
    brainRules: {
      urgencyClassification: 'high',
      alwaysCollect: ['issue_type', 'system_type', 'address', 'callback_number', 'is_heating_or_cooling'],
      neverDo: ['diagnose_refrigerant_issues', 'advise_on_electrical_components', 'quote_without_inspection'],
      escalationTriggers: ['no_heat_in_winter', 'no_ac_in_extreme_heat', 'gas_smell', 'carbon_monoxide_alarm'],
      toneGuidance: 'Empathetic for comfort emergencies. Technical confidence for maintenance inquiries.',
      complianceNotes: ['EPA regulations on refrigerants', 'Never advise touching electrical components']
    },
    featureConfig: {
      appointmentBooking: 'ON',
      emergencyEscalation: 'ON',
      afterHoursHandling: 'ON',
      leadCapture: 'ON',
      callbackScheduling: 'ON',
      insuranceInfoCollection: 'OFF',
      priceQuoting: 'OPTIONAL',
      locationVerification: 'ON',
      smsFollowUp: 'ON',
      transferToHuman: 'ON'
    },
    workflowPermissions: {
      allowed: ['triage_emergency', 'book_appointment', 'capture_lead', 'offer_maintenance_plan', 'check_service_area'],
      forbidden: ['diagnose_technical_issues', 'quote_repair_costs', 'advise_diy_repairs'],
      requiresConfirmation: ['emergency_after_hours', 'maintenance_plan_signup']
    },
    channelOverrides: {
      phone: {
        primaryAction: 'Assess urgency based on weather/comfort and dispatch or book',
        greetingStyle: 'empathetic',
        responseLength: 'brief',
        canShowVisuals: false,
        canSendLinks: false,
        interruptionHandling: 'Allow for emergency clarification',
        fallbackBehavior: 'Capture callback and prioritize based on weather conditions'
      },
      web_chat: {
        primaryAction: 'Qualify system type and schedule service',
        greetingStyle: 'professional',
        responseLength: 'moderate',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Queue and process',
        fallbackBehavior: 'Offer scheduling link or callback'
      },
      web_voice: {
        primaryAction: 'Hybrid phone/chat with visual scheduling',
        greetingStyle: 'empathetic',
        responseLength: 'brief',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Allow interruption',
        fallbackBehavior: 'Transition to chat for scheduling'
      },
      sms: {
        primaryAction: 'Appointment confirmations and maintenance reminders',
        greetingStyle: 'professional',
        responseLength: 'brief',
        canShowVisuals: false,
        canSendLinks: true,
        interruptionHandling: 'Async',
        fallbackBehavior: 'Direct to phone for emergencies'
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. ELECTRICIANS
  // ═══════════════════════════════════════════════════════════════════════════
  3: {
    verticalId: 3,
    verticalName: 'Electricians',
    brainRules: {
      urgencyClassification: 'critical',
      alwaysCollect: ['issue_type', 'address', 'callback_number', 'is_power_out', 'smell_or_sparks'],
      neverDo: ['advise_touching_electrical', 'provide_diy_wiring_help', 'diagnose_without_inspection'],
      escalationTriggers: ['sparking', 'burning_smell', 'power_outage', 'exposed_wires', 'water_near_electrical'],
      toneGuidance: 'Safety-first urgency. Calm authority when advising to stay away from hazards.',
      complianceNotes: ['All electrical work requires licensed electrician', 'Never advise DIY for safety']
    },
    featureConfig: {
      appointmentBooking: 'ON',
      emergencyEscalation: 'ON',
      afterHoursHandling: 'ON',
      leadCapture: 'ON',
      callbackScheduling: 'ON',
      insuranceInfoCollection: 'OFF',
      priceQuoting: 'OFF',
      locationVerification: 'ON',
      smsFollowUp: 'ON',
      transferToHuman: 'ON'
    },
    workflowPermissions: {
      allowed: ['triage_safety_emergency', 'advise_power_shutoff', 'book_appointment', 'capture_lead', 'emergency_dispatch'],
      forbidden: ['provide_wiring_instructions', 'diagnose_electrical_issues', 'quote_prices'],
      requiresConfirmation: ['emergency_dispatch', 'after_hours_service']
    },
    channelOverrides: {
      phone: {
        primaryAction: 'Safety triage first, then dispatch or book',
        greetingStyle: 'urgent',
        responseLength: 'brief',
        canShowVisuals: false,
        canSendLinks: false,
        interruptionHandling: 'Priority interruption for safety details',
        fallbackBehavior: 'Advise turning off breaker, capture callback'
      },
      web_chat: {
        primaryAction: 'Qualify issue type and urgency level',
        greetingStyle: 'professional',
        responseLength: 'moderate',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Queue processing',
        fallbackBehavior: 'Escalate to phone for emergencies'
      },
      web_voice: {
        primaryAction: 'Safety-first verbal triage with visual aids',
        greetingStyle: 'urgent',
        responseLength: 'brief',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Allow safety interruptions',
        fallbackBehavior: 'Transition to phone for true emergencies'
      },
      sms: {
        primaryAction: 'Confirmations only, no emergency handling',
        greetingStyle: 'professional',
        responseLength: 'brief',
        canShowVisuals: false,
        canSendLinks: true,
        interruptionHandling: 'Async',
        fallbackBehavior: 'Always direct emergencies to phone'
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. ROOFING
  // ═══════════════════════════════════════════════════════════════════════════
  4: {
    verticalId: 4,
    verticalName: 'Roofing',
    brainRules: {
      urgencyClassification: 'medium',
      alwaysCollect: ['issue_type', 'address', 'callback_number', 'storm_related', 'insurance_claim'],
      neverDo: ['advise_climbing_on_roof', 'guarantee_insurance_coverage', 'quote_without_inspection'],
      escalationTriggers: ['active_leak_during_storm', 'structural_damage', 'tree_on_roof'],
      toneGuidance: 'Reassuring after storm events. Professional for estimate requests.',
      complianceNotes: ['Never guarantee insurance approval', 'Document storm dates for claims']
    },
    featureConfig: {
      appointmentBooking: 'ON',
      emergencyEscalation: 'OPTIONAL',
      afterHoursHandling: 'OPTIONAL',
      leadCapture: 'ON',
      callbackScheduling: 'ON',
      insuranceInfoCollection: 'ON',
      priceQuoting: 'OFF',
      locationVerification: 'ON',
      smsFollowUp: 'ON',
      transferToHuman: 'ON'
    },
    workflowPermissions: {
      allowed: ['book_inspection', 'capture_lead', 'collect_insurance_info', 'schedule_estimate', 'document_storm_date'],
      forbidden: ['guarantee_pricing', 'advise_roof_access', 'promise_insurance_outcome'],
      requiresConfirmation: ['emergency_tarp_service']
    },
    channelOverrides: {
      phone: {
        primaryAction: 'Qualify storm vs routine, book inspection',
        greetingStyle: 'professional',
        responseLength: 'moderate',
        canShowVisuals: false,
        canSendLinks: false,
        interruptionHandling: 'Standard conversation flow',
        fallbackBehavior: 'Capture lead for callback'
      },
      web_chat: {
        primaryAction: 'Lead capture and inspection scheduling',
        greetingStyle: 'professional',
        responseLength: 'detailed',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Queue processing',
        fallbackBehavior: 'Offer estimate request form'
      },
      web_voice: {
        primaryAction: 'Conversational booking with visual calendar',
        greetingStyle: 'professional',
        responseLength: 'moderate',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Standard',
        fallbackBehavior: 'Switch to chat for scheduling'
      },
      sms: {
        primaryAction: 'Appointment reminders and follow-ups',
        greetingStyle: 'professional',
        responseLength: 'brief',
        canShowVisuals: false,
        canSendLinks: true,
        interruptionHandling: 'Async',
        fallbackBehavior: 'Direct to phone'
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. WATER DAMAGE / RESTORATION
  // ═══════════════════════════════════════════════════════════════════════════
  5: {
    verticalId: 5,
    verticalName: 'Water Damage / Restoration',
    brainRules: {
      urgencyClassification: 'critical',
      alwaysCollect: ['damage_source', 'address', 'callback_number', 'water_stopped', 'insurance_info'],
      neverDo: ['delay_emergency_response', 'advise_cleanup_before_documentation', 'guarantee_insurance'],
      escalationTriggers: ['active_flooding', 'sewage_backup', 'fire_damage', 'mold_visible'],
      toneGuidance: 'Urgent and action-oriented. Empathetic to property loss.',
      complianceNotes: ['Document before mitigation', 'IICRC standards apply']
    },
    featureConfig: {
      appointmentBooking: 'ON',
      emergencyEscalation: 'ON',
      afterHoursHandling: 'ON',
      leadCapture: 'ON',
      callbackScheduling: 'OFF',
      insuranceInfoCollection: 'ON',
      priceQuoting: 'OFF',
      locationVerification: 'ON',
      smsFollowUp: 'ON',
      transferToHuman: 'ON'
    },
    workflowPermissions: {
      allowed: ['immediate_dispatch', 'collect_insurance', 'capture_damage_details', 'advise_water_shutoff', 'advise_documentation'],
      forbidden: ['advise_cleanup_before_photos', 'guarantee_insurance', 'delay_for_scheduling'],
      requiresConfirmation: ['non_emergency_assessment']
    },
    channelOverrides: {
      phone: {
        primaryAction: 'Immediate dispatch for active emergencies',
        greetingStyle: 'urgent',
        responseLength: 'brief',
        canShowVisuals: false,
        canSendLinks: false,
        interruptionHandling: 'Priority for damage details',
        fallbackBehavior: 'Capture location, dispatch immediately'
      },
      web_chat: {
        primaryAction: 'Rapid lead capture, escalate active emergencies to phone',
        greetingStyle: 'urgent',
        responseLength: 'brief',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Priority processing',
        fallbackBehavior: 'Click-to-call for emergencies'
      },
      web_voice: {
        primaryAction: 'Mirror phone with location confirmation',
        greetingStyle: 'urgent',
        responseLength: 'brief',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Allow all interruptions',
        fallbackBehavior: 'Immediate phone transfer'
      },
      sms: {
        primaryAction: 'Status updates only, no intake',
        greetingStyle: 'professional',
        responseLength: 'brief',
        canShowVisuals: false,
        canSendLinks: true,
        interruptionHandling: 'Async',
        fallbackBehavior: 'Direct all inquiries to phone'
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. LOCKSMITHS
  // ═══════════════════════════════════════════════════════════════════════════
  6: {
    verticalId: 6,
    verticalName: 'Locksmiths',
    brainRules: {
      urgencyClassification: 'critical',
      alwaysCollect: ['lockout_type', 'exact_address', 'callback_number', 'vehicle_or_property', 'id_verification_note'],
      neverDo: ['provide_lock_bypass_instructions', 'dispatch_without_location', 'skip_ownership_verification'],
      escalationTriggers: ['child_locked_in_car', 'medical_access_needed', 'business_lockout'],
      toneGuidance: 'Calm and reassuring. Clear on pricing. Verify ownership intent.',
      complianceNotes: ['Always mention ID verification requirement', 'Never teach bypass methods']
    },
    featureConfig: {
      appointmentBooking: 'OFF',
      emergencyEscalation: 'ON',
      afterHoursHandling: 'ON',
      leadCapture: 'ON',
      callbackScheduling: 'OFF',
      insuranceInfoCollection: 'OFF',
      priceQuoting: 'ON',
      locationVerification: 'ON',
      smsFollowUp: 'ON',
      transferToHuman: 'ON'
    },
    workflowPermissions: {
      allowed: ['immediate_dispatch', 'provide_eta', 'give_price_range', 'verify_location', 'capture_vehicle_info'],
      forbidden: ['teach_bypass_methods', 'dispatch_without_address', 'skip_id_mention'],
      requiresConfirmation: ['non_standard_pricing']
    },
    channelOverrides: {
      phone: {
        primaryAction: 'Verify location, provide ETA and price, dispatch',
        greetingStyle: 'urgent',
        responseLength: 'brief',
        canShowVisuals: false,
        canSendLinks: false,
        interruptionHandling: 'Allow for location correction',
        fallbackBehavior: 'Must have address before ending call'
      },
      web_chat: {
        primaryAction: 'Location capture and dispatch coordination',
        greetingStyle: 'urgent',
        responseLength: 'brief',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Priority processing',
        fallbackBehavior: 'Click-to-call for faster service'
      },
      web_voice: {
        primaryAction: 'Phone-like experience with map confirmation',
        greetingStyle: 'urgent',
        responseLength: 'brief',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Allow interruptions',
        fallbackBehavior: 'Capture location via text input'
      },
      sms: {
        primaryAction: 'ETA updates only',
        greetingStyle: 'professional',
        responseLength: 'brief',
        canShowVisuals: false,
        canSendLinks: true,
        interruptionHandling: 'Async',
        fallbackBehavior: 'Direct to phone for new requests'
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. TOWING
  // ═══════════════════════════════════════════════════════════════════════════
  7: {
    verticalId: 7,
    verticalName: 'Towing',
    brainRules: {
      urgencyClassification: 'critical',
      alwaysCollect: ['exact_location', 'vehicle_info', 'callback_number', 'destination', 'hazard_status'],
      neverDo: ['dispatch_without_location', 'underestimate_eta', 'ignore_safety_situation'],
      escalationTriggers: ['accident_scene', 'highway_breakdown', 'vehicle_fire', 'blocking_traffic'],
      toneGuidance: 'Efficient and reassuring. Safety-focused for highway situations.',
      complianceNotes: ['Verify tow destination authorization', 'Note if on private property']
    },
    featureConfig: {
      appointmentBooking: 'OFF',
      emergencyEscalation: 'ON',
      afterHoursHandling: 'ON',
      leadCapture: 'ON',
      callbackScheduling: 'OFF',
      insuranceInfoCollection: 'OPTIONAL',
      priceQuoting: 'ON',
      locationVerification: 'ON',
      smsFollowUp: 'ON',
      transferToHuman: 'ON'
    },
    workflowPermissions: {
      allowed: ['dispatch_immediately', 'provide_eta', 'quote_price', 'verify_location', 'capture_vehicle_details'],
      forbidden: ['dispatch_without_location', 'give_unrealistic_eta', 'tow_without_destination'],
      requiresConfirmation: ['long_distance_tow', 'heavy_duty_equipment']
    },
    channelOverrides: {
      phone: {
        primaryAction: 'Get location, vehicle info, destination — dispatch',
        greetingStyle: 'urgent',
        responseLength: 'brief',
        canShowVisuals: false,
        canSendLinks: false,
        interruptionHandling: 'Allow for safety info',
        fallbackBehavior: 'Must have location before ending'
      },
      web_chat: {
        primaryAction: 'Location and vehicle capture with map integration',
        greetingStyle: 'urgent',
        responseLength: 'brief',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Priority',
        fallbackBehavior: 'Click-to-call prominently displayed'
      },
      web_voice: {
        primaryAction: 'Verbal location with visual map confirmation',
        greetingStyle: 'urgent',
        responseLength: 'brief',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Full interruption allowed',
        fallbackBehavior: 'Text input for location'
      },
      sms: {
        primaryAction: 'ETA updates and driver location sharing',
        greetingStyle: 'professional',
        responseLength: 'brief',
        canShowVisuals: false,
        canSendLinks: true,
        interruptionHandling: 'Async',
        fallbackBehavior: 'Call for new requests'
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. AUTO REPAIR
  // ═══════════════════════════════════════════════════════════════════════════
  8: {
    verticalId: 8,
    verticalName: 'Auto Repair',
    brainRules: {
      urgencyClassification: 'medium',
      alwaysCollect: ['vehicle_info', 'issue_description', 'callback_number', 'preferred_date'],
      neverDo: ['diagnose_over_phone', 'quote_repair_costs', 'promise_same_day_completion'],
      escalationTriggers: ['vehicle_undrivable', 'safety_system_failure', 'check_engine_flashing'],
      toneGuidance: 'Knowledgeable and trustworthy. Patient with non-technical customers.',
      complianceNotes: ['Cannot diagnose without inspection', 'Written estimates required by law in most states']
    },
    featureConfig: {
      appointmentBooking: 'ON',
      emergencyEscalation: 'OPTIONAL',
      afterHoursHandling: 'OPTIONAL',
      leadCapture: 'ON',
      callbackScheduling: 'ON',
      insuranceInfoCollection: 'OPTIONAL',
      priceQuoting: 'OFF',
      locationVerification: 'OFF',
      smsFollowUp: 'ON',
      transferToHuman: 'ON'
    },
    workflowPermissions: {
      allowed: ['book_diagnostic', 'capture_vehicle_info', 'provide_hours', 'capture_symptom_details', 'schedule_callback'],
      forbidden: ['diagnose_issues', 'quote_repair_prices', 'promise_completion_times'],
      requiresConfirmation: ['tow_arrangement', 'rental_car_coordination']
    },
    channelOverrides: {
      phone: {
        primaryAction: 'Capture symptoms and book diagnostic appointment',
        greetingStyle: 'professional',
        responseLength: 'moderate',
        canShowVisuals: false,
        canSendLinks: false,
        interruptionHandling: 'Standard conversation',
        fallbackBehavior: 'Schedule callback with service advisor'
      },
      web_chat: {
        primaryAction: 'Vehicle info capture and online scheduling',
        greetingStyle: 'professional',
        responseLength: 'detailed',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Queue',
        fallbackBehavior: 'Offer scheduling calendar'
      },
      web_voice: {
        primaryAction: 'Conversational booking with calendar display',
        greetingStyle: 'professional',
        responseLength: 'moderate',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Standard',
        fallbackBehavior: 'Switch to chat for scheduling'
      },
      sms: {
        primaryAction: 'Status updates and pickup notifications',
        greetingStyle: 'professional',
        responseLength: 'brief',
        canShowVisuals: false,
        canSendLinks: true,
        interruptionHandling: 'Async',
        fallbackBehavior: 'Call for new appointments'
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. TREE SERVICES
  // ═══════════════════════════════════════════════════════════════════════════
  9: {
    verticalId: 9,
    verticalName: 'Tree Services',
    brainRules: {
      urgencyClassification: 'high',
      alwaysCollect: ['issue_type', 'address', 'callback_number', 'storm_related', 'tree_size_estimate'],
      neverDo: ['advise_diy_tree_removal', 'guarantee_same_day_for_large_jobs', 'quote_without_seeing'],
      escalationTriggers: ['tree_on_structure', 'tree_on_power_lines', 'blocking_road', 'storm_damage'],
      toneGuidance: 'Calm during emergencies. Knowledgeable for routine consultations.',
      complianceNotes: ['Power line work requires utility company', 'Permits may be required']
    },
    featureConfig: {
      appointmentBooking: 'ON',
      emergencyEscalation: 'ON',
      afterHoursHandling: 'OPTIONAL',
      leadCapture: 'ON',
      callbackScheduling: 'ON',
      insuranceInfoCollection: 'OPTIONAL',
      priceQuoting: 'OFF',
      locationVerification: 'ON',
      smsFollowUp: 'ON',
      transferToHuman: 'ON'
    },
    workflowPermissions: {
      allowed: ['emergency_triage', 'book_estimate', 'capture_lead', 'assess_storm_priority', 'schedule_consultation'],
      forbidden: ['advise_diy_removal', 'quote_prices', 'touch_power_lines'],
      requiresConfirmation: ['emergency_removal', 'crane_work']
    },
    channelOverrides: {
      phone: {
        primaryAction: 'Triage emergency vs routine, dispatch or book',
        greetingStyle: 'professional',
        responseLength: 'moderate',
        canShowVisuals: false,
        canSendLinks: false,
        interruptionHandling: 'Priority for emergencies',
        fallbackBehavior: 'Capture callback for estimate'
      },
      web_chat: {
        primaryAction: 'Qualify job type and schedule estimate',
        greetingStyle: 'professional',
        responseLength: 'detailed',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Queue',
        fallbackBehavior: 'Estimate request form'
      },
      web_voice: {
        primaryAction: 'Conversational job assessment',
        greetingStyle: 'professional',
        responseLength: 'moderate',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Standard',
        fallbackBehavior: 'Chat transition'
      },
      sms: {
        primaryAction: 'Appointment confirmations',
        greetingStyle: 'professional',
        responseLength: 'brief',
        canShowVisuals: false,
        canSendLinks: true,
        interruptionHandling: 'Async',
        fallbackBehavior: 'Phone for emergencies'
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. GARAGE DOOR REPAIR
  // ═══════════════════════════════════════════════════════════════════════════
  10: {
    verticalId: 10,
    verticalName: 'Garage Door Repair',
    brainRules: {
      urgencyClassification: 'high',
      alwaysCollect: ['issue_type', 'address', 'callback_number', 'door_type', 'car_trapped'],
      neverDo: ['advise_spring_repair_diy', 'ignore_safety_concerns', 'diagnose_without_seeing'],
      escalationTriggers: ['car_trapped_inside', 'door_fell', 'spring_broke', 'security_concern'],
      toneGuidance: 'Safety-conscious. Understanding of urgency for trapped vehicles.',
      complianceNotes: ['Spring repair is dangerous - never DIY advice', 'Opener codes are security-sensitive']
    },
    featureConfig: {
      appointmentBooking: 'ON',
      emergencyEscalation: 'ON',
      afterHoursHandling: 'ON',
      leadCapture: 'ON',
      callbackScheduling: 'ON',
      insuranceInfoCollection: 'OFF',
      priceQuoting: 'OPTIONAL',
      locationVerification: 'ON',
      smsFollowUp: 'ON',
      transferToHuman: 'ON'
    },
    workflowPermissions: {
      allowed: ['emergency_dispatch', 'book_service', 'capture_door_info', 'provide_safety_warnings', 'same_day_scheduling'],
      forbidden: ['advise_spring_repair', 'provide_opener_codes', 'diagnose_remotely'],
      requiresConfirmation: ['after_hours_service', 'new_door_installation']
    },
    channelOverrides: {
      phone: {
        primaryAction: 'Assess urgency (trapped car?), dispatch or book same-day',
        greetingStyle: 'urgent',
        responseLength: 'brief',
        canShowVisuals: false,
        canSendLinks: false,
        interruptionHandling: 'Allow for urgency details',
        fallbackBehavior: 'Capture callback, prioritize same-day'
      },
      web_chat: {
        primaryAction: 'Qualify issue and schedule service',
        greetingStyle: 'professional',
        responseLength: 'moderate',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Queue',
        fallbackBehavior: 'Offer callback request'
      },
      web_voice: {
        primaryAction: 'Verbal triage with scheduling display',
        greetingStyle: 'professional',
        responseLength: 'brief',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Allow',
        fallbackBehavior: 'Chat transition'
      },
      sms: {
        primaryAction: 'Appointment confirmations and ETA updates',
        greetingStyle: 'professional',
        responseLength: 'brief',
        canShowVisuals: false,
        canSendLinks: true,
        interruptionHandling: 'Async',
        fallbackBehavior: 'Phone for emergencies'
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. APPLIANCE REPAIR
  // ═══════════════════════════════════════════════════════════════════════════
  11: {
    verticalId: 11,
    verticalName: 'Appliance Repair',
    brainRules: {
      urgencyClassification: 'medium',
      alwaysCollect: ['appliance_type', 'brand_model', 'issue_description', 'address', 'callback_number'],
      neverDo: ['diagnose_over_phone', 'advise_opening_appliance', 'guarantee_parts_availability'],
      escalationTriggers: ['refrigerator_not_cooling', 'gas_appliance_smell', 'water_leaking'],
      toneGuidance: 'Helpful and knowledgeable. Patient with appliance identification.',
      complianceNotes: ['Gas appliances require licensed technicians', 'Warranty status affects repair approach']
    },
    featureConfig: {
      appointmentBooking: 'ON',
      emergencyEscalation: 'OPTIONAL',
      afterHoursHandling: 'OFF',
      leadCapture: 'ON',
      callbackScheduling: 'ON',
      insuranceInfoCollection: 'OFF',
      priceQuoting: 'OPTIONAL',
      locationVerification: 'ON',
      smsFollowUp: 'ON',
      transferToHuman: 'ON'
    },
    workflowPermissions: {
      allowed: ['book_service_call', 'capture_appliance_info', 'check_service_area', 'provide_service_fee_info', 'capture_symptoms'],
      forbidden: ['diagnose_issues', 'advise_diy_repair', 'promise_parts_availability'],
      requiresConfirmation: ['same_day_service', 'commercial_appliance']
    },
    channelOverrides: {
      phone: {
        primaryAction: 'Capture appliance details and book service window',
        greetingStyle: 'professional',
        responseLength: 'moderate',
        canShowVisuals: false,
        canSendLinks: false,
        interruptionHandling: 'Standard',
        fallbackBehavior: 'Schedule callback'
      },
      web_chat: {
        primaryAction: 'Guided appliance identification and scheduling',
        greetingStyle: 'professional',
        responseLength: 'detailed',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Queue',
        fallbackBehavior: 'Form-based booking'
      },
      web_voice: {
        primaryAction: 'Conversational appliance intake',
        greetingStyle: 'professional',
        responseLength: 'moderate',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Standard',
        fallbackBehavior: 'Chat fallback'
      },
      sms: {
        primaryAction: 'Appointment confirmations and tech ETA',
        greetingStyle: 'professional',
        responseLength: 'brief',
        canShowVisuals: false,
        canSendLinks: true,
        interruptionHandling: 'Async',
        fallbackBehavior: 'Phone for bookings'
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. PEST CONTROL
  // ═══════════════════════════════════════════════════════════════════════════
  12: {
    verticalId: 12,
    verticalName: 'Pest Control',
    brainRules: {
      urgencyClassification: 'medium',
      alwaysCollect: ['pest_type', 'severity', 'address', 'callback_number', 'pets_children'],
      neverDo: ['advise_diy_chemicals', 'downplay_infestations', 'guarantee_one_treatment_cure'],
      escalationTriggers: ['venomous_pests', 'large_infestation', 'bed_bugs', 'commercial_property'],
      toneGuidance: 'Non-judgmental and professional. Reassuring about treatment effectiveness.',
      complianceNotes: ['EPA regulations on pesticides', 'Safety info for pets/children required']
    },
    featureConfig: {
      appointmentBooking: 'ON',
      emergencyEscalation: 'OPTIONAL',
      afterHoursHandling: 'OFF',
      leadCapture: 'ON',
      callbackScheduling: 'ON',
      insuranceInfoCollection: 'OFF',
      priceQuoting: 'OPTIONAL',
      locationVerification: 'ON',
      smsFollowUp: 'ON',
      transferToHuman: 'ON'
    },
    workflowPermissions: {
      allowed: ['book_inspection', 'capture_pest_info', 'offer_recurring_service', 'explain_treatment_process', 'ask_safety_questions'],
      forbidden: ['advise_chemical_use', 'guarantee_results', 'skip_safety_questions'],
      requiresConfirmation: ['termite_treatment', 'commercial_service']
    },
    channelOverrides: {
      phone: {
        primaryAction: 'Identify pest, assess severity, book service',
        greetingStyle: 'professional',
        responseLength: 'moderate',
        canShowVisuals: false,
        canSendLinks: false,
        interruptionHandling: 'Standard',
        fallbackBehavior: 'Capture callback'
      },
      web_chat: {
        primaryAction: 'Pest identification with image upload option',
        greetingStyle: 'professional',
        responseLength: 'detailed',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Queue',
        fallbackBehavior: 'Callback request'
      },
      web_voice: {
        primaryAction: 'Verbal pest description and booking',
        greetingStyle: 'professional',
        responseLength: 'moderate',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Standard',
        fallbackBehavior: 'Chat transition'
      },
      sms: {
        primaryAction: 'Appointment reminders and follow-up scheduling',
        greetingStyle: 'professional',
        responseLength: 'brief',
        canShowVisuals: false,
        canSendLinks: true,
        interruptionHandling: 'Async',
        fallbackBehavior: 'Phone for new issues'
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 13. JUNK REMOVAL
  // ═══════════════════════════════════════════════════════════════════════════
  13: {
    verticalId: 13,
    verticalName: 'Junk Removal',
    brainRules: {
      urgencyClassification: 'low',
      alwaysCollect: ['item_description', 'volume_estimate', 'address', 'callback_number', 'access_info'],
      neverDo: ['quote_exact_prices_without_seeing', 'accept_hazardous_materials', 'skip_access_questions'],
      escalationTriggers: ['estate_cleanout', 'commercial_volume', 'same_day_urgent'],
      toneGuidance: 'Friendly and efficient. Helpful with volume estimation.',
      complianceNotes: ['Hazmat restrictions', 'Donation vs disposal preferences']
    },
    featureConfig: {
      appointmentBooking: 'ON',
      emergencyEscalation: 'OFF',
      afterHoursHandling: 'OFF',
      leadCapture: 'ON',
      callbackScheduling: 'ON',
      insuranceInfoCollection: 'OFF',
      priceQuoting: 'OPTIONAL',
      locationVerification: 'ON',
      smsFollowUp: 'ON',
      transferToHuman: 'ON'
    },
    workflowPermissions: {
      allowed: ['book_estimate', 'capture_item_list', 'provide_price_range', 'check_service_area', 'discuss_access'],
      forbidden: ['accept_hazmat', 'guarantee_exact_price', 'schedule_without_details'],
      requiresConfirmation: ['large_volume_jobs', 'same_day_service']
    },
    channelOverrides: {
      phone: {
        primaryAction: 'Understand scope, provide range, book estimate or service',
        greetingStyle: 'warm',
        responseLength: 'moderate',
        canShowVisuals: false,
        canSendLinks: false,
        interruptionHandling: 'Standard',
        fallbackBehavior: 'Schedule callback'
      },
      web_chat: {
        primaryAction: 'Item list capture with photo upload',
        greetingStyle: 'warm',
        responseLength: 'detailed',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Queue',
        fallbackBehavior: 'Quote request form'
      },
      web_voice: {
        primaryAction: 'Conversational scoping',
        greetingStyle: 'warm',
        responseLength: 'moderate',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Standard',
        fallbackBehavior: 'Chat transition'
      },
      sms: {
        primaryAction: 'Appointment confirmations and arrival updates',
        greetingStyle: 'professional',
        responseLength: 'brief',
        canShowVisuals: false,
        canSendLinks: true,
        interruptionHandling: 'Async',
        fallbackBehavior: 'Phone for quotes'
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 14. BAIL BONDS
  // ═══════════════════════════════════════════════════════════════════════════
  14: {
    verticalId: 14,
    verticalName: 'Bail Bonds',
    brainRules: {
      urgencyClassification: 'critical',
      alwaysCollect: ['defendant_name', 'jail_location', 'charge_type', 'callback_number', 'relationship'],
      neverDo: ['provide_legal_advice', 'guarantee_release_time', 'discuss_case_details'],
      escalationTriggers: ['all_calls_are_urgent', 'weekend_arrest', 'high_bail_amount'],
      toneGuidance: 'Calm, professional, non-judgmental. Efficient under stress.',
      complianceNotes: ['Licensed bondsman requirements', 'Fee disclosure requirements', 'No legal advice']
    },
    featureConfig: {
      appointmentBooking: 'OFF',
      emergencyEscalation: 'ON',
      afterHoursHandling: 'ON',
      leadCapture: 'ON',
      callbackScheduling: 'OFF',
      insuranceInfoCollection: 'OFF',
      priceQuoting: 'ON',
      locationVerification: 'ON',
      smsFollowUp: 'ON',
      transferToHuman: 'ON'
    },
    workflowPermissions: {
      allowed: ['collect_defendant_info', 'explain_process', 'provide_fee_info', 'dispatch_agent', 'verify_jail_info'],
      forbidden: ['give_legal_advice', 'guarantee_timing', 'discuss_case_merits'],
      requiresConfirmation: ['payment_arrangement', 'collateral_discussion']
    },
    channelOverrides: {
      phone: {
        primaryAction: 'Rapid intake, explain fees, dispatch bondsman',
        greetingStyle: 'empathetic',
        responseLength: 'brief',
        canShowVisuals: false,
        canSendLinks: false,
        interruptionHandling: 'Allow all - callers are stressed',
        fallbackBehavior: 'Must capture jail and name before ending'
      },
      web_chat: {
        primaryAction: 'Basic intake, escalate to phone',
        greetingStyle: 'empathetic',
        responseLength: 'brief',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Priority',
        fallbackBehavior: 'Click-to-call prominent'
      },
      web_voice: {
        primaryAction: 'Phone-equivalent intake',
        greetingStyle: 'empathetic',
        responseLength: 'brief',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Full allow',
        fallbackBehavior: 'Immediate phone transfer'
      },
      sms: {
        primaryAction: 'Status updates only',
        greetingStyle: 'professional',
        responseLength: 'brief',
        canShowVisuals: false,
        canSendLinks: true,
        interruptionHandling: 'Async',
        fallbackBehavior: 'Phone for all new requests'
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 15. CRIMINAL DEFENSE ATTORNEYS
  // ═══════════════════════════════════════════════════════════════════════════
  15: {
    verticalId: 15,
    verticalName: 'Criminal Defense Attorneys',
    brainRules: {
      urgencyClassification: 'critical',
      alwaysCollect: ['defendant_name', 'charge_type', 'arrest_status', 'callback_number', 'jurisdiction'],
      neverDo: ['provide_legal_advice', 'predict_outcomes', 'discuss_fees_in_detail', 'record_case_details'],
      escalationTriggers: ['active_arrest', 'arraignment_imminent', 'serious_felony', 'juvenile_case'],
      toneGuidance: 'Confidential, professional, reassuring. Urgent but not panicked.',
      complianceNotes: ['Attorney-client privilege starts at intake', 'No specific legal advice', 'Conflict check required']
    },
    featureConfig: {
      appointmentBooking: 'ON',
      emergencyEscalation: 'ON',
      afterHoursHandling: 'ON',
      leadCapture: 'ON',
      callbackScheduling: 'ON',
      insuranceInfoCollection: 'OFF',
      priceQuoting: 'OFF',
      locationVerification: 'ON',
      smsFollowUp: 'OPTIONAL',
      transferToHuman: 'ON'
    },
    workflowPermissions: {
      allowed: ['capture_basic_case_info', 'schedule_consultation', 'emergency_attorney_dispatch', 'provide_general_process_info', 'verify_jurisdiction'],
      forbidden: ['provide_legal_advice', 'discuss_fees', 'predict_outcomes', 'record_detailed_statements'],
      requiresConfirmation: ['emergency_representation', 'weekend_consultation']
    },
    channelOverrides: {
      phone: {
        primaryAction: 'Assess urgency, capture minimal info, connect to attorney',
        greetingStyle: 'empathetic',
        responseLength: 'brief',
        canShowVisuals: false,
        canSendLinks: false,
        interruptionHandling: 'Priority for urgency',
        fallbackBehavior: 'Attorney callback within 15 minutes for arrests'
      },
      web_chat: {
        primaryAction: 'Confidential intake form, schedule consultation',
        greetingStyle: 'professional',
        responseLength: 'moderate',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Queue',
        fallbackBehavior: 'Secure callback request'
      },
      web_voice: {
        primaryAction: 'Verbal intake with privacy emphasis',
        greetingStyle: 'empathetic',
        responseLength: 'brief',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Allow',
        fallbackBehavior: 'Phone transfer for sensitive matters'
      },
      sms: {
        primaryAction: 'Appointment confirmations only - no case discussion',
        greetingStyle: 'professional',
        responseLength: 'brief',
        canShowVisuals: false,
        canSendLinks: true,
        interruptionHandling: 'Async',
        fallbackBehavior: 'Phone required for all case matters'
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 16. PERSONAL INJURY ATTORNEYS
  // ═══════════════════════════════════════════════════════════════════════════
  16: {
    verticalId: 16,
    verticalName: 'Personal Injury Attorneys',
    brainRules: {
      urgencyClassification: 'high',
      alwaysCollect: ['incident_type', 'incident_date', 'injury_description', 'callback_number', 'insurance_status'],
      neverDo: ['provide_legal_advice', 'promise_outcomes', 'discuss_settlement_values', 'discourage_medical_treatment'],
      escalationTriggers: ['statute_of_limitations_near', 'severe_injury', 'wrongful_death', 'commercial_vehicle'],
      toneGuidance: 'Compassionate and understanding. Professional confidence without promises.',
      complianceNotes: ['No case evaluation over phone', 'Medical treatment always priority', 'Statute of limitations awareness']
    },
    featureConfig: {
      appointmentBooking: 'ON',
      emergencyEscalation: 'OPTIONAL',
      afterHoursHandling: 'OPTIONAL',
      leadCapture: 'ON',
      callbackScheduling: 'ON',
      insuranceInfoCollection: 'ON',
      priceQuoting: 'OFF',
      locationVerification: 'OPTIONAL',
      smsFollowUp: 'ON',
      transferToHuman: 'ON'
    },
    workflowPermissions: {
      allowed: ['capture_incident_info', 'schedule_consultation', 'collect_insurance_info', 'explain_general_process', 'qualify_case_type'],
      forbidden: ['evaluate_case_value', 'provide_legal_advice', 'discourage_treatment', 'promise_outcomes'],
      requiresConfirmation: ['priority_callback', 'home_visit_scheduling']
    },
    channelOverrides: {
      phone: {
        primaryAction: 'Compassionate intake, qualify case type, schedule consultation',
        greetingStyle: 'empathetic',
        responseLength: 'moderate',
        canShowVisuals: false,
        canSendLinks: false,
        interruptionHandling: 'Patient and allowing',
        fallbackBehavior: 'Callback scheduling with priority'
      },
      web_chat: {
        primaryAction: 'Guided case intake form with qualification',
        greetingStyle: 'empathetic',
        responseLength: 'detailed',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Queue',
        fallbackBehavior: 'Case evaluation request form'
      },
      web_voice: {
        primaryAction: 'Conversational intake with visual forms',
        greetingStyle: 'empathetic',
        responseLength: 'moderate',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Patient',
        fallbackBehavior: 'Chat continuation'
      },
      sms: {
        primaryAction: 'Appointment reminders and document requests',
        greetingStyle: 'professional',
        responseLength: 'brief',
        canShowVisuals: false,
        canSendLinks: true,
        interruptionHandling: 'Async',
        fallbackBehavior: 'Phone for case discussion'
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 17. DENTISTS
  // ═══════════════════════════════════════════════════════════════════════════
  17: {
    verticalId: 17,
    verticalName: 'Dentists',
    brainRules: {
      urgencyClassification: 'high',
      alwaysCollect: ['issue_type', 'pain_level', 'patient_name', 'callback_number', 'new_or_existing'],
      neverDo: ['diagnose_conditions', 'prescribe_treatment', 'advise_medication', 'dismiss_pain_complaints'],
      escalationTriggers: ['severe_pain', 'facial_swelling', 'knocked_out_tooth', 'uncontrolled_bleeding'],
      toneGuidance: 'Warm and reassuring. Calm for anxious patients. Urgent for emergencies.',
      complianceNotes: ['HIPAA applies', 'No medical advice', 'Insurance verification offered']
    },
    featureConfig: {
      appointmentBooking: 'ON',
      emergencyEscalation: 'ON',
      afterHoursHandling: 'OPTIONAL',
      leadCapture: 'ON',
      callbackScheduling: 'ON',
      insuranceInfoCollection: 'ON',
      priceQuoting: 'OPTIONAL',
      locationVerification: 'OFF',
      smsFollowUp: 'ON',
      transferToHuman: 'ON'
    },
    workflowPermissions: {
      allowed: ['book_appointment', 'capture_patient_info', 'verify_insurance', 'triage_emergency', 'explain_services'],
      forbidden: ['diagnose_conditions', 'advise_medication', 'provide_treatment_recommendations'],
      requiresConfirmation: ['emergency_slot', 'new_patient_comprehensive']
    },
    channelOverrides: {
      phone: {
        primaryAction: 'Assess urgency, book appropriate appointment type',
        greetingStyle: 'warm',
        responseLength: 'moderate',
        canShowVisuals: false,
        canSendLinks: false,
        interruptionHandling: 'Patient and understanding',
        fallbackBehavior: 'Emergency callback within 30 minutes'
      },
      web_chat: {
        primaryAction: 'Online scheduling with service selection',
        greetingStyle: 'warm',
        responseLength: 'detailed',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Queue',
        fallbackBehavior: 'Appointment request form'
      },
      web_voice: {
        primaryAction: 'Conversational scheduling with calendar view',
        greetingStyle: 'warm',
        responseLength: 'moderate',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Standard',
        fallbackBehavior: 'Chat continuation'
      },
      sms: {
        primaryAction: 'Appointment reminders and confirmations',
        greetingStyle: 'professional',
        responseLength: 'brief',
        canShowVisuals: false,
        canSendLinks: true,
        interruptionHandling: 'Async',
        fallbackBehavior: 'Phone for emergencies'
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 18. PROPERTY MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  18: {
    verticalId: 18,
    verticalName: 'Property Management',
    brainRules: {
      urgencyClassification: 'high',
      alwaysCollect: ['caller_type', 'property_address', 'unit_number', 'issue_type', 'callback_number'],
      neverDo: ['make_lease_decisions', 'discuss_other_tenants', 'promise_specific_timelines', 'bypass_owner_approval'],
      escalationTriggers: ['fire', 'flood', 'no_heat_cold_weather', 'security_breach', 'gas_leak'],
      toneGuidance: 'Professional and neutral. Empathetic for maintenance emergencies.',
      complianceNotes: ['Fair housing compliance', 'Tenant privacy', 'Owner notification requirements']
    },
    featureConfig: {
      appointmentBooking: 'ON',
      emergencyEscalation: 'ON',
      afterHoursHandling: 'ON',
      leadCapture: 'ON',
      callbackScheduling: 'ON',
      insuranceInfoCollection: 'OFF',
      priceQuoting: 'OFF',
      locationVerification: 'ON',
      smsFollowUp: 'ON',
      transferToHuman: 'ON'
    },
    workflowPermissions: {
      allowed: ['log_maintenance_request', 'dispatch_emergency_vendor', 'route_to_manager', 'capture_showing_request', 'verify_tenant_status'],
      forbidden: ['make_lease_decisions', 'discuss_other_residents', 'quote_rent_changes', 'approve_repairs'],
      requiresConfirmation: ['emergency_vendor_dispatch', 'owner_notification']
    },
    channelOverrides: {
      phone: {
        primaryAction: 'Identify caller type, route appropriately, log requests',
        greetingStyle: 'professional',
        responseLength: 'moderate',
        canShowVisuals: false,
        canSendLinks: false,
        interruptionHandling: 'Standard',
        fallbackBehavior: 'Log ticket and promise callback'
      },
      web_chat: {
        primaryAction: 'Tenant portal integration, maintenance requests',
        greetingStyle: 'professional',
        responseLength: 'detailed',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Queue',
        fallbackBehavior: 'Maintenance request form'
      },
      web_voice: {
        primaryAction: 'Verbal request with visual ticket creation',
        greetingStyle: 'professional',
        responseLength: 'moderate',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Standard',
        fallbackBehavior: 'Chat continuation'
      },
      sms: {
        primaryAction: 'Maintenance updates and showing confirmations',
        greetingStyle: 'professional',
        responseLength: 'brief',
        canShowVisuals: false,
        canSendLinks: true,
        interruptionHandling: 'Async',
        fallbackBehavior: 'Phone for emergencies'
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 19. MOVING COMPANIES
  // ═══════════════════════════════════════════════════════════════════════════
  19: {
    verticalId: 19,
    verticalName: 'Moving Companies',
    brainRules: {
      urgencyClassification: 'low',
      alwaysCollect: ['move_date', 'origin_address', 'destination_address', 'home_size', 'callback_number'],
      neverDo: ['quote_binding_price_without_survey', 'guarantee_delivery_dates_long_distance', 'skip_inventory_questions'],
      escalationTriggers: ['same_week_move', 'commercial_move', 'long_distance', 'storage_needed'],
      toneGuidance: 'Organized and reassuring. Patient with detail collection.',
      complianceNotes: ['DOT regulations for interstate', 'Written estimates required', 'Insurance options disclosure']
    },
    featureConfig: {
      appointmentBooking: 'ON',
      emergencyEscalation: 'OFF',
      afterHoursHandling: 'OFF',
      leadCapture: 'ON',
      callbackScheduling: 'ON',
      insuranceInfoCollection: 'OPTIONAL',
      priceQuoting: 'OPTIONAL',
      locationVerification: 'ON',
      smsFollowUp: 'ON',
      transferToHuman: 'ON'
    },
    workflowPermissions: {
      allowed: ['capture_move_details', 'schedule_estimate', 'provide_range_quote', 'explain_process', 'discuss_packing_options'],
      forbidden: ['guarantee_prices', 'promise_delivery_dates', 'skip_inventory_assessment'],
      requiresConfirmation: ['long_distance_move', 'commercial_move', 'specialty_items']
    },
    channelOverrides: {
      phone: {
        primaryAction: 'Capture move details, provide range, schedule estimate',
        greetingStyle: 'warm',
        responseLength: 'detailed',
        canShowVisuals: false,
        canSendLinks: false,
        interruptionHandling: 'Patient',
        fallbackBehavior: 'Schedule callback for estimate'
      },
      web_chat: {
        primaryAction: 'Guided move planner with inventory capture',
        greetingStyle: 'warm',
        responseLength: 'detailed',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Queue',
        fallbackBehavior: 'Quote request form'
      },
      web_voice: {
        primaryAction: 'Conversational move planning',
        greetingStyle: 'warm',
        responseLength: 'detailed',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Patient',
        fallbackBehavior: 'Chat continuation'
      },
      sms: {
        primaryAction: 'Move date confirmations and crew arrival updates',
        greetingStyle: 'professional',
        responseLength: 'brief',
        canShowVisuals: false,
        canSendLinks: true,
        interruptionHandling: 'Async',
        fallbackBehavior: 'Phone for changes'
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 20. CONCRETE / MASONRY
  // ═══════════════════════════════════════════════════════════════════════════
  20: {
    verticalId: 20,
    verticalName: 'Concrete / Masonry',
    brainRules: {
      urgencyClassification: 'low',
      alwaysCollect: ['project_type', 'address', 'callback_number', 'project_size', 'timeline'],
      neverDo: ['quote_without_seeing', 'guarantee_weather_schedules', 'advise_structural_decisions'],
      escalationTriggers: ['structural_crack', 'foundation_concern', 'commercial_project'],
      toneGuidance: 'Knowledgeable and patient. Professional for project discussions.',
      complianceNotes: ['Permits often required', 'Weather dependencies', 'Structural work needs engineering']
    },
    featureConfig: {
      appointmentBooking: 'ON',
      emergencyEscalation: 'OFF',
      afterHoursHandling: 'OFF',
      leadCapture: 'ON',
      callbackScheduling: 'ON',
      insuranceInfoCollection: 'OFF',
      priceQuoting: 'OFF',
      locationVerification: 'ON',
      smsFollowUp: 'ON',
      transferToHuman: 'ON'
    },
    workflowPermissions: {
      allowed: ['schedule_estimate', 'capture_project_details', 'explain_process', 'discuss_materials', 'check_service_area'],
      forbidden: ['quote_prices', 'advise_on_structural', 'guarantee_weather_timing'],
      requiresConfirmation: ['commercial_project', 'structural_work']
    },
    channelOverrides: {
      phone: {
        primaryAction: 'Understand project scope, schedule on-site estimate',
        greetingStyle: 'professional',
        responseLength: 'moderate',
        canShowVisuals: false,
        canSendLinks: false,
        interruptionHandling: 'Standard',
        fallbackBehavior: 'Schedule callback'
      },
      web_chat: {
        primaryAction: 'Project inquiry with photo upload',
        greetingStyle: 'professional',
        responseLength: 'detailed',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Queue',
        fallbackBehavior: 'Estimate request form'
      },
      web_voice: {
        primaryAction: 'Conversational project scoping',
        greetingStyle: 'professional',
        responseLength: 'moderate',
        canShowVisuals: true,
        canSendLinks: true,
        interruptionHandling: 'Standard',
        fallbackBehavior: 'Chat continuation'
      },
      sms: {
        primaryAction: 'Appointment confirmations and weather updates',
        greetingStyle: 'professional',
        responseLength: 'brief',
        canShowVisuals: false,
        canSendLinks: true,
        interruptionHandling: 'Async',
        fallbackBehavior: 'Phone for project discussion'
      }
    }
  }
};

// Export helper to get config by vertical ID (with fallback to Generic Local Business)
export function getVerticalConfig(verticalId: number): VerticalPromptConfig {
  const config = verticalPromptMappings[verticalId];
  if (!config) {
    console.warn(`[VerticalConfig] Unknown verticalId ${verticalId}, using Generic Local Business fallback`);
    return GENERIC_LOCAL_BUSINESS_CONFIG;
  }
  return config;
}

// Check if vertical requires compliance modifiers
export function isComplianceAwareVertical(verticalId: number): { medical: boolean; legal: boolean } {
  return {
    medical: MEDICAL_VERTICAL_IDS.includes(verticalId),
    legal: LEGAL_VERTICAL_IDS.includes(verticalId)
  };
}

// Get compliance modifiers for a vertical
export function getComplianceModifiers(verticalId: number): string[] {
  const compliance = isComplianceAwareVertical(verticalId);
  const modifiers: string[] = [];
  if (compliance.medical) modifiers.push(...COMPLIANCE_MODIFIERS.medical);
  if (compliance.legal) modifiers.push(...COMPLIANCE_MODIFIERS.legal);
  return modifiers;
}

// Export list of all vertical IDs
export const TOP_20_VERTICAL_IDS = Object.keys(verticalPromptMappings).map(Number);
