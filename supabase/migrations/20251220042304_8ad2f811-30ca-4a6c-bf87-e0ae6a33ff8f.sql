-- Add parent_archetype column to track inheritance
ALTER TABLE public.vertical_training 
ADD COLUMN IF NOT EXISTS parent_archetype text NULL;

-- Insert the 80 derived verticals (ranks 21-100)
INSERT INTO public.vertical_training (rank, industry_name, parent_archetype, why_priority, pain_points, why_phone_ai_fits, where_to_find) VALUES
-- HOME & PROPERTY (21-35)
(21, 'Vinyl Siding', 'Roofing Companies', '["Non-emergency home exterior"]', '["Seasonal demand", "Quote-heavy sales cycle"]', '["Appointment scheduling", "Quote requests"]', '["Home improvement directories", "Local contractors"]'),
(22, 'Window Installation', 'Roofing Companies', '["Non-emergency home improvement"]', '["High-ticket sales", "Long decision cycles"]', '["Lead qualification", "Appointment booking"]', '["Home improvement shows", "Realtor referrals"]'),
(23, 'Door Installation', 'Roofing Companies', '["Security and aesthetic upgrades"]', '["Competitive market", "Quote comparisons"]', '["Quick quote requests", "Scheduling"]', '["Home improvement stores", "Contractors"]'),
(24, 'Insulation Contractors', 'HVAC Services', '["Energy efficiency focus"]', '["Seasonal peaks", "Education-heavy sales"]', '["Energy audit scheduling", "Quote requests"]', '["Utility company referrals", "Green directories"]'),
(25, 'Chimney Services', 'Roofing Companies', '["Seasonal maintenance"]', '["Short busy season", "Safety concerns"]', '["Inspection scheduling", "Emergency repairs"]', '["Homeowner associations", "Real estate agents"]'),
(26, 'Gutter Installation', 'Roofing Companies', '["Storm damage and prevention"]', '["Weather-dependent", "Bundled services"]', '["Quote requests", "Maintenance scheduling"]', '["Roofing company referrals", "Storm chasers"]'),
(27, 'Foundation Repair', 'Roofing Companies', '["Structural emergency potential"]', '["High-ticket", "Trust-critical"]', '["Inspection scheduling", "Urgent assessments"]', '["Home inspectors", "Real estate transactions"]'),
(28, 'Basement Waterproofing', 'Cleaning Services', '["Water damage prevention"]', '["Seasonal flooding", "Insurance claims"]', '["Emergency response", "Assessment scheduling"]', '["Insurance adjusters", "Home inspectors"]'),
(29, 'Septic Services', 'Plumbing Services', '["Rural essential service"]', '["Emergency pumping", "Maintenance schedules"]', '["Emergency dispatch", "Routine scheduling"]', '["Rural homeowners", "Property managers"]'),
(30, 'Well Pump Services', 'Plumbing Services', '["Rural water emergency"]', '["No water = emergency", "Technical diagnosis"]', '["Emergency dispatch", "Diagnostic scheduling"]', '["Rural communities", "Farm suppliers"]'),
(31, 'Solar Installation', 'Electrical Contractors', '["Growing green market"]', '["Long sales cycle", "Financing complexity"]', '["Lead qualification", "Consultation booking"]', '["Environmental groups", "Utility incentive programs"]'),
(32, 'Home Automation', 'Electrical Contractors', '["Smart home growth"]', '["Technical support needs", "Integration complexity"]', '["Consultation booking", "Support scheduling"]', '["Tech retailers", "Security companies"]'),
(33, 'Fire Alarm Systems', 'Electrical Contractors', '["Code compliance required"]', '["Inspection deadlines", "Emergency repairs"]', '["Inspection scheduling", "Emergency service"]', '["Property managers", "Insurance requirements"]'),
(34, 'Security System Installers', 'Electrical Contractors', '["Safety and peace of mind"]', '["Competition with DIY", "Monitoring contracts"]', '["Consultation booking", "Service calls"]', '["Real estate agents", "Insurance discounts"]'),
(35, 'Elevator Repair (Residential)', 'Electrical Contractors', '["Accessibility critical"]', '["Emergency entrapment", "Code compliance"]', '["Emergency dispatch", "Maintenance scheduling"]', '["Accessibility advocates", "Senior housing"]'),

-- VEHICLE & TRANSPORTATION (36-45)
(36, 'Mobile Mechanics', 'Auto Repair Shops', '["Convenience-focused"]', '["Geographic coverage", "Parts availability"]', '["Location-based dispatch", "Scheduling"]', '["Roadside assistance", "Fleet managers"]'),
(37, 'Transmission Repair', 'Auto Repair Shops', '["Specialized high-ticket"]', '["Technical diagnosis", "Price concerns"]', '["Diagnostic scheduling", "Quote requests"]', '["General mechanics referrals", "Auto forums"]'),
(38, 'Tire Shops', 'Auto Repair Shops', '["High-volume routine"]', '["Price competition", "Wait times"]', '["Appointment booking", "Inventory checks"]', '["Seasonal marketing", "Fleet accounts"]'),
(39, 'Auto Body / Collision', 'Auto Repair Shops', '["Insurance-driven"]', '["Insurance coordination", "Rental needs"]', '["Estimate scheduling", "Status updates"]', '["Insurance adjusters", "Towing companies"]'),
(40, 'Motorcycle Repair', 'Auto Repair Shops', '["Seasonal specialty"]', '["Short riding season", "Parts sourcing"]', '["Service scheduling", "Parts inquiries"]', '["Motorcycle clubs", "Dealerships"]'),
(41, 'Boat Repair', 'Auto Repair Shops', '["Seasonal marine"]', '["Short season", "Specialized parts"]', '["Service scheduling", "Winterization booking"]', '["Marinas", "Boat clubs"]'),
(42, 'RV Repair', 'Auto Repair Shops', '["Mobile living support"]', '["Roadside emergencies", "Specialized systems"]', '["Emergency dispatch", "Service scheduling"]', '["RV parks", "Camping clubs"]'),
(43, 'Fleet Maintenance', 'Auto Repair Shops', '["B2B volume"]', '["Downtime costs", "Scheduled maintenance"]', '["Preventive scheduling", "Emergency dispatch"]', '["Trucking companies", "Delivery services"]'),
(44, 'Roadside Assistance', 'Towing Services', '["24/7 emergency"]', '["Response time critical", "Geographic coverage"]', '["Emergency dispatch", "ETA updates"]', '["Insurance partnerships", "Auto clubs"]'),
(45, 'Heavy Equipment Repair', 'Auto Repair Shops', '["Industrial B2B"]', '["Downtime = money", "On-site needs"]', '["Emergency dispatch", "Preventive scheduling"]', '["Construction companies", "Equipment dealers"]'),

-- CLEANING & MAINTENANCE (46-55)
(46, 'Carpet Cleaning', 'Cleaning Services', '["Routine home maintenance"]', '["Price competition", "Seasonal demand"]', '["Quote requests", "Scheduling"]', '["Real estate agents", "Property managers"]'),
(47, 'Pressure Washing', 'Cleaning Services', '["Exterior maintenance"]', '["Weather dependent", "Seasonal peaks"]', '["Quote requests", "Scheduling"]', '["HOAs", "Property managers"]'),
(48, 'Window Cleaning', 'Cleaning Services', '["Commercial and residential"]', '["Height/safety concerns", "Recurring schedules"]', '["Quote requests", "Recurring booking"]', '["Commercial property managers", "Residential services"]'),
(49, 'Janitorial Services', 'Cleaning Services', '["B2B recurring"]', '["Contract negotiations", "Staff reliability"]', '["Quote requests", "Service scheduling"]', '["Commercial real estate", "Office managers"]'),
(50, 'Hoarding Cleanup', 'Cleaning Services', '["Sensitive specialty"]', '["Emotional situations", "Health hazards"]', '["Sensitive intake", "Assessment scheduling"]', '["Social workers", "Estate attorneys"]'),
(51, 'Biohazard Cleanup', 'Cleaning Services', '["Emergency specialty"]', '["24/7 emergency", "Compliance requirements"]', '["Emergency dispatch", "Compliance documentation"]', '["Law enforcement", "Property managers"]'),
(52, 'Mold Remediation', 'Cleaning Services', '["Health emergency"]', '["Insurance claims", "Health concerns"]', '["Assessment scheduling", "Emergency response"]', '["Home inspectors", "Insurance adjusters"]'),
(53, 'Air Duct Cleaning', 'HVAC Services', '["HVAC maintenance add-on"]', '["Scam concerns", "Proving value"]', '["Service scheduling", "HVAC bundling"]', '["HVAC companies", "Allergy sufferers"]'),
(54, 'Chimney Cleaning', 'Roofing Companies', '["Seasonal safety"]', '["Short busy season", "Safety education"]', '["Inspection scheduling", "Seasonal booking"]', '["Homeowner associations", "Insurance requirements"]'),
(55, 'Graffiti Removal', 'Cleaning Services', '["Commercial specialty"]', '["Quick response needed", "Recurring vandalism"]', '["Emergency dispatch", "Contract scheduling"]', '["Property managers", "Municipalities"]'),

-- PROFESSIONAL SERVICES (56-67)
(56, 'Family Law Attorneys', 'Law Firms', '["Emotionally charged"]', '["Sensitive intake", "Urgent custody matters"]', '["Confidential intake", "Consultation booking"]', '["Therapists", "Social workers"]'),
(57, 'Criminal Defense Attorneys', 'Law Firms', '["Urgent legal needs"]', '["24/7 arrests", "Time-sensitive"]', '["24/7 intake", "Urgent consultation"]', '["Bail bonds", "Court referrals"]'),
(58, 'Estate Planning Attorneys', 'Law Firms', '["Life event driven"]', '["Procrastination", "Complexity concerns"]', '["Consultation booking", "Document scheduling"]', '["Financial advisors", "Senior centers"]'),
(59, 'Immigration Attorneys', 'Law Firms', '["Deadline critical"]', '["Government deadlines", "Language barriers"]', '["Multilingual intake", "Deadline tracking"]', '["Community organizations", "Employers"]'),
(60, 'Bankruptcy Attorneys', 'Law Firms', '["Financial distress"]', '["Shame/stigma", "Urgency"]', '["Confidential intake", "Consultation booking"]', '["Credit counselors", "Financial advisors"]'),
(61, 'Accounting Firms', 'Insurance Agencies', '["Seasonal peaks"]', '["Tax deadlines", "Year-end rush"]', '["Appointment booking", "Document collection"]', '["Business associations", "Banks"]'),
(62, 'Bookkeepers', 'Insurance Agencies', '["Small business support"]', '["Ongoing relationship", "Trust building"]', '["Consultation booking", "Onboarding scheduling"]', '["Accountant referrals", "Small business groups"]'),
(63, 'Tax Preparers', 'Insurance Agencies', '["Extreme seasonal"]', '["Tax season crush", "Extension deadlines"]', '["Appointment booking", "Document reminders"]', '["Banks", "Employers"]'),
(64, 'Financial Advisors', 'Insurance Agencies', '["Relationship-based"]', '["Trust building", "Compliance requirements"]', '["Consultation booking", "Review scheduling"]', '["CPAs", "Estate attorneys"]'),
(65, 'Mortgage Brokers', 'Real Estate Agencies', '["Transaction-driven"]', '["Rate shopping", "Time sensitivity"]', '["Pre-qualification calls", "Rate updates"]', '["Real estate agents", "Builders"]'),
(66, 'Title Companies', 'Real Estate Agencies', '["Transaction support"]', '["Closing deadlines", "Document coordination"]', '["Closing scheduling", "Status updates"]', '["Real estate agents", "Lenders"]'),
(67, 'Home Inspectors', 'Real Estate Agencies', '["Transaction timeline"]', '["Tight deadlines", "Scheduling conflicts"]', '["Quick scheduling", "Report delivery"]', '["Real estate agents", "Buyers"]'),

-- MEDICAL & HEALTH (68-77)
(68, 'Chiropractors', 'Medical Practices', '["Pain-driven visits"]', '["New patient intake", "Insurance verification"]', '["Appointment booking", "Insurance pre-check"]', '["Primary care referrals", "Gyms"]'),
(69, 'Physical Therapy Clinics', 'Medical Practices', '["Referral-based"]', '["Insurance authorization", "Scheduling frequency"]', '["Multi-visit scheduling", "Insurance coordination"]', '["Orthopedic surgeons", "Primary care"]'),
(70, 'Urgent Care Clinics', 'Medical Practices', '["Walk-in focused"]', '["Wait time concerns", "After-hours needs"]', '["Wait time updates", "Pre-registration"]', '["Primary care overflow", "Employers"]'),
(71, 'Mental Health Practices', 'Medical Practices', '["Sensitive intake"]', '["Stigma concerns", "Availability issues"]', '["Confidential intake", "Crisis screening"]', '["Primary care", "Employee assistance programs"]'),
(72, 'Addiction Treatment Centers', 'Medical Practices', '["Crisis intervention"]', '["Immediate need", "Insurance complexity"]', '["24/7 intake", "Insurance verification"]', '["Hospitals", "Courts"]'),
(73, 'Vision Centers / Optometrists', 'Medical Practices', '["Routine and urgent"]', '["Insurance/vision plans", "Product sales"]', '["Appointment booking", "Insurance verification"]', '["Primary care", "Schools"]'),
(74, 'Hearing Aid Clinics', 'Medical Practices', '["Senior-focused"]', '["Hearing difficulties", "Technology concerns"]', '["Clear communication", "Appointment booking"]', '["ENT referrals", "Senior centers"]'),
(75, 'Dermatology Clinics', 'Medical Practices', '["Routine and urgent"]', '["Long wait times", "Cosmetic vs medical"]', '["Appointment booking", "Urgency triage"]', '["Primary care referrals", "Spas"]'),
(76, 'Orthopedic Clinics', 'Medical Practices', '["Injury-driven"]', '["Urgent injuries", "Surgery scheduling"]', '["Urgent triage", "Surgery coordination"]', '["Emergency rooms", "Primary care"]'),
(77, 'Imaging Centers', 'Medical Practices', '["Referral-based"]', '["Scheduling coordination", "Prep instructions"]', '["Appointment booking", "Prep reminders"]', '["Physician referrals", "Hospitals"]'),

-- PERSONAL & CONSUMER SERVICES (78-88)
(78, 'Hair Salons', 'Dental Practices', '["Appointment retail"]', '["No-shows", "Stylist preferences"]', '["Appointment booking", "Reminder calls"]', '["Social media", "Local directories"]'),
(79, 'Barber Shops', 'Dental Practices', '["Walk-in and appointment"]', '["Wait times", "Barber availability"]', '["Appointment booking", "Wait time updates"]', '["Local community", "Social media"]'),
(80, 'Nail Salons', 'Dental Practices', '["High-frequency visits"]', '["Walk-in demand", "Service duration"]', '["Appointment booking", "Service inquiries"]', '["Social media", "Local directories"]'),
(81, 'Massage Therapy', 'Dental Practices', '["Wellness appointments"]', '["Therapist preferences", "Gift certificates"]', '["Appointment booking", "Gift card sales"]', '["Gyms", "Chiropractors"]'),
(82, 'Spas (Non-Medical)', 'Dental Practices', '["Luxury appointments"]', '["Package complexity", "Special occasions"]', '["Package inquiries", "Appointment booking"]', '["Hotels", "Bridal shops"]'),
(83, 'Tattoo Studios', 'Dental Practices', '["Consultation-first"]', '["Artist scheduling", "Design consultations"]', '["Consultation booking", "Deposit collection"]', '["Social media", "Conventions"]'),
(84, 'Piercing Studios', 'Dental Practices', '["Quick service"]', '["Age verification", "Aftercare"]', '["Appointment booking", "Service inquiries"]', '["Tattoo studios", "Malls"]'),
(85, 'Fitness Studios', 'Dental Practices', '["Class-based"]', '["Class schedules", "Membership inquiries"]', '["Class booking", "Membership info"]', '["Social media", "Corporate wellness"]'),
(86, 'Martial Arts Schools', 'Dental Practices', '["Trial-focused"]', '["Trial class booking", "Age groups"]', '["Trial scheduling", "Program inquiries"]', '["Schools", "Community centers"]'),
(87, 'Dance Studios', 'Dental Practices', '["Class and event"]', '["Class schedules", "Recital info"]', '["Class booking", "Event scheduling"]', '["Schools", "Wedding planners"]'),
(88, 'Music Schools', 'Dental Practices', '["Lesson scheduling"]', '["Teacher matching", "Instrument rentals"]', '["Lesson booking", "Trial scheduling"]', '["Schools", "Music stores"]'),

-- LOGISTICS, EVENTS & MISC (89-100)
(89, 'Event Planners', 'Real Estate Agencies', '["Consultation-based"]', '["Date availability", "Vendor coordination"]', '["Consultation booking", "Availability checks"]', '["Venues", "Caterers"]'),
(90, 'Party Rental Companies', 'Real Estate Agencies', '["Date-driven"]', '["Inventory availability", "Delivery coordination"]', '["Availability checks", "Booking"]', '["Event planners", "Venues"]'),
(91, 'Tent Rental', 'Real Estate Agencies', '["Event logistics"]', '["Size requirements", "Setup coordination"]', '["Quote requests", "Booking"]', '["Event planners", "Caterers"]'),
(92, 'Storage Facilities', 'Property Management', '["Unit availability"]', '["Size matching", "Access hours"]', '["Unit availability", "Booking"]', '["Moving companies", "Real estate agents"]'),
(93, 'Self-Storage', 'Property Management', '["Self-service focused"]', '["Unit sizes", "Online booking"]', '["Availability checks", "Reservation"]', '["Moving companies", "Apartments"]'),
(94, 'Courier Services', 'Towing Services', '["Time-sensitive"]', '["Pickup scheduling", "Tracking"]', '["Dispatch", "Status updates"]', '["Legal offices", "Medical facilities"]'),
(95, 'Delivery Services', 'Towing Services', '["Logistics coordination"]', '["Time windows", "Address verification"]', '["Scheduling", "Status updates"]', '["Retailers", "Restaurants"]'),
(96, 'Funeral Transport', 'Funeral Homes', '["Sensitive logistics"]', '["Timing coordination", "Family needs"]', '["Sensitive scheduling", "Coordination"]', '["Funeral homes", "Hospitals"]'),
(97, 'Cremation Services', 'Funeral Homes', '["End-of-life"]', '["Sensitive intake", "Paperwork"]', '["Sensitive intake", "Arrangement scheduling"]', '["Funeral homes", "Hospice"]'),
(98, 'Senior Care Services', 'Property Management', '["Family decision"]', '["Care assessment", "Family coordination"]', '["Assessment scheduling", "Family calls"]', '["Hospitals", "Senior centers"]'),
(99, 'Childcare Centers', 'Medical Practices', '["Compliance-aware"]', '["Waitlists", "Tour scheduling"]', '["Tour booking", "Waitlist management"]', '["Employers", "Schools"]'),
(100, 'Pet Grooming', 'Veterinary Clinics', '["Recurring appointments"]', '["Breed-specific needs", "Scheduling"]', '["Appointment booking", "Service inquiries"]', '["Veterinary clinics", "Pet stores"]')
ON CONFLICT (rank) DO UPDATE SET
  industry_name = EXCLUDED.industry_name,
  parent_archetype = EXCLUDED.parent_archetype,
  why_priority = EXCLUDED.why_priority,
  pain_points = EXCLUDED.pain_points,
  why_phone_ai_fits = EXCLUDED.why_phone_ai_fits,
  where_to_find = EXCLUDED.where_to_find,
  updated_at = now();