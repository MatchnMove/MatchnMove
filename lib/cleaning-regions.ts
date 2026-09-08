import type { NzServiceArea } from "@/lib/nz-regions";

export type CleaningRegionContent = {
  metaFocus: string;
  planningNote: string;
  accessNote: string;
  propertyNote: string;
  tips: readonly string[];
  questions: readonly string[];
};

export const CLEANING_REGION_CONTENT = {
  Northland: {
    metaFocus: "travel between Whangarei, the Bay of Islands, smaller towns, and rural properties",
    planningNote:
      "Northland cleaning jobs can involve meaningful travel between centres and rural or coastal addresses. Give the exact pickup location early and ask whether travel is included so a provider can judge the route before accepting the work.",
    accessNote:
      "Long or unsealed driveways, limited turning space, gates, water arrangements, and distance from the parking position can affect how equipment reaches the home. Share these details and any lock-up instructions before moving day.",
    propertyNote:
      "Coastal homes, baches, family houses, rentals, and rural properties can have very different layouts and exposure to sand, dust, damp air, or outdoor debris. Describe the actual condition instead of relying on bedroom count alone.",
    tips: [
      "Confirm the provider's travel area and the address they are quoting.",
      "Mention water supply, power, tanks, wastewater restrictions, gates, and animals where relevant.",
      "Allow a buffer if the same-day move continues a long distance south.",
    ],
    questions: [
      "Is travel to this address included in the written amount?",
      "Can the cleaning vehicle and equipment safely reach the property?",
      "Which coastal or outdoor areas are included in the scope?",
    ],
  },
  Auckland: {
    metaFocus: "apartments, motorway timing, loading zones, paid parking, and access across a large urban area",
    planningNote:
      "An Auckland clean can be delayed by cross-city travel even when the property itself is straightforward. Share the suburb, reliable access window, and the time the moving truck is expected to clear so cleaners can plan around traffic and the handover deadline.",
    accessNote:
      "Apartments and townhouses may require lift or loading-bay bookings, concierge access, paid parking, fobs, and restricted moving hours. Confirm who will meet the cleaner and whether parking or waiting costs are included.",
    propertyNote:
      "Auckland requests range from compact apartments with extensive glass to multi-level townhouses and large suburban homes. Bathrooms, fitted storage, stairs, balconies, and furniture status are often more useful than a property label alone.",
    tips: [
      "Book building access before fixing the cleaner's arrival time.",
      "Send parking and lift instructions with the final confirmation.",
      "Avoid an unrealistic clean-to-key-return window when the moving truck must cross the city first.",
    ],
    questions: [
      "Does the quote include parking, travel, and building-access time?",
      "Can the team meet the apartment's loading and lift rules?",
      "What happens if motorway or moving delays change the access time?",
    ],
  },
  Waikato: {
    metaFocus: "Hamilton homes, surrounding towns, rural access, and longer trips around the wider region",
    planningNote:
      "Waikato coverage can mean a Hamilton suburb, a nearby town, a rural address, Taupo, or the Coromandel. State the exact locality and do not assume a provider covering Hamilton automatically serves every part of the region on the same terms.",
    accessNote:
      "Rural driveways, farm gates, pets or stock, detached garages, multiple buildings, and limited equipment access should be disclosed. In central Hamilton, townhouse parking and shared driveways may be the more important constraint.",
    propertyNote:
      "The region includes apartments, student or family rentals, townhouses, rural homes, and holiday properties. Note extra bathrooms, utility areas, sheds, outdoor transitions, and any space that sits outside the main dwelling.",
    tips: [
      "Check that the written quote names the correct Waikato locality.",
      "Separate the main house from garages, sleepouts, or other buildings in the scope.",
      "Give cleaners clear directions when an address is difficult to locate from the road.",
    ],
    questions: [
      "How is travel beyond Hamilton handled?",
      "Are detached or rural-property spaces included?",
      "What access, water, power, or animal information does the team need?",
    ],
  },
  "Bay of Plenty": {
    metaFocus: "Tauranga growth corridors, coastal properties, apartments, and travel toward Rotorua or Whakatane",
    planningNote:
      "Bay of Plenty jobs may involve busy Tauranga routes, Mount Maunganui or Papamoa apartments, holiday properties, or travel farther across the region. Reconfirm timing close to moving day and identify whether the clean is tied to a fixed key handover.",
    accessNote:
      "Apartment lifts, gated developments, compact townhouse parking, beachside parking pressure, and longer drives between centres can affect arrival and equipment access. Provide building contacts and parking instructions in advance.",
    propertyNote:
      "Coastal sand, large areas of glass, balconies, indoor-outdoor living, and properties used seasonally may add work not shown by bedroom count. State whether exterior panes, decks, or garages are expected because they may be outside the core quote.",
    tips: [
      "Clarify whether the provider serves Tauranga only or the wider Bay of Plenty.",
      "Name balconies, glass, garages, and outdoor areas individually.",
      "Protect drying and inspection time if beach traffic or a long onward move could delay access.",
    ],
    questions: [
      "Which coastal and exterior-adjacent areas are included?",
      "Are travel and parking included for this locality?",
      "Can the provider work within the building or gated-access window?",
    ],
  },
  Gisborne: {
    metaFocus: "local provider availability, coastal conditions, rural routes, and firm handover planning",
    planningNote:
      "Gisborne and East Coast moves can have fewer short-notice scheduling options than a large metro area. Request cleaning quotes early, provide date flexibility where you have it, and confirm the booking again once the removal plan is firm.",
    accessNote:
      "Rural travel, long driveways, gates, dogs, limited turning areas, and directions beyond standard map pins can matter. Confirm utilities and access if a property will be vacant before or immediately after the clean.",
    propertyNote:
      "Coastal dust or sand, older homes, family properties, rentals, and rural outbuildings each need a tailored scope. Photograph condition and separate ordinary interior cleaning from exterior, garden, rubbish, or restoration work.",
    tips: [
      "Ask about service availability before committing to a narrow handover window.",
      "Supply clear directions and an onsite contact for harder-to-find addresses.",
      "Arrange specialist or exterior work separately rather than assuming it is included.",
    ],
    questions: [
      "Is the requested date and locality within the provider's normal coverage?",
      "What happens if road or moving delays affect access?",
      "Which outbuildings or outdoor spaces, if any, are in the quote?",
    ],
  },
  "Hawke's Bay": {
    metaFocus: "Napier and Hastings routes, coastal dust, varied housing, and travel to smaller centres",
    planningNote:
      "Clarify whether the property is in Napier, Hastings, Havelock North, Central Hawke's Bay, or another locality. A provider's route and availability may differ across the region, particularly for a clean locked to moving-day timing.",
    accessNote:
      "Central or hillside parking, shared drives, gates, rural approaches, and equipment carries should be described. If several trades are working after a sale or repair, sequence them before the final clean where practical.",
    propertyNote:
      "The region includes city apartments, villas, suburban family homes, newer developments, and rural properties. High ceilings, older joinery, large windows, outdoor rooms, and detached spaces need explicit agreement rather than a generic package name.",
    tips: [
      "Name the city or district, not only Hawke's Bay, when requesting a quote.",
      "Schedule dusty maintenance or repair work before the final clean.",
      "Explain high features, old finishes, and detached spaces so safe methods can be planned.",
    ],
    questions: [
      "Does this team cover the exact address on the required date?",
      "Are travel, parking, and detached areas included?",
      "Which older or delicate surfaces need a restricted cleaning method?",
    ],
  },
  Taranaki: {
    metaFocus: "New Plymouth access, regional travel, changeable weather, and rural or coastal properties",
    planningNote:
      "Taranaki cleaning plans should distinguish a New Plymouth job from travel to Stratford, Hawera, Waitara, or a rural address. Give a realistic access window and allow for the move, cleaner, and key handover to operate in changing weather.",
    accessNote:
      "Wet entrances, covered equipment access, rural gates, steep or shared drives, and distance from the vehicle can affect a moving-day clean. Keep a dry route available and state whether water or power will be disconnected.",
    propertyNote:
      "Coastal homes, villas, farm properties, town rentals, and modern subdivisions can present different dust, ventilation, joinery, and outdoor-area needs. Identify delicate finishes and any mould or moisture concern before work begins.",
    tips: [
      "Confirm travel terms outside New Plymouth.",
      "Keep a weather-protected route for equipment and final floor work.",
      "Treat recurring damp or mould concerns as property issues requiring appropriate assessment.",
    ],
    questions: [
      "Can the cleaner reach this address within the handover window?",
      "How will wet-weather access affect floors and drying?",
      "Which moisture-related concerns are ordinary cleaning and which need escalation?",
    ],
  },
  "Manawatu-Whanganui": {
    metaFocus: "Palmerston North, Whanganui, Horowhenua, regional travel, and mixed urban-rural access",
    planningNote:
      "This broad region includes several separate centres. State whether the job is in Palmerston North, Whanganui, Levin, Feilding, or farther afield, and check that the provider's advertised region matches their practical route for your date.",
    accessNote:
      "Student or central-city rentals may need tight key coordination, while rural properties can involve gates, animals, outbuildings, and long driveways. Give access facts that match the specific address rather than the wider region.",
    propertyNote:
      "Compact flats, older homes, family houses, lifestyle properties, and supplied appliances can create very different scopes. Count bathrooms, fitted storage, levels, and separate buildings as well as bedrooms.",
    tips: [
      "Use the exact centre and postcode in the cleaning request.",
      "Confirm who holds keys if tenants, property managers, movers, and cleaners have different arrival times.",
      "List outbuildings and furnished items separately from the main interior.",
    ],
    questions: [
      "Which centres and rural routes does the quoted travel cover?",
      "Who will provide and recover keys?",
      "Does the scope include supplied appliances or separate buildings?",
    ],
  },
  Wellington: {
    metaFocus: "hills, stairs, limited parking, apartments, wind exposure, and access around the wider region",
    planningNote:
      "In Wellington, a short road distance can still involve steep paths, flights of stairs, apartment rules, or limited loading space. Describe the equipment carry and reserve cleaner access separately from the moving truck where possible.",
    accessNote:
      "Confirm parking, loading zones, lift bookings, narrow streets, exterior steps, exposed paths, and whether a trolley route exists. Include Lower Hutt, Upper Hutt, Porirua, Kapiti, or Wairarapa travel details rather than assuming one city rate covers the region.",
    propertyNote:
      "Hillside houses, character flats, apartments, townhouses, and coastal homes can include high windows, old finishes, compact rooms, or ventilation challenges. Avoid unsafe exterior or high work unless the provider is equipped and has agreed to it.",
    tips: [
      "Photograph stairs and the route from parking to the front door.",
      "Reserve lifts and loading areas for both movers and cleaners without overlap.",
      "Allow drying and final inspection time in cool or windy conditions.",
    ],
    questions: [
      "Is the equipment carry reflected in the quote?",
      "Can the team comply with building and parking rules?",
      "Which high, exterior, or weather-exposed areas are safely included?",
    ],
  },
  Tasman: {
    metaFocus: "Richmond and Motueka access, rural and coastal travel, holiday properties, and service-area clarity",
    planningNote:
      "Tasman jobs can range from Richmond subdivisions to Motueka, Golden Bay, or remote rural and coastal addresses. Confirm the provider's actual route and travel terms early, especially when the clean must follow a long moving day.",
    accessNote:
      "Long driveways, private roads, gates, limited mobile coverage, water arrangements, and distance from parking can matter. Provide written directions and a backup access contact if the property is hard to find.",
    propertyNote:
      "Holiday homes, rural properties, new builds, family houses, and indoor-outdoor living may involve sand, dust, insects, extensive glass, decks, or storage. Separate interior cleaning from exterior and post-construction work.",
    tips: [
      "Confirm coverage beyond Richmond and Motueka before relying on the date.",
      "Give precise directions and utility information for remote properties.",
      "Identify whether the home has been vacant and whether pest or specialist work is needed.",
    ],
    questions: [
      "What travel area and costs does the quote assume?",
      "Will power, water, keys, and a contact be available?",
      "Are decks, glass, or post-building residue outside the standard scope?",
    ],
  },
  Nelson: {
    metaFocus: "central parking, hillside access, compact urban routes, coastal homes, and coordination with Tasman travel",
    planningNote:
      "Nelson City jobs may be close together but still involve central parking, hillside streets, apartment access, or steep paths. State whether the move continues into Tasman or Marlborough so the cleaning window is not based on an unrealistic return time.",
    accessNote:
      "Describe steps, sloping drives, parking restrictions, shared entries, and the carry from vehicle to property. Keep the cleaner's vehicle space available after the moving truck leaves where possible.",
    propertyNote:
      "Apartments, villas, coastal houses, and hillside homes can feature large windows, decks, older finishes, or strong indoor-outdoor use. Clarify which glass, tracks, decks, and exterior-adjacent areas are included.",
    tips: [
      "Reserve a cleaner parking space rather than assuming the moving truck's space remains free.",
      "Share stair and hillside-access photographs.",
      "Keep exterior windows and decks as explicit quote items.",
    ],
    questions: [
      "How will central or hillside access affect the work?",
      "Does the quote include parking and equipment carry time?",
      "Which window and outdoor surfaces are included?",
    ],
  },
  Marlborough: {
    metaFocus: "Blenheim and Picton scheduling, ferry-linked moves, rural properties, and access around the Sounds",
    planningNote:
      "A Marlborough cleaning booking may need to fit a ferry, long-distance removal, or travel beyond Blenheim. Protect the clean from transport delays and confirm whether the provider can reach Picton, rural districts, or Sounds access points on the required day.",
    accessNote:
      "Rural gates, long driveways, limited turning space, holiday-property keys, and remote directions should be settled in advance. For ferry-linked moves, nominate a local person who can still give access if the customer must depart.",
    propertyNote:
      "Town homes, vineyard or rural properties, baches, and coastal houses may include extra buildings, outdoor transitions, glass, dust, or properties left vacant. Describe each occupied structure and distinguish routine cleaning from pest, exterior, or restoration work.",
    tips: [
      "Do not make cleaner access depend on you catching or leaving a ferry.",
      "Arrange a local key and lock-up contact when travel timing is uncertain.",
      "List every building or holiday-property area included in the clean.",
    ],
    questions: [
      "Can the provider serve this locality without relying on ferry timing?",
      "Who can provide access if the moving party has departed?",
      "Are rural travel and additional buildings included?",
    ],
  },
  "West Coast": {
    metaFocus: "long travel between towns, wet-weather access, drying, remote properties, and provider availability",
    planningNote:
      "West Coast towns can be separated by long road journeys, so early confirmation matters. Give the exact address, preferred date, flexibility, and handover time rather than requesting a generic region-wide booking at short notice.",
    accessNote:
      "Wet footwear and equipment routes, covered entry, ventilation, rural directions, gates, and utilities at vacant properties can affect the final clean. Keep a dry exit path and allow extra time for surfaces to dry before lock-up.",
    propertyNote:
      "Older homes, rentals, rural houses, and coastal properties may have recurring damp, mould, or building-condition issues that ordinary cleaning cannot resolve. Disclose them and seek appropriate property or specialist advice when needed.",
    tips: [
      "Check availability and travel terms well before the moving date.",
      "Plan ventilation and drying rather than scheduling key return immediately after wet work.",
      "Separate surface cleaning from recurring moisture or building concerns.",
    ],
    questions: [
      "Is travel to this town included and practical on the chosen date?",
      "How much drying time should the handover plan allow?",
      "Are any damp or mould areas outside ordinary cleaning scope?",
    ],
  },
  Canterbury: {
    metaFocus: "Christchurch access, apartment and townhouse growth, regional routes, dust, and post-repair boundaries",
    planningNote:
      "Canterbury requests may be within Christchurch or involve Rangiora, Ashburton, Timaru, Kaikoura, or a rural route. Name the actual locality and coordinate the cleaner with the truck's expected clearance rather than the nominal moving start time.",
    accessNote:
      "Central apartments can require lift and loading arrangements, while suburban and rural properties may involve shared drives, new-development parking, gates, or detached garages. State whether trades or repair work will finish before the clean.",
    propertyNote:
      "Apartments, townhouses, family homes, older houses, and rural properties can differ in storage density, dust, heating systems, glazing, and outbuildings. Building dust or repair residue may require a different scope from an ordinary move-out clean.",
    tips: [
      "Confirm travel terms outside Christchurch.",
      "Schedule sanding, drilling, repairs, and other dust-producing work before the final clean.",
      "Name garages, workshops, balconies, and supplied appliances separately.",
    ],
    questions: [
      "Does the team cover this Canterbury locality on the required day?",
      "Will any building or repair work still be underway?",
      "Which detached, outdoor, or specialist areas are included?",
    ],
  },
  Otago: {
    metaFocus: "Dunedin hills, student and character properties, Central Otago travel, winter access, and Queenstown apartments",
    planningNote:
      "Otago covers very different markets, from Dunedin flats and hillside homes to Queenstown apartments and long Central Otago routes. Give the specific city or district and ask the provider to confirm travel, parking, and date availability.",
    accessNote:
      "Dunedin stairs and steep paths, Queenstown building access and parking, rural drives, and winter road or surface conditions can all affect equipment access. Keep paths safe and state whether heating, power, water, and ventilation will remain available.",
    propertyNote:
      "Older student properties, character homes, modern apartments, holiday homes, and rural properties need different care. Note delicate finishes, furnished rooms, large glass areas, fireplaces, moisture concerns, and any specialist task explicitly.",
    tips: [
      "Use locality-specific quotes rather than treating Otago as one short travel zone.",
      "Photograph stairs, paths, and apartment access before booking.",
      "Protect winter drying and ventilation time before the property is locked.",
    ],
    questions: [
      "Are travel and parking included for this Otago locality?",
      "Can the team access the property safely in the expected conditions?",
      "Which furnished, high-glass, fireplace, or specialist areas are covered?",
    ],
  },
  Southland: {
    metaFocus: "Invercargill homes, rural travel, Fiordland routes, weather, drying, and reliable vacant-property access",
    planningNote:
      "Southland cleaning providers may serve Invercargill and selected surrounding routes rather than every distant locality. Confirm coverage for Gore, Te Anau, Fiordland, rural addresses, or an onward Otago move before fixing a handover plan.",
    accessNote:
      "Wet-weather entry, long drives, farm gates, animals, heating, ventilation, and utilities at a vacant home deserve early attention. Arrange a local access contact when the moving party will already be travelling.",
    propertyNote:
      "Family homes, rural properties, older houses, rentals, and holiday accommodation can include mud, moisture, fireplaces, utility areas, garages, or outbuildings. Distinguish ordinary interior cleaning from chimneys, pests, mould remediation, and exterior work.",
    tips: [
      "Verify service coverage and travel time for the exact address.",
      "Leave safe heating or ventilation only as property instructions allow and clarify lock-up responsibility.",
      "Separate fireplaces, garages, farm residue, and outbuildings in the written scope.",
    ],
    questions: [
      "Can the provider serve this route within the required handover window?",
      "Who controls keys, utilities, heating, ventilation, and final lock-up?",
      "Which rural or weather-related tasks require a specialist or separate quote?",
    ],
  },
} as const satisfies Record<NzServiceArea, CleaningRegionContent>;
