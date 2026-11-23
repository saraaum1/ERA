/**
 * Makes ERA's demo data chronologically consistent. Safe to run again.
 *  - A booking can only be "Completed" (with a stamp) after its experience has taken place.
 *  - Seasonal experiences sit in their real season.
 *  - The demo customer gets a past history: experiences completed earlier this autumn.
 */
import mysql from "mysql2/promise";

const db = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "era_db",
});

try {
  // 1) Seasons: Al-Ahsa dates are harvested in late summer.
  await db.execute(
    "UPDATE Activity SET `date`='2027-08-21' WHERE activityName='Date Harvest in the Al-Ahsa Oasis' AND `date` < '2027-07-01'",
  );

  // 2) Completed bookings whose experience is still in the future go back to Confirmed (and lose the early stamp).
  const [early] = await db.execute(
    "SELECT b.bookingID FROM Booking b JOIN Activity a ON a.activityID=b.activityID WHERE b.status='Completed' AND a.`date` > CURRENT_DATE()",
  );
  for (const { bookingID } of early) {
    await db.execute("DELETE FROM DigitalStamp WHERE bookingID=?", [bookingID]);
    await db.execute("UPDATE Booking SET status='Confirmed' WHERE bookingID=?", [bookingID]);
  }
  console.log(`Returned ${early.length} early-completed booking(s) to Confirmed.`);

  // 3) Past experiences with a completed history for the demo customer.
  const [[provider]] = await db.execute(
    "SELECT userID FROM ServiceProvider WHERE email='provider@era.demo'",
  );
  const [[customer]] = await db.execute(
    "SELECT userID FROM Customer WHERE email='customer@era.demo'",
  );
  if (provider && customer) {
    const PAST = [
      // name, type, description, destination, location, date, time, capacity, shape, color, icon, bookedOn, stampedAt
      [
        "Old Riyadh Heritage Walk at Al-Masmak",
        "Entertainment",
        "A guided late-afternoon walk from Al-Masmak Fortress through the souqs of Deira, ending with Saudi coffee as the call to prayer echoes over old Riyadh.",
        "Riyadh, Saudi Arabia",
        "Al-Masmak Fortress, Riyadh, Saudi Arabia",
        "2026-10-24",
        "16:00",
        25,
        "hexagon",
        "terracotta",
        "landmark",
        "2026-10-12",
        "2026-10-24 19:10:00",
      ],
      [
        "Farasan Islands Sunset Sail",
        "Wellness",
        "Sail between the coral islands of Farasan on a traditional dhow, spotting dolphins and Farasan gazelles as the sun sets over the Red Sea.",
        "Farasan, Saudi Arabia",
        "Farasan Islands, Jazan, Saudi Arabia",
        "2026-11-07",
        "16:30",
        18,
        "sunburst",
        "gold",
        "sun",
        "2026-10-28",
        "2026-11-07 19:45:00",
      ],
    ];
    const [[passport]] = await db.execute(
      "SELECT passportID FROM DigitalActivityPassport WHERE customerID=?",
      [customer.userID],
    );
    for (const [
      name,
      type,
      desc,
      dest,
      loc,
      date,
      time,
      cap,
      shape,
      color,
      icon,
      bookedOn,
      stampedAt,
    ] of PAST) {
      let [[act]] = await db.execute("SELECT activityID FROM Activity WHERE activityName=?", [
        name,
      ]);
      if (!act) {
        const [r] = await db.execute(
          "INSERT INTO Activity (providerID,activityName,type,description,destination,location,`date`,`time`,availableCapacity,stampShape,stampColor,stampIcon) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
          [provider.userID, name, type, desc, dest, loc, date, time, cap, shape, color, icon],
        );
        act = { activityID: r.insertId };
      }
      const [[had]] = await db.execute(
        "SELECT bookingID FROM Booking WHERE customerID=? AND activityID=?",
        [customer.userID, act.activityID],
      );
      if (had) continue;
      const [b] = await db.execute(
        "INSERT INTO Booking (customerID, activityID, bookingDate) VALUES (?,?,?)",
        [customer.userID, act.activityID, bookedOn],
      );
      await db.execute("UPDATE DigitalTicket SET issuedAt=? WHERE bookingID=?", [
        `${bookedOn} 10:00:00`,
        b.insertId,
      ]);
      await db.execute("UPDATE Booking SET status='Completed' WHERE bookingID=?", [b.insertId]); // trigger awards the stamp
      if (passport)
        await db.execute("UPDATE DigitalStamp SET awardedAt=? WHERE bookingID=?", [
          stampedAt,
          b.insertId,
        ]);
      console.log(`History: ${name} (${date}) completed.`);
    }
  }
  console.log("Dates are consistent.");
} finally {
  await db.end();
}
