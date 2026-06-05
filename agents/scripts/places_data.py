"""
Static place data for all 15 FIFA 2026 host cities.

Each dict conforms to the hodari.places collection schema:
  place_id, name, city, country, location (GeoJSON Point), categories,
  price_level (1–4), description, ratings, stadium_proximity_km

Coordinates are realistic approximations near each host stadium.
"""

PLACES: list[dict] = [
    # ──────────────────────────────────────────────────────────
    # New York / New Jersey  —  MetLife Stadium, East Rutherford
    # ──────────────────────────────────────────────────────────
    {
        "place_id": "ChIJ_hodari_nyc_1",
        "name": "Keens Steakhouse",
        "city": "New York",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-73.9853, 40.7484]},
        "categories": ["restaurant", "steakhouse", "historic"],
        "price_level": 4,
        "description": (
            "One of Manhattan's oldest and most storied steakhouses, Keens has been serving "
            "massive mutton chops and prime beef since 1885. The walls are lined with thousands "
            "of churchwarden pipes, making it a singular pre-match dining experience that FIFA "
            "visitors won't find anywhere else in the world."
        ),
        "ratings": {"score": 4.7, "count": 6800},
        "stadium_proximity_km": 18.5,
    },
    {
        "place_id": "ChIJ_hodari_nyc_2",
        "name": "Xi'an Famous Foods",
        "city": "New York",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-73.9980, 40.7158]},
        "categories": ["restaurant", "chinese", "noodles", "budget-friendly"],
        "price_level": 1,
        "description": (
            "Xi'an Famous Foods serves hand-ripped biang biang noodles and cumin-spiced lamb "
            "burgers rooted in the bold flavours of China's Shaanxi province. Multiple Manhattan "
            "locations make it easy to grab a filling, affordable meal between sightseeing stops "
            "before heading to MetLife."
        ),
        "ratings": {"score": 4.5, "count": 9200},
        "stadium_proximity_km": 19.2,
    },
    {
        "place_id": "ChIJ_hodari_nyc_3",
        "name": "The High Line",
        "city": "New York",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-74.0048, 40.7480]},
        "categories": ["park", "attraction", "outdoor", "walking"],
        "price_level": 1,
        "description": (
            "An elevated linear park built on a former freight rail line, the High Line offers "
            "stunning Hudson River views, public art installations, and lush gardens across 1.45 miles "
            "of West Manhattan. It's a perfect leisurely walk before catching a bus or train to "
            "MetLife Stadium for a World Cup match."
        ),
        "ratings": {"score": 4.7, "count": 42000},
        "stadium_proximity_km": 17.8,
    },
    {
        "place_id": "ChIJ_hodari_nyc_4",
        "name": "Taïm Falafel",
        "city": "New York",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-73.9996, 40.7326]},
        "categories": ["restaurant", "falafel", "vegetarian", "vegan", "halal"],
        "price_level": 1,
        "description": (
            "Taïm is a beloved New York falafel shop crafting vibrant, herbaceous green falafel "
            "wraps, sabich sandwiches, and fresh mezze platters. Everything on the menu is "
            "vegetarian and many options are vegan, making it ideal for plant-based fans exploring "
            "the city before a match."
        ),
        "ratings": {"score": 4.6, "count": 5100},
        "stadium_proximity_km": 18.0,
    },
    {
        "place_id": "ChIJ_hodari_nyc_5",
        "name": "Brooklyn Fan Zone — Prospect Park",
        "city": "New York",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-73.9690, 40.6602]},
        "categories": ["fan zone", "outdoor", "sports bar", "watch party"],
        "price_level": 2,
        "description": (
            "FIFA's official Brooklyn fan zone at Prospect Park sets up giant screens, food vendors, "
            "and live entertainment for supporters of all nations. The park's sweeping lawns create "
            "a festival atmosphere perfect for gathering with fellow fans from around the globe "
            "before or after matches at MetLife."
        ),
        "ratings": {"score": 4.4, "count": 2300},
        "stadium_proximity_km": 22.0,
    },
    {
        "place_id": "ChIJ_hodari_nyc_6",
        "name": "The Metropolitan Museum of Art",
        "city": "New York",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-73.9632, 40.7794]},
        "categories": ["museum", "cultural", "art", "attraction"],
        "price_level": 2,
        "description": (
            "The Met is one of the world's greatest art museums, housing over two million works "
            "spanning 5,000 years of human creativity across two Manhattan locations. A few hours "
            "here before a World Cup evening kick-off offers a perfect cultural counterpoint to "
            "the football fever sweeping the city."
        ),
        "ratings": {"score": 4.8, "count": 85000},
        "stadium_proximity_km": 19.5,
    },
    {
        "place_id": "ChIJ_hodari_nyc_7",
        "name": "Kalustyan's Specialty Foods",
        "city": "New York",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-73.9832, 40.7468]},
        "categories": ["market", "halal", "spices", "international"],
        "price_level": 2,
        "description": (
            "Kalustyan's is a legendary Murray Hill spice emporium carrying thousands of hard-to-find "
            "ingredients, halal snacks, and international delicacies from across the Middle East, "
            "South Asia, and beyond. Travelers missing flavours from home will find something "
            "familiar tucked on its labyrinthine shelves."
        ),
        "ratings": {"score": 4.6, "count": 4700},
        "stadium_proximity_km": 18.4,
    },

    # ──────────────────────────────────────────────────────────
    # Los Angeles  —  SoFi Stadium, Inglewood
    # ──────────────────────────────────────────────────────────
    {
        "place_id": "ChIJ_hodari_lax_1",
        "name": "Grand Central Market",
        "city": "Los Angeles",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-118.2489, 34.0506]},
        "categories": ["market", "food hall", "diverse cuisine", "vegetarian-friendly"],
        "price_level": 2,
        "description": (
            "Grand Central Market is a century-old downtown food hall buzzing with some of LA's "
            "best vendors — from pupusas and ramen to organic açaí bowls and artisan coffee. "
            "The bustling atmosphere and diverse stalls make it a microcosm of LA's legendary "
            "food scene, ideal for a pre-match lunch."
        ),
        "ratings": {"score": 4.5, "count": 18000},
        "stadium_proximity_km": 20.1,
    },
    {
        "place_id": "ChIJ_hodari_lax_2",
        "name": "Guisados Tacos",
        "city": "Los Angeles",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-118.2232, 34.0496]},
        "categories": ["restaurant", "tacos", "mexican", "budget-friendly"],
        "price_level": 1,
        "description": (
            "Guisados specialises in braised-meat tacos — tinga de pollo, short rib, and chicharrón "
            "in salsa verde — piled into handmade corn tortillas. Just minutes from downtown, it "
            "packs enormous flavour at bargain prices and is an unmissable taste of authentic "
            "LA street food culture."
        ),
        "ratings": {"score": 4.7, "count": 11000},
        "stadium_proximity_km": 19.8,
    },
    {
        "place_id": "ChIJ_hodari_lax_3",
        "name": "The Getty Center",
        "city": "Los Angeles",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-118.4741, 34.0780]},
        "categories": ["museum", "art", "cultural", "attraction"],
        "price_level": 1,
        "description": (
            "Perched above the Santa Monica Mountains, the Getty Center offers world-class art "
            "collections alongside spectacular panoramic views of LA and the Pacific. Admission "
            "is free (parking fee only), making it one of the most impressive free cultural "
            "experiences any World Cup visitor can have in the city."
        ),
        "ratings": {"score": 4.8, "count": 55000},
        "stadium_proximity_km": 16.0,
    },
    {
        "place_id": "ChIJ_hodari_lax_4",
        "name": "Zinqué — Venice Beach",
        "city": "Los Angeles",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-118.4730, 33.9856]},
        "categories": ["restaurant", "french", "vegetarian-friendly", "brunch"],
        "price_level": 3,
        "description": (
            "Zinqué brings Parisian zinc-bar energy to the Venice Beach boardwalk, serving "
            "croque madame, tartines, and chilled rosé with an ocean breeze. The relaxed "
            "all-day menu has strong vegetarian options, and the beachside setting is a perfect "
            "afternoon escape before an evening SoFi kick-off."
        ),
        "ratings": {"score": 4.4, "count": 4200},
        "stadium_proximity_km": 14.5,
    },
    {
        "place_id": "ChIJ_hodari_lax_5",
        "name": "SoFi Fan Zone — Hollywood Park",
        "city": "Los Angeles",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-118.3380, 33.9530]},
        "categories": ["fan zone", "outdoor", "sports", "entertainment"],
        "price_level": 2,
        "description": (
            "The FIFA Fan Zone at Hollywood Park sits steps from SoFi Stadium, offering giant "
            "screens, live music, and food trucks curated from LA's wildly diverse culinary scene. "
            "It's the perfect gathering spot for international supporters to mingle and soak up "
            "World Cup atmosphere before kick-off."
        ),
        "ratings": {"score": 4.5, "count": 3100},
        "stadium_proximity_km": 0.8,
    },
    {
        "place_id": "ChIJ_hodari_lax_6",
        "name": "Alhambra Palace — Halal Grill",
        "city": "Los Angeles",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-118.1270, 34.0958]},
        "categories": ["restaurant", "halal", "middle-eastern", "grilled meats"],
        "price_level": 2,
        "description": (
            "This Alhambra institution grills outstanding halal lamb chops, shawarma platters, "
            "and mixed mezze, drawing loyal crowds from across the San Gabriel Valley. "
            "A filling and welcoming spot for fans who need a certified halal meal the day "
            "of or after a World Cup match."
        ),
        "ratings": {"score": 4.5, "count": 3700},
        "stadium_proximity_km": 24.5,
    },
    {
        "place_id": "ChIJ_hodari_lax_7",
        "name": "Griffith Observatory",
        "city": "Los Angeles",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-118.3004, 34.1184]},
        "categories": ["attraction", "landmark", "scenic", "outdoor"],
        "price_level": 1,
        "description": (
            "Griffith Observatory crowns the Santa Monica Mountains with the city's most iconic "
            "views — Hollywood Sign, downtown skyline, and the Pacific on clear days. Free "
            "entry to the grounds and telescope shows make it an unmissable half-morning activity "
            "for any World Cup visitor with time to spare."
        ),
        "ratings": {"score": 4.8, "count": 62000},
        "stadium_proximity_km": 22.0,
    },

    # ──────────────────────────────────────────────────────────
    # Dallas  —  AT&T Stadium, Arlington
    # ──────────────────────────────────────────────────────────
    {
        "place_id": "ChIJ_hodari_dal_1",
        "name": "Pecan Lodge BBQ",
        "city": "Dallas",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-96.7836, 32.7840]},
        "categories": ["restaurant", "bbq", "texas", "carnivore"],
        "price_level": 2,
        "description": (
            "Pecan Lodge is a Deep Ellum institution serving brisket so good that lines snake "
            "around the block every weekend. The slow-smoked beef ribs and house-made jalapeño "
            "cheddar sausage deliver the full Texas BBQ experience that World Cup visitors "
            "simply can't miss while in the Dallas–Fort Worth area."
        ),
        "ratings": {"score": 4.7, "count": 14500},
        "stadium_proximity_km": 28.0,
    },
    {
        "place_id": "ChIJ_hodari_dal_2",
        "name": "Kalachandji's Restaurant",
        "city": "Dallas",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-96.7617, 32.8077]},
        "categories": ["restaurant", "vegetarian", "vegan", "indian", "buffet"],
        "price_level": 1,
        "description": (
            "Kalachandji's is a beloved Dallas vegetarian buffet set in a Hare Krishna temple "
            "garden, offering freshly prepared Indian and international dishes at remarkably "
            "low prices. The serene courtyard setting and 100 per cent plant-based menu make "
            "it a standout option for vegetarian and vegan fans."
        ),
        "ratings": {"score": 4.6, "count": 4800},
        "stadium_proximity_km": 26.5,
    },
    {
        "place_id": "ChIJ_hodari_dal_3",
        "name": "Dallas Arboretum",
        "city": "Dallas",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-96.7167, 32.8232]},
        "categories": ["garden", "outdoor", "attraction", "scenic"],
        "price_level": 2,
        "description": (
            "Spanning 66 acres on the shore of White Rock Lake, the Dallas Arboretum features "
            "immaculate seasonal gardens, canopy walks, and sweeping lake views. It's a stunning "
            "outdoor retreat for World Cup visitors who want to experience a greener, quieter "
            "side of the city before the stadium buzz."
        ),
        "ratings": {"score": 4.8, "count": 21000},
        "stadium_proximity_km": 29.0,
    },
    {
        "place_id": "ChIJ_hodari_dal_4",
        "name": "Al-Hedaya Halal Market & Café",
        "city": "Dallas",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-96.8210, 32.9182]},
        "categories": ["restaurant", "halal", "middle-eastern", "café"],
        "price_level": 1,
        "description": (
            "Al-Hedaya is a friendly halal café and market in Richardson serving hearty falafel "
            "plates, lamb shawarma wraps, and freshly baked baklava. The welcoming atmosphere and "
            "certified halal kitchen make it a reliable go-to for Muslim fans visiting for a "
            "World Cup match at AT&T Stadium."
        ),
        "ratings": {"score": 4.5, "count": 2900},
        "stadium_proximity_km": 22.0,
    },
    {
        "place_id": "ChIJ_hodari_dal_5",
        "name": "AT&T Fan Zone — Arlington Entertainment District",
        "city": "Dallas",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-97.0860, 32.7532]},
        "categories": ["fan zone", "entertainment", "outdoor", "sports"],
        "price_level": 2,
        "description": (
            "The FIFA Fan Zone in Arlington's Entertainment District surrounds AT&T Stadium with "
            "interactive football pitches, food from Texas and international vendors, and live "
            "performances. Walking distance from the stadium, it's the hub for fan energy "
            "on match day."
        ),
        "ratings": {"score": 4.4, "count": 1800},
        "stadium_proximity_km": 1.2,
    },
    {
        "place_id": "ChIJ_hodari_dal_6",
        "name": "Sixth Floor Museum at Dealey Plaza",
        "city": "Dallas",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-96.8082, 32.7797]},
        "categories": ["museum", "history", "cultural", "attraction"],
        "price_level": 2,
        "description": (
            "The Sixth Floor Museum tells the story of President Kennedy's assassination with "
            "remarkable primary sources, original photographs, and the preserved sniper's-nest "
            "vantage point. A sobering and essential slice of American history that international "
            "visitors consistently rank among Dallas's unmissable attractions."
        ),
        "ratings": {"score": 4.7, "count": 18000},
        "stadium_proximity_km": 29.5,
    },

    # ──────────────────────────────────────────────────────────
    # San Francisco Bay Area  —  Levi's Stadium, Santa Clara
    # ──────────────────────────────────────────────────────────
    {
        "place_id": "ChIJ_hodari_sfo_1",
        "name": "Tartine Manufactory",
        "city": "San Francisco",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-122.4149, 37.7649]},
        "categories": ["bakery", "café", "brunch", "vegetarian-friendly"],
        "price_level": 3,
        "description": (
            "Tartine Manufactory is the flagship of one of America's most influential bakeries, "
            "turning out perfectly blistered country loaves, flaky pastries, and creative "
            "all-day plates in a sprawling Mission District space. The morning bread queue is "
            "a San Francisco ritual worth experiencing before heading south to Levi's."
        ),
        "ratings": {"score": 4.6, "count": 12000},
        "stadium_proximity_km": 72.0,
    },
    {
        "place_id": "ChIJ_hodari_sfo_2",
        "name": "Oren's Hummus — Palo Alto",
        "city": "San Francisco",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-122.1604, 37.4458]},
        "categories": ["restaurant", "israeli", "vegetarian", "halal-friendly", "hummus"],
        "price_level": 2,
        "description": (
            "Oren's Hummus brings Israeli street-food culture to Silicon Valley, with silky "
            "fresh-ground hummus topped with whole chickpeas, sautéed mushrooms, or spiced "
            "lamb, alongside piping hot pitas. Close to Levi's Stadium, it's a fantastic "
            "choice for fans wanting a light, flavourful pre-match meal."
        ),
        "ratings": {"score": 4.6, "count": 5600},
        "stadium_proximity_km": 14.0,
    },
    {
        "place_id": "ChIJ_hodari_sfo_3",
        "name": "Ferry Building Marketplace",
        "city": "San Francisco",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-122.3940, 37.7955]},
        "categories": ["market", "food hall", "local produce", "seafood"],
        "price_level": 3,
        "description": (
            "The Ferry Building Marketplace on the Embarcadero is a showcase for Northern "
            "California's world-class food producers — artisan cheeses, oysters, sourdough, "
            "and local wines with the Bay Bridge as backdrop. The Saturday farmers' market "
            "draws locals and tourists alike for a truly Californian culinary morning."
        ),
        "ratings": {"score": 4.7, "count": 29000},
        "stadium_proximity_km": 74.0,
    },
    {
        "place_id": "ChIJ_hodari_sfo_4",
        "name": "Golden Gate Park",
        "city": "San Francisco",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-122.4862, 37.7694]},
        "categories": ["park", "outdoor", "attraction", "cycling"],
        "price_level": 1,
        "description": (
            "Golden Gate Park stretches three miles through San Francisco, encompassing botanical "
            "gardens, the de Young museum, a Japanese tea garden, and emerald meadows popular "
            "with cyclists and joggers. It's a must-see green lung of the city and a relaxing "
            "morning activity before the drive down to Levi's Stadium."
        ),
        "ratings": {"score": 4.8, "count": 80000},
        "stadium_proximity_km": 68.0,
    },
    {
        "place_id": "ChIJ_hodari_sfo_5",
        "name": "Levi's Fan Tailgate — Great America Parking",
        "city": "San Francisco",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-121.9750, 37.4150]},
        "categories": ["fan zone", "tailgate", "outdoor", "sports"],
        "price_level": 2,
        "description": (
            "The official FIFA tailgate outside Levi's Stadium transforms the stadium parking "
            "complex into a festival with food trucks, live music, and street-football pitches. "
            "Gates open three hours before kick-off, making it the place to be for international "
            "fans soaking up the Bay Area match-day atmosphere."
        ),
        "ratings": {"score": 4.3, "count": 1500},
        "stadium_proximity_km": 0.5,
    },
    {
        "place_id": "ChIJ_hodari_sfo_6",
        "name": "Rangoon Ruby Burmese Cuisine",
        "city": "San Francisco",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-122.1524, 37.4456]},
        "categories": ["restaurant", "burmese", "asian", "vegetarian-friendly"],
        "price_level": 2,
        "description": (
            "Rangoon Ruby near Stanford serves flavourful Burmese tea-leaf salads, mohinga "
            "noodle soup, and crispy samosas that showcase one of Asia's most underrated "
            "cuisines. The warm, lively atmosphere and generous vegetarian options make it "
            "a great dinner pick after a day exploring the Peninsula."
        ),
        "ratings": {"score": 4.5, "count": 4100},
        "stadium_proximity_km": 13.5,
    },

    # ──────────────────────────────────────────────────────────
    # Seattle  —  Lumen Field
    # ──────────────────────────────────────────────────────────
    {
        "place_id": "ChIJ_hodari_sea_1",
        "name": "Pike Place Market",
        "city": "Seattle",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-122.3426, 47.6097]},
        "categories": ["market", "seafood", "attraction", "local produce"],
        "price_level": 2,
        "description": (
            "Pike Place Market is Seattle's most iconic landmark — a labyrinthine waterfront "
            "market famous for fish-throwing fishmongers, fresh Dungeness crab, artisan cheeses, "
            "and the original Starbucks. It's an essential morning destination for World Cup "
            "visitors, just a mile from Lumen Field."
        ),
        "ratings": {"score": 4.7, "count": 95000},
        "stadium_proximity_km": 1.8,
    },
    {
        "place_id": "ChIJ_hodari_sea_2",
        "name": "Pho Bac Súp Shop",
        "city": "Seattle",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-122.3177, 47.5987]},
        "categories": ["restaurant", "vietnamese", "pho", "budget-friendly"],
        "price_level": 1,
        "description": (
            "Pho Bac Súp Shop in the International District serves Seattle's most celebrated "
            "pho — deep, fragrant broths simmered for hours, piled with silky rice noodles "
            "and your choice of proteins. An inexpensive and restorative meal minutes from "
            "Lumen Field, perfect before a big match."
        ),
        "ratings": {"score": 4.6, "count": 7200},
        "stadium_proximity_km": 1.5,
    },
    {
        "place_id": "ChIJ_hodari_sea_3",
        "name": "Lumen Fan Zone — SODO District",
        "city": "Seattle",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-122.3316, 47.5952]},
        "categories": ["fan zone", "outdoor", "entertainment", "sports"],
        "price_level": 2,
        "description": (
            "The FIFA Fan Zone wraps around Lumen Field's SODO plaza, with Pacific Northwest "
            "craft beer, salmon tacos, and live entertainment celebrating Seattle's global "
            "community. The Puget Sound backdrop and the roar of fans from 50 nations make "
            "this one of the World Cup's most atmospheric gathering places."
        ),
        "ratings": {"score": 4.5, "count": 2200},
        "stadium_proximity_km": 0.2,
    },
    {
        "place_id": "ChIJ_hodari_sea_4",
        "name": "Space Needle",
        "city": "Seattle",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-122.3493, 47.6205]},
        "categories": ["attraction", "landmark", "scenic", "observation deck"],
        "price_level": 3,
        "description": (
            "The Space Needle's glass floor observation deck delivers 360-degree views of the "
            "Olympic Mountains, Mount Rainier, Puget Sound, and Seattle's skyline. Built for "
            "the 1962 World's Fair, it remains the city's defining symbol and a must-visit for "
            "any international traveller."
        ),
        "ratings": {"score": 4.6, "count": 40000},
        "stadium_proximity_km": 3.5,
    },
    {
        "place_id": "ChIJ_hodari_sea_5",
        "name": "Mamnoon Street",
        "city": "Seattle",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-122.3219, 47.6137]},
        "categories": ["restaurant", "middle-eastern", "halal", "vegetarian-friendly"],
        "price_level": 2,
        "description": (
            "Mamnoon Street is a fast-casual outpost of Seattle's acclaimed Syrian-Lebanese "
            "restaurant, serving beautifully seasoned halal wraps, mezze, and flatbreads in "
            "a lively Capitol Hill setting. The menu is built for sharing and has strong "
            "vegetarian and halal options across the board."
        ),
        "ratings": {"score": 4.6, "count": 3800},
        "stadium_proximity_km": 3.2,
    },
    {
        "place_id": "ChIJ_hodari_sea_6",
        "name": "Chihuly Garden and Glass",
        "city": "Seattle",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-122.3510, 47.6207]},
        "categories": ["museum", "art", "cultural", "indoor"],
        "price_level": 3,
        "description": (
            "Adjacent to the Space Needle, Chihuly Garden and Glass showcases Dale Chihuly's "
            "spectacular large-scale glass sculptures in a series of ethereal indoor galleries "
            "and an outdoor garden. The breathtaking interplay of colour and light makes it "
            "one of America's most visually arresting cultural spaces."
        ),
        "ratings": {"score": 4.8, "count": 22000},
        "stadium_proximity_km": 3.6,
    },

    # ──────────────────────────────────────────────────────────
    # Kansas City  —  Arrowhead Stadium
    # ──────────────────────────────────────────────────────────
    {
        "place_id": "ChIJ_hodari_kci_1",
        "name": "Joe's Kansas City Bar-B-Que",
        "city": "Kansas City",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-94.6150, 39.0284]},
        "categories": ["restaurant", "bbq", "smoky", "carnivore"],
        "price_level": 2,
        "description": (
            "Joe's Kansas City is routinely ranked among the best barbecue restaurants in "
            "the United States, famous for the Z-Man sandwich — sliced brisket, smoked "
            "provolone, and onion rings on a kaiser roll. The gas-station setting is part "
            "of the legend; the smoky, bark-crusted ribs are the payoff."
        ),
        "ratings": {"score": 4.8, "count": 19500},
        "stadium_proximity_km": 14.0,
    },
    {
        "place_id": "ChIJ_hodari_kci_2",
        "name": "Crossroads Arts District Fan Zone",
        "city": "Kansas City",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-94.5804, 39.0893]},
        "categories": ["fan zone", "arts", "outdoor", "entertainment"],
        "price_level": 2,
        "description": (
            "Kansas City's Crossroads Arts District transforms into a vibrant FIFA hub during "
            "the World Cup, with murals, pop-up bars, and local food trucks celebrating the "
            "city's jazz heritage and barbecue culture. Street performers and live bands fill "
            "the brick-paved blocks with a uniquely Midwest match-day energy."
        ),
        "ratings": {"score": 4.4, "count": 1600},
        "stadium_proximity_km": 10.0,
    },
    {
        "place_id": "ChIJ_hodari_kci_3",
        "name": "The Nelson-Atkins Museum of Art",
        "city": "Kansas City",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-94.5768, 39.0455]},
        "categories": ["museum", "art", "cultural", "free"],
        "price_level": 1,
        "description": (
            "Free to enter, the Nelson-Atkins houses a world-class collection of Asian, "
            "European, and American art alongside Claes Oldenburg's giant shuttlecocks on "
            "its iconic lawn. It's a surprising cultural gem in the heartland and a perfect "
            "afternoon destination for World Cup visitors between matches."
        ),
        "ratings": {"score": 4.8, "count": 14000},
        "stadium_proximity_km": 13.0,
    },
    {
        "place_id": "ChIJ_hodari_kci_4",
        "name": "Ça Va French Brasserie",
        "city": "Kansas City",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-94.5852, 39.1012]},
        "categories": ["restaurant", "french", "upscale", "vegetarian-friendly"],
        "price_level": 3,
        "description": (
            "Ça Va brings Parisian brasserie classics to downtown Kansas City — steak frites, "
            "moules marinières, and a thoroughly considered wine list in a gorgeous art deco "
            "room. An elegant pre-match dinner option for fans who want a refined evening "
            "before heading to Arrowhead."
        ),
        "ratings": {"score": 4.5, "count": 3200},
        "stadium_proximity_km": 10.5,
    },
    {
        "place_id": "ChIJ_hodari_kci_5",
        "name": "Jasper's Italian Restaurant",
        "city": "Kansas City",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-94.5617, 39.0211]},
        "categories": ["restaurant", "italian", "upscale", "pasta"],
        "price_level": 4,
        "description": (
            "A Kansas City institution since 1954, Jasper's serves refined Italian-American "
            "classics — handmade pastas, veal piccata, and tiramisu — in an old-world dining "
            "room beloved by locals and visiting dignitaries alike. The warm service makes "
            "every guest feel like a VIP before the World Cup big game."
        ),
        "ratings": {"score": 4.7, "count": 5800},
        "stadium_proximity_km": 12.5,
    },
    {
        "place_id": "ChIJ_hodari_kci_6",
        "name": "City Market",
        "city": "Kansas City",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-94.5836, 39.1117]},
        "categories": ["market", "diverse cuisine", "local", "breakfast"],
        "price_level": 1,
        "description": (
            "Kansas City's historic City Market is the Midwest's largest open-air market, "
            "with weekend stalls selling fresh produce, international street food, and local "
            "crafts in the River Market neighbourhood. Grab a tamale, a döner wrap, or a "
            "fresh-squeezed juice for a cheap and cheerful World Cup morning."
        ),
        "ratings": {"score": 4.4, "count": 8500},
        "stadium_proximity_km": 11.0,
    },

    # ──────────────────────────────────────────────────────────
    # Boston  —  Gillette Stadium, Foxborough
    # ──────────────────────────────────────────────────────────
    {
        "place_id": "ChIJ_hodari_bos_1",
        "name": "Neptune Oyster",
        "city": "Boston",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-71.0553, 42.3636]},
        "categories": ["restaurant", "seafood", "oysters", "upscale"],
        "price_level": 3,
        "description": (
            "Neptune Oyster is a tiny, perpetually packed North End gem serving the finest "
            "East Coast shellfish alongside a legendary lobster roll — cold with mayo or hot "
            "with drawn butter. The intimate space and exquisite raw bar make it one of Boston's "
            "most sought-after seafood experiences for visiting fans."
        ),
        "ratings": {"score": 4.7, "count": 15000},
        "stadium_proximity_km": 42.0,
    },
    {
        "place_id": "ChIJ_hodari_bos_2",
        "name": "Veggie Galaxy",
        "city": "Boston",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-71.1056, 42.3670]},
        "categories": ["restaurant", "vegan", "vegetarian", "diner", "brunch"],
        "price_level": 2,
        "description": (
            "Veggie Galaxy is a retro diner serving entirely vegan comfort food — pancakes, "
            "Reuben sandwiches, and diner burgers made without a trace of meat or dairy. "
            "In a city dominated by clam chowder and lobster, it's a welcome sanctuary for "
            "plant-based fans visiting for the World Cup."
        ),
        "ratings": {"score": 4.6, "count": 5100},
        "stadium_proximity_km": 40.5,
    },
    {
        "place_id": "ChIJ_hodari_bos_3",
        "name": "Freedom Trail",
        "city": "Boston",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-71.0570, 42.3601]},
        "categories": ["attraction", "history", "walking tour", "cultural"],
        "price_level": 1,
        "description": (
            "The Freedom Trail is a 2.5-mile red-brick walking path connecting 16 of Boston's "
            "most significant Revolutionary War sites, from the Boston Common to the USS "
            "Constitution. It's a self-guided historical adventure through the birthplace of "
            "American independence — free, fascinating, and unmissable."
        ),
        "ratings": {"score": 4.7, "count": 55000},
        "stadium_proximity_km": 43.0,
    },
    {
        "place_id": "ChIJ_hodari_bos_4",
        "name": "Halal Guys — Boston",
        "city": "Boston",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-71.0907, 42.3484]},
        "categories": ["restaurant", "halal", "middle-eastern", "budget-friendly"],
        "price_level": 1,
        "description": (
            "The legendary Halal Guys bring their New York cart-style platters to Boston — "
            "giant portions of gyro, chicken, or falafel over turmeric-tinted rice with "
            "white sauce and the fiery red sauce that built a cult following. A fast, filling, "
            "and fully halal option near the Fenway area."
        ),
        "ratings": {"score": 4.4, "count": 4300},
        "stadium_proximity_km": 41.0,
    },
    {
        "place_id": "ChIJ_hodari_bos_5",
        "name": "Gillette Fan Tailgate — Patriot Place",
        "city": "Boston",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-71.2640, 42.0906]},
        "categories": ["fan zone", "tailgate", "shopping", "entertainment"],
        "price_level": 2,
        "description": (
            "Patriot Place, the outdoor mall adjacent to Gillette Stadium, becomes the FIFA "
            "Fan Zone for World Cup matches — giant screens, New England craft brews, lobster "
            "rolls, and memorabilia stalls filling the plaza. It's a convenient and lively "
            "pre-match gathering point steps from the stadium gates."
        ),
        "ratings": {"score": 4.3, "count": 1900},
        "stadium_proximity_km": 0.4,
    },
    {
        "place_id": "ChIJ_hodari_bos_6",
        "name": "Harvard Square",
        "city": "Boston",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-71.1188, 42.3736]},
        "categories": ["neighborhood", "cultural", "bookshops", "cafés"],
        "price_level": 2,
        "description": (
            "Harvard Square is a vibrant Cambridge neighbourhood clustered around one of the "
            "world's great universities, lined with independent bookshops, jazz bars, and "
            "diverse restaurants. Street musicians, world-class architecture, and the buzz "
            "of academic life make it a delightful afternoon excursion during the World Cup."
        ),
        "ratings": {"score": 4.6, "count": 28000},
        "stadium_proximity_km": 38.5,
    },

    # ──────────────────────────────────────────────────────────
    # Philadelphia  —  Lincoln Financial Field
    # ──────────────────────────────────────────────────────────
    {
        "place_id": "ChIJ_hodari_phi_1",
        "name": "Reading Terminal Market",
        "city": "Philadelphia",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-75.1596, 39.9534]},
        "categories": ["market", "food hall", "diverse cuisine", "local"],
        "price_level": 2,
        "description": (
            "Reading Terminal Market is Philadelphia's historic indoor food market — a bustling "
            "treasure chest of Amish baked goods, fresh seafood, cheesesteaks, and international "
            "cuisines under one enormous roof since 1893. A mandatory stop for any World Cup "
            "visitor to Philly, it showcases the city's food culture perfectly."
        ),
        "ratings": {"score": 4.7, "count": 35000},
        "stadium_proximity_km": 6.5,
    },
    {
        "place_id": "ChIJ_hodari_phi_2",
        "name": "Pat's King of Steaks",
        "city": "Philadelphia",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-75.1619, 39.9307]},
        "categories": ["restaurant", "cheesesteak", "american", "iconic"],
        "price_level": 1,
        "description": (
            "Pat's King of Steaks is the original Philadelphia cheesesteak restaurant, credited "
            "with inventing the iconic sandwich in 1930. The outdoor counter-service window "
            "operates 24/7, and the ritual of ordering ('wit' or 'witout' onions) is a "
            "Philadelphia rite of passage no World Cup visitor should skip."
        ),
        "ratings": {"score": 4.4, "count": 18000},
        "stadium_proximity_km": 5.8,
    },
    {
        "place_id": "ChIJ_hodari_phi_3",
        "name": "Philadelphia Museum of Art",
        "city": "Philadelphia",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-75.1807, 39.9656]},
        "categories": ["museum", "art", "cultural", "landmark"],
        "price_level": 2,
        "description": (
            "The Philadelphia Museum of Art houses one of America's premier collections and "
            "is famous worldwide for the Rocky Steps leading to its neoclassical entrance. "
            "Inside, Impressionist masterworks and a remarkable Asian art wing await — outside, "
            "the view down the Benjamin Franklin Parkway is unforgettable."
        ),
        "ratings": {"score": 4.7, "count": 32000},
        "stadium_proximity_km": 8.0,
    },
    {
        "place_id": "ChIJ_hodari_phi_4",
        "name": "Zahav Israeli Restaurant",
        "city": "Philadelphia",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-75.1464, 39.9464]},
        "categories": ["restaurant", "israeli", "middle-eastern", "upscale"],
        "price_level": 4,
        "description": (
            "James Beard Award-winning Zahav is widely considered one of the best restaurants "
            "in America, serving modern Israeli cuisine — hummus tehina, wood-roasted meats, "
            "and salatim — in a warm Old City setting. Reservations are essential; it's a "
            "splurge-worthy World Cup dinner experience."
        ),
        "ratings": {"score": 4.8, "count": 8900},
        "stadium_proximity_km": 7.2,
    },
    {
        "place_id": "ChIJ_hodari_phi_5",
        "name": "Lincoln Financial Fan Zone",
        "city": "Philadelphia",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-75.1681, 39.9010]},
        "categories": ["fan zone", "outdoor", "entertainment", "sports"],
        "price_level": 2,
        "description": (
            "The FIFA Fan Zone in the Sports Complex surrounding Lincoln Financial Field "
            "brings cheesesteak vendors, Philly soft pretzels, and giant screens to the "
            "stadium's outer plazas on match days. The electric atmosphere of South Philly "
            "fans mixing with international supporters is something special."
        ),
        "ratings": {"score": 4.4, "count": 2100},
        "stadium_proximity_km": 0.3,
    },
    {
        "place_id": "ChIJ_hodari_phi_6",
        "name": "Dizengoff Hummus",
        "city": "Philadelphia",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-75.1721, 39.9483]},
        "categories": ["restaurant", "hummus", "vegetarian", "israeli", "halal-friendly"],
        "price_level": 2,
        "description": (
            "Dizengoff serves one thing and serves it perfectly — warm, velvety whole-bowl "
            "hummus topped with rotating seasonal combinations of lamb, mushroom ragù, or "
            "soft-boiled egg. The short, focused menu and plant-friendly options make it "
            "one of Philadelphia's most beloved lunch destinations."
        ),
        "ratings": {"score": 4.6, "count": 6400},
        "stadium_proximity_km": 7.0,
    },

    # ──────────────────────────────────────────────────────────
    # Miami  —  Hard Rock Stadium, Miami Gardens
    # ──────────────────────────────────────────────────────────
    {
        "place_id": "ChIJ_hodari_mia_1",
        "name": "Versailles Restaurant",
        "city": "Miami",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-80.3515, 25.7631]},
        "categories": ["restaurant", "cuban", "latin", "iconic"],
        "price_level": 2,
        "description": (
            "Versailles is the crown jewel of Miami's Little Havana, a legendary Cuban "
            "restaurant serving ropa vieja, lechón asado, and the city's best café cubano "
            "since 1971. Its mirrored dining room and the window where Cubans gather to "
            "debate politics over cortaditos make it an essential cultural experience."
        ),
        "ratings": {"score": 4.5, "count": 22000},
        "stadium_proximity_km": 16.0,
    },
    {
        "place_id": "ChIJ_hodari_mia_2",
        "name": "KYU Miami",
        "city": "Miami",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-80.1989, 25.7995]},
        "categories": ["restaurant", "asian-bbq", "upscale", "vegetarian-friendly"],
        "price_level": 3,
        "description": (
            "KYU is a wood-fired Asian barbecue restaurant in Miami's Wynwood arts district, "
            "charring Japanese-inspired brisket, roasted cauliflower with miso tahini, and "
            "Korean fried chicken to perfection. The open kitchen, creative cocktails, and "
            "vibrant atmosphere make it a highlight of the Miami dining scene."
        ),
        "ratings": {"score": 4.7, "count": 9500},
        "stadium_proximity_km": 18.0,
    },
    {
        "place_id": "ChIJ_hodari_mia_3",
        "name": "Wynwood Walls",
        "city": "Miami",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-80.1988, 25.8003]},
        "categories": ["attraction", "street art", "cultural", "outdoor"],
        "price_level": 2,
        "description": (
            "The Wynwood Walls is an outdoor museum of large-scale murals painted by the world's "
            "leading street artists, transforming a former warehouse district into one of the "
            "most photographed outdoor galleries in the world. Free to walk past or paid entry "
            "for the curated garden — equally stunning either way."
        ),
        "ratings": {"score": 4.7, "count": 38000},
        "stadium_proximity_km": 17.5,
    },
    {
        "place_id": "ChIJ_hodari_mia_4",
        "name": "Zak the Baker",
        "city": "Miami",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-80.2014, 25.7981]},
        "categories": ["bakery", "café", "kosher", "vegetarian", "brunch"],
        "price_level": 2,
        "description": (
            "Zak the Baker is a Wynwood bakery-café producing sourdough loaves, shakshuka, "
            "and fresh pastries under a kosher certification. It's a beloved neighbourhood "
            "gathering spot with a warm, communal spirit that appeals equally to veggie fans "
            "and lovers of artisan bread."
        ),
        "ratings": {"score": 4.6, "count": 6800},
        "stadium_proximity_km": 17.3,
    },
    {
        "place_id": "ChIJ_hodari_mia_5",
        "name": "Hard Rock Fan Zone — Miami Gardens",
        "city": "Miami",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-80.2388, 25.9579]},
        "categories": ["fan zone", "outdoor", "entertainment", "sports"],
        "price_level": 2,
        "description": (
            "The FIFA Fan Zone at Hard Rock Stadium rings the outer plazas with Caribbean food "
            "stalls, reggaeton and salsa stages, and giant screens for fans arriving early "
            "to Miami's World Cup matches. The tropical heat, international crowd, and "
            "Latin music energy create an unforgettable carnival atmosphere."
        ),
        "ratings": {"score": 4.5, "count": 2700},
        "stadium_proximity_km": 0.2,
    },
    {
        "place_id": "ChIJ_hodari_mia_6",
        "name": "Coconut Grove Farmers Market",
        "city": "Miami",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-80.2404, 25.7288]},
        "categories": ["market", "organic", "breakfast", "vegetarian-friendly"],
        "price_level": 2,
        "description": (
            "The Saturday Coconut Grove Farmers Market is a lively showcase of organic South "
            "Florida produce, freshly pressed tropical fruit juices, and prepared foods from "
            "local artisans. The shaded bayfront grove setting makes it a pleasant and "
            "healthy start to a World Cup match day."
        ),
        "ratings": {"score": 4.5, "count": 4600},
        "stadium_proximity_km": 22.0,
    },
    {
        "place_id": "ChIJ_hodari_mia_7",
        "name": "Mandolin Aegean Bistro",
        "city": "Miami",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-80.1843, 25.8076]},
        "categories": ["restaurant", "greek", "turkish", "halal-friendly", "vegetarian-friendly"],
        "price_level": 3,
        "description": (
            "Mandolin serves refined Aegean cuisine — grilled octopus, spanakopita, and "
            "lamb köfte — in a fairy-lit bougainvillea garden that feels like a Mykonos "
            "courtyard transplanted to Miami. The mezze menu is extensive with strong "
            "halal-friendly options, and the setting is among the most romantic in the city."
        ),
        "ratings": {"score": 4.6, "count": 7200},
        "stadium_proximity_km": 19.5,
    },

    # ──────────────────────────────────────────────────────────
    # Houston  —  NRG Stadium
    # ──────────────────────────────────────────────────────────
    {
        "place_id": "ChIJ_hodari_hou_1",
        "name": "Pappas Bros. Steakhouse",
        "city": "Houston",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-95.4617, 29.7583]},
        "categories": ["restaurant", "steakhouse", "upscale", "carnivore"],
        "price_level": 4,
        "description": (
            "Pappas Bros. is one of America's great steakhouses — dry-aged prime beef in a "
            "mahogany-panelled room with an award-winning wine cellar of over 3,800 selections. "
            "A definitive Houston dining experience for World Cup visitors who want a "
            "luxury dinner before or after a match at NRG."
        ),
        "ratings": {"score": 4.8, "count": 7600},
        "stadium_proximity_km": 5.8,
    },
    {
        "place_id": "ChIJ_hodari_hou_2",
        "name": "Aga's Restaurant — Halal Pakistani",
        "city": "Houston",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-95.4811, 29.7028]},
        "categories": ["restaurant", "halal", "pakistani", "south-asian", "budget-friendly"],
        "price_level": 1,
        "description": (
            "Aga's is Houston's most celebrated halal Pakistani restaurant, famous for "
            "slow-cooked nihari, smoky chicken tikka, and fragrant biryani served in "
            "enormous family-style portions. The vibrant, informal atmosphere and certified "
            "halal kitchen make it a beloved institution for Muslim fans in the city."
        ),
        "ratings": {"score": 4.6, "count": 8100},
        "stadium_proximity_km": 8.5,
    },
    {
        "place_id": "ChIJ_hodari_hou_3",
        "name": "Space Center Houston",
        "city": "Houston",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-95.0965, 29.5517]},
        "categories": ["museum", "science", "attraction", "family"],
        "price_level": 3,
        "description": (
            "Space Center Houston is NASA's official visitor complex — tour a real Saturn V "
            "rocket, step inside a Space Shuttle mock-up, and watch astronaut training from "
            "the observation deck. For international visitors, it's an unrivalled window into "
            "America's space programme and a genuinely thrilling half-day out."
        ),
        "ratings": {"score": 4.6, "count": 31000},
        "stadium_proximity_km": 38.0,
    },
    {
        "place_id": "ChIJ_hodari_hou_4",
        "name": "Mixteco Grill",
        "city": "Houston",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-95.3849, 29.7410]},
        "categories": ["restaurant", "mexican", "oaxacan", "vegetarian-friendly"],
        "price_level": 2,
        "description": (
            "Mixteco Grill offers authentic Oaxacan home cooking — mole negro, tlayudas, "
            "and earthy black bean tamales — in a warm, family-run setting near Montrose. "
            "The complex, chile-layered sauces represent Mexican regional cuisine at its "
            "most sophisticated and are a world away from the usual Tex-Mex."
        ),
        "ratings": {"score": 4.6, "count": 5400},
        "stadium_proximity_km": 7.5,
    },
    {
        "place_id": "ChIJ_hodari_hou_5",
        "name": "NRG Fan Zone — NRG Park",
        "city": "Houston",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-95.4107, 29.6847]},
        "categories": ["fan zone", "outdoor", "entertainment", "sports"],
        "price_level": 2,
        "description": (
            "The FIFA Fan Zone in NRG Park surrounds the stadium with Tex-Mex food stalls, "
            "live Tejano and cumbia music, and international supporters creating an electric "
            "multicultural atmosphere. Houston's extraordinary diversity — 145 languages "
            "spoken — makes this one of the World Cup's most genuinely global fan hubs."
        ),
        "ratings": {"score": 4.5, "count": 2400},
        "stadium_proximity_km": 0.3,
    },
    {
        "place_id": "ChIJ_hodari_hou_6",
        "name": "The Menil Collection",
        "city": "Houston",
        "country": "United States",
        "location": {"type": "Point", "coordinates": [-95.3974, 29.7371]},
        "categories": ["museum", "art", "cultural", "free"],
        "price_level": 1,
        "description": (
            "The Menil Collection is one of the world's great private art museums, offering "
            "free admission to a remarkable trove of Surrealist paintings, African masks, "
            "Byzantine icons, and contemporary works in a tranquil Montrose campus. "
            "The neighbouring Rothko Chapel adds a profound meditative dimension."
        ),
        "ratings": {"score": 4.8, "count": 12000},
        "stadium_proximity_km": 7.3,
    },

    # ──────────────────────────────────────────────────────────
    # Toronto  —  BMO Field
    # ──────────────────────────────────────────────────────────
    {
        "place_id": "ChIJ_hodari_yyz_1",
        "name": "St. Lawrence Market",
        "city": "Toronto",
        "country": "Canada",
        "location": {"type": "Point", "coordinates": [-79.3717, 43.6487]},
        "categories": ["market", "food hall", "local", "diverse cuisine"],
        "price_level": 2,
        "description": (
            "St. Lawrence Market is one of the world's greatest food markets — 120 vendors "
            "across three floors selling peameal bacon sandwiches, artisan cheeses, fresh fish, "
            "and international delicacies in a magnificent 19th-century building. A Saturday "
            "morning here is a quintessential Toronto experience for any World Cup visitor."
        ),
        "ratings": {"score": 4.7, "count": 28000},
        "stadium_proximity_km": 4.8,
    },
    {
        "place_id": "ChIJ_hodari_yyz_2",
        "name": "Pai Northern Thai Kitchen",
        "city": "Toronto",
        "country": "Canada",
        "location": {"type": "Point", "coordinates": [-79.3881, 43.6489]},
        "categories": ["restaurant", "thai", "northern-thai", "vegetarian-friendly"],
        "price_level": 2,
        "description": (
            "Pai brings the fragrant, complex flavours of northern Thailand to downtown Toronto "
            "— khao soi curry, pad see ew, and mango sticky rice served in a lively "
            "candlelit space. Consistently voted one of Toronto's best Asian restaurants, "
            "with strong vegetarian options and generous portions."
        ),
        "ratings": {"score": 4.7, "count": 11000},
        "stadium_proximity_km": 4.2,
    },
    {
        "place_id": "ChIJ_hodari_yyz_3",
        "name": "CN Tower EdgeWalk",
        "city": "Toronto",
        "country": "Canada",
        "location": {"type": "Point", "coordinates": [-79.3871, 43.6426]},
        "categories": ["attraction", "landmark", "adventure", "scenic"],
        "price_level": 4,
        "description": (
            "The CN Tower's EdgeWalk lets thrill-seekers walk hands-free around the outside "
            "of the tower's main pod, 356 metres above downtown Toronto with the Lake Ontario "
            "skyline spread below. For those who prefer to keep their feet firmly on glass, "
            "the glass floor observation deck offers equally breathtaking views."
        ),
        "ratings": {"score": 4.6, "count": 22000},
        "stadium_proximity_km": 3.5,
    },
    {
        "place_id": "ChIJ_hodari_yyz_4",
        "name": "Maison Selby — Halal Brunch",
        "city": "Toronto",
        "country": "Canada",
        "location": {"type": "Point", "coordinates": [-79.3769, 43.6710]},
        "categories": ["restaurant", "halal", "brunch", "french-inspired"],
        "price_level": 3,
        "description": (
            "Set in a restored Victorian mansion, Maison Selby serves a halal-certified brunch "
            "and dinner menu inspired by French bistro classics — crêpes, steak tartare, and "
            "crème brûlée. The gorgeous architecture, candlelit rooms, and halal certification "
            "make it a special occasion dining destination during the World Cup."
        ),
        "ratings": {"score": 4.5, "count": 5600},
        "stadium_proximity_km": 6.0,
    },
    {
        "place_id": "ChIJ_hodari_yyz_5",
        "name": "BMO Fan Zone — Exhibition Place",
        "city": "Toronto",
        "country": "Canada",
        "location": {"type": "Point", "coordinates": [-79.4189, 43.6332]},
        "categories": ["fan zone", "outdoor", "entertainment", "sports"],
        "price_level": 2,
        "description": (
            "The FIFA Fan Zone at Exhibition Place wraps around BMO Field with poutine stands, "
            "maple syrup waffles, and international food trucks reflecting Toronto's status "
            "as one of the world's most multicultural cities. Live music and street performers "
            "create an inclusive, joyful pre-match atmosphere."
        ),
        "ratings": {"score": 4.5, "count": 2600},
        "stadium_proximity_km": 0.3,
    },
    {
        "place_id": "ChIJ_hodari_yyz_6",
        "name": "Kensington Market",
        "city": "Toronto",
        "country": "Canada",
        "location": {"type": "Point", "coordinates": [-79.4007, 43.6542]},
        "categories": ["neighborhood", "market", "vintage", "diverse cuisine", "cultural"],
        "price_level": 1,
        "description": (
            "Kensington Market is a bohemian neighbourhood of independent food stalls, "
            "vintage stores, and cafés representing Toronto's extraordinary cultural mosaic "
            "— Jamaican patties next to Portuguese custard tarts next to Ethiopian injera. "
            "An afternoon wander here captures Toronto's unique spirit better than anywhere else."
        ),
        "ratings": {"score": 4.7, "count": 17000},
        "stadium_proximity_km": 5.5,
    },

    # ──────────────────────────────────────────────────────────
    # Vancouver  —  BC Place
    # ──────────────────────────────────────────────────────────
    {
        "place_id": "ChIJ_hodari_yvr_1",
        "name": "Granville Island Public Market",
        "city": "Vancouver",
        "country": "Canada",
        "location": {"type": "Point", "coordinates": [-123.1341, 49.2715]},
        "categories": ["market", "seafood", "local produce", "artisan"],
        "price_level": 2,
        "description": (
            "Granville Island Public Market is a beloved Vancouver institution on a peninsula "
            "beneath the Granville Bridge, packed with fresh BC salmon, artisan pastries, "
            "and international street food stalls. Arriving by Aquabus adds to the charm, "
            "and it's a perfect morning before a World Cup afternoon kick-off."
        ),
        "ratings": {"score": 4.7, "count": 32000},
        "stadium_proximity_km": 3.8,
    },
    {
        "place_id": "ChIJ_hodari_yvr_2",
        "name": "Vij's Restaurant",
        "city": "Vancouver",
        "country": "Canada",
        "location": {"type": "Point", "coordinates": [-123.1218, 49.2633]},
        "categories": ["restaurant", "indian", "upscale", "vegetarian-friendly"],
        "price_level": 3,
        "description": (
            "Vij's is Vancouver's iconic modern Indian restaurant — acclaimed globally for "
            "its bold, aromatic curries, lamb popsicles in fenugreek cream, and innovative "
            "vegetarian dishes. The no-reservations policy means queuing, but the complimentary "
            "chai and samosas served while you wait make it worth every minute."
        ),
        "ratings": {"score": 4.7, "count": 9800},
        "stadium_proximity_km": 2.5,
    },
    {
        "place_id": "ChIJ_hodari_yvr_3",
        "name": "Stanley Park",
        "city": "Vancouver",
        "country": "Canada",
        "location": {"type": "Point", "coordinates": [-123.1427, 49.3017]},
        "categories": ["park", "outdoor", "cycling", "scenic", "attraction"],
        "price_level": 1,
        "description": (
            "Stanley Park is one of North America's finest urban green spaces — 400 hectares "
            "of old-growth forest on a peninsula jutting into Burrard Inlet, ringed by a "
            "spectacular 9-km seawall. Cycling the seawall at dawn or dusk offers unforgettable "
            "views of the North Shore mountains and Vancouver skyline."
        ),
        "ratings": {"score": 4.9, "count": 95000},
        "stadium_proximity_km": 4.5,
    },
    {
        "place_id": "ChIJ_hodari_yvr_4",
        "name": "Japadog Street Cart — Robson St",
        "city": "Vancouver",
        "country": "Canada",
        "location": {"type": "Point", "coordinates": [-123.1218, 49.2820]},
        "categories": ["street food", "japanese", "hot dog", "budget-friendly"],
        "price_level": 1,
        "description": (
            "Japadog is a Vancouver original — a Japanese-style hot dog cart serving teriyaki "
            "sausages topped with seaweed, daikon, and oroshi soy on fluffy steamed buns. "
            "The concept sounds unlikely but the result is delicious; the line on Robson "
            "Street is a reliable indicator of how good it actually is."
        ),
        "ratings": {"score": 4.5, "count": 7400},
        "stadium_proximity_km": 2.0,
    },
    {
        "place_id": "ChIJ_hodari_yvr_5",
        "name": "BC Place Fan Zone — Plaza of Nations",
        "city": "Vancouver",
        "country": "Canada",
        "location": {"type": "Point", "coordinates": [-123.1118, 49.2768]},
        "categories": ["fan zone", "outdoor", "entertainment", "sports"],
        "price_level": 2,
        "description": (
            "The FIFA Fan Zone at the Plaza of Nations beside BC Place fills the False Creek "
            "waterfront with Pacific Northwest salmon tacos, craft ciders, and giant screens. "
            "The backdrop of the North Shore mountains visible across the harbour makes this "
            "one of the World Cup's most scenic fan gathering spots."
        ),
        "ratings": {"score": 4.5, "count": 2800},
        "stadium_proximity_km": 0.3,
    },
    {
        "place_id": "ChIJ_hodari_yvr_6",
        "name": "Hawksworth Restaurant",
        "city": "Vancouver",
        "country": "Canada",
        "location": {"type": "Point", "coordinates": [-123.1234, 49.2817]},
        "categories": ["restaurant", "canadian", "upscale", "fine-dining"],
        "price_level": 4,
        "description": (
            "Hawksworth is Vancouver's benchmark fine-dining destination, housed in the "
            "historic Hotel Georgia and serving chef David Hawksworth's contemporary "
            "Canadian cuisine — Haida Gwaii halibut, dry-aged BC beef, and wild mushroom "
            "risotto built from the finest Pacific Northwest ingredients."
        ),
        "ratings": {"score": 4.7, "count": 6200},
        "stadium_proximity_km": 2.8,
    },
    {
        "place_id": "ChIJ_hodari_yvr_7",
        "name": "Al-Fayed Halal Butcher & Café",
        "city": "Vancouver",
        "country": "Canada",
        "location": {"type": "Point", "coordinates": [-123.0714, 49.2480]},
        "categories": ["restaurant", "halal", "middle-eastern", "café"],
        "price_level": 2,
        "description": (
            "Al-Fayed serves generous halal platters of grilled lamb, chicken shawarma, and "
            "freshly baked pita in Vancouver's South Vancouver neighbourhood. The adjoining "
            "halal butcher supplies some of the city's best restaurants, and the café is "
            "a welcoming, affordable option for Muslim fans visiting BC Place."
        ),
        "ratings": {"score": 4.5, "count": 3100},
        "stadium_proximity_km": 6.5,
    },

    # ──────────────────────────────────────────────────────────
    # Mexico City  —  Estadio Azteca
    # ──────────────────────────────────────────────────────────
    {
        "place_id": "ChIJ_hodari_mex_1",
        "name": "Contramar",
        "city": "Mexico City",
        "country": "Mexico",
        "location": {"type": "Point", "coordinates": [-99.1694, 19.4179]},
        "categories": ["restaurant", "seafood", "mexican", "upscale"],
        "price_level": 3,
        "description": (
            "Contramar is Mexico City's most celebrated seafood restaurant — the signature "
            "tuna tostadas and the legendary pescado a la talla (grilled butterflied fish "
            "painted red and green) have been drawing the city's creative class since 1998. "
            "Book ahead; a table here is one of the great World Cup lunches available anywhere."
        ),
        "ratings": {"score": 4.8, "count": 14000},
        "stadium_proximity_km": 11.5,
    },
    {
        "place_id": "ChIJ_hodari_mex_2",
        "name": "Mercado de La Merced",
        "city": "Mexico City",
        "country": "Mexico",
        "location": {"type": "Point", "coordinates": [-99.1213, 19.4249]},
        "categories": ["market", "street food", "mexican", "budget-friendly"],
        "price_level": 1,
        "description": (
            "La Merced is one of Latin America's largest traditional markets — a labyrinthine "
            "complex of stalls selling every chilli, herb, and ingredient used in Mexican "
            "cooking, alongside tacos de canasta, tamales, and fresh agua fresca. An authentic "
            "sensory immersion into Mexico City's culinary soul."
        ),
        "ratings": {"score": 4.4, "count": 11000},
        "stadium_proximity_km": 9.0,
    },
    {
        "place_id": "ChIJ_hodari_mex_3",
        "name": "Museo Nacional de Antropología",
        "city": "Mexico City",
        "country": "Mexico",
        "location": {"type": "Point", "coordinates": [-99.1862, 19.4259]},
        "categories": ["museum", "archaeology", "cultural", "world-class"],
        "price_level": 2,
        "description": (
            "The National Museum of Anthropology in Chapultepec Park is one of the world's "
            "great museums, housing the Aztec Sun Stone, Maya jade masks, and artefacts from "
            "every pre-Columbian civilization in Mexico across twelve magnificent halls. "
            "An unmissable half-day for any international visitor to the Azteca."
        ),
        "ratings": {"score": 4.9, "count": 72000},
        "stadium_proximity_km": 9.0,
    },
    {
        "place_id": "ChIJ_hodari_mex_4",
        "name": "El Cardenal",
        "city": "Mexico City",
        "country": "Mexico",
        "location": {"type": "Point", "coordinates": [-99.1353, 19.4319]},
        "categories": ["restaurant", "mexican", "traditional", "breakfast"],
        "price_level": 2,
        "description": (
            "El Cardenal is the definitive traditional Mexican breakfast destination in the "
            "historic centre — warm pan dulce, chilled fruit plates, and chiles en nogada "
            "served in an elegant colonial dining room. Locals and visitors alike consider "
            "a leisurely breakfast here an essential Mexico City ritual."
        ),
        "ratings": {"score": 4.7, "count": 13500},
        "stadium_proximity_km": 10.5,
    },
    {
        "place_id": "ChIJ_hodari_mex_5",
        "name": "Azteca Fan Zone — Estadio Azteca Forecourt",
        "city": "Mexico City",
        "country": "Mexico",
        "location": {"type": "Point", "coordinates": [-99.1505, 19.3029]},
        "categories": ["fan zone", "outdoor", "entertainment", "sports"],
        "price_level": 2,
        "description": (
            "The FIFA Fan Zone outside Estadio Azteca — the only stadium hosting World Cup "
            "matches in three different tournaments — transforms the great forecourt into a "
            "festival of tacos, mezcal, mariachi, and football history. The chance to stand "
            "outside the legendary stadium is a pilgrimage for any football fan."
        ),
        "ratings": {"score": 4.6, "count": 4500},
        "stadium_proximity_km": 0.2,
    },
    {
        "place_id": "ChIJ_hodari_mex_6",
        "name": "Pujol",
        "city": "Mexico City",
        "country": "Mexico",
        "location": {"type": "Point", "coordinates": [-99.1982, 19.4282]},
        "categories": ["restaurant", "mexican", "fine-dining", "tasting menu"],
        "price_level": 4,
        "description": (
            "Consistently ranked among the world's 50 best restaurants, Pujol is Enrique "
            "Olvera's temple to contemporary Mexican cuisine — the aged mole madre (a mole "
            "that has been evolving for over a decade) alone justifies the pilgrimage. "
            "Book weeks in advance; this is once-in-a-World-Cup territory."
        ),
        "ratings": {"score": 4.8, "count": 6700},
        "stadium_proximity_km": 10.2,
    },
    {
        "place_id": "ChIJ_hodari_mex_7",
        "name": "Quintonil",
        "city": "Mexico City",
        "country": "Mexico",
        "location": {"type": "Point", "coordinates": [-99.2021, 19.4288]},
        "categories": ["restaurant", "mexican", "vegetarian-friendly", "upscale"],
        "price_level": 4,
        "description": (
            "Quintonil is a Polanco restaurant celebrating indigenous Mexican ingredients "
            "with a menu built around wild herbs, heirloom corn, and hyperlocal seasonal "
            "produce. Chef Jorge Vallejo's cooking is simultaneously deeply rooted in "
            "Mexican tradition and strikingly modern — a must for food-focused World Cup visitors."
        ),
        "ratings": {"score": 4.8, "count": 5900},
        "stadium_proximity_km": 10.5,
    },

    # ──────────────────────────────────────────────────────────
    # Guadalajara  —  Estadio Akron
    # ──────────────────────────────────────────────────────────
    {
        "place_id": "ChIJ_hodari_gdl_1",
        "name": "La Chata Restaurant",
        "city": "Guadalajara",
        "country": "Mexico",
        "location": {"type": "Point", "coordinates": [-103.3483, 20.6725]},
        "categories": ["restaurant", "mexican", "traditional", "jaliscan"],
        "price_level": 2,
        "description": (
            "La Chata is Guadalajara's beloved institution for traditional Jalisco cooking "
            "— birria de chivo, pozole rojo, and tortas ahogadas submerged in fiery "
            "guajillo sauce that defines the city's culinary identity. The warm, "
            "colourful dining room and generous portions are exactly what a World Cup "
            "visitor needs after a day exploring the city."
        ),
        "ratings": {"score": 4.6, "count": 12000},
        "stadium_proximity_km": 18.0,
    },
    {
        "place_id": "ChIJ_hodari_gdl_2",
        "name": "Mercado San Juan de Dios",
        "city": "Guadalajara",
        "country": "Mexico",
        "location": {"type": "Point", "coordinates": [-103.3446, 20.6677]},
        "categories": ["market", "street food", "budget-friendly", "mexican"],
        "price_level": 1,
        "description": (
            "The largest covered market in Latin America, San Juan de Dios spans three "
            "floors of food stalls, leather goods, and handicrafts in the heart of Guadalajara. "
            "The ground-floor food section is the best place in the city for an authentic "
            "cheap breakfast of chilaquiles or a freshly made tlayuda."
        ),
        "ratings": {"score": 4.4, "count": 9800},
        "stadium_proximity_km": 18.5,
    },
    {
        "place_id": "ChIJ_hodari_gdl_3",
        "name": "Instituto Cultural Cabañas",
        "city": "Guadalajara",
        "country": "Mexico",
        "location": {"type": "Point", "coordinates": [-103.3440, 20.6739]},
        "categories": ["museum", "UNESCO", "murals", "cultural", "historic"],
        "price_level": 2,
        "description": (
            "A UNESCO World Heritage Site, the Cabañas Cultural Institute houses José Clemente "
            "Orozco's monumental murals in a stunning 19th-century neoclassical chapel — including "
            "the breathtaking 'Man of Fire' ceiling fresco. It's one of Mexico's most important "
            "cultural landmarks and a profound experience for any visitor."
        ),
        "ratings": {"score": 4.8, "count": 16000},
        "stadium_proximity_km": 19.0,
    },
    {
        "place_id": "ChIJ_hodari_gdl_4",
        "name": "Akron Fan Zone — Estadio Akron",
        "city": "Guadalajara",
        "country": "Mexico",
        "location": {"type": "Point", "coordinates": [-103.4624, 20.6869]},
        "categories": ["fan zone", "outdoor", "entertainment", "sports"],
        "price_level": 2,
        "description": (
            "The FIFA Fan Zone surrounding Estadio Akron fills the Chivas-country hillside with "
            "tequila samplings, live norteño and mariachi performances, and regional Jalisco "
            "food vendors. Watching the Guadalajara skyline light up as kick-off approaches "
            "is an experience unique to this host city."
        ),
        "ratings": {"score": 4.5, "count": 2000},
        "stadium_proximity_km": 0.4,
    },
    {
        "place_id": "ChIJ_hodari_gdl_5",
        "name": "Tequila Town Day Trip",
        "city": "Guadalajara",
        "country": "Mexico",
        "location": {"type": "Point", "coordinates": [-103.8350, 20.8789]},
        "categories": ["excursion", "tequila", "distillery", "cultural", "outdoor"],
        "price_level": 3,
        "description": (
            "The town of Tequila, just an hour from Guadalajara by the Jose Cuervo Express "
            "train, offers tours of blue agave fields and historic distilleries where Mexico's "
            "national spirit has been produced for centuries. A full-day excursion here — "
            "tasting flights included — is one of the most memorable World Cup side trips available."
        ),
        "ratings": {"score": 4.7, "count": 8500},
        "stadium_proximity_km": 55.0,
    },
    {
        "place_id": "ChIJ_hodari_gdl_6",
        "name": "Tacos de Canasta El Rey",
        "city": "Guadalajara",
        "country": "Mexico",
        "location": {"type": "Point", "coordinates": [-103.3521, 20.6781]},
        "categories": ["street food", "tacos", "vegetarian-friendly", "budget-friendly"],
        "price_level": 1,
        "description": (
            "El Rey's basket tacos — steamed soft tortillas filled with beans, potato, "
            "chicharrón, or tinga — are a Guadalajara breakfast staple sold from a bicycle "
            "cart in the Centro Histórico. Cheap, filling, and authentically local, they're "
            "the perfect morning fuel before a day of World Cup sightseeing."
        ),
        "ratings": {"score": 4.5, "count": 4200},
        "stadium_proximity_km": 18.2,
    },

    # ──────────────────────────────────────────────────────────
    # Monterrey  —  Estadio BBVA
    # ──────────────────────────────────────────────────────────
    {
        "place_id": "ChIJ_hodari_mty_1",
        "name": "El Tío Restaurant — Carne Asada",
        "city": "Monterrey",
        "country": "Mexico",
        "location": {"type": "Point", "coordinates": [-100.3073, 25.6722]},
        "categories": ["restaurant", "mexican", "carne-asada", "carnivore"],
        "price_level": 2,
        "description": (
            "El Tío is a regiomontano classic — a sprawling open-air asador where enormous "
            "cuts of arrachera and short rib are grilled over mesquite coals and served "
            "with fresh tortillas, beans, and salsa verde. Monterrey's carne asada culture "
            "is legendary in Mexico, and El Tío is its finest expression."
        ),
        "ratings": {"score": 4.7, "count": 10500},
        "stadium_proximity_km": 7.5,
    },
    {
        "place_id": "ChIJ_hodari_mty_2",
        "name": "Barrio Antiguo",
        "city": "Monterrey",
        "country": "Mexico",
        "location": {"type": "Point", "coordinates": [-100.3128, 25.6701]},
        "categories": ["neighborhood", "nightlife", "cultural", "restaurants", "bars"],
        "price_level": 2,
        "description": (
            "Barrio Antiguo is Monterrey's historic arts district — cobblestone streets "
            "lined with colonial architecture, craft beer bars, mezcalerías, and independent "
            "restaurants that come alive after sundown. It's the cultural heart of the city "
            "and the best place to experience Monterrey's nightlife during the World Cup."
        ),
        "ratings": {"score": 4.6, "count": 14000},
        "stadium_proximity_km": 8.0,
    },
    {
        "place_id": "ChIJ_hodari_mty_3",
        "name": "Parque Fundidora",
        "city": "Monterrey",
        "country": "Mexico",
        "location": {"type": "Point", "coordinates": [-100.2988, 25.6757]},
        "categories": ["park", "outdoor", "cultural", "attraction"],
        "price_level": 1,
        "description": (
            "Built on the bones of a 19th-century steel foundry, Parque Fundidora is a "
            "remarkable industrial heritage park with blast furnace museums, outdoor sculpture, "
            "and a lake perfect for paddleboating. The Centro de las Artes inside the "
            "converted foundry is a stunning setting for exhibitions during the World Cup."
        ),
        "ratings": {"score": 4.7, "count": 22000},
        "stadium_proximity_km": 6.5,
    },
    {
        "place_id": "ChIJ_hodari_mty_4",
        "name": "BBVA Fan Zone — Estadio BBVA",
        "city": "Monterrey",
        "country": "Mexico",
        "location": {"type": "Point", "coordinates": [-100.2461, 25.6694]},
        "categories": ["fan zone", "outdoor", "entertainment", "sports"],
        "price_level": 2,
        "description": (
            "The FIFA Fan Zone surrounding Estadio BBVA — perhaps the world's most dramatically "
            "sited stadium, nestled against the Cerro de la Silla mountain — fills the approaches "
            "with chicharrón vendors, norteño bands, and supporters from across the globe. "
            "The mountain backdrop makes for genuinely spectacular match-day photographs."
        ),
        "ratings": {"score": 4.6, "count": 2800},
        "stadium_proximity_km": 0.3,
    },
    {
        "place_id": "ChIJ_hodari_mty_5",
        "name": "Mariscos El Güero",
        "city": "Monterrey",
        "country": "Mexico",
        "location": {"type": "Point", "coordinates": [-100.3199, 25.6618]},
        "categories": ["restaurant", "seafood", "mexican", "budget-friendly"],
        "price_level": 1,
        "description": (
            "Despite being far from the coast, Mariscos El Güero draws crowds daily for "
            "its Pacific-style seafood — raw oysters, shrimp cocktails in chilli-tomato "
            "broth, and ceviche tostadas that punch far above their modest price. "
            "A great informal lunch option for fans exploring central Monterrey."
        ),
        "ratings": {"score": 4.5, "count": 6200},
        "stadium_proximity_km": 10.0,
    },
    {
        "place_id": "ChIJ_hodari_mty_6",
        "name": "Museo de Arte Contemporáneo (MARCO)",
        "city": "Monterrey",
        "country": "Mexico",
        "location": {"type": "Point", "coordinates": [-100.3128, 25.6691]},
        "categories": ["museum", "art", "contemporary", "cultural"],
        "price_level": 2,
        "description": (
            "MARCO is one of Latin America's foremost contemporary art museums, housed in a "
            "striking Ricardo Legorreta building in the Macroplaza. Its rotating exhibitions "
            "of Mexican and international contemporary art are thought-provoking and the "
            "Rufino Tamayo courtyard sculpture is a highlight in its own right."
        ),
        "ratings": {"score": 4.7, "count": 9800},
        "stadium_proximity_km": 8.5,
    },
    {
        "place_id": "ChIJ_hodari_mty_7",
        "name": "Taquería Los Compadres",
        "city": "Monterrey",
        "country": "Mexico",
        "location": {"type": "Point", "coordinates": [-100.2731, 25.6489]},
        "categories": ["street food", "tacos", "budget-friendly", "mexican"],
        "price_level": 1,
        "description": (
            "Los Compadres is a neighbourhood taquería near the stadium serving Monterrey's "
            "speciality — tacos de trompo (spit-roasted pork inspired by shawarma) piled "
            "with pineapple, onion, and coriander for 20 pesos each. Perfect for a quick "
            "bite before or after a match at the BBVA."
        ),
        "ratings": {"score": 4.5, "count": 5100},
        "stadium_proximity_km": 3.5,
    },
]
