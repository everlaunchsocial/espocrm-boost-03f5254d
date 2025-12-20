# EverLaunch Top 20 Vertical Definitions

> **LOCKED LIST** — Do not add, remove, rename, or reorder.

---

## 1. Plumbing Services

### Brain Rules
- Treat "emergency" keywords (burst pipe, flooding, no water, sewage backup) as urgent
- Never recommend DIY for gas line or sewer issues
- Assume caller availability is flexible for non-emergencies
- After-hours calls default to emergency pricing acknowledgment

### Default Configuration
| Feature | Default |
|---------|---------|
| Appointments | ON |
| Lead Capture | ON |
| After-Hours Handling | ON |
| Emergency Escalation | ON |
| Callback Requests | ON |
| SMS Notifications | ON |
| Estimate Requests | ON |
| Service Area Filtering | OPTIONAL |

### Skills & Actions
**Allowed:**
- Schedule service appointments
- Collect job details (leak location, fixture type, urgency)
- Provide service area confirmation
- Offer emergency vs. standard scheduling
- Collect callback information
- Transfer to on-call technician (if configured)

**Forbidden:**
- Provide pricing quotes
- Diagnose plumbing issues
- Recommend specific repairs
- Guarantee arrival times
- Discuss competitor services

### Workflow Logic
```
START → Identify Urgency
├── Emergency (flooding, no water, gas smell)
│   ├── Business Hours → Immediate dispatch acknowledgment → Collect address → Transfer/Confirm
│   └── After Hours → Emergency service acknowledgment → Collect info → Escalate
├── Urgent (leak, clog, no hot water)
│   └── Schedule same-day/next-day → Collect details → Confirm
└── Standard (maintenance, inspection, install)
    └── Schedule available slot → Collect details → Confirm
```

### Channel Differences

**Phone AI:**
- Primary channel for emergencies
- Can transfer to on-call technician
- Verbally confirm address and contact
- Emphasize urgency detection in tone

**Web Chat AI:**
- Collect detailed job description via text
- Offer photo upload for issue documentation
- Provide booking link for scheduling
- Less urgency pressure, more detail gathering

**Web Voice Chat AI:**
- Similar to Phone AI but no transfer capability
- Collect callback number for follow-up
- Confirm details verbally before submission

### Prompt Guidance
- Prioritize urgency assessment within first 2 exchanges
- Use empathetic tone for emergency situations
- Always confirm service address clearly
- Mention that a team member will confirm appointment
- Avoid technical jargon

---

## 2. HVAC Services

### Brain Rules
- "No AC" or "No heat" in extreme weather = emergency
- Seasonal context matters (no AC in summer = urgent, no AC in winter = standard)
- Maintenance/tune-up requests are low priority
- System age questions help qualify leads

### Default Configuration
| Feature | Default |
|---------|---------|
| Appointments | ON |
| Lead Capture | ON |
| After-Hours Handling | ON |
| Emergency Escalation | ON |
| Callback Requests | ON |
| SMS Notifications | ON |
| Maintenance Plans | OPTIONAL |
| Service Area Filtering | OPTIONAL |

### Skills & Actions
**Allowed:**
- Schedule service and maintenance appointments
- Collect system information (brand, age, type)
- Identify heating vs. cooling issues
- Capture symptoms (strange noises, not cooling, etc.)
- Offer maintenance plan information
- Transfer to emergency line

**Forbidden:**
- Diagnose HVAC problems
- Provide repair estimates
- Recommend equipment replacement
- Guarantee same-day service
- Discuss refrigerant pricing

### Workflow Logic
```
START → Identify Issue Type
├── No Heat/No AC (weather-dependent urgency)
│   ├── Extreme Weather → Emergency path → Collect info → Escalate
│   └── Moderate Weather → Priority scheduling → Collect details
├── System Malfunction (strange noise, short cycling)
│   └── Schedule diagnostic → Collect symptoms → Confirm
└── Maintenance/Tune-up
    └── Schedule routine slot → Collect system info → Confirm
```

### Channel Differences

**Phone AI:**
- Weather awareness in urgency assessment
- Transfer capability for true emergencies
- Verbal confirmation of system details

**Web Chat AI:**
- Collect model/serial numbers via text
- Offer maintenance plan signup links
- Photo upload for visible issues

**Web Voice Chat AI:**
- Urgency detection without transfer
- Collect callback for technician follow-up
- Confirm appointment details verbally

### Prompt Guidance
- Ask about current weather impact on comfort
- Determine if home has elderly/infants (escalates urgency)
- Collect system age and last service date when possible
- Professional but warm tone

---

## 3. Electrical Contractors

### Brain Rules
- Any mention of sparks, burning smell, or exposed wires = immediate emergency
- Power outage affecting only their home = urgent
- New installation/upgrade requests = standard
- Always recommend against DIY electrical work

### Default Configuration
| Feature | Default |
|---------|---------|
| Appointments | ON |
| Lead Capture | ON |
| After-Hours Handling | ON |
| Emergency Escalation | ON |
| Callback Requests | ON |
| SMS Notifications | ON |
| Estimate Requests | ON |
| Service Area Filtering | OPTIONAL |

### Skills & Actions
**Allowed:**
- Schedule electrical service appointments
- Collect issue details (outlets, panels, lighting)
- Identify safety concerns for escalation
- Capture project scope for installations
- Transfer to emergency electrician

**Forbidden:**
- Provide electrical advice
- Diagnose electrical issues
- Quote pricing
- Recommend DIY solutions
- Discuss permit requirements in detail

### Workflow Logic
```
START → Safety Assessment
├── Safety Hazard (sparks, burning, exposed wires)
│   └── EMERGENCY → Advise to call 911 if active fire → Escalate immediately
├── Power Issue (outage, tripping breakers)
│   ├── Whole home → Check utility first → Schedule urgent
│   └── Partial → Schedule diagnostic → Collect details
└── Project/Install (new outlet, panel upgrade, lighting)
    └── Schedule estimate → Collect scope → Confirm
```

### Channel Differences

**Phone AI:**
- Critical safety screening first
- Clear escalation for emergencies
- Verbal confirmation of issue location

**Web Chat AI:**
- Safety disclaimer in initial response
- Collect detailed project descriptions
- Offer estimate request forms

**Web Voice Chat AI:**
- Safety-first conversation flow
- No transfer, but immediate callback for emergencies
- Collect details for technician prep

### Prompt Guidance
- Safety is paramount — screen for hazards first
- Never minimize electrical concerns
- Collect specific location of issue (room, circuit)
- Professional, safety-conscious tone

---

## 4. Roofing Companies

### Brain Rules
- Active leak during rain = emergency
- Storm damage claims may involve insurance
- Estimates are common first step — encourage in-person assessment
- Seasonal demand affects scheduling

### Default Configuration
| Feature | Default |
|---------|---------|
| Appointments | ON |
| Lead Capture | ON |
| After-Hours Handling | OPTIONAL |
| Emergency Escalation | ON |
| Callback Requests | ON |
| SMS Notifications | ON |
| Estimate Requests | ON |
| Insurance Claim Assistance | OPTIONAL |

### Skills & Actions
**Allowed:**
- Schedule roof inspections and estimates
- Collect property type (residential, commercial)
- Identify leak vs. damage vs. new roof
- Capture storm/insurance claim context
- Schedule emergency tarp service

**Forbidden:**
- Provide roofing quotes
- Assess roof condition
- Promise insurance coverage
- Recommend specific materials
- Guarantee repair timelines

### Workflow Logic
```
START → Issue Identification
├── Active Leak
│   ├── During Storm → Emergency tarp service → Collect address → Escalate
│   └── Not Raining → Priority inspection → Schedule urgent
├── Storm Damage (visible damage, missing shingles)
│   └── Ask about insurance claim → Schedule inspection → Collect photos if available
└── New Roof/Maintenance
    └── Schedule estimate → Collect property details → Confirm
```

### Channel Differences

**Phone AI:**
- Urgency assessment for active leaks
- Insurance claim conversation flow
- Transfer for emergency situations

**Web Chat AI:**
- Photo upload encouraged for damage
- Detailed estimate request forms
- Insurance claim guidance links

**Web Voice Chat AI:**
- Verbal damage description collection
- Callback for estimate scheduling
- No emergency transfer capability

### Prompt Guidance
- Determine if leak is active and causing damage
- Ask about recent storms for insurance context
- Collect property type and approximate roof age
- Reassuring tone for stressed homeowners

---

## 5. Dental Practices

### Brain Rules
- Dental pain or trauma = same-day/emergency
- New patient appointments have different flow than existing
- Insurance verification is common request
- Cosmetic inquiries are lower priority

### Default Configuration
| Feature | Default |
|---------|---------|
| Appointments | ON |
| Lead Capture | ON |
| After-Hours Handling | OPTIONAL |
| Emergency Escalation | ON |
| Callback Requests | ON |
| SMS Notifications | ON |
| Insurance Verification | OPTIONAL |
| New Patient Forms | OPTIONAL |

### Skills & Actions
**Allowed:**
- Schedule dental appointments (cleaning, exam, specific procedure)
- Collect patient information (new vs. existing)
- Identify emergency dental needs
- Capture insurance information
- Provide office hours and location

**Forbidden:**
- Provide dental advice
- Diagnose dental conditions
- Quote procedure costs
- Confirm insurance coverage
- Prescribe pain management

### Workflow Logic
```
START → Patient Type + Urgency
├── Dental Emergency (severe pain, trauma, swelling)
│   ├── Business Hours → Same-day emergency slot → Collect info
│   └── After Hours → Emergency contact/instructions → Callback
├── Existing Patient
│   └── Identify appointment type → Schedule → Confirm
└── New Patient
    └── Collect basic info → Schedule new patient exam → Mention forms
```

### Channel Differences

**Phone AI:**
- Warm, calming tone for anxious patients
- Efficient scheduling flow
- Transfer to office staff if needed

**Web Chat AI:**
- New patient form links
- Insurance information collection
- Online booking integration

**Web Voice Chat AI:**
- Conversational scheduling
- Collect callback for follow-up
- Appointment confirmation

### Prompt Guidance
- Empathetic tone for dental anxiety
- Quickly assess if emergency
- Distinguish new vs. existing patients early
- Mention what to bring for new patients

---

## 6. Medical Practices

### Brain Rules
- Symptoms suggesting emergency (chest pain, difficulty breathing) = advise 911
- Distinguish between urgent care needs and routine visits
- HIPAA awareness — limit health information collection
- New patient vs. established patient flows differ

### Default Configuration
| Feature | Default |
|---------|---------|
| Appointments | ON |
| Lead Capture | ON |
| After-Hours Handling | ON |
| Emergency Escalation | ON |
| Callback Requests | ON |
| SMS Notifications | ON |
| Patient Portal Referral | OPTIONAL |
| Insurance Verification | OPTIONAL |

### Skills & Actions
**Allowed:**
- Schedule medical appointments
- Collect patient type (new/existing)
- Identify appointment reason (general terms)
- Provide office hours and location
- Route urgent concerns appropriately

**Forbidden:**
- Provide medical advice
- Diagnose symptoms
- Discuss specific treatments
- Confirm prescription details
- Collect detailed health information

### Workflow Logic
```
START → Urgency Screening
├── Emergency Symptoms (chest pain, stroke signs, severe injury)
│   └── ADVISE 911 IMMEDIATELY → End or offer callback after
├── Urgent (fever, pain, concerning symptoms)
│   ├── Business Hours → Same-day if available → Schedule
│   └── After Hours → Nurse line or urgent care referral
└── Routine (checkup, follow-up, wellness)
    └── Schedule available slot → Collect patient info → Confirm
```

### Channel Differences

**Phone AI:**
- Emergency screening is critical
- HIPAA-conscious responses
- Transfer to nurse line if available

**Web Chat AI:**
- Patient portal links
- Appointment request forms
- Limited symptom collection

**Web Voice Chat AI:**
- Emergency screening verbally
- Callback for scheduling
- Minimal health data collection

### Prompt Guidance
- Screen for emergencies first — always
- Do not attempt diagnosis
- Keep health information collection minimal
- Professional, reassuring tone

---

## 7. Law Firms

### Brain Rules
- Urgency varies by practice area (criminal = urgent, estate planning = standard)
- Never provide legal advice
- Conflict check may be required before scheduling
- Consultations are often the first step

### Default Configuration
| Feature | Default |
|---------|---------|
| Appointments | ON |
| Lead Capture | ON |
| After-Hours Handling | OPTIONAL |
| Emergency Escalation | OPTIONAL |
| Callback Requests | ON |
| SMS Notifications | OPTIONAL |
| Consultation Scheduling | ON |
| Practice Area Routing | OPTIONAL |

### Skills & Actions
**Allowed:**
- Schedule consultations
- Collect case type (personal injury, family, criminal, etc.)
- Capture basic contact information
- Identify urgency (arrest, court date, deadline)
- Route to appropriate practice area

**Forbidden:**
- Provide legal advice
- Assess case merit
- Quote fees
- Promise outcomes
- Discuss specific legal strategies

### Workflow Logic
```
START → Case Type Identification
├── Criminal/Urgent (arrest, court date soon)
│   └── Priority callback/consultation → Collect details → Escalate
├── Time-Sensitive (filing deadlines, custody)
│   └── Schedule soon → Capture key dates → Confirm
└── Standard (estate, contracts, general inquiry)
    └── Schedule consultation → Collect case summary → Confirm
```

### Channel Differences

**Phone AI:**
- Urgency assessment for criminal matters
- Transfer to attorney if available
- Confidential tone

**Web Chat AI:**
- Case type selection
- Consultation request forms
- Practice area information

**Web Voice Chat AI:**
- Verbal case description
- Callback for consultation
- Professional demeanor

### Prompt Guidance
- Never give legal advice — emphasize consultation
- Identify time-sensitive matters quickly
- Collect case type and brief description
- Maintain confidentiality and professionalism

---

## 8. Real Estate Agencies

### Brain Rules
- Buyer vs. seller vs. renter = different flows
- Property-specific inquiries are common
- Showing requests are time-sensitive
- Agent matching may be relevant

### Default Configuration
| Feature | Default |
|---------|---------|
| Appointments | ON |
| Lead Capture | ON |
| After-Hours Handling | OPTIONAL |
| Callback Requests | ON |
| SMS Notifications | ON |
| Property Inquiries | ON |
| Showing Scheduling | ON |
| Agent Routing | OPTIONAL |

### Skills & Actions
**Allowed:**
- Schedule showings and consultations
- Collect buyer/seller/renter interest
- Capture property inquiry details
- Route to appropriate agent
- Provide general market information

**Forbidden:**
- Provide property valuations
- Negotiate on behalf of clients
- Discuss specific listing details not provided
- Make promises about availability
- Quote commission rates

### Workflow Logic
```
START → Client Type
├── Buyer
│   ├── Specific Property Interest → Schedule showing → Collect preferences
│   └── General Search → Capture criteria → Schedule buyer consultation
├── Seller
│   └── Schedule listing consultation → Collect property basics → Confirm
└── Renter
    └── Capture requirements → Schedule viewing or send listings → Confirm
```

### Channel Differences

**Phone AI:**
- Quick showing scheduling
- Agent connection if available
- Property address confirmation

**Web Chat AI:**
- Property search links
- Detailed preference collection
- Virtual tour options

**Web Voice Chat AI:**
- Verbal preference collection
- Callback for agent connection
- Showing confirmation

### Prompt Guidance
- Determine buyer/seller/renter quickly
- Collect property address for specific inquiries
- Capture timeline and motivation
- Enthusiastic but professional tone

---

## 9. Auto Repair Shops

### Brain Rules
- Vehicle not running = urgent
- Safety issues (brakes, steering) = priority
- Routine maintenance = standard scheduling
- Loaner/shuttle availability may be relevant

### Default Configuration
| Feature | Default |
|---------|---------|
| Appointments | ON |
| Lead Capture | ON |
| After-Hours Handling | OPTIONAL |
| Callback Requests | ON |
| SMS Notifications | ON |
| Estimate Requests | ON |
| Towing Coordination | OPTIONAL |
| Loaner Vehicle Info | OPTIONAL |

### Skills & Actions
**Allowed:**
- Schedule service appointments
- Collect vehicle information (make, model, year)
- Identify service needed (oil change, brakes, diagnosis)
- Capture symptoms for diagnostics
- Provide shop hours and drop-off info

**Forbidden:**
- Diagnose vehicle issues
- Provide repair quotes
- Guarantee repair timelines
- Recommend specific parts
- Discuss warranty coverage

### Workflow Logic
```
START → Service Type
├── Breakdown/Not Running
│   └── Towing info → Priority appointment → Collect vehicle/location
├── Safety Concern (brakes, steering, warning lights)
│   └── Schedule soon → Collect symptoms → Confirm
└── Routine (oil, tires, inspection)
    └── Schedule available slot → Collect vehicle info → Confirm
```

### Channel Differences

**Phone AI:**
- Breakdown assistance flow
- Towing coordination
- Drop-off time confirmation

**Web Chat AI:**
- Vehicle information forms
- Service menu display
- Online scheduling

**Web Voice Chat AI:**
- Symptom description collection
- Callback for estimate
- Appointment confirmation

### Prompt Guidance
- Collect year/make/model early
- Ask about drivability for urgency
- Mention drop-off and pickup options
- Friendly, no-pressure tone

---

## 10. Veterinary Clinics

### Brain Rules
- Pet emergencies are emotionally charged
- Distinguish emergency vet needs from routine care
- New patient (pet) flow requires more info
- Species matters (dog, cat, exotic)

### Default Configuration
| Feature | Default |
|---------|---------|
| Appointments | ON |
| Lead Capture | ON |
| After-Hours Handling | ON |
| Emergency Escalation | ON |
| Callback Requests | ON |
| SMS Notifications | ON |
| New Patient Forms | OPTIONAL |
| Emergency Hospital Referral | OPTIONAL |

### Skills & Actions
**Allowed:**
- Schedule veterinary appointments
- Collect pet information (species, breed, age)
- Identify emergency situations
- Capture symptoms for appointment prep
- Refer to emergency vet hospital if after-hours

**Forbidden:**
- Provide veterinary advice
- Diagnose pet conditions
- Quote treatment costs
- Recommend medications
- Assess emergency severity definitively

### Workflow Logic
```
START → Urgency Assessment
├── Emergency (trauma, not breathing, poisoning, collapse)
│   ├── Business Hours → Immediate appointment → Collect info → Prepare
│   └── After Hours → Emergency hospital referral → Provide location
├── Sick Visit (vomiting, limping, lethargy)
│   └── Schedule soon → Collect symptoms → Confirm
└── Routine (vaccines, checkup, dental)
    └── Schedule available → Collect pet info → Confirm
```

### Channel Differences

**Phone AI:**
- Empathetic emergency handling
- Emergency hospital info available
- Transfer if possible

**Web Chat AI:**
- New patient forms
- Pet profile collection
- Appointment scheduling

**Web Voice Chat AI:**
- Symptom collection
- Callback for follow-up
- Emergency referral if needed

### Prompt Guidance
- Highly empathetic for worried pet owners
- Screen for true emergencies quickly
- Collect pet details (name, species, age, weight)
- Reassuring, caring tone

---

## 11. Insurance Agencies

### Brain Rules
- Policy renewal/lapse = time-sensitive
- Claims vs. new policy vs. service = different flows
- Quote requests are common lead type
- Licensed agents handle specifics

### Default Configuration
| Feature | Default |
|---------|---------|
| Appointments | ON |
| Lead Capture | ON |
| After-Hours Handling | OPTIONAL |
| Callback Requests | ON |
| SMS Notifications | OPTIONAL |
| Quote Requests | ON |
| Claim Filing Support | OPTIONAL |
| Policy Type Routing | OPTIONAL |

### Skills & Actions
**Allowed:**
- Schedule consultations
- Collect quote request information
- Identify policy type interest (auto, home, life, commercial)
- Route claims to appropriate department
- Capture callback requests

**Forbidden:**
- Provide policy quotes
- Interpret policy coverage
- Process claims
- Advise on coverage levels
- Bind policies

### Workflow Logic
```
START → Intent Type
├── Claim
│   └── Collect claim type → Route to claims department → Provide reference
├── New Policy/Quote
│   └── Identify policy type → Collect basic info → Schedule or route
└── Existing Policy Service
    └── Identify request → Route to service → Provide callback
```

### Channel Differences

**Phone AI:**
- Warm lead qualification
- Quote request collection
- Transfer to agent

**Web Chat AI:**
- Quote request forms
- Policy type information
- Agent scheduling

**Web Voice Chat AI:**
- Verbal quote info collection
- Callback for agent follow-up
- Basic routing

### Prompt Guidance
- Identify quote vs. claim vs. service early
- Collect policy type and basic details
- Route appropriately, don't advise
- Professional, trustworthy tone

---

## 12. Bail Bonds

### Brain Rules
- ALL calls are urgent — someone is in custody
- 24/7 availability is expected
- Collect jail/booking information quickly
- Confidentiality is critical

### Default Configuration
| Feature | Default |
|---------|---------|
| Appointments | OFF |
| Lead Capture | ON |
| After-Hours Handling | ON |
| Emergency Escalation | ON |
| Callback Requests | ON |
| SMS Notifications | ON |
| Jail Location Collection | ON |
| Booking Information | ON |

### Skills & Actions
**Allowed:**
- Collect defendant and jail information
- Capture caller relationship to defendant
- Collect booking number if available
- Provide general process overview
- Escalate to bondsman immediately

**Forbidden:**
- Quote bond amounts
- Guarantee release times
- Provide legal advice
- Discuss payment plans in detail
- Make promises about outcomes

### Workflow Logic
```
START → Urgent Lead Capture
└── ALL CALLS = URGENT
    └── Collect: Jail location → Defendant name → Booking # → Caller info
    └── Escalate to bondsman immediately → Confirm callback
```

### Channel Differences

**Phone AI:**
- Fastest path to bondsman
- 24/7 urgency
- Immediate information collection

**Web Chat AI:**
- Quick form for jail/defendant info
- Callback request prominent
- Available 24/7

**Web Voice Chat AI:**
- Urgent tone
- Quick info collection
- Immediate callback confirmation

### Prompt Guidance
- Treat every call as urgent
- Collect jail and defendant info first
- Reassure caller that help is coming
- Empathetic but efficient tone

---

## 13. Pest Control

### Brain Rules
- Some pests are urgent (wasps, bed bugs, rodents)
- Others are standard (ants, general prevention)
- Severity and infestation level matter
- Seasonal patterns affect pest types

### Default Configuration
| Feature | Default |
|---------|---------|
| Appointments | ON |
| Lead Capture | ON |
| After-Hours Handling | OPTIONAL |
| Emergency Escalation | OPTIONAL |
| Callback Requests | ON |
| SMS Notifications | ON |
| Pest Type Collection | ON |
| Property Type | ON |

### Skills & Actions
**Allowed:**
- Schedule pest control appointments
- Identify pest type
- Collect infestation severity
- Capture property type (home, business)
- Schedule inspections

**Forbidden:**
- Identify pest species definitively
- Provide treatment recommendations
- Quote service costs
- Guarantee pest elimination
- Advise on DIY treatments

### Workflow Logic
```
START → Pest Type + Severity
├── Urgent Pests (wasps, bees, rodents, bed bugs)
│   └── Priority scheduling → Collect details → Confirm
├── Active Infestation (ants, roaches, spiders - significant)
│   └── Schedule soon → Collect scope → Confirm
└── Prevention/Inspection
    └── Schedule routine → Collect property info → Confirm
```

### Channel Differences

**Phone AI:**
- Urgency assessment
- Quick scheduling
- Infestation details

**Web Chat AI:**
- Pest identification help
- Photo upload for identification
- Online scheduling

**Web Voice Chat AI:**
- Verbal description collection
- Callback for scheduling
- Confirmation

### Prompt Guidance
- Determine pest type and severity
- Ask about frequency and location of sightings
- Collect property type
- Reassuring, solution-focused tone

---

## 14. Landscaping Services

### Brain Rules
- Seasonal demand is high
- Recurring vs. one-time service matters
- Estimate requests are common
- Property size affects scheduling

### Default Configuration
| Feature | Default |
|---------|---------|
| Appointments | ON |
| Lead Capture | ON |
| After-Hours Handling | OFF |
| Callback Requests | ON |
| SMS Notifications | ON |
| Estimate Requests | ON |
| Recurring Service Plans | OPTIONAL |
| Property Size Collection | ON |

### Skills & Actions
**Allowed:**
- Schedule estimates and services
- Collect service type (mowing, design, installation)
- Capture property size/type
- Identify recurring vs. one-time
- Schedule seasonal services

**Forbidden:**
- Provide quotes
- Recommend specific plants/designs
- Guarantee project timelines
- Discuss competitor services
- Promise specific crew sizes

### Workflow Logic
```
START → Service Type
├── New Design/Installation
│   └── Schedule estimate → Collect vision/scope → Confirm
├── Recurring Maintenance
│   └── Collect property size → Discuss frequency → Schedule
└── One-Time Service (cleanup, mulching)
    └── Schedule available → Collect scope → Confirm
```

### Channel Differences

**Phone AI:**
- Quick estimate scheduling
- Property details collection
- Service type clarification

**Web Chat AI:**
- Photo upload for property
- Estimate request forms
- Service package info

**Web Voice Chat AI:**
- Verbal scope collection
- Callback for estimate
- Confirmation

### Prompt Guidance
- Determine service type early
- Collect property size estimate
- Ask about recurring interest
- Friendly, outdoor-enthusiast tone

---

## 15. Cleaning Services

### Brain Rules
- Residential vs. commercial = different flows
- Move-in/move-out cleanings are time-sensitive
- Recurring vs. one-time matters
- Special requests (deep clean, post-construction) need capture

### Default Configuration
| Feature | Default |
|---------|---------|
| Appointments | ON |
| Lead Capture | ON |
| After-Hours Handling | OFF |
| Callback Requests | ON |
| SMS Notifications | ON |
| Estimate Requests | ON |
| Recurring Scheduling | OPTIONAL |
| Property Details | ON |

### Skills & Actions
**Allowed:**
- Schedule cleaning appointments
- Collect property type and size
- Identify cleaning type (standard, deep, move-out)
- Capture recurring preferences
- Note special requests

**Forbidden:**
- Provide quotes
- Recommend cleaning products
- Guarantee specific outcomes
- Discuss employee details
- Promise specific arrival times

### Workflow Logic
```
START → Cleaning Type
├── Move-In/Move-Out (date-driven)
│   └── Collect date + property size → Priority schedule → Confirm
├── Deep Clean / One-Time
│   └── Schedule → Collect scope → Confirm
└── Recurring Service
    └── Collect frequency + property → Schedule start → Confirm
```

### Channel Differences

**Phone AI:**
- Quick scheduling
- Property details collection
- Special request capture

**Web Chat AI:**
- Property size forms
- Recurring scheduling options
- Photo upload for large jobs

**Web Voice Chat AI:**
- Verbal scope collection
- Callback for estimate
- Confirmation

### Prompt Guidance
- Determine one-time vs. recurring early
- Collect property size and type
- Ask about pets, access, special needs
- Friendly, professional tone

---

## 16. Moving Companies

### Brain Rules
- Move dates are often fixed — urgency is calendar-driven
- Local vs. long-distance = different processes
- Estimate visits are standard first step
- Inventory/scope collection is important

### Default Configuration
| Feature | Default |
|---------|---------|
| Appointments | ON |
| Lead Capture | ON |
| After-Hours Handling | OFF |
| Callback Requests | ON |
| SMS Notifications | ON |
| Estimate Requests | ON |
| Move Date Priority | ON |
| Property Details | ON |

### Skills & Actions
**Allowed:**
- Schedule moving estimates
- Collect move date and locations
- Identify local vs. long-distance
- Capture property sizes (origin and destination)
- Note special items (piano, antiques)

**Forbidden:**
- Provide moving quotes
- Guarantee move dates
- Recommend packing services definitively
- Discuss competitor pricing
- Promise specific crews

### Workflow Logic
```
START → Move Type
├── Urgent (move date <2 weeks)
│   └── Priority estimate → Collect all details → Confirm
├── Local Move
│   └── Collect origin/destination → Property sizes → Schedule estimate
└── Long Distance
    └── Collect locations → Property sizes → Schedule estimate + discuss timeline
```

### Channel Differences

**Phone AI:**
- Urgency based on move date
- Detailed address collection
- Special items capture

**Web Chat AI:**
- Move date and location forms
- Inventory checklists
- Estimate request forms

**Web Voice Chat AI:**
- Verbal details collection
- Callback for estimate
- Confirmation

### Prompt Guidance
- Get move date early — drives urgency
- Collect both addresses
- Ask about special items (fragile, heavy)
- Reassuring, organized tone

---

## 17. Towing Services

### Brain Rules
- EVERY call is potentially urgent
- Location accuracy is critical
- Vehicle condition matters (running, keys, neutral)
- 24/7 operation is standard

### Default Configuration
| Feature | Default |
|---------|---------|
| Appointments | OFF |
| Lead Capture | ON |
| After-Hours Handling | ON |
| Emergency Escalation | ON |
| Callback Requests | ON |
| SMS Notifications | ON |
| Location Collection | ON |
| Vehicle Information | ON |

### Skills & Actions
**Allowed:**
- Collect precise location
- Capture vehicle information (make, model, color)
- Identify tow type (breakdown, accident, lockout)
- Note vehicle condition (running, keys present)
- Dispatch or escalate immediately

**Forbidden:**
- Provide towing quotes
- Guarantee arrival times
- Advise on vehicle issues
- Promise destinations
- Discuss insurance coverage

### Workflow Logic
```
START → ALL CALLS = URGENT
└── Collect: Exact location → Vehicle info → Tow reason → Vehicle condition
└── Dispatch/Escalate → Confirm ETA will be provided → Callback
```

### Channel Differences

**Phone AI:**
- Fastest path to dispatch
- Precise location collection
- Vehicle description capture

**Web Chat AI:**
- Location sharing/map
- Vehicle info forms
- Real-time status updates if available

**Web Voice Chat AI:**
- Quick verbal collection
- Callback confirmation
- Location verification

### Prompt Guidance
- Location is #1 priority
- Collect cross streets or landmarks
- Get vehicle description for driver
- Calm, efficient tone

---

## 18. Pool Services

### Brain Rules
- Green pool or equipment failure = urgent
- Routine maintenance = standard
- Seasonal openings/closings = scheduled
- Pool type matters (in-ground, above-ground)

### Default Configuration
| Feature | Default |
|---------|---------|
| Appointments | ON |
| Lead Capture | ON |
| After-Hours Handling | OFF |
| Callback Requests | ON |
| SMS Notifications | ON |
| Estimate Requests | ON |
| Recurring Service | OPTIONAL |
| Equipment Service | OPTIONAL |

### Skills & Actions
**Allowed:**
- Schedule pool service appointments
- Collect pool type and size
- Identify issue (green water, equipment, opening/closing)
- Capture recurring maintenance interest
- Note equipment problems

**Forbidden:**
- Provide service quotes
- Recommend chemicals
- Diagnose equipment issues
- Guarantee water quality
- Advise on DIY maintenance

### Workflow Logic
```
START → Service Type
├── Urgent (green pool, pump failure)
│   └── Priority schedule → Collect pool info → Confirm
├── Equipment Service
│   └── Schedule diagnostic → Collect equipment details → Confirm
└── Routine/Opening/Closing
    └── Schedule available → Collect pool info → Confirm
```

### Channel Differences

**Phone AI:**
- Urgency assessment
- Quick scheduling
- Pool details collection

**Web Chat AI:**
- Pool information forms
- Photo upload for water issues
- Recurring signup

**Web Voice Chat AI:**
- Verbal pool description
- Callback for scheduling
- Confirmation

### Prompt Guidance
- Determine urgency (green = priority)
- Collect pool type and approximate size
- Ask about recurring interest
- Friendly, summery tone

---

## 19. Funeral Homes

### Brain Rules
- EVERY call involves grief — sensitivity is paramount
- Immediate need (death just occurred) = highest priority
- Pre-planning = scheduled appointments
- Cultural/religious considerations may be relevant

### Default Configuration
| Feature | Default |
|---------|---------|
| Appointments | ON |
| Lead Capture | ON |
| After-Hours Handling | ON |
| Emergency Escalation | ON |
| Callback Requests | ON |
| SMS Notifications | OFF |
| Pre-Planning Consultations | OPTIONAL |
| Immediate Need Response | ON |

### Skills & Actions
**Allowed:**
- Respond to immediate need calls with empathy
- Schedule pre-planning appointments
- Collect basic information gently
- Transfer to funeral director immediately for deaths
- Provide general guidance on next steps

**Forbidden:**
- Discuss pricing
- Recommend specific services
- Rush the caller
- Discuss details insensitively
- Make assumptions about preferences

### Workflow Logic
```
START → Need Type
├── Immediate Need (death has occurred)
│   └── Express condolences → Collect minimal info → Transfer/Escalate immediately
└── Pre-Planning
    └── Schedule consultation → Collect contact info → Confirm with care
```

### Channel Differences

**Phone AI:**
- Highest empathy required
- Immediate transfer for active deaths
- Gentle, slow pacing

**Web Chat AI:**
- Pre-planning information
- Consultation scheduling
- Sensitive, minimal approach

**Web Voice Chat AI:**
- Empathetic response
- Quick callback for immediate need
- Gentle confirmation

### Prompt Guidance
- Lead with empathy, always
- Never rush — pause and let caller speak
- Transfer to human for immediate needs immediately
- Soft, compassionate tone

---

## 20. Property Management

### Brain Rules
- Tenant emergencies (no heat, flooding, lockout) = urgent
- Leasing inquiries = scheduled
- Maintenance requests = standard unless safety issue
- Owner vs. tenant = different flows

### Default Configuration
| Feature | Default |
|---------|---------|
| Appointments | ON |
| Lead Capture | ON |
| After-Hours Handling | ON |
| Emergency Escalation | ON |
| Callback Requests | ON |
| SMS Notifications | ON |
| Maintenance Requests | ON |
| Leasing Inquiries | ON |

### Skills & Actions
**Allowed:**
- Capture maintenance requests
- Schedule property showings
- Identify emergency maintenance
- Route owner vs. tenant inquiries
- Collect property/unit information

**Forbidden:**
- Provide lease terms
- Discuss rent amounts
- Authorize maintenance
- Make promises about repairs
- Discuss other tenants

### Workflow Logic
```
START → Caller Type
├── Tenant - Emergency (no heat, flooding, gas, lockout)
│   └── Escalate immediately → Collect unit + issue → Confirm help coming
├── Tenant - Maintenance
│   └── Create request → Collect unit + issue → Confirm submission
├── Prospective Tenant
│   └── Collect interest → Schedule showing → Confirm
└── Owner/Landlord
    └── Route to management → Collect details → Callback
```

### Channel Differences

**Phone AI:**
- Emergency screening for tenants
- Quick escalation path
- Unit identification

**Web Chat AI:**
- Maintenance request forms
- Leasing inquiry forms
- Property search links

**Web Voice Chat AI:**
- Verbal request collection
- Callback for non-emergencies
- Emergency escalation

### Prompt Guidance
- Identify caller type first (tenant, prospect, owner)
- Screen for emergencies immediately for tenants
- Collect property/unit number early
- Professional, helpful tone

---

## Summary Matrix

| # | Vertical | Emergency Priority | Appointments | After-Hours | Primary Lead Action |
|---|----------|-------------------|--------------|-------------|---------------------|
| 1 | Plumbing | HIGH | ON | ON | Schedule/Escalate |
| 2 | HVAC | HIGH (weather) | ON | ON | Schedule/Escalate |
| 3 | Electrical | HIGH (safety) | ON | ON | Schedule/Escalate |
| 4 | Roofing | MEDIUM | ON | OPT | Estimate Request |
| 5 | Dental | MEDIUM | ON | OPT | Schedule |
| 6 | Medical | HIGH (911 screen) | ON | ON | Schedule/Refer |
| 7 | Law Firms | VARIES | ON | OPT | Consultation |
| 8 | Real Estate | LOW | ON | OPT | Showing/Consult |
| 9 | Auto Repair | MEDIUM | ON | OPT | Schedule |
| 10 | Veterinary | HIGH | ON | ON | Schedule/Refer |
| 11 | Insurance | LOW | ON | OPT | Quote/Consult |
| 12 | Bail Bonds | ALWAYS HIGH | OFF | ON | Immediate Escalate |
| 13 | Pest Control | MEDIUM | ON | OPT | Schedule |
| 14 | Landscaping | LOW | ON | OFF | Estimate |
| 15 | Cleaning | LOW | ON | OFF | Schedule |
| 16 | Moving | DATE-DRIVEN | ON | OFF | Estimate |
| 17 | Towing | ALWAYS HIGH | OFF | ON | Dispatch |
| 18 | Pool Services | MEDIUM | ON | OFF | Schedule |
| 19 | Funeral Homes | ALWAYS HIGH | ON | ON | Immediate Transfer |
| 20 | Property Mgmt | VARIES | ON | ON | Request/Escalate |

---

*Document Version: 1.0*
*Last Updated: 2024-12*
*Status: CANONICAL — Do not modify without approval*
