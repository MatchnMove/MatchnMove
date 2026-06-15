export type ResourceSection =
  | {
      type: "copy";
      heading: string;
      paragraphs: string[];
    }
  | {
      type: "list";
      heading: string;
      intro?: string;
      items: string[];
    }
  | {
      type: "steps";
      heading: string;
      intro?: string;
      items: Array<{ title: string; copy: string }>;
    }
  | {
      type: "table";
      heading: string;
      intro?: string;
      columns: string[];
      rows: string[][];
      note?: string;
    }
  | {
      type: "callout";
      heading: string;
      copy: string;
    };

export type MovingResource = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  eyebrow: string;
  readTime: string;
  updatedLabel: string;
  intro: string;
  sections: ResourceSection[];
  relatedSlugs: string[];
};

export const movingResources: MovingResource[] = [
  {
    slug: "nz-moving-costs-2026",
    title: "NZ Moving Costs in 2026: A Practical Pricing Guide",
    shortTitle: "NZ moving costs in 2026",
    description:
      "Understand typical New Zealand mover pricing in 2026, including hourly rates, home-size estimates, common extras, and ways to get a more accurate quote.",
    eyebrow: "2026 cost guide",
    readTime: "9 min read",
    updatedLabel: "Updated June 2026",
    intro:
      "Moving prices in New Zealand vary widely because movers are pricing time, crew size, truck capacity, distance, access, demand, and optional services. This guide gives you a planning range, then shows you what to include in a quote request so movers can replace that range with a price based on your actual job.",
    sections: [
      {
        type: "callout",
        heading: "The short answer",
        copy:
          "Published New Zealand examples commonly place a two-person moving crew and truck around $100 to $160 per hour, while larger crews or specialist jobs can exceed $200 per hour. Local three-bedroom moves are often discussed in broad ranges around $500 to $1,500, but access, volume, travel, minimum charges, and add-ons can move the final total well outside that band.",
      },
      {
        type: "table",
        heading: "Indicative 2026 planning ranges",
        intro:
          "These are broad NZD budgeting ranges synthesised from publicly advertised rates and moving-market guides. They are not Match 'n Move quotes or guaranteed market averages.",
        columns: ["Move type", "Planning range", "Typical pricing method"],
        rows: [
          ["Small local move or studio", "$300-$750", "Hourly, often with a minimum charge"],
          ["1-bedroom local move", "$400-$950", "Hourly or a small fixed quote"],
          ["2-bedroom local move", "$550-$1,300", "Hourly or fixed after inventory review"],
          ["3-bedroom local move", "$700-$1,600", "Hourly or fixed after survey"],
          ["4+ bedroom local move", "$1,100-$2,800+", "Usually surveyed or itemised"],
          ["Long-distance same-island move", "$1,200-$4,500+", "Distance, volume, crew and schedule"],
          ["Inter-island household move", "$2,000-$10,000+", "Volume, ferry/freight, handling and timing"],
        ],
        note:
          "GST, call-out charges, depot travel, packing, storage, insurance, difficult access, heavy items, and waiting time may be additional.",
      },
      {
        type: "list",
        heading: "What changes the price most",
        items: [
          "Volume and weight: bedrooms are only a rough proxy; a detailed inventory is more useful.",
          "Crew and truck size: a larger crew costs more per hour but may finish substantially faster.",
          "Travel: depot time, kilometres, fuel, ferry or freight legs, and return travel may all be priced differently.",
          "Access: stairs, lifts, long carries, steep driveways, loading zones, and limited parking add labour time.",
          "Timing: weekends, month-end dates, school holidays, and short-notice bookings can reduce availability.",
          "Services: packing, unpacking, dismantling, storage, piano moving, and appliance handling add scope.",
        ],
      },
      {
        type: "steps",
        heading: "How to get a useful quote",
        items: [
          {
            title: "Describe the load",
            copy: "List major furniture, approximate box count, outdoor items, appliances, fragile pieces, and unusually heavy items.",
          },
          {
            title: "Explain both properties",
            copy: "Give movers the stairs, lift, parking, driveway, walking distance, and loading restrictions at pickup and delivery.",
          },
          {
            title: "Ask what is included",
            copy: "Confirm GST, call-out or travel charges, minimum hours, packing materials, insurance options, and cancellation terms.",
          },
          {
            title: "Compare the same scope",
            copy: "A cheap quote that excludes travel, packing, or a required extra crew is not directly comparable with an all-inclusive quote.",
          },
        ],
      },
      {
        type: "copy",
        heading: "A sensible moving budget",
        paragraphs: [
          "Start with the midpoint of an indicative range, then keep a contingency of roughly 15% to 25% for scope changes or access surprises. The best way to reduce uncertainty is not to chase the lowest online number; it is to give several movers the same detailed inventory and access information.",
          "If affordability is a concern, Work and Income says a repayable Moving Costs Grant may be available to eligible people moving into accommodation. Check the current eligibility rules directly with Work and Income before relying on that support.",
        ],
      },
    ],
    relatedSlugs: ["moving-cost-calculator", "compare-moving-quotes", "moving-house-checklist"],
  },
  {
    slug: "auckland-moving-costs",
    title: "Auckland Moving Costs and Quote Guide",
    shortTitle: "Auckland moving price guide",
    description:
      "Plan an Auckland move with indicative pricing, traffic and apartment-access considerations, and a checklist for comparing local mover quotes.",
    eyebrow: "Auckland guide",
    readTime: "7 min read",
    updatedLabel: "Updated June 2026",
    intro:
      "An Auckland move can be geographically short and still take time. Motorway congestion, apartment loading rules, limited street parking, building bookings, and travel between suburbs can matter as much as the straight-line distance.",
    sections: [
      {
        type: "table",
        heading: "Auckland planning ranges",
        intro:
          "Use these as early budgeting figures only. Public Auckland rate cards observed in June 2026 include examples around $135 per hour for two movers and a small truck, with larger crews and trucks priced higher plus call-out charges.",
        columns: ["Move size", "Indicative local budget", "Allow for"],
        rows: [
          ["Studio or a few large items", "$300-$700", "Minimum hours and call-out"],
          ["1-bedroom apartment", "$400-$900", "Lift bookings and walking distance"],
          ["2-bedroom home", "$600-$1,250", "Traffic, access and box volume"],
          ["3-bedroom home", "$750-$1,600", "Crew size and loading time"],
          ["4+ bedroom home", "$1,200-$2,800+", "Survey, multiple trips or larger truck"],
        ],
        note: "Moves beyond Auckland or involving storage, packing, specialist items, or difficult access need a tailored quote.",
      },
      {
        type: "list",
        heading: "Auckland details movers need",
        items: [
          "Exact suburbs and whether motorway travel is likely during peak periods.",
          "Apartment body-corporate rules, lift dimensions, loading-bay booking windows, and key collection.",
          "Parking availability or whether Auckland Transport loading restrictions apply.",
          "Steep or shared driveways, gated developments, and long carries from the truck.",
          "Whether the route extends to Northland, Waikato, Bay of Plenty, or another region.",
        ],
      },
      {
        type: "steps",
        heading: "Ways to reduce Auckland move time",
        items: [
          {
            title: "Book building access first",
            copy: "Confirm lifts and loading bays before locking in the moving crew.",
          },
          {
            title: "Avoid peak traffic where practical",
            copy: "Ask whether an early start changes travel time or depot charges for your route.",
          },
          {
            title: "Clear the truck approach",
            copy: "A short carry from door to truck can save more time than a small hourly-rate difference.",
          },
          {
            title: "Finish packing before arrival",
            copy: "Loose items and open boxes slow loading and make volume harder to control.",
          },
        ],
      },
      {
        type: "callout",
        heading: "Best next step",
        copy:
          "Request itemised quotes using the same inventory and access notes. Ask each mover to state the crew size, truck size, minimum charge, travel or call-out fee, and whether GST is included.",
      },
    ],
    relatedSlugs: ["nz-moving-costs-2026", "moving-cost-calculator", "compare-moving-quotes"],
  },
  {
    slug: "wellington-moving-costs",
    title: "Wellington Moving Costs and Quote Guide",
    shortTitle: "Wellington moving price guide",
    description:
      "Estimate and plan a Wellington move with guidance on hills, stairs, parking, access, regional routes, and quote comparison.",
    eyebrow: "Wellington guide",
    readTime: "7 min read",
    updatedLabel: "Updated June 2026",
    intro:
      "In Wellington, access can dominate the job. Hillside homes, narrow streets, stairs, exposed paths, apartment lifts, and limited truck parking can add more labour than the driving distance suggests.",
    sections: [
      {
        type: "table",
        heading: "Wellington planning ranges",
        intro:
          "These broad budgeting ranges use published NZ hourly pricing as a base and allow for the access complexity common across Wellington City, Lower Hutt, Upper Hutt, Porirua, and the Kapiti Coast.",
        columns: ["Move size", "Indicative local budget", "Main variables"],
        rows: [
          ["Studio or small flat", "$350-$750", "Stairs, parking and minimum hours"],
          ["1-bedroom home", "$450-$950", "Carry distance and building access"],
          ["2-bedroom home", "$650-$1,350", "Inventory, stairs and truck position"],
          ["3-bedroom home", "$800-$1,700", "Crew size and property access"],
          ["4+ bedroom home", "$1,250-$3,000+", "Survey and specialist planning"],
        ],
        note:
          "Wairarapa, Horowhenua, intercity, packing, storage, and heavy-item moves should be priced from a full route and inventory.",
      },
      {
        type: "list",
        heading: "Wellington access questions",
        items: [
          "How many exterior and interior steps are at each address?",
          "Can a moving truck stop directly outside, and is a parking plan or permit needed?",
          "Is the path exposed, steep, narrow, or unsuitable for a trolley?",
          "Does an apartment building require lift padding, a booking, or restricted moving hours?",
          "Could wind or weather make handling large items more difficult?",
        ],
      },
      {
        type: "copy",
        heading: "Local versus regional routes",
        paragraphs: [
          "A move between Wellington City and Lower Hutt may still be treated as an hourly local move. Longer routes to Kapiti, Wairarapa, Palmerston North, or beyond may be quoted using travel time, distance, or a fixed job price.",
          "For a regional route, ask whether the price includes the crew's return travel, depot time, fuel, and any overnight or storage handling. Those details often explain why two apparently similar quotes differ.",
        ],
      },
      {
        type: "callout",
        heading: "The most useful detail to provide",
        copy:
          "Send photos or a short video of stairs, paths, parking, and the largest furniture. It gives movers a much better chance of assigning the right crew and quoting enough time.",
      },
    ],
    relatedSlugs: ["nz-moving-costs-2026", "moving-house-checklist", "compare-moving-quotes"],
  },
  {
    slug: "christchurch-moving-costs",
    title: "Christchurch Moving Costs and Quote Guide",
    shortTitle: "Christchurch moving price guide",
    description:
      "Plan a Christchurch move with indicative local costs, regional route considerations, and practical quote-comparison questions.",
    eyebrow: "Christchurch guide",
    readTime: "7 min read",
    updatedLabel: "Updated June 2026",
    intro:
      "Christchurch's flatter terrain can simplify access, but spread-out suburbs, new developments, long driveways, settlement-day timing, and routes into wider Canterbury still influence crew time and travel charges.",
    sections: [
      {
        type: "table",
        heading: "Christchurch planning ranges",
        intro:
          "These figures are broad budgeting estimates based on published New Zealand mover ranges, not a guaranteed Christchurch market rate.",
        columns: ["Move size", "Indicative local budget", "Main variables"],
        rows: [
          ["Studio or small load", "$300-$650", "Minimum booking and travel"],
          ["1-bedroom home", "$400-$850", "Volume and walking distance"],
          ["2-bedroom home", "$550-$1,200", "Truck size and packing readiness"],
          ["3-bedroom home", "$700-$1,500", "Crew size and suburb travel"],
          ["4+ bedroom home", "$1,100-$2,700+", "Survey, volume and extra services"],
        ],
        note:
          "Routes to Selwyn, Waimakariri, Ashburton, Timaru, the West Coast, Otago, or another island require tailored distance and logistics pricing.",
      },
      {
        type: "list",
        heading: "Christchurch details to include",
        items: [
          "Whether either property is in a new subdivision with active construction or restricted truck access.",
          "Long driveways, rear units, shared access, or a long carry between the door and truck.",
          "Garage, workshop, garden, and outdoor items that a bedroom count may not capture.",
          "Settlement-day key timing and whether waiting time could occur.",
          "Any route beyond greater Christchurch, including the exact town and required delivery window.",
        ],
      },
      {
        type: "steps",
        heading: "Prepare for a smoother local move",
        items: [
          {
            title: "Measure large furniture",
            copy: "Confirm it can pass through doors, hallways, and stair turns without unexpected dismantling.",
          },
          {
            title: "Separate non-moving items",
            copy: "Clearly mark anything staying, being sold, or going to storage.",
          },
          {
            title: "Protect the schedule",
            copy: "Have a plan for keys and settlement delays, and ask how waiting time is charged.",
          },
          {
            title: "List garage contents",
            copy: "Tools, shelving, bikes, freezers, and outdoor furniture can add substantial volume.",
          },
        ],
      },
      {
        type: "callout",
        heading: "Compare complete prices",
        copy:
          "Check whether GST, call-out, depot travel, wrapping, dismantling, and reassembly are included before comparing the totals.",
      },
    ],
    relatedSlugs: ["nz-moving-costs-2026", "inter-island-moving-guide", "moving-cost-calculator"],
  },
  {
    slug: "inter-island-moving-guide",
    title: "Inter-Island Moving Guide for New Zealand",
    shortTitle: "Inter-island moving guide",
    description:
      "Plan a North Island to South Island move with guidance on freight options, timing, packing, storage, insurance, costs, and quote questions.",
    eyebrow: "Long-distance guide",
    readTime: "10 min read",
    updatedLabel: "Updated June 2026",
    intro:
      "An inter-island move is a logistics job rather than a longer version of a local move. Your belongings may pass through depots, ferries, rail or coastal freight, shared-load networks, storage, and separate pickup and delivery crews.",
    sections: [
      {
        type: "table",
        heading: "Indicative inter-island budgets",
        intro:
          "Public 2026 guides show wide ranges. These figures are deliberately broad because volume, route, service speed, and whether your load shares capacity have a major effect.",
        columns: ["Load size", "Planning range", "Common format"],
        rows: [
          ["Boxes or a few furniture items", "$800-$2,500+", "Shared load or freight service"],
          ["Studio or 1-bedroom", "$2,000-$4,000+", "Shared or dedicated household move"],
          ["2-bedroom home", "$3,500-$6,500+", "Volume-based long-distance quote"],
          ["3-bedroom home", "$5,000-$8,500+", "Surveyed household move"],
          ["4+ bedroom home", "$7,000-$12,000+", "Surveyed, often with packing options"],
        ],
        note:
          "Vehicle transport, packing, insurance, storage, difficult access, urgent delivery, and remote pickup or delivery can be additional.",
      },
      {
        type: "steps",
        heading: "A practical planning timeline",
        items: [
          {
            title: "Six to eight weeks out",
            copy: "Reduce volume, build an inventory, request several quotes, and discuss flexible or fixed collection and delivery windows.",
          },
          {
            title: "Four weeks out",
            copy: "Choose the service, confirm insurance and storage, identify restricted items, and decide who is packing.",
          },
          {
            title: "One to two weeks out",
            copy: "Finish packing, photograph valuable items, separate essentials, and reconfirm pickup access and contacts.",
          },
          {
            title: "Collection and transit",
            copy: "Keep documents, medication, chargers, clothing, and valuables with you because delivery may not be immediate.",
          },
        ],
      },
      {
        type: "list",
        heading: "Questions to ask every inter-island mover",
        items: [
          "Is the load dedicated, containerised, or consolidated with other customers?",
          "What are the collection and delivery windows, and what happens if ferry or freight schedules change?",
          "How many times will the goods be handled or transferred?",
          "Where could the load be stored, and are storage days included?",
          "What packing standard is required for owner-packed boxes?",
          "What protection or insurance options apply during handling, storage, and transit?",
          "Are ferry, fuel, depot, access, and delivery charges included in the total?",
        ],
      },
      {
        type: "copy",
        heading: "Shared load versus dedicated service",
        paragraphs: [
          "A shared-load service can reduce cost because your goods use spare capacity, but pickup and delivery dates may be broader. A dedicated service gives more control and may reduce handling, but usually costs more.",
          "Neither model is automatically better. Choose based on your delivery deadline, volume, tolerance for date windows, storage needs, and how the mover documents your inventory.",
        ],
      },
      {
        type: "callout",
        heading: "Pack an arrival kit",
        copy:
          "Keep several days of clothing, bedding, toiletries, work equipment, medicines, children's essentials, pet supplies, and important documents out of the moving load.",
      },
    ],
    relatedSlugs: ["nz-moving-costs-2026", "moving-house-checklist", "compare-moving-quotes"],
  },
  {
    slug: "moving-house-checklist",
    title: "The Complete Moving-House Checklist for NZ",
    shortTitle: "Moving-house checklist",
    description:
      "Use a practical New Zealand moving checklist covering quotes, packing, utilities, address changes, moving day, and settling in.",
    eyebrow: "Printable planning guide",
    readTime: "8 min read",
    updatedLabel: "Updated June 2026",
    intro:
      "A good moving checklist protects the dates that cannot slip, then works backwards. Use this timeline as a starting point and shorten it carefully if your move is already close.",
    sections: [
      {
        type: "steps",
        heading: "Six to eight weeks before",
        items: [
          {
            title: "Build the move scope",
            copy: "List rooms, major items, garage and outdoor contents, fragile pieces, storage needs, and both-property access.",
          },
          {
            title: "Request comparable quotes",
            copy: "Give each mover the same inventory, dates, route, and service requirements.",
          },
          {
            title: "Declutter early",
            copy: "Sell, donate, recycle, or dispose of items before paying to move them.",
          },
          {
            title: "Plan school, pets and work",
            copy: "Arrange enrolment, pet care or transport, leave, and any temporary accommodation.",
          },
        ],
      },
      {
        type: "steps",
        heading: "Three to four weeks before",
        items: [
          {
            title: "Confirm the mover",
            copy: "Read the scope, price basis, inclusions, insurance options, cancellation terms, and payment schedule.",
          },
          {
            title: "Start non-essential packing",
            copy: "Label boxes by room and contents, and mark fragile or priority boxes clearly.",
          },
          {
            title: "Arrange utilities",
            copy: "Schedule electricity, internet, gas where relevant, and final meter or account arrangements.",
          },
          {
            title: "Update important organisations",
            copy: "Prepare address changes for banks, insurers, employers, schools, subscriptions, electoral enrolment, and government services.",
          },
        ],
      },
      {
        type: "steps",
        heading: "One week before",
        items: [
          {
            title: "Reconfirm access and timing",
            copy: "Check keys, lifts, parking, loading bays, settlement timing, and the mover's arrival window.",
          },
          {
            title: "Prepare appliances",
            copy: "Follow manufacturer guidance for refrigerators, freezers, washing machines, and gas appliances.",
          },
          {
            title: "Create an essentials kit",
            copy: "Keep documents, medicines, chargers, toiletries, tools, cleaning supplies, food, bedding, and a change of clothes with you.",
          },
          {
            title: "Photograph valuable items",
            copy: "Record condition and serial numbers where useful, and keep irreplaceable valuables out of the truck.",
          },
        ],
      },
      {
        type: "list",
        heading: "Moving-day checklist",
        items: [
          "Walk through the inventory and flag fragile, heavy, dismantled, or non-moving items.",
          "Keep children and pets safely away from loading areas.",
          "Check cupboards, sheds, roof spaces, storage lockers, outdoor areas, and appliance connections.",
          "Record meter readings where required and photograph the empty property.",
          "Confirm the delivery address, contact numbers, route, and expected arrival process.",
          "Before the crew leaves, check the truck and property and record any visible concern promptly.",
        ],
      },
      {
        type: "list",
        heading: "First day in the new home",
        items: [
          "Check utilities, locks, smoke alarms, urgent maintenance, and appliance connections.",
          "Direct boxes into labelled rooms rather than creating one large unpacking pile.",
          "Assemble beds and open the essentials kit first.",
          "Check larger and fragile items while the move is fresh and follow the mover's reporting process if needed.",
          "Keep receipts, inventory records, agreements, and photos together until everything is resolved.",
        ],
      },
    ],
    relatedSlugs: ["compare-moving-quotes", "moving-cost-calculator", "inter-island-moving-guide"],
  },
  {
    slug: "compare-moving-quotes",
    title: "How to Compare Moving Quotes Properly",
    shortTitle: "Guide to comparing moving quotes",
    description:
      "Compare moving-company quotes on equal scope, pricing method, inclusions, access, insurance, reviews, and contract terms—not price alone.",
    eyebrow: "Quote comparison guide",
    readTime: "8 min read",
    updatedLabel: "Updated June 2026",
    intro:
      "The lowest total is only the cheapest quote if it covers the same work. A useful comparison separates scope, assumptions, pricing method, risk, and service quality before looking at the final number.",
    sections: [
      {
        type: "table",
        heading: "Put each quote into the same comparison",
        columns: ["Check", "What to record", "Why it matters"],
        rows: [
          ["Pricing method", "Hourly, fixed, volume-based or estimate", "Controls who carries time or scope risk"],
          ["Crew and vehicle", "Number of movers and truck size", "Changes speed, capacity and hourly cost"],
          ["Travel", "Depot time, kilometres, fuel, ferry and return travel", "Often explains a large price difference"],
          ["Minimum charges", "Minimum hours and rounding increments", "A short move may still trigger a base charge"],
          ["Included work", "Packing, wrapping, dismantling and reassembly", "Avoids paying extras on moving day"],
          ["Access assumptions", "Stairs, lifts, parking and carry distance", "Incorrect assumptions can change labour time"],
          ["Protection", "Liability terms and optional cover", "Shows how loss or damage is handled"],
          ["Timing", "Arrival window and delivery window", "Important for settlement and long-distance moves"],
        ],
      },
      {
        type: "list",
        heading: "Questions worth asking",
        items: [
          "Is GST included in the displayed total?",
          "What event would allow the final price to exceed this figure?",
          "Are travel, call-out, fuel, parking, ferry, and depot charges included?",
          "What happens if the job takes longer than estimated?",
          "Who is responsible for dismantling, packing, and protecting furniture?",
          "Are employees, contractors, or another carrier completing any part of the move?",
          "What is the cancellation or postponement policy?",
          "How should loss, damage, or a service concern be reported?",
        ],
      },
      {
        type: "steps",
        heading: "A four-part decision",
        items: [
          {
            title: "Check fit",
            copy: "Can the mover handle your route, date, access, load size, and specialist items?",
          },
          {
            title: "Check completeness",
            copy: "Does the quote clearly cover every service you need and state its assumptions?",
          },
          {
            title: "Check evidence",
            copy: "Review business details, communication quality, relevant experience, and genuine customer feedback.",
          },
          {
            title: "Check value",
            copy: "Choose the strongest combination of price clarity, capability, timing, and confidence—not simply the smallest number.",
          },
        ],
      },
      {
        type: "callout",
        heading: "Watch for an unrealistically low quote",
        copy:
          "A low figure may be legitimate, but ask what has been excluded. Missing travel, insufficient crew, a small truck, owner packing, broad delivery windows, or an incomplete inventory can make a quote look cheaper than the job will be.",
      },
    ],
    relatedSlugs: ["nz-moving-costs-2026", "moving-house-checklist", "moving-cost-calculator"],
  },
];

export const resourceCards = [
  ...movingResources,
  {
    slug: "moving-cost-calculator",
    title: "Moving Cost Calculator",
    shortTitle: "Moving cost calculator",
    description:
      "Build a broad NZ moving budget from route type, home size, city, access, timing, packing, and heavy-item requirements.",
    eyebrow: "Interactive tool",
    readTime: "2 min estimate",
    updatedLabel: "Updated June 2026",
    intro: "",
    sections: [],
    relatedSlugs: ["nz-moving-costs-2026", "compare-moving-quotes"],
  },
  {
    slug: "case-studies",
    title: "Verified Moving Case Studies",
    shortTitle: "Moving case studies",
    description:
      "Anonymised case studies from completed Match 'n Move jobs, published only with suitable evidence and permission.",
    eyebrow: "Verified outcomes",
    readTime: "Growing library",
    updatedLabel: "Updated June 2026",
    intro: "",
    sections: [],
    relatedSlugs: ["compare-moving-quotes", "moving-house-checklist"],
  },
] satisfies MovingResource[];

export function getMovingResource(slug: string) {
  return movingResources.find((resource) => resource.slug === slug) ?? null;
}

export function getResourceCard(slug: string) {
  return resourceCards.find((resource) => resource.slug === slug) ?? null;
}

