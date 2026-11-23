/** Adds ERA's Saudi experiences. Run with: npm run seed:saudi. Safe to run again (skips names that already exist). */
import { connect } from "./db.mjs";

const db = await connect();

// [name, type, description, destination, location, date, time, capacity, shape, color, icon]
const IMAGES = {
  "Najdi Coffee Ceremony at At-Turaif": "/img/sa-coffee.webp",
  "Sunset Hike at the Edge of the World": "/img/sa-edge.webp",
  "Coral Reef Diving in Umluj": "/img/sa-umluj.webp",
  "Date Harvest in the Al-Ahsa Oasis": "/img/sa-ahsa.webp",
  "Al-Qatt Al-Asiri Painting in Rijal Almaa": "/img/sa-rijal.webp",
  "Hijazi Oud Evening in Al-Balad": "/img/sa-balad.webp",
  "Taif Rose Harvest & Distillery": "/img/sa-taif.webp",
  "Arabian Horse Ride in Wadi Hanifa": "/img/sa-horse.webp",
};
const SAUDI = [
  [
    "Najdi Coffee Ceremony at At-Turaif",
    "Entertainment",
    "Sit with a Najdi host in the mud-brick lanes of At-Turaif, a UNESCO World Heritage Site, and learn the ritual of Saudi coffee — roasting, cardamom, the dallah and the art of serving — paired with Khalas dates.",
    "Diriyah, Saudi Arabia",
    "At-Turaif District, Diriyah, Riyadh, Saudi Arabia",
    "2026-12-10",
    "16:30",
    24,
    "octagon",
    "cocoa",
    "coffee",
  ],
  [
    "Sunset Hike at the Edge of the World",
    "Sport",
    "Trek across the Tuwaiq escarpment to Jebel Fihrayn, where 300-metre cliffs drop into an ancient seabed. A guided desert hike ending with Arabic coffee as the sun sets over the endless plain.",
    "Riyadh, Saudi Arabia",
    "Jebel Fihrayn (Edge of the World), Riyadh, Saudi Arabia",
    "2026-12-12",
    "14:30",
    18,
    "hexagon",
    "terracotta",
    "mountain",
  ],
  [
    "Coral Reef Diving in Umluj",
    "Sport",
    "Dive the untouched coral gardens of Umluj — the 'Maldives of Saudi Arabia' — with certified Red Sea guides. Turquoise lagoons, reef sharks and sea turtles in one unforgettable morning.",
    "Umluj, Saudi Arabia",
    "Umluj Islands, Red Sea Coast, Saudi Arabia",
    "2027-01-15",
    "08:00",
    12,
    "scalloped",
    "teal",
    "wave",
  ],
  [
    "Date Harvest in the Al-Ahsa Oasis",
    "Wellness",
    "Walk among three million palms in the world's largest oasis, a UNESCO site. Join farmers for the date harvest, taste fresh Khalas and Ruzaiz, and rest by the natural springs of Al-Ahsa.",
    "Al-Ahsa, Saudi Arabia",
    "Al-Ahsa Oasis, Eastern Province, Saudi Arabia",
    "2026-12-18",
    "07:30",
    20,
    "circle",
    "emerald",
    "palm",
  ],
  [
    "Al-Qatt Al-Asiri Painting in Rijal Almaa",
    "Entertainment",
    "Learn Al-Qatt Al-Asiri — the UNESCO-listed wall art of Asiri women — inside the stone towers of Rijal Almaa village, painting bold geometric patterns with natural pigments.",
    "Abha, Saudi Arabia",
    "Rijal Almaa Heritage Village, Asir, Saudi Arabia",
    "2027-01-08",
    "10:00",
    15,
    "shield",
    "crimson",
    "palette",
  ],
  [
    "Hijazi Oud Evening in Al-Balad",
    "Entertainment",
    "An intimate night of oud and Hijazi song on a rooshan-framed rooftop in historic Jeddah, with Saudi sweets and mint tea under the lanterns of Al-Balad.",
    "Jeddah, Saudi Arabia",
    "Al-Balad Historic District, Jeddah, Saudi Arabia",
    "2026-12-20",
    "20:30",
    40,
    "sunburst",
    "plum",
    "music",
  ],
  [
    "Taif Rose Harvest & Distillery",
    "Wellness",
    "Rise at dawn in the rose farms of Al-Hada to pick Taif's famous damask roses, then follow them into a traditional copper distillery to see rose water and ward oil being made.",
    "Taif, Saudi Arabia",
    "Al-Hada Rose Farms, Taif, Saudi Arabia",
    "2027-04-05",
    "06:30",
    25,
    "scalloped",
    "rose",
    "lotus",
  ],
  [
    "Arabian Horse Ride in Wadi Hanifa",
    "Sport",
    "Ride purebred Arabian horses along the palm-lined banks of Wadi Hanifa, beneath the walls of old Diriyah, guided by riders from a family stable with generations of heritage.",
    "Diriyah, Saudi Arabia",
    "Wadi Hanifa, Diriyah, Riyadh, Saudi Arabia",
    "2027-01-22",
    "16:00",
    10,
    "shield",
    "gold",
    "horseshoe",
  ],
];

try {
  const [[provider]] = await db.execute(
    "SELECT userID FROM ServiceProvider WHERE email='provider@era.demo'",
  );
  if (!provider) throw new Error("Run npm run seed:demo first (demo provider not found).");

  // The earlier test activity becomes the Umluj diving experience.
  await db.execute(
    "UPDATE Activity SET isDeleted=TRUE WHERE activityName='Red Sea Diving Adventure' AND isDeleted=FALSE AND NOT EXISTS (SELECT 1 FROM Booking b WHERE b.activityID=Activity.activityID)",
  );
  // Keep the AlUla stargazing night bookable.
  await db.execute(
    "UPDATE Activity SET `date`='2026-12-14' WHERE activityName='Stargazing Experience in AlUla' AND `date` < CURRENT_DATE",
  );

  let added = 0;
  for (const [
    name,
    type,
    description,
    destination,
    location,
    date,
    time,
    cap,
    shape,
    color,
    icon,
  ] of SAUDI) {
    const [exists] = await db.execute(
      "SELECT 1 FROM Activity WHERE activityName=? AND isDeleted=FALSE",
      [name],
    );
    if (exists.length) continue;
    await db.execute(
      "INSERT INTO Activity (providerID,activityName,type,description,destination,location,`date`,`time`,availableCapacity,image,imageAlt,stampShape,stampColor,stampIcon) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        provider.userID,
        name,
        type,
        description,
        destination,
        location,
        date,
        time,
        cap,
        IMAGES[name] ?? null,
        name,
        shape,
        color,
        icon,
      ],
    );
    added++;
  }
  // Give existing Saudi experiences their photo if they have none yet.
  for (const [name, img] of Object.entries(IMAGES))
    await db.execute(
      "UPDATE Activity SET image=?, imageAlt=? WHERE activityName=? AND (image IS NULL OR image='')",
      [img, name, name],
    );
  console.log(`Added ${added} Saudi experiences.`);
} finally {
  await db.end();
}
