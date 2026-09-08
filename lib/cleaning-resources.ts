import type { MovingResource } from "@/lib/moving-resources";

type CleaningGuideInput = Omit<
  MovingResource,
  "category" | "eyebrow" | "updatedLabel"
> & {
  eyebrow?: string;
};

function cleaningGuide({ eyebrow = "Move-out cleaning guide", ...guide }: CleaningGuideInput): MovingResource {
  return {
    ...guide,
    category: "cleaning",
    eyebrow,
    updatedLabel: "Updated September 2026",
  };
}

export const cleaningResources: MovingResource[] = [
  cleaningGuide({
    slug: "end-of-tenancy-cleaning-nz-guide",
    title: "End of Tenancy Cleaning NZ: A Complete Moving Guide",
    shortTitle: "End of tenancy cleaning NZ",
    description:
      "Plan an end-of-tenancy clean in New Zealand, define the scope, coordinate it with moving day, and compare cleaner quotes without missing important details.",
    readTime: "10 min read",
    intro:
      "An end-of-tenancy clean is easier to manage when it is treated as a small project rather than a final-night scramble. This guide helps New Zealand renters and homeowners decide what needs attention, when the property will be ready, and what a cleaner needs to quote the work accurately.",
    sections: [
      {
        type: "copy",
        heading: "Start with the condition you need to leave behind",
        paragraphs: [
          "Walk through the property with your tenancy agreement, property-condition information, sale arrangements, or your own handover goals in mind. Note built-up grease, soap residue, pet hair, marks, and areas hidden by furniture. If you are renting, use current Tenancy Services guidance and any property-specific instructions rather than relying on a generic social-media checklist.",
          "Separate cleaning from maintenance or damage. A cleaner can remove ordinary dirt and residue, but a broken fitting, stained or damaged surface, mould caused by a building issue, or unsafe material may need a landlord, tradesperson, or specialist contractor.",
        ],
      },
      {
        type: "steps",
        heading: "A practical end-of-tenancy plan",
        items: [
          { title: "Define the rooms", copy: "List bedrooms, bathrooms, living areas, utility spaces, balconies, garages, and any furnished areas that need attention." },
          { title: "Name the extras", copy: "Call out the oven, rangehood, inside cupboards, windows, carpets, walls, blinds, and appliances instead of assuming they are included." },
          { title: "Confirm access", copy: "Give the cleaner the address, parking or lift arrangements, entry method, power and water availability, and the time the movers will finish." },
          { title: "Check the result", copy: "Leave time for a well-lit walkthrough, photos, and any agreed touch-ups before keys or access are handed over." },
        ],
      },
      {
        type: "list",
        heading: "Details that make cleaner quotes easier to compare",
        intro: "Send every cleaner the same description so differences in price reflect the offer rather than missing information.",
        items: [
          "Property type, approximate size or bedroom count, and number of bathrooms.",
          "Whether the property will be empty, partly furnished, or fully furnished during the clean.",
          "Preferred date, access window, and whether timing can move if the removal runs late.",
          "Specific problem areas and optional services such as carpet, oven, or interior-window cleaning.",
          "Whether supplies, equipment, rubbish removal, parking, and GST are included in the quote.",
          "What happens if the cleaner discovers extra work that was not visible when quoting.",
        ],
      },
      {
        type: "callout",
        heading: "Keep the moving and cleaning scopes separate",
        copy:
          "For a move-out cleaning request, cleaners need the pickup property, property details, date, contact information, and cleaning notes. They do not need your destination address or detailed moving inventory to price the clean.",
      },
    ],
    relatedSlugs: ["move-out-cleaning-checklist-nz", "end-of-tenancy-cleaning-costs-nz", "moving-house-cleaning-timeline"],
  }),
  cleaningGuide({
    slug: "move-out-cleaning-checklist-nz",
    title: "Move-Out Cleaning Checklist NZ",
    shortTitle: "Move-out cleaning checklist",
    description:
      "Use a clear New Zealand move-out cleaning checklist covering preparation, rooms, final checks, and a cleaner-ready handover.",
    readTime: "8 min read",
    intro:
      "A move-out checklist should help you see what is left, not bury you in tiny tasks. Work from high areas to low areas, dry jobs to wet jobs, and finished rooms toward the exit so clean surfaces stay clean while the move continues.",
    sections: [
      {
        type: "list",
        heading: "Before cleaning begins",
        items: [
          "Remove boxes, loose belongings, food, and rubbish from the rooms being cleaned.",
          "Set aside keys, remotes, manuals, and items that must remain with the property.",
          "Photograph delicate, marked, or damaged surfaces before work starts.",
          "Check product labels and surface-care instructions before using chemicals.",
          "Arrange safe access to power, water, parking, lifts, gates, and alarm systems.",
          "Keep children and pets away from wet floors, equipment, and cleaning products.",
        ],
      },
      {
        type: "steps",
        heading: "Work through the home in four passes",
        items: [
          { title: "Dust and detail", copy: "Start with vents, ledges, light fittings, tops of doors, shelving, skirting, tracks, and other high or easily missed surfaces." },
          { title: "Clean kitchens and bathrooms", copy: "Allow dwell time for suitable products, then rinse and dry surfaces so residue and streaks are visible." },
          { title: "Finish floors", copy: "Vacuum edges and cupboards before cleaning hard floors or arranging separately agreed carpet treatment." },
          { title: "Inspect at the exit", copy: "Check inside storage, behind doors, around switches, in corners, and along the route used to remove the final supplies." },
        ],
      },
      {
        type: "list",
        heading: "Final room-by-room check",
        items: [
          "Kitchen: benches, sink, splashback, hob, rangehood exterior, cupboard faces, and agreed appliance interiors.",
          "Bathrooms: shower, bath, basin, toilet, mirrors, fittings, ventilation cover, and dry floors.",
          "Bedrooms and living areas: shelves, wardrobes, skirting, reachable marks, windowsills, and floors.",
          "Laundry and utility areas: tub, shelving, appliance spaces, lint, and floor edges.",
          "Outdoor or shared-access areas: only the balconies, paths, bins, garage, or entrance areas included in the agreed scope.",
        ],
      },
      {
        type: "callout",
        heading: "Do not promise what cannot be checked",
        copy:
          "A checklist is a planning tool, not a guarantee of a bond, sale, or inspection outcome. Agree the scope in writing and complete your own final walkthrough against the property-specific requirements.",
      },
    ],
    relatedSlugs: ["room-by-room-move-out-cleaning-checklist", "moving-out-rental-cleaning-checklist", "cleaning-after-furniture-removed"],
  }),
  cleaningGuide({
    slug: "move-in-cleaning-checklist",
    title: "Move-In Cleaning Checklist for a Fresh Start",
    shortTitle: "Move-in cleaning checklist",
    description:
      "Plan a safe, efficient move-in clean before boxes and furniture arrive, with priorities for kitchens, bathrooms, storage, and floors.",
    readTime: "7 min read",
    intro:
      "A move-in clean has a different purpose from a move-out clean: it gives you confidence about the surfaces and storage you will use first. If access is available, clean before the truck arrives so cupboards, floors, and corners are unobstructed.",
    sections: [
      {
        type: "steps",
        heading: "Choose the highest-value order",
        items: [
          { title: "Inspect first", copy: "Record existing marks or concerns, locate water and power, ventilate the home, and identify surfaces needing specialist care." },
          { title: "Make essentials usable", copy: "Prioritise a bathroom, kitchen preparation area, and the cupboards needed for the first night." },
          { title: "Clean empty storage", copy: "Vacuum and wipe wardrobes, drawers, shelves, and pantry spaces before belongings are placed inside." },
          { title: "Finish traffic areas", copy: "Clean floors last and leave a clear dry route for movers, children, pets, and essential boxes." },
        ],
      },
      {
        type: "list",
        heading: "Useful move-in cleaning checks",
        items: [
          "Kitchen benches, sink, handles, cupboard interiors, and the appliance spaces you will use.",
          "Bathroom fixtures, toilet, shower surfaces, mirrors, ventilation cover, and storage.",
          "Wardrobe shelves, bedroom floors, windowsills, switches, and frequently touched handles.",
          "Laundry tub, lint-prone areas, and connections around appliances without disturbing plumbing or electrical fittings.",
          "Visible dust or debris in corners, skirting edges, tracks, and areas previously covered by furniture.",
        ],
      },
      {
        type: "copy",
        heading: "Coordinate cleaners and movers",
        paragraphs: [
          "Give cleaners a firm access window with a realistic buffer before the moving truck. If the schedule overlaps, nominate finished rooms where movers can place items without crossing wet floors or blocking cleaning equipment.",
          "Move-in cleaning belongs at the destination, while Match 'n Move's initial cleaning quote option is designed for the property you are leaving. If you need both, describe the destination clean separately so providers do not assume the wrong address or scope.",
        ],
      },
      {
        type: "callout",
        heading: "Safety comes before speed",
        copy:
          "Do not mix cleaning chemicals, climb unsafely, or use a product on an unfamiliar surface without checking its instructions. Ask a suitable specialist about hazardous material, significant mould, pests, or post-construction residue.",
      },
    ],
    relatedSlugs: ["prepare-home-for-professional-cleaning", "clean-before-or-after-movers", "moving-house-cleaning-timeline"],
  }),
  cleaningGuide({
    slug: "end-of-tenancy-cleaning-costs-nz",
    title: "End of Tenancy Cleaning Costs in NZ: What Shapes a Quote?",
    shortTitle: "End of tenancy cleaning costs",
    description:
      "Understand the information New Zealand cleaners use to quote end-of-tenancy work and compare scope, extras, access, and pricing terms fairly.",
    readTime: "9 min read",
    intro:
      "There is no single reliable end-of-tenancy cleaning price for every New Zealand property. A quote reflects the amount of work, condition, access, timing, inclusions, and business pricing model. The most useful budget comes from a written scope shared consistently with several cleaners.",
    sections: [
      {
        type: "list",
        heading: "The main quote drivers",
        items: [
          "Property size, layout, number of bathrooms, and the amount of fitted storage.",
          "Current condition, including grease, soap residue, pet hair, dust, and areas not cleaned regularly.",
          "Whether furniture and belongings remain while the clean is carried out.",
          "Optional work such as oven interiors, carpet treatment, interior windows, blinds, walls, balconies, or garages.",
          "Parking, apartment access, stairs, lift bookings, key collection, and travel to the property.",
          "The available time window, short-notice scheduling, and whether another trade or the movers are still onsite.",
        ],
      },
      {
        type: "table",
        heading: "Compare the same scope",
        columns: ["Quote detail", "What to confirm", "Why it matters"],
        rows: [
          ["Pricing basis", "Fixed scope, hourly work, or estimate", "Shows how time or extra work affects the final amount"],
          ["Labour", "Crew size and expected duration", "Helps you compare capacity and timing"],
          ["Inclusions", "Rooms, surfaces, appliance interiors, and floors", "Prevents a low quote from hiding a smaller scope"],
          ["Extras", "Parking, travel, supplies, equipment, and specialist services", "Makes the expected total easier to understand"],
          ["Tax", "Whether the displayed amount includes GST", "Keeps business quotes comparable"],
          ["Changes", "How unanticipated work is approved", "Avoids surprises when the cleaner arrives"],
        ],
      },
      {
        type: "steps",
        heading: "Build a useful cleaning budget",
        items: [
          { title: "Create the base scope", copy: "Write down rooms, bathrooms, property type, condition, and whether the home will be empty." },
          { title: "Price optional work separately", copy: "Ask for carpet, oven, windows, walls, or outdoor spaces as individual lines where possible." },
          { title: "Allow a timing buffer", copy: "Protect the cleaning window from a late move and retain time to inspect the result." },
          { title: "Keep the written quote", copy: "Save the scope, assumptions, price basis, change process, and cancellation terms together." },
        ],
      },
      {
        type: "callout",
        heading: "Be cautious with unsourced averages",
        copy:
          "Online figures can describe a different city, property condition, year, or list of inclusions. Use them only as rough context; current quotes for your actual property are a safer basis for planning.",
      },
    ],
    relatedSlugs: ["how-much-does-move-out-cleaning-cost", "compare-cleaning-quotes", "what-does-end-of-tenancy-clean-include"],
  }),
  cleaningGuide({
    slug: "how-much-does-move-out-cleaning-cost",
    title: "How Much Does Move-Out Cleaning Cost? A Quote-Ready Guide",
    shortTitle: "Move-out cleaning cost guide",
    description:
      "Turn your property details into a quote-ready cleaning brief and understand why move-out cleaning prices can differ.",
    readTime: "7 min read",
    intro:
      "The quickest way to answer ‘how much will my move-out clean cost?’ is to make the job easy to understand. Bedroom count helps, but condition, bathrooms, kitchen build-up, access, furniture, and optional specialist work often matter just as much.",
    sections: [
      {
        type: "steps",
        heading: "Prepare a five-minute quote brief",
        items: [
          { title: "Describe the home", copy: "Give the property type, bedroom and bathroom count, approximate layout, and whether it has multiple levels." },
          { title: "Describe the condition", copy: "Mention pets, smoking, heavy kitchen use, long-unoccupied rooms, or any areas needing more than routine cleaning." },
          { title: "Separate optional items", copy: "List oven, carpet, windows, walls, blinds, appliances, garage, or balcony work so it can be included or priced separately." },
          { title: "Set the handover window", copy: "State when the property becomes empty, when keys must be returned, and any access or parking restrictions." },
        ],
      },
      {
        type: "list",
        heading: "Why two prices may look very different",
        items: [
          "One quote may include products and equipment while another expects them onsite.",
          "A fixed-price quote may allow for a defined result; an hourly quote may place more risk on the customer if the condition changes.",
          "One cleaner may include appliance interiors or windows that another treats as extras.",
          "Travel, paid parking, building access, minimum bookings, or after-hours work may be handled differently.",
          "Crew size can change the elapsed time even when total labour effort is similar.",
        ],
      },
      {
        type: "copy",
        heading: "Choose clarity before the lowest headline",
        paragraphs: [
          "A useful quote states what will be cleaned, what is excluded, the pricing basis, and how extra work will be approved. Ask questions while there is still time to change the scope rather than when the cleaner is waiting outside.",
          "If your budget is tight, identify must-do areas first and ask which optional jobs you could complete yourself. Do not remove a task that is important to your property-specific handover without understanding the consequence.",
        ],
      },
      {
        type: "callout",
        heading: "Free quotes are for the customer",
        copy:
          "Requesting cleaning quotes through Match 'n Move does not oblige you to book. Compare the written scope, availability, and business terms before choosing a provider.",
      },
    ],
    relatedSlugs: ["end-of-tenancy-cleaning-costs-nz", "questions-to-ask-before-hiring-cleaner", "diy-vs-professional-move-out-cleaning"],
  }),
  cleaningGuide({
    slug: "compare-cleaning-quotes",
    title: "How to Compare Cleaning Quotes Without Missing the Scope",
    shortTitle: "How to compare cleaning quotes",
    description:
      "Compare move-out cleaner quotes by scope, pricing method, timing, business details, and change terms rather than headline price alone.",
    readTime: "8 min read",
    intro:
      "Cleaning quotes are only comparable when they describe the same job. A shorter list of inclusions can look cheaper while leaving you to arrange important work separately. Put each offer into one simple comparison before deciding.",
    sections: [
      {
        type: "table",
        heading: "A like-for-like quote comparison",
        columns: ["Check", "Record", "Question to ask"],
        rows: [
          ["Core scope", "Rooms and surfaces included", "Does this cover the full property brief I supplied?"],
          ["Optional services", "Oven, carpet, windows, walls, blinds", "Which are included and which need a separate specialist?"],
          ["Price basis", "Fixed, hourly, or estimate", "What can change the final amount?"],
          ["Timing", "Arrival, duration, and completion window", "Can this finish after the movers and before handover?"],
          ["Access", "Keys, parking, stairs, lift, utilities", "Are access costs and waiting time included?"],
          ["Business terms", "GST, cancellation, complaints, insurance", "Where are these terms recorded?"],
        ],
      },
      {
        type: "steps",
        heading: "A balanced selection process",
        items: [
          { title: "Check fit", copy: "Confirm the cleaner serves the address, can meet the date, and accepts the property type and requested extras." },
          { title: "Check completeness", copy: "Compare every room, exclusion, product, piece of equipment, and specialist service against your brief." },
          { title: "Check confidence", copy: "Review communication, business identity, relevant experience, terms, and how concerns or rework are handled." },
          { title: "Confirm in writing", copy: "Keep the accepted price, scope, access plan, timing, and contact details in one message or document." },
        ],
      },
      {
        type: "list",
        heading: "Warning signs worth clarifying",
        items: [
          "A price given without asking about property size, condition, access, or timing.",
          "Unclear answers about what ‘full clean’ or ‘deep clean’ means.",
          "Pressure to decide immediately without written inclusions or terms.",
          "A provider who expects unsafe access, unlabelled chemicals, or undisclosed extra payment.",
          "Claims that any clean can guarantee a third party's inspection, bond, or property decision.",
        ],
      },
      {
        type: "callout",
        heading: "Use one brief for every quote",
        copy:
          "Send the same property facts and cleaning notes to each provider. If you change the scope, ask all shortlisted cleaners to update their price before comparing again.",
      },
    ],
    relatedSlugs: ["questions-to-ask-before-hiring-cleaner", "what-professional-cleaners-dont-include", "end-of-tenancy-cleaning-costs-nz"],
  }),
  cleaningGuide({
    slug: "what-does-end-of-tenancy-clean-include",
    title: "What Does an End-of-Tenancy Clean Include?",
    shortTitle: "What an end-of-tenancy clean includes",
    description:
      "Understand common end-of-tenancy cleaning areas and the appliance, carpet, window, wall, and outdoor tasks that often need explicit agreement.",
    readTime: "8 min read",
    intro:
      "‘End-of-tenancy clean’ is not a universal package. Each cleaner sets a scope, and each property has different requirements. Treat the service name as the start of a conversation and get the room-by-room inclusions in writing.",
    sections: [
      {
        type: "list",
        heading: "A common core scope to discuss",
        items: [
          "Dusting reachable ledges, fittings, doors, skirting, shelves, and windowsills.",
          "Vacuuming accessible carpet and cleaning suitable hard-floor surfaces.",
          "Cleaning kitchen benches, sink, splashback, hob surface, and cupboard exteriors.",
          "Cleaning bathroom fixtures, shower or bath surfaces, mirrors, toilet, and floor.",
          "Wiping accessible wardrobes, storage, switches, handles, and visible marks where the surface allows.",
          "Removing ordinary cleaning waste generated during the agreed work.",
        ],
      },
      {
        type: "table",
        heading: "Tasks to name explicitly",
        columns: ["Task", "Why to confirm it", "Useful detail"],
        rows: [
          ["Oven interior", "Often needs extra time and products", "Racks, trays, door glass, and rangehood"],
          ["Carpet treatment", "May use different equipment or a specialist", "Rooms, stains, drying time, and access"],
          ["Windows", "Height and inside/outside access change the job", "Interior glass, frames, tracks, and exterior panes"],
          ["Walls and ceilings", "Paint and marks need cautious treatment", "Spot cleaning versus broad washing"],
          ["Blinds and curtains", "Materials require different methods", "Dusting, washing, removal, or specialist care"],
          ["Garage or balcony", "May sit outside the standard interior scope", "Sweeping, washing, storage, and rubbish"],
        ],
      },
      {
        type: "copy",
        heading: "Condition changes the practical scope",
        paragraphs: [
          "An empty, regularly maintained home is different from a property with heavy grease, pet hair, adhesive residue, or belongings left behind. Honest condition notes help the cleaner bring the right products, equipment, crew, and time allowance.",
          "If there is significant mould, pest contamination, hazardous residue, bodily fluids, needles, or building damage, stop and ask whether a qualified specialist or property manager needs to assess the area first.",
        ],
      },
      {
        type: "callout",
        heading: "Ask for exclusions too",
        copy:
          "A clear exclusion list is as valuable as an inclusion list. It shows which tasks remain yours and reduces disagreement when the property is inspected.",
      },
    ],
    relatedSlugs: ["what-professional-cleaners-dont-include", "room-by-room-move-out-cleaning-checklist", "oven-cleaning-before-moving-out"],
  }),
  cleaningGuide({
    slug: "what-professional-cleaners-dont-include",
    title: "What Professional Cleaners Usually Don't Include",
    shortTitle: "Common cleaning exclusions",
    description:
      "Identify move-out cleaning tasks that may be excluded, need specialist equipment, or require separate approval before work begins.",
    readTime: "7 min read",
    intro:
      "A professional cleaner may offer many services, but no single package safely covers every property problem. Knowing the likely exclusions helps you arrange specialists early and prevents assumptions at handover.",
    sections: [
      {
        type: "list",
        heading: "Work that commonly needs separate agreement",
        items: [
          "Exterior or high windows, roofs, gutters, façades, and any work requiring unsafe access at height.",
          "Carpet extraction, stain treatment, pest treatment, or restoration beyond ordinary vacuuming.",
          "Heavy mould, sewage, bodily fluids, needles, hazardous chemicals, asbestos concerns, or other biohazards.",
          "Repairs, painting, replacing fittings, filling holes, or treating damage rather than dirt.",
          "Removal of large rubbish loads, furniture, abandoned belongings, or regulated waste.",
          "Gardening, water blasting, pools, chimneys, ducts, and specialist appliance servicing.",
        ],
      },
      {
        type: "steps",
        heading: "Resolve an uncertain task before booking",
        items: [
          { title: "Photograph it", copy: "Take a clear wide view and a close-up without sharing unrelated personal information." },
          { title: "Describe the surface", copy: "State the material, approximate area, height, access, and what you believe caused the issue." },
          { title: "Ask about method", copy: "Confirm whether the cleaner can safely treat it and whether there is a risk of colour or finish change." },
          { title: "Get the decision recorded", copy: "Add the agreed inclusion, exclusion, limitation, or specialist referral to the written scope." },
        ],
      },
      {
        type: "copy",
        heading: "Cleaning is not repair or restoration",
        paragraphs: [
          "Some marks remain because a surface is worn, bleached, scratched, corroded, or permanently stained. More aggressive cleaning can make damage worse. A reputable provider should explain when ordinary cleaning is unlikely to change the result.",
          "Arrange property repairs with the appropriate owner, manager, or tradesperson. If you rent, avoid authorising alterations without the required permission.",
        ],
      },
      {
        type: "callout",
        heading: "Never hide a safety issue",
        copy:
          "Tell the provider about hazards before arrival. A last-minute discovery can stop the job, expose workers to risk, and leave too little time to arrange the right specialist.",
      },
    ],
    relatedSlugs: ["what-does-end-of-tenancy-clean-include", "questions-to-ask-before-hiring-cleaner", "prepare-home-for-professional-cleaning"],
  }),
  cleaningGuide({
    slug: "room-by-room-move-out-cleaning-checklist",
    title: "Cleaning Before Moving Out: A Room-by-Room Checklist",
    shortTitle: "Room-by-room cleaning checklist",
    description:
      "Work through kitchens, bathrooms, bedrooms, living spaces, utility rooms, storage, and entrances with a practical move-out checklist.",
    readTime: "9 min read",
    intro:
      "Room-by-room planning makes progress visible and helps multiple people avoid repeating the same work. Complete dusty details first, wet areas next, and floors last, then close each finished room to moving traffic where practical.",
    sections: [
      {
        type: "list",
        heading: "Kitchen",
        items: [
          "Empty cupboards and drawers, then vacuum crumbs before wiping suitable interiors and fronts.",
          "Degrease the splashback, hob, rangehood exterior, handles, and washable preparation surfaces.",
          "Clean the sink, taps, drain area, and benchtop without using products that may damage the finish.",
          "Confirm separately whether oven, fridge, dishwasher, or rangehood interiors are included.",
          "Finish kickboards, appliance spaces, skirting, edges, and the floor after all higher work is complete.",
        ],
      },
      {
        type: "list",
        heading: "Bathrooms and laundry",
        items: [
          "Remove personal products and allow suitable cleaners time to work on soap and mineral residue.",
          "Clean shower, bath, basin, toilet, mirrors, reachable fittings, storage, and ventilation covers.",
          "Rinse and dry polished surfaces so streaks, residue, and missed edges are easier to see.",
          "Check behind doors, around the toilet base, under accessible vanities, and beside appliances.",
          "Clean the laundry tub, shelving, splash areas, lint, and floor without disturbing services.",
        ],
      },
      {
        type: "list",
        heading: "Bedrooms, living areas, and storage",
        items: [
          "Dust high ledges, light fittings that are safely reachable, doors, frames, shelves, and skirting.",
          "Empty and clean wardrobes, cupboards, built-in drawers, windowsills, and accessible tracks.",
          "Spot-clean washable marks carefully and stop if paint or finish begins to change.",
          "Vacuum edges, corners, under removed furniture, and suitable soft surfaces before hard floors.",
          "Check heat-pump exteriors, vents, switches, handles, and other touch points without opening equipment.",
        ],
      },
      {
        type: "callout",
        heading: "Finish with the route out",
        copy:
          "Inspect halls, stairs, entrance glass, door tracks, balconies or garages included in the scope, and the path used to remove equipment. Take final photos only after floors are dry and the last rubbish is gone.",
      },
    ],
    relatedSlugs: ["kitchen-move-out-cleaning-checklist", "bathroom-move-out-cleaning-checklist", "move-out-cleaning-checklist-nz"],
  }),
  cleaningGuide({
    slug: "clean-before-or-after-movers",
    title: "Should You Clean Before or After the Movers Arrive?",
    shortTitle: "Clean before or after movers?",
    description:
      "Choose a cleaning sequence that fits packing, furniture removal, property access, drying time, and the final handover deadline.",
    readTime: "7 min read",
    intro:
      "Most move-out cleaning is easier after large furniture has left, but waiting until the truck departs can create a tight deadline. The best plan combines early preparation with a final empty-property clean and enough buffer for delays.",
    sections: [
      {
        type: "table",
        heading: "What to do at each stage",
        columns: ["Stage", "Good tasks", "Hold back"],
        rows: [
          ["Before packing finishes", "Declutter, dispose of rubbish, clean little-used cupboards", "Busy rooms and floors"],
          ["Before movers arrive", "Oven if unused, high dusting, spare rooms, windowsills", "Main traffic route and furniture footprints"],
          ["While loading", "Closed rooms away from the route, final cupboard checks", "Wet floors, stairs, and shared access"],
          ["After the truck leaves", "Behind furniture, edges, wardrobes, floors, final bathroom", "Any task needing long specialist drying unless planned"],
          ["Before handover", "Walkthrough, photos, agreed touch-ups, rubbish removal", "Starting a large new task without time"],
        ],
      },
      {
        type: "steps",
        heading: "Build a delay-resistant schedule",
        items: [
          { title: "Set the immovable deadline", copy: "Work backwards from key return, settlement, building access, or the next occupant's agreed entry time." },
          { title: "Estimate truck clearance", copy: "Ask the mover for a realistic loading window and add a buffer rather than booking cleaners at the earliest possible minute." },
          { title: "Create clean zones", copy: "Finish and close spare rooms or storage areas before moving day so the final team has less ground to cover." },
          { title: "Protect drying time", copy: "Plan carpet or wet-floor work so surfaces can dry without movers crossing them or doors being locked immediately." },
        ],
      },
      {
        type: "copy",
        heading: "When overlap is unavoidable",
        paragraphs: [
          "Give one person authority to coordinate both teams. Keep equipment and chemicals out of loading paths, identify which rooms are released for cleaning, and make sure nobody blocks lifts, driveways, or emergency access.",
          "Tell the cleaner if the property may still contain furniture. Their original time or price may assume an empty home, and working around belongings can change what is accessible.",
        ],
      },
      {
        type: "callout",
        heading: "Avoid a zero-buffer handover",
        copy:
          "A late truck, missing key, parking delay, or unexpected extra work can consume the entire cleaning window. Even a modest buffer gives you time to inspect and respond calmly.",
      },
    ],
    relatedSlugs: ["cleaning-after-furniture-removed", "moving-house-cleaning-timeline", "last-minute-move-out-cleaning-guide"],
  }),
  cleaningGuide({
    slug: "carpet-cleaning-when-moving-house",
    title: "Carpet Cleaning When Moving House",
    shortTitle: "Carpet cleaning when moving",
    description:
      "Plan carpet cleaning around furniture removal, stain disclosure, drying time, access, and your property-specific handover requirements.",
    readTime: "8 min read",
    intro:
      "Carpet work can range from ordinary vacuuming to specialist extraction or stain treatment. Do not assume a general move-out clean includes specialist carpet equipment, and do not assume every tenancy or property requires the same treatment.",
    sections: [
      {
        type: "list",
        heading: "Information a carpet provider needs",
        items: [
          "Number and approximate size of carpeted rooms, halls, stairs, and landings.",
          "Fibre or care information if known, plus the carpet's age and general condition.",
          "Pets, odour, spills, visible stains, prior treatments, and any colour-change concerns.",
          "Whether furniture remains and who is responsible for moving it.",
          "Floor level, lift or stair access, parking, water access, and equipment-carry distance.",
          "The deadline and how long the property can ventilate and remain undisturbed after treatment.",
        ],
      },
      {
        type: "steps",
        heading: "Schedule carpet work safely",
        items: [
          { title: "Check the requirement", copy: "Use your property-specific instructions and current NZ guidance rather than assuming specialist cleaning is always required." },
          { title: "Remove obstructions", copy: "Arrange furniture removal and pick up small objects before the carpet appointment." },
          { title: "Discuss expectations", copy: "Ask what method is proposed, what stains may remain, and whether spot treatment carries any risk." },
          { title: "Protect drying", copy: "Allow ventilation and drying time, limit foot traffic, and avoid placing boxes or furniture on damp carpet." },
        ],
      },
      {
        type: "copy",
        heading: "Stain removal is not guaranteed",
        paragraphs: [
          "The result depends on fibre, dye, age, previous chemicals, contamination, and how long a mark has been present. Share stain information honestly and be cautious of anyone promising that every mark will disappear.",
          "If a carpet is damaged, delaminated, bleached, mould-affected, or contaminated, cleaning may not be the appropriate remedy. Ask a suitable flooring, restoration, or property professional before aggressive treatment.",
        ],
      },
      {
        type: "callout",
        heading: "Confirm what ‘carpet cleaning’ means",
        copy:
          "Record the rooms, method, spot treatment, deodorising, furniture movement, drying guidance, and price. Ordinary vacuuming and specialist carpet treatment are not the same service.",
      },
    ],
    relatedSlugs: ["what-professional-cleaners-dont-include", "cleaning-after-furniture-removed", "moving-out-rental-cleaning-checklist"],
  }),
  cleaningGuide({
    slug: "oven-cleaning-before-moving-out",
    title: "Oven Cleaning Before Moving Out",
    shortTitle: "Oven cleaning before moving out",
    description:
      "Plan oven cleaning safely, confirm which components are included, and fit the work around packing, meals, ventilation, and handover.",
    readTime: "7 min read",
    intro:
      "Ovens are frequently treated as an optional or separately priced move-out task because grease build-up, racks, trays, glass, and rangehoods can take significant time. Define each appliance surface rather than requesting a vague ‘kitchen clean’.",
    sections: [
      {
        type: "list",
        heading: "Define the appliance scope",
        items: [
          "Oven cavity, door interior and exterior, glass, seals, racks, rails, and trays.",
          "Cooktop or hob surface, removable supports, knobs, and surrounding splashback.",
          "Rangehood exterior, accessible filters, and whether replacement rather than cleaning is needed.",
          "Separate appliances such as microwave, fridge, freezer, or dishwasher interiors.",
          "Floor, wall, and cabinetry revealed when a freestanding appliance is safely removed by the responsible person.",
        ],
      },
      {
        type: "steps",
        heading: "Choose the right timing",
        items: [
          { title: "Finish cooking", copy: "Plan simple meals or stop using the oven early enough that it is cool and available for cleaning." },
          { title: "Check instructions", copy: "Follow appliance and product guidance, especially for self-cleaning coatings, catalytic liners, aluminium, seals, and glass." },
          { title: "Ventilate safely", copy: "Keep the room ventilated as directed and make sure children and pets cannot reach products or hot surfaces." },
          { title: "Inspect in good light", copy: "Reassemble only the parts intended to be removed and check for residue once surfaces are dry." },
        ],
      },
      {
        type: "copy",
        heading: "Know when to stop",
        paragraphs: [
          "Do not mix chemicals or use abrasive tools that may scratch glass, enamel, stainless steel, markings, or non-stick finishes. A stubborn baked mark may be safer to leave than to damage the appliance while chasing a perfect appearance.",
          "Cleaning is different from repair. Faults, broken glass, damaged seals, electrical concerns, gas concerns, or a non-functioning rangehood should be handled by the appropriate property contact or qualified trade.",
        ],
      },
      {
        type: "callout",
        heading: "Ask whether oven cleaning is included",
        copy:
          "Before accepting a quote, confirm the exact oven and rangehood components, whether products and equipment are supplied, and what condition assumptions the cleaner used.",
      },
    ],
    relatedSlugs: ["kitchen-move-out-cleaning-checklist", "what-does-end-of-tenancy-clean-include", "prepare-home-for-professional-cleaning"],
  }),
  cleaningGuide({
    slug: "kitchen-move-out-cleaning-checklist",
    title: "Kitchen Move-Out Cleaning Checklist",
    shortTitle: "Kitchen cleaning checklist",
    description:
      "Clean an empty kitchen methodically, including cupboards, preparation surfaces, appliances, grease-prone details, and the final floor.",
    readTime: "8 min read",
    intro:
      "The kitchen often carries the most variable move-out workload. Empty it fully, separate appliance interiors from the core scope, and work from dry crumbs and dust toward wet cleaning so grease is not spread around the room.",
    sections: [
      {
        type: "steps",
        heading: "A reliable kitchen sequence",
        items: [
          { title: "Empty and sort", copy: "Remove food, liners, loose shelves, rubbish, and personal appliances; set aside anything that must stay with the property." },
          { title: "Vacuum dry debris", copy: "Clear crumbs from cupboards, drawers, corners, appliance gaps, and kickboards before applying wet products." },
          { title: "Work from high to low", copy: "Clean cabinet tops where safely reachable, rangehood exterior, splashback, fronts, benches, sink, and lower storage." },
          { title: "Finish details and floor", copy: "Check handles, edges, switches, skirting, appliance spaces, then clean the floor toward the exit." },
        ],
      },
      {
        type: "list",
        heading: "Kitchen details commonly missed",
        items: [
          "Undersides of wall cabinets, shelf supports, drawer corners, and cupboard hinge areas.",
          "Rangehood surfaces and filters included in the agreed scope.",
          "Tap bases, sink overflow areas, draining grooves, plugs, and removable strainers.",
          "Grease on handles, the sides of cabinetry, kickboards, and the wall near cooking areas.",
          "Dust and debris in fridge, dishwasher, or freestanding-oven spaces once safely accessible.",
          "Bins, recycling storage, pantry corners, and food residue that could attract pests.",
        ],
      },
      {
        type: "copy",
        heading: "Use surface-appropriate products",
        paragraphs: [
          "Stone, laminate, timber, stainless steel, glass, painted cabinetry, and appliance coatings can react differently. Check manufacturer or property instructions and test cautiously in an inconspicuous spot when appropriate.",
          "Never mix products, and do not dismantle gas, electrical, plumbing, extraction, or built-in appliance components. Escalate faults or unsafe conditions instead of treating them as cleaning jobs.",
        ],
      },
      {
        type: "callout",
        heading: "Photograph the empty kitchen",
        copy:
          "Once surfaces are dry, take wide photos and a few detail photos of the oven or other separately agreed items. This creates a clearer handover record than close-ups alone.",
      },
    ],
    relatedSlugs: ["oven-cleaning-before-moving-out", "room-by-room-move-out-cleaning-checklist", "moving-house-cleaning-supplies-checklist"],
  }),
  cleaningGuide({
    slug: "bathroom-move-out-cleaning-checklist",
    title: "Bathroom Move-Out Cleaning Checklist",
    shortTitle: "Bathroom cleaning checklist",
    description:
      "Work through shower residue, fixtures, ventilation, storage, toilet areas, mirrors, and floors with a safe move-out sequence.",
    readTime: "8 min read",
    intro:
      "Bathrooms benefit from dwell time, ventilation, and careful product choice. Remove personal items first, identify the surface materials, and give products time to work rather than relying on aggressive scrubbing that can damage finishes.",
    sections: [
      {
        type: "steps",
        heading: "Clean without working against yourself",
        items: [
          { title: "Clear and ventilate", copy: "Remove toiletries, mats, bins, and loose storage; open safe ventilation and put on appropriate protective equipment." },
          { title: "Start dry and high", copy: "Dust reachable vents, ledges, window areas, lighting exteriors, and cupboard tops before wetting lower surfaces." },
          { title: "Treat wet zones", copy: "Use suitable products on shower, bath, basin, tiles, grout, fittings, mirrors, and toilet areas according to label instructions." },
          { title: "Rinse, dry, inspect", copy: "Remove residue, dry reflective surfaces and fittings, then finish storage, edges, skirting, and floor." },
        ],
      },
      {
        type: "list",
        heading: "Details to include in the scope",
        items: [
          "Shower glass, door tracks, screens, seals, fittings, shelves, and accessible drain cover.",
          "Bath edges, basin overflow, tap bases, vanity fronts, drawers, and cupboard interiors.",
          "Toilet seat hinges, exterior surfaces, base area, nearby wall, holder, and floor edges.",
          "Mirrors, windowsills, reachable ventilation cover, switches, handles, and towel fittings.",
          "Laundry fixtures or a separate toilet if they sit outside the main bathroom.",
        ],
      },
      {
        type: "copy",
        heading: "Mould and damaged sealant need care",
        paragraphs: [
          "Surface spotting and significant mould are not the same issue. Widespread or recurring mould can indicate moisture or building problems and may require property management or specialist assessment rather than stronger household chemicals.",
          "Discoloured, failed, or missing sealant and grout may not improve through cleaning. Avoid scraping, repainting, or replacing material unless that work has been authorised and assigned to an appropriate person.",
        ],
      },
      {
        type: "callout",
        heading: "Never mix bathroom chemicals",
        copy:
          "Different products can react dangerously. Follow labels, ventilate as instructed, keep products in their original containers, and rinse only as directed before changing products.",
      },
    ],
    relatedSlugs: ["room-by-room-move-out-cleaning-checklist", "moving-house-cleaning-supplies-checklist", "what-professional-cleaners-dont-include"],
  }),
  cleaningGuide({
    slug: "apartment-move-out-cleaning-guide",
    title: "Apartment Move-Out Cleaning Guide",
    shortTitle: "Apartment move-out cleaning",
    description:
      "Coordinate apartment cleaning with lift bookings, loading access, parking, body-corporate rules, compact spaces, and handover timing.",
    readTime: "8 min read",
    intro:
      "Apartments may have fewer rooms than a house, but access can be more complicated. Lift bookings, loading bays, concierge hours, shared corridors, parking, noise limits, and a tightly scheduled move can all affect the cleaning plan.",
    sections: [
      {
        type: "list",
        heading: "Confirm building access early",
        items: [
          "Cleaner arrival window and whether reception, security, or a building manager must provide access.",
          "Lift booking times, loading-bay rules, height limits, and where cleaning equipment may be unloaded.",
          "Visitor parking, paid parking, street restrictions, and the walking distance to the apartment.",
          "Rules for propping doors, protecting lifts, moving equipment, noise, rubbish, and use of shared taps or drains.",
          "Key, fob, swipe-card, alarm, and lockbox arrangements, including who collects them afterward.",
          "Where the cleaner may dispose of ordinary cleaning waste and what must be removed offsite.",
        ],
      },
      {
        type: "steps",
        heading: "Coordinate a compact-space clean",
        items: [
          { title: "Release rooms deliberately", copy: "Have movers empty one area at a time so cleaners can work without equipment and boxes competing for the same floor space." },
          { title: "Prioritise ventilation", copy: "Use permitted windows or mechanical ventilation and account for products and carpet work in a smaller enclosed home." },
          { title: "Protect shared areas", copy: "Keep chemicals, cords, hoses, and waste out of corridors, fire exits, lifts, and neighbours' doorways." },
          { title: "Inspect before access ends", copy: "Complete the walkthrough while the lift, parking, keys, lighting, and building contact are still available." },
        ],
      },
      {
        type: "copy",
        heading: "Small does not always mean quick",
        paragraphs: [
          "A compact kitchen can have dense cabinetry and appliances, while one bathroom may carry most of the property's build-up. Balconies, large glass areas, furnished layouts, and long equipment carries can add work not reflected in bedroom count.",
          "Give the cleaner photographs and honest access details before accepting a fixed price. Mention if building rules prevent exterior glass, balcony washing, or use of certain equipment.",
        ],
      },
      {
        type: "callout",
        heading: "Keep common areas in scope only when agreed",
        copy:
          "Confirm whether the entry immediately outside your apartment, balcony, storage locker, or car park is your responsibility and included. Do not ask a provider to clean shared property without permission.",
      },
    ],
    relatedSlugs: ["clean-before-or-after-movers", "prepare-home-for-professional-cleaning", "how-long-does-end-of-tenancy-clean-take"],
  }),
  cleaningGuide({
    slug: "moving-out-rental-cleaning-checklist",
    title: "Moving Out of a Rental: Cleaning Checklist",
    shortTitle: "Rental move-out cleaning checklist",
    description:
      "Create a property-specific rental cleaning plan, document the result, and avoid confusing cleaning with maintenance or repairs.",
    readTime: "9 min read",
    intro:
      "A rental move-out clean should be based on the property, your records, the tenancy agreement, and current New Zealand guidance. Generic checklists are useful prompts, but they cannot decide every responsibility or guarantee a bond outcome.",
    sections: [
      {
        type: "steps",
        heading: "Build the checklist from evidence",
        items: [
          { title: "Review your records", copy: "Compare entry-condition information, photos, agreed changes, maintenance messages, and any written handover instructions." },
          { title: "Ask early questions", copy: "Clarify key return, inspection time, rubbish arrangements, provided appliances, and any unclear property-specific expectation." },
          { title: "Separate the work", copy: "List cleaning, rubbish removal, gardening if applicable, and maintenance concerns as distinct tasks with the right person responsible." },
          { title: "Document completion", copy: "Take dated wide and detail photos after belongings and cleaning supplies have left and surfaces are dry." },
        ],
      },
      {
        type: "list",
        heading: "Rental handover areas to check",
        items: [
          "Kitchen, supplied appliances, cupboards, food storage, bins, and grease-prone surfaces.",
          "Bathrooms, separate toilets, ventilation covers, mirrors, storage, and wet-area floors.",
          "Bedrooms, wardrobes, living areas, windowsills, accessible tracks, skirting, and floors.",
          "Laundry, garage, balcony, outdoor area, or furnished items where they form part of your agreed responsibility.",
          "Rubbish, recycling, personal property, keys, remotes, manuals, access cards, and alarm information.",
        ],
      },
      {
        type: "copy",
        heading: "Use current New Zealand information",
        paragraphs: [
          "Tenancy requirements and the facts of an individual property can matter. Check current Tenancy Services material or obtain appropriate advice if you are unsure about a disputed requirement, professional carpet cleaning, fair wear, damage, or responsibility for a building issue.",
          "Do not authorise repairs, painting, chemical treatment, or alterations merely to satisfy a checklist unless you have the necessary permission and the work is safe.",
        ],
      },
      {
        type: "callout",
        heading: "A cleaner cannot guarantee the inspection decision",
        copy:
          "A professional clean can complete an agreed scope, but the property manager or owner assesses the wider handover. Keep the quote, scope, messages, receipt, and final photos together.",
      },
    ],
    relatedSlugs: ["end-of-tenancy-cleaning-nz-guide", "move-out-cleaning-checklist-nz", "carpet-cleaning-when-moving-house"],
  }),
  cleaningGuide({
    slug: "how-long-does-end-of-tenancy-clean-take",
    title: "How Long Does an End-of-Tenancy Clean Take?",
    shortTitle: "End-of-tenancy cleaning time",
    description:
      "Estimate a realistic cleaning window from property size, condition, crew, furniture, access, optional services, and moving-day constraints.",
    readTime: "7 min read",
    intro:
      "Cleaning duration is not determined by bedroom count alone. Two similar homes can require very different effort because of bathrooms, kitchen condition, storage, furniture, access, optional work, and how well the property has been prepared.",
    sections: [
      {
        type: "list",
        heading: "What changes the cleaning window",
        items: [
          "The number of rooms, bathrooms, levels, fitted cupboards, windows, and utility spaces.",
          "Grease, soap residue, pet hair, dust, adhesive, stains, and areas hidden for a long time.",
          "Whether furniture, boxes, rubbish, food, or personal belongings still obstruct surfaces.",
          "Crew size, equipment, products, and whether specialist carpet or window work is involved.",
          "Parking, lift bookings, stairs, long carries, key collection, and restricted building hours.",
          "Interruptions from movers, trades, inspections, utility disconnection, or another occupant.",
        ],
      },
      {
        type: "steps",
        heading: "Ask for a useful time estimate",
        items: [
          { title: "Send the full scope", copy: "Share room counts, condition notes, optional tasks, photographs, and whether the home will be empty." },
          { title: "State both deadlines", copy: "Give the earliest reliable access time and the latest acceptable completion time." },
          { title: "Ask for assumptions", copy: "Confirm crew size, pricing basis, expected duration, and what could extend the job." },
          { title: "Reserve inspection time", copy: "Keep a buffer after cleaning for drying, walkthrough, photos, and agreed touch-ups." },
        ],
      },
      {
        type: "copy",
        heading: "Elapsed time and labour time differ",
        paragraphs: [
          "A larger crew may finish sooner without reducing the total labour involved. When comparing an hourly solo cleaner with a fixed-price team, compare the whole offer rather than multiplying one stated hourly rate by an assumed duration.",
          "Some products need safe dwell time and some floor or carpet methods need drying time after active cleaning ends. Ask when the property can be walked through, locked, or occupied, not only when the team expects to leave.",
        ],
      },
      {
        type: "callout",
        heading: "Avoid booking against an optimistic truck time",
        copy:
          "Furniture removal can run late. Give the cleaner a realistic update process and enough buffer that a delayed moving truck does not eliminate the cleaning or inspection window.",
      },
    ],
    relatedSlugs: ["clean-before-or-after-movers", "prepare-home-for-professional-cleaning", "move-out-cleaning-large-homes"],
  }),
  cleaningGuide({
    slug: "diy-vs-professional-move-out-cleaning",
    title: "DIY Cleaning vs Hiring a Professional Cleaner",
    shortTitle: "DIY vs professional cleaning",
    description:
      "Compare DIY and professional move-out cleaning by time, equipment, property condition, safety, timing risk, and the work you can split.",
    readTime: "8 min read",
    intro:
      "The right choice is rarely ‘all DIY’ or ‘all professional’. Many households complete straightforward rooms themselves and hire help for time-intensive or equipment-heavy work. Decide based on the property and your moving schedule, not guilt or habit.",
    sections: [
      {
        type: "table",
        heading: "Compare the practical trade-offs",
        columns: ["Factor", "DIY approach", "Professional approach"],
        rows: [
          ["Time", "Fits around your packing but competes with moving tasks", "Reserves labour for an agreed window"],
          ["Products", "You select, buy, store, and transport them", "Often supplied, but confirm the quote"],
          ["Equipment", "Limited to what you own or hire", "May include commercial tools for the agreed scope"],
          ["Control", "You set the detail and order", "You must communicate expectations clearly"],
          ["Risk", "You carry timing, fatigue, and surface-choice risk", "Provider terms define service and rework responsibilities"],
          ["Cost", "Lower labour spend but uses your time and supplies", "Quoted labour with potential access or optional-service costs"],
        ],
      },
      {
        type: "list",
        heading: "DIY may suit when",
        items: [
          "The property is regularly maintained, mostly empty, and the scope is straightforward.",
          "You have safe products, suitable equipment, enough physical capacity, and several days of buffer.",
          "You can finish rooms progressively without cleaning around active packing or moving traffic.",
          "There is no specialist, hazardous, high-access, or restoration work involved.",
        ],
      },
      {
        type: "list",
        heading: "Professional help may add value when",
        items: [
          "The handover window is short or you will be travelling, working, or caring for family during the move.",
          "The home is large, furnished, access is difficult, or the kitchen and bathrooms need concentrated effort.",
          "Carpet, high glass, specialist equipment, or a coordinated crew is needed and offered safely.",
          "You want a written scope, business contact, and service process rather than organising several helpers yourself.",
        ],
      },
      {
        type: "callout",
        heading: "A split scope can be efficient",
        copy:
          "You might empty cupboards, declutter, and clean spare rooms, then hire a cleaner for the final kitchen, bathrooms, details, and floors. Write down who owns each task so nothing disappears between the two plans.",
      },
    ],
    relatedSlugs: ["how-much-does-move-out-cleaning-cost", "moving-house-cleaning-supplies-checklist", "last-minute-move-out-cleaning-guide"],
  }),
  cleaningGuide({
    slug: "questions-to-ask-before-hiring-cleaner",
    title: "Questions to Ask Before Hiring a Move-Out Cleaner",
    shortTitle: "Questions for a cleaner",
    description:
      "Use a concise question list to confirm cleaning scope, pricing, access, timing, products, safety, business terms, and follow-up.",
    readTime: "7 min read",
    intro:
      "A good conversation before booking is shorter than resolving a misunderstanding afterward. Ask the questions that affect scope and timing, then keep the answers with the accepted quote.",
    sections: [
      {
        type: "list",
        heading: "Questions about the work",
        items: [
          "Which rooms, surfaces, and routine tasks are included in this quote?",
          "Are oven, carpet, interior windows, tracks, blinds, walls, cupboards, garage, or balcony work included?",
          "What is excluded, and which concerns would need a separate specialist?",
          "Do you need the property completely empty, and who moves any remaining furniture?",
          "Are cleaning products and equipment supplied, and can you accommodate relevant surface or fragrance concerns?",
          "How do you handle an area that cannot be safely cleaned without damage or specialist access?",
        ],
      },
      {
        type: "list",
        heading: "Questions about price and timing",
        items: [
          "Is the quote fixed for the written scope, hourly, capped, or an estimate?",
          "Does the amount include GST where applicable, products, equipment, travel, parking, and rubbish from the clean?",
          "What could change the amount, and how will you obtain approval before extra work?",
          "What arrival window, crew size, and completion window should I plan around?",
          "What happens if the moving truck runs late or building access is unavailable?",
          "What are the cancellation, postponement, payment, concern, and agreed rework terms?",
        ],
      },
      {
        type: "steps",
        heading: "Verify fit without turning it into an interrogation",
        items: [
          { title: "Send one clear brief", copy: "A detailed starting message lets the provider answer several questions at once." },
          { title: "Check business details", copy: "Confirm the company name, contact person, service area, and the written terms attached to the offer." },
          { title: "Clarify the differences", copy: "Focus follow-up on exclusions, assumptions, and timing that differ between shortlisted quotes." },
          { title: "Save the agreement", copy: "Keep the final scope, amount, date, access plan, and contact channel available on moving day." },
        ],
      },
      {
        type: "callout",
        heading: "No provider controls a third party's decision",
        copy:
          "Be cautious with unconditional guarantees about bonds, inspections, sale outcomes, or permanent stain removal. A provider can stand behind an agreed service process, not every external decision.",
      },
    ],
    relatedSlugs: ["compare-cleaning-quotes", "what-professional-cleaners-dont-include", "end-of-tenancy-cleaning-nz-guide"],
  }),
  cleaningGuide({
    slug: "prepare-home-for-professional-cleaning",
    title: "How to Prepare Your Home for Professional Cleaning",
    shortTitle: "Prepare for professional cleaning",
    description:
      "Prepare access, remove belongings, disclose hazards, protect valuables, confirm utilities, and give a cleaner a clear move-out brief.",
    readTime: "7 min read",
    intro:
      "Preparation lets paid cleaning time go toward cleaning rather than searching for access, moving boxes, or deciding what should stay. A simple handover note can prevent most avoidable delays.",
    sections: [
      {
        type: "steps",
        heading: "Prepare the property in four passes",
        items: [
          { title: "Remove personal items", copy: "Empty the agreed cupboards and rooms, dispose of rubbish, and label anything that must remain." },
          { title: "Make access reliable", copy: "Confirm keys, alarms, gates, parking, lift bookings, contact numbers, power, water, lighting, and lock-up instructions." },
          { title: "Share the scope", copy: "Leave room counts, priorities, optional services, surface concerns, photographs, and the final completion deadline." },
          { title: "Create a safe site", copy: "Disclose hazards, secure pets, keep children away, and ensure movers or trades will not block work areas." },
        ],
      },
      {
        type: "list",
        heading: "Remove these avoidable obstacles",
        items: [
          "Loose valuables, medicines, identity documents, cash, keys not needed by the cleaner, and sentimental items.",
          "Food, open containers, unlabelled chemicals, rubbish, recycling, and belongings inside storage being cleaned.",
          "Boxes in bathrooms, kitchens, corridors, stairs, appliance spaces, and the cleaner's planned exit route.",
          "Unsecured pets and pet equipment in areas where doors or gates may be opened.",
          "Vehicles or moving equipment occupying the agreed cleaner parking or unloading position.",
        ],
      },
      {
        type: "copy",
        heading: "Disclose condition and safety concerns",
        paragraphs: [
          "Tell the provider about mould, pests, sharp objects, bodily fluids, smoke residue, heavy lifting, broken fittings, unstable surfaces, or areas without safe access. Provide photographs where helpful and appropriate.",
          "The cleaner may decline or isolate work outside their training, equipment, or agreed scope. Early disclosure gives you time to arrange a specialist instead of discovering the issue during the final hour.",
        ],
      },
      {
        type: "callout",
        heading: "Nominate one contact",
        copy:
          "Choose one person who can answer scope questions, approve any documented change, provide access, and complete the final walkthrough. Conflicting instructions from several people waste time.",
      },
    ],
    relatedSlugs: ["questions-to-ask-before-hiring-cleaner", "clean-before-or-after-movers", "what-professional-cleaners-dont-include"],
  }),
  cleaningGuide({
    slug: "move-out-cleaning-large-homes",
    title: "Move-Out Cleaning for Large Homes",
    shortTitle: "Cleaning a large home",
    description:
      "Plan zones, crew access, priorities, specialist work, quality checks, and moving-day coordination for a larger move-out clean.",
    readTime: "8 min read",
    intro:
      "Large homes need more than a longer generic checklist. Multiple living areas, bathrooms, levels, storage spaces, garages, and outdoor transitions make sequencing and quality control important, especially when cleaners and movers overlap.",
    sections: [
      {
        type: "steps",
        heading: "Turn the property into manageable zones",
        items: [
          { title: "Map every area", copy: "List bedrooms, bathrooms, living rooms, kitchen zones, offices, wardrobes, utility rooms, garage, and agreed outdoor spaces." },
          { title: "Release zones", copy: "Ask movers to clear and hand over sections so cleaners can finish them without return traffic." },
          { title: "Assign priorities", copy: "Identify must-complete areas, separately priced specialist work, and spaces you will handle yourself." },
          { title: "Inspect progressively", copy: "Check completed zones while the relevant cleaner is still onsite rather than leaving the entire walkthrough to the end." },
        ],
      },
      {
        type: "list",
        heading: "Large-home details that affect the quote",
        items: [
          "Bathroom count, separate toilets, multiple kitchens, sculleries, laundries, and fitted storage.",
          "Stairs, split levels, long internal carries, detached buildings, gates, and distance from parking.",
          "Large areas of glass, high features, chandeliers, voids, or anything outside safe ordinary reach.",
          "Carpeted stairs and rooms, extensive hard floors, pets, furnished areas, and condition variation between zones.",
          "Crew access, water points, power, equipment staging, rubbish handling, and secure lock-up across several entrances.",
        ],
      },
      {
        type: "copy",
        heading: "Crew size is only one part of capacity",
        paragraphs: [
          "Ask how the provider will supervise the scope, prevent duplicate work, and check consistency across zones. A larger crew may reduce elapsed time, but only if everyone can access the property and work safely without blocking movers or each other.",
          "Use a written zone list and record any area that is excluded, inaccessible, or waiting for furniture removal. This makes the final inspection much more reliable than relying on memory.",
        ],
      },
      {
        type: "callout",
        heading: "Plan more than one checkpoint",
        copy:
          "Confirm the property at the start, review a sample completed zone partway through, and carry out the final walkthrough. Early feedback is easier to act on than a large list after the team has packed up.",
      },
    ],
    relatedSlugs: ["how-long-does-end-of-tenancy-clean-take", "cleaning-after-furniture-removed", "compare-cleaning-quotes"],
  }),
  cleaningGuide({
    slug: "cleaning-after-furniture-removed",
    title: "Cleaning a Home After Furniture Has Been Removed",
    shortTitle: "Cleaning after furniture removal",
    description:
      "Use the empty-home window to clean newly exposed dust, floor edges, walls, storage, appliance spaces, and final moving paths.",
    readTime: "7 min read",
    intro:
      "Once furniture leaves, the property becomes easier to inspect and new work becomes visible. Expect dust outlines, compressed carpet, debris, marks, and forgotten items in places that could not be reached earlier.",
    sections: [
      {
        type: "list",
        heading: "Inspect newly exposed areas",
        items: [
          "Floor edges, corners, carpet outlines, hard-floor pads, and debris beneath former furniture positions.",
          "Walls, skirting, sockets, cable areas, windowsills, and marks hidden behind beds, sofas, desks, or artwork.",
          "Wardrobes, built-in drawers, cupboards, shelves, and storage rooms emptied late in the move.",
          "Spaces beside or behind appliances that have been safely disconnected and moved by the responsible person.",
          "Door tracks, hallways, stairs, entries, and other areas affected by the final loading route.",
          "Small hardware, rubbish, labels, tape, ties, and packing material left after dismantling or loading.",
        ],
      },
      {
        type: "steps",
        heading: "Use the empty-property window well",
        items: [
          { title: "Walk before cleaning", copy: "Photograph damage or maintenance issues and separate them from removable dirt or dust." },
          { title: "Clean high to low", copy: "Finish ledges, walls where appropriate, storage, and skirting before vacuuming or washing floors." },
          { title: "Protect the exit route", copy: "Work from the furthest spaces toward the door and prevent equipment from crossing finished wet floors." },
          { title: "Close the property", copy: "Remove supplies and waste, inspect in good light, take final photos, and follow the agreed key and security process." },
        ],
      },
      {
        type: "copy",
        heading: "Know what cleaning cannot change",
        paragraphs: [
          "Furniture can hide fading, dents, scratched flooring, damaged paint, compressed carpet, or moisture issues. These may remain after ordinary cleaning and should be recorded rather than attacked with harsher products.",
          "If the cleaner's quote assumed an empty property, notify them when the truck actually leaves. If furniture remains, agree whether the team will work around it, return later, or adjust the scope.",
        ],
      },
      {
        type: "callout",
        heading: "Keep one final clean bathroom available",
        copy:
          "If possible, reserve one bathroom for the last stage after movers and helpers have finished using the property. This avoids re-cleaning it several times during loading.",
      },
    ],
    relatedSlugs: ["clean-before-or-after-movers", "room-by-room-move-out-cleaning-checklist", "move-out-cleaning-large-homes"],
  }),
  cleaningGuide({
    slug: "last-minute-move-out-cleaning-guide",
    title: "Last-Minute Move-Out Cleaning Guide",
    shortTitle: "Last-minute cleaning guide",
    description:
      "Triage a short move-out cleaning window by safety, essential rooms, visible residue, rubbish, access, and honest provider communication.",
    readTime: "7 min read",
    intro:
      "When time is short, trying to clean everything at once produces half-finished rooms and unsafe shortcuts. Stabilise the move, remove obstructions, prioritise the areas that matter most, and communicate the true deadline to anyone you hire.",
    sections: [
      {
        type: "steps",
        heading: "The first hour of a last-minute clean",
        items: [
          { title: "Stop adding mess", copy: "Finish packing, remove food and rubbish, contain pets, and establish one clear loading and cleaning route." },
          { title: "Set priorities", copy: "Choose the kitchen, bathroom, empty storage, visible floors, and property-specific handover items before cosmetic details." },
          { title: "Split ownership", copy: "Assign rooms or task groups to named people and write down what is intentionally deferred or excluded." },
          { title: "Call with facts", copy: "Tell a cleaner the location, property size, condition, empty time, deadline, access, and exact work still required." },
        ],
      },
      {
        type: "list",
        heading: "Prioritise high-impact unfinished work",
        items: [
          "Remove all rubbish, food, personal items, and cleaning supplies that should not remain.",
          "Clean the toilet, shower or bath, basin, mirrors, and dry bathroom floor.",
          "Clear kitchen grease and food residue from benches, sink, hob, splashback, and storage.",
          "Vacuum obvious debris, edges, wardrobes, and the areas exposed by furniture removal.",
          "Wipe reachable touch points, visible dust, shelves, doors, and windowsills.",
          "Finish the entrance and loading route after the last person carries items through it.",
        ],
      },
      {
        type: "copy",
        heading: "What not to do under pressure",
        paragraphs: [
          "Do not mix chemicals, work at unsafe height, flood surfaces, dismantle appliances, or use a harsh product without checking the material. A rushed attempt can create damage or a safety emergency that costs more time.",
          "Do not hide the condition from a cleaner to obtain a quick price. Clear photographs and honest notes let the provider decide whether the scope and deadline are achievable.",
        ],
      },
      {
        type: "callout",
        heading: "Reset expectations early",
        copy:
          "If the full scope cannot be completed safely before handover, communicate with the relevant property contact as soon as possible and obtain appropriate advice. Do not rely on a provider to promise an impossible deadline.",
      },
    ],
    relatedSlugs: ["move-out-cleaning-checklist-nz", "diy-vs-professional-move-out-cleaning", "moving-house-cleaning-timeline"],
  }),
  cleaningGuide({
    slug: "moving-house-cleaning-supplies-checklist",
    title: "Cleaning Supplies Checklist for Moving House",
    shortTitle: "Moving cleaning supplies",
    description:
      "Pack a safe, surface-aware cleaning kit for moving day, including tools, protective items, product handling, and a final exit box.",
    readTime: "8 min read",
    intro:
      "A useful moving-house cleaning kit is compact, labelled, and kept out of the removal truck until the final clean is finished. Choose products for the actual surfaces in the home and follow each label rather than collecting multiple chemicals for the same task.",
    sections: [
      {
        type: "list",
        heading: "Core tools",
        items: [
          "Vacuum with suitable floor head, crevice tool, spare bag or emptied container, and accessible charging cable if required.",
          "Microfibre or other suitable cloths separated by task, non-scratch sponges, a small detailing brush, and a duster.",
          "Bucket, mop suitable for the floor finish, dustpan and brush, broom where appropriate, and a floor-warning option.",
          "Rubbish and recycling bags, paper or reusable towels where suitable, and a caddy that keeps products upright.",
          "Gloves and any protective equipment required by product instructions, plus closed footwear with reliable grip.",
          "Step access only if it is stable, suitable, permitted, and can be used safely; otherwise leave high work to an equipped provider.",
        ],
      },
      {
        type: "list",
        heading: "Choose products by surface and task",
        items: [
          "A suitable general surface cleaner rather than one assumed safe for every material.",
          "Kitchen degreaser, bathroom product, glass product, and toilet product only where labels and surfaces allow.",
          "Floor product specifically suitable for the timber, laminate, tile, vinyl, stone, or other finish present.",
          "Dishwashing liquid or mild option for appropriate tasks, plus plain clean water for rinsing where directed.",
          "Manufacturer-approved appliance products if you are cleaning an oven or specialist finish yourself.",
        ],
      },
      {
        type: "steps",
        heading: "Pack a final-clean exit box",
        items: [
          { title: "Keep essentials separate", copy: "Do not load the vacuum, cloths, bags, gloves, mop, and final products onto the truck too early." },
          { title: "Retain labels", copy: "Keep products in original containers and never decant them into drink bottles or unmarked packaging." },
          { title: "Transport safely", copy: "Close lids, keep products upright, separate incompatible items as labels direct, and keep them away from food, children, and pets." },
          { title: "Remove everything", copy: "At the end, take products, dirty cloths, waste, and the caddy with you; do not leave an unlabelled chemical behind." },
        ],
      },
      {
        type: "callout",
        heading: "Never mix cleaning products",
        copy:
          "Use one product at a time according to its label, ventilate as directed, and do not assume rinsing makes an unknown combination safe. If a surface or residue is unfamiliar, stop and seek suitable advice.",
      },
    ],
    relatedSlugs: ["move-out-cleaning-checklist-nz", "kitchen-move-out-cleaning-checklist", "bathroom-move-out-cleaning-checklist"],
  }),
  cleaningGuide({
    slug: "moving-house-cleaning-timeline",
    title: "Moving House Checklist With a Cleaning Timeline",
    shortTitle: "Moving and cleaning timeline",
    description:
      "Coordinate decluttering, cleaner quotes, packing, furniture removal, specialist work, final cleaning, and handover on one timeline.",
    readTime: "9 min read",
    intro:
      "Cleaning becomes much easier when it is scheduled alongside the move instead of added after every other booking is fixed. Work backwards from the handover deadline, protect the empty-property window, and give each provider updates when timing changes.",
    sections: [
      {
        type: "table",
        heading: "A flexible planning timeline",
        columns: ["Stage", "Cleaning actions", "Moving connection"],
        rows: [
          ["When the move is confirmed", "Review property requirements and list the likely scope", "Record pickup access, destination access, and handover deadlines"],
          ["Before final packing", "Request quotes, choose DIY tasks, and book any specialist work", "Share realistic furniture-clearance timing"],
          ["During packing", "Declutter and clean little-used storage or spare rooms", "Label items that stay and keep cleaning gear separate"],
          ["Final days", "Finish oven or other unused areas and confirm cleaner access", "Reconfirm movers, keys, lifts, parking, and contacts"],
          ["Moving day", "Release empty zones and protect cleaning paths", "Update the cleaner if loading runs early or late"],
          ["After furniture leaves", "Complete details, bathrooms, kitchen, floors, and inspection", "Remove final waste and follow key handover instructions"],
        ],
      },
      {
        type: "steps",
        heading: "Four decisions that protect the schedule",
        items: [
          { title: "Choose the cleaning property", copy: "State clearly whether the quote is for the home you are leaving, the destination, or two separate jobs." },
          { title: "Fix the handover deadline", copy: "Work backwards from keys, settlement, building access, travel, or the next occupant's agreed arrival." },
          { title: "Add buffers", copy: "Allow for truck delays, key issues, drying, a final walkthrough, and any agreed touch-up process." },
          { title: "Keep one live contact plan", copy: "Make sure movers, cleaners, building contacts, and the person approving changes have current contact details." },
        ],
      },
      {
        type: "list",
        heading: "Final confirmation message for a cleaner",
        items: [
          "Property address and safe access instructions.",
          "Expected furniture-clear time and latest completion time.",
          "Confirmed rooms, optional services, exclusions, and any change since quoting.",
          "Parking, stairs, lift, gate, alarm, power, water, and key arrangements.",
          "Hazards, pets, other people onsite, and the nominated decision-maker.",
          "Walkthrough, lock-up, invoice, and follow-up expectations.",
        ],
      },
      {
        type: "callout",
        heading: "Update the schedule when the facts change",
        copy:
          "A timeline is useful because it makes dependencies visible, not because every minute must remain fixed. Tell the cleaner promptly if the property will not be empty, access changes, or the moving truck is delayed.",
      },
    ],
    relatedSlugs: ["clean-before-or-after-movers", "prepare-home-for-professional-cleaning", "end-of-tenancy-cleaning-nz-guide"],
  }),
];
