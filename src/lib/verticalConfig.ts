export type VerticalKey = 
  | 'dentist' 
  | 'home-improvement' 
  | 'hvac' 
  | 'legal' 
  | 'real-estate' 
  | 'pest-control' 
  | 'med-spa';

export interface VerticalConfig {
  key: VerticalKey;
  name: string;
  industry: string;
  headline: string;
  subheadline: string;
  solutionSubheadline: string;
  leadTerm: string;
  heroImage: string;
  thumbnail: string;
  painPoints: Array<{ icon: string; title: string; description: string }>;
  features: string[];
  demoPrompts: string[];
  testimonial: { quote: string; name: string; business: string };
  faqs: Array<{ question: string; answer: string }>;
}

export const verticalConfig: Record<VerticalKey, VerticalConfig> = {
  'dentist': {
    key: 'dentist',
    name: 'Dental Practices',
    industry: 'Dental',
    headline: 'Never Miss A Patient Call Again',
    subheadline: 'Your AI Receptionist That Works 24/7 - Even During Procedures',
    solutionSubheadline: 'Your 24/7 AI Receptionist That Never Misses a Call',
    leadTerm: 'Patient',
    heroImage: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1920&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&q=80',
    painPoints: [
      { icon: '📞', title: 'Missing patient calls', description: 'Calls going unanswered while you\'re with patients' },
      { icon: '📅', title: 'After-hours emergencies', description: 'Emergency calls going straight to voicemail' },
      { icon: '💼', title: 'Overwhelmed staff', description: 'Front desk can\'t keep up during busy hours' },
      { icon: '📊', title: 'Losing patients', description: 'Competitors who answer faster get your patients' },
    ],
    features: [
      'Answers every call instantly - even at 3 AM',
      'Books appointments directly to your calendar',
      'Captures lead information automatically',
      'Handles common questions about insurance & services',
      'Transfers urgent calls to you when needed',
      'Works alongside your existing team',
    ],
    demoPrompts: ['Emergency appointment', 'Insurance questions', 'New patient inquiry', 'Schedule cleaning'],
    testimonial: {
      quote: "We've captured 40+ new patients in the first month. The AI handles appointment requests while I focus on patient care.",
      name: 'Dr. Sarah Chen',
      business: 'Smile Dental',
    },
    faqs: [
      { question: 'How long does setup take?', answer: 'About 15 minutes. We guide you through everything.' },
      { question: 'Does it integrate with Dentrix/Eaglesoft?', answer: 'We work with most dental practice management software through calendar integration.' },
      { question: 'What if the AI can\'t answer a question?', answer: 'It transfers the call to you or takes a detailed message.' },
      { question: 'Can I try it before committing?', answer: 'Yes! Request a custom demo for your practice.' },
    ],
  },
  'home-improvement': {
    key: 'home-improvement',
    name: 'Home Services',
    industry: 'Home Improvement',
    headline: 'Answer Every Lead While You\'re On The Job',
    subheadline: 'Never Lose A $10,000 Project To A Missed Call Again',
    solutionSubheadline: 'Your 24/7 AI Assistant That Books Jobs While You Work',
    leadTerm: 'Lead',
    heroImage: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1920&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=80',
    painPoints: [
      { icon: '📞', title: 'Missing leads on site', description: 'Can\'t answer calls with tools in your hands' },
      { icon: '🚫', title: 'Lost projects', description: 'Losing $10k+ jobs to faster competitors' },
      { icon: '⏰', title: 'After-hours calls', description: 'Evening and weekend inquiries going unanswered' },
      { icon: '💼', title: 'Seasonal surge', description: 'Can\'t hire staff for busy season peaks' },
    ],
    features: [
      'Answers every call instantly - even while you work',
      'Qualifies leads and provides instant estimates',
      'Books on-site consultations automatically',
      'Handles common service questions',
      'Texts you hot leads immediately',
      'Scales for seasonal demand',
    ],
    demoPrompts: ['Get a quote', 'Schedule estimate', 'Emergency repair', 'Service inquiry'],
    testimonial: {
      quote: "I was losing $50k/year in missed calls. EverLaunch paid for itself in the first week.",
      name: 'Mike Rodriguez',
      business: 'Rodriguez Contracting',
    },
    faqs: [
      { question: 'How long does setup take?', answer: 'About 15 minutes. We guide you through everything.' },
      { question: 'Does it give price quotes?', answer: 'Yes! Configure your pricing ranges and the AI provides instant ballpark estimates.' },
      { question: 'What if the AI can\'t answer a question?', answer: 'It transfers the call to you or takes a detailed message.' },
      { question: 'Can I try it before committing?', answer: 'Yes! Request a custom demo for your business.' },
    ],
  },
  'hvac': {
    key: 'hvac',
    name: 'HVAC & Plumbing',
    industry: 'HVAC',
    headline: '24/7 Emergency Call Handling - Even at 3 AM',
    subheadline: 'Never Miss Another High-Value Emergency Call',
    solutionSubheadline: 'Your AI Dispatcher That Works Around The Clock',
    leadTerm: 'Call',
    heroImage: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1920&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&q=80',
    painPoints: [
      { icon: '🔥', title: '3 AM emergencies', description: 'Emergency calls going to voicemail while you sleep' },
      { icon: '📱', title: 'Hands-on work', description: 'Juggling phone calls while troubleshooting equipment' },
      { icon: '💸', title: 'Lost revenue', description: 'High-value emergency calls going to competitors' },
      { icon: '👥', title: 'Staffing costs', description: 'Can\'t afford 24/7 answering service' },
    ],
    features: [
      'Answers emergency calls 24/7/365',
      'Triages emergencies vs routine calls',
      'Dispatches information to your phone immediately',
      'Books maintenance appointments automatically',
      'Answers troubleshooting questions',
      'Costs less than answering services',
    ],
    demoPrompts: ['AC emergency', 'No heat call', 'Maintenance schedule', 'Price estimate'],
    testimonial: {
      quote: "Emergency calls at 2 AM? No problem. The AI qualifies the lead and texts me the details immediately.",
      name: 'Tom Baker',
      business: 'Baker HVAC',
    },
    faqs: [
      { question: 'How long does setup take?', answer: 'About 15 minutes. We guide you through everything.' },
      { question: 'Can it handle emergency calls?', answer: 'Absolutely! It identifies true emergencies and alerts you immediately while capturing all details.' },
      { question: 'What if the AI can\'t answer a question?', answer: 'It transfers the call to you or takes a detailed message.' },
      { question: 'Can I try it before committing?', answer: 'Yes! Request a custom demo for your business.' },
    ],
  },
  'legal': {
    key: 'legal',
    name: 'Law Firms',
    industry: 'Legal',
    headline: 'Capture Every $10,000 Case - Automatically',
    subheadline: 'Never Lose A Client To A Competitor Again',
    solutionSubheadline: 'Your AI Intake Specialist That Never Sleeps',
    leadTerm: 'Client',
    heroImage: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1920&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&q=80',
    painPoints: [
      { icon: '💰', title: 'Lost cases', description: '$10,000+ cases slipping through the cracks' },
      { icon: '📞', title: 'Missed inquiries', description: 'Potential clients calling competitors next' },
      { icon: '⏱️', title: 'Inefficient screening', description: 'Reception can\'t screen calls effectively' },
      { icon: '📉', title: 'After-hours gap', description: 'Missing inquiries after business hours' },
    ],
    features: [
      'Screens potential clients instantly 24/7',
      'Gathers case details automatically',
      'Schedules consultations based on case type',
      'Answers common legal procedure questions',
      'Protects attorney time for billable work',
      'Maintains professional client experience',
    ],
    demoPrompts: ['Case inquiry', 'Consultation request', 'Legal question', 'Attorney availability'],
    testimonial: {
      quote: "Every consultation request is captured. We\'ve increased our client intake by 60%.",
      name: 'Attorney Lisa Park',
      business: 'Park Law Group',
    },
    faqs: [
      { question: 'How long does setup take?', answer: 'About 15 minutes. We guide you through everything.' },
      { question: 'Is it compliant for attorney-client communications?', answer: 'Yes, the AI is designed for initial intake only and doesn\'t provide legal advice.' },
      { question: 'What if the AI can\'t answer a question?', answer: 'It transfers the call to you or takes a detailed message.' },
      { question: 'Can I try it before committing?', answer: 'Yes! Request a custom demo for your firm.' },
    ],
  },
  'real-estate': {
    key: 'real-estate',
    name: 'Real Estate',
    industry: 'Real Estate',
    headline: 'Answer Property Inquiries While Showing Homes',
    subheadline: 'Never Miss A Buyer Call During Open Houses',
    solutionSubheadline: 'Your 24/7 AI Assistant That Qualifies Leads Instantly',
    leadTerm: 'Lead',
    heroImage: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1920&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=80',
    painPoints: [
      { icon: '🏠', title: 'Missed during showings', description: 'Property inquiries coming in while showing homes' },
      { icon: '📱', title: 'Open house chaos', description: 'Can\'t answer calls during open houses' },
      { icon: '⏰', title: 'Weekend leads', description: 'Missing weekend and evening inquiries' },
      { icon: '🎯', title: 'Multiple listings', description: 'Buyers calling about multiple properties' },
    ],
    features: [
      'Answers property-specific questions 24/7',
      'Schedules showings automatically',
      'Qualifies buyer/seller intent',
      'Handles multiple listings simultaneously',
      'Follows up on open house inquiries',
      'Texts you hot buyer leads instantly',
    ],
    demoPrompts: ['Property details', 'Schedule showing', 'Listing inquiry', 'Price question'],
    testimonial: {
      quote: "I can focus on showings while the AI handles all property inquiries. Game changer.",
      name: 'Jennifer Wu',
      business: 'Top Agent Realty',
    },
    faqs: [
      { question: 'How long does setup take?', answer: 'About 15 minutes. We guide you through everything.' },
      { question: 'Can it handle multiple property listings?', answer: 'Yes! Upload all your listings and the AI answers questions about each property.' },
      { question: 'What if the AI can\'t answer a question?', answer: 'It transfers the call to you or takes a detailed message.' },
      { question: 'Can I try it before committing?', answer: 'Yes! Request a custom demo for your business.' },
    ],
  },
  'pest-control': {
    key: 'pest-control',
    name: 'Pest Control',
    industry: 'Pest Control',
    headline: 'Never Miss An Emergency Call Again',
    subheadline: 'Handle Spring Rush Without Hiring More Staff',
    solutionSubheadline: 'Your AI Dispatcher That Works 24/7/365',
    leadTerm: 'Call',
    heroImage: 'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=1920&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=400&q=80',
    painPoints: [
      { icon: '🐛', title: 'Emergency calls', description: 'Wasp nest in garage calls going to voicemail' },
      { icon: '📞', title: 'Seasonal surge', description: 'Spring/summer rush overwhelming your team' },
      { icon: '💼', title: 'On-site work', description: 'Can\'t answer phone while treating properties' },
      { icon: '🏠', title: 'Competition', description: 'First to respond wins - customers call multiple companies' },
    ],
    features: [
      'Triages emergency vs routine calls instantly',
      'Books inspections automatically',
      'Answers "Do you handle [pest]?" questions',
      'Explains service plans and pricing',
      'Schedules recurring treatments',
      'Handles seasonal surge without extra staff',
    ],
    demoPrompts: ['Wasp emergency', 'Termite inspection', 'Recurring service', 'Price quote'],
    testimonial: {
      quote: "During spring rush, we were drowning in calls. The AI triaged emergencies and booked routine services automatically. Added 200+ customers this season.",
      name: 'Dave Thompson',
      business: 'Thompson Pest Solutions',
    },
    faqs: [
      { question: 'How long does setup take?', answer: 'About 15 minutes. We guide you through everything.' },
      { question: 'Can it identify what type of pest problem someone has?', answer: 'Yes! The AI asks qualifying questions to understand the pest type and urgency.' },
      { question: 'What if the AI can\'t answer a question?', answer: 'It transfers the call to you or takes a detailed message.' },
      { question: 'Can I try it before committing?', answer: 'Yes! Request a custom demo for your business.' },
    ],
  },
  'med-spa': {
    key: 'med-spa',
    name: 'Medical Spa',
    industry: 'Medical Aesthetics',
    headline: 'Never Miss A Consultation Booking Again',
    subheadline: 'Your AI Voice Concierge That Converts 80%+ of Calls to Consultations',
    solutionSubheadline: 'Your 24/7 Luxury Concierge That Books Consultations Instantly',
    leadTerm: 'Client',
    heroImage: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1920&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&q=80',
    painPoints: [
      { icon: '📞', title: 'Missing high-value calls', description: 'Losing $5,000+ clients to competitors who answer first' },
      { icon: '⏰', title: 'After-hours inquiries', description: 'Evening and weekend callers going to voicemail' },
      { icon: '💼', title: 'Staff overwhelmed', description: 'Front desk juggling treatments and phones' },
      { icon: '💰', title: 'Price shoppers leaving', description: 'Callers hanging up without booking consultations' },
    ],
    features: [
      'Answers every call instantly - even at 3 AM',
      'Books complimentary consultations automatically',
      'Provides pricing ranges (never exact quotes)',
      'Handles Botox, filler, and laser treatment questions',
      'Escalates medical concerns to licensed staff immediately',
      'Captures marketing attribution on every call',
    ],
    demoPrompts: ['Botox inquiry', 'Consultation booking', 'Treatment pricing', 'Available appointments'],
    testimonial: {
      quote: "We went from missing calls during treatments to booking 80% of inquiries. Each new client is worth $2,000+ to us.",
      name: 'Dr. Michelle Torres',
      business: 'Luxe Medical Aesthetics',
    },
    faqs: [
      { question: 'How long does setup take?', answer: 'About 15 minutes. We guide you through everything.' },
      { question: 'Can it handle medical questions?', answer: 'The AI provides treatment information but never medical advice. Medical concerns are escalated to licensed staff immediately.' },
      { question: 'Does it quote exact prices?', answer: 'No - it provides pricing ranges only. Exact pricing is discussed during consultations.' },
      { question: 'Can I try it before committing?', answer: 'Yes! Request a custom demo for your med spa.' },
    ],
  },
};

// List of all verticals for iteration
export const verticalsList = Object.values(verticalConfig);
