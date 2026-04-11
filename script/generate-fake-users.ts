import fs from "fs";
import path from "path";
import { type InsertUser, users, DIRECTIONS } from "../shared/schema";
import { db } from "../server/db";
import UZ_LOCATIONS_JSON from "../client/src/lib/uz_locations.json";

// Fergana Viloyati location data
const FARGONA_REGION = "Farg'ona viloyati";
const fargonaData = (UZ_LOCATIONS_JSON as any)[FARGONA_REGION];
const districts = fargonaData?.districts || [];
const mahallasMap = fargonaData?.mahallas || {};

const UZBEK_FIRST_NAMES_MALE = [
  "Aziz", "Sardor", "Rustam", "Jasur", "Timur", "Alisher", "Bobur", "Shavkat",
  "Umid", "Farrux", "Davron", "Shohruh", "Ilhom", "Otabek", "Doston", "Sanjar",
  "Nodir", "Sherzod", "Akmal", "Javohir", "Murod", "Bekzod", "Shuxrat", "Zafar"
];
const UZBEK_FIRST_NAMES_FEMALE = [
  "Sevara", "Nargiza", "Dilnoza", "Zilola", "Malika", "Shohida", "Nilufar",
  "Gulnora", "Feruza", "Zamira", "Shahnoza", "Umida", "Dinora", "Nigora",
  "Salima", "Go'zal", "Madina", "Shirin", "Oydin", "Guli"
];

const UZBEK_LAST_NAMES = [
  "Abdullaev", "Karimov", "Rahimov", "Usmonov", "Ibragimov", "Yusupov",
  "Nazarov", "Xabibullaev", "Toshmatov", "Eshmatov", "Sodikov", "Jalilov",
  "Aliyev", "Valiyev", "Qodirov", "Nuriddinov", "Tursunov", "Olimov"
];

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem<T>(arr: T[]): T {
  return arr[getRandomInt(0, arr.length - 1)];
}

function generateDateOfBirth() {
  const year = getRandomInt(1985, 2005);
  const month = getRandomInt(1, 12).toString().padStart(2, "0");
  const day = getRandomInt(1, 28).toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function generatePhoneNumber() {
  // Common prefixes in Uzbekistan: 90, 91, 93, 94, 97, 99
  const prefixes = ["90", "91", "93", "94", "95", "97", "98", "99"];
  const prefix = getRandomItem(prefixes);
  const number = getRandomInt(1000000, 9999999);
  return `+998${prefix}${number}`;
}

export async function generateFakeUsers(count: number = 1000) {
  const fakeUsers: InsertUser[] = [];
  
  for (let i = 0; i < count; i++) {
    const isMale = Math.random() > 0.5;
    const firstName = isMale ? getRandomItem(UZBEK_FIRST_NAMES_MALE) : getRandomItem(UZBEK_FIRST_NAMES_FEMALE);
    let lastName = getRandomItem(UZBEK_LAST_NAMES);
    if (!isMale) {
      lastName += "a";
    }

    const tuman = getRandomItem(districts);
    const mahallasInDistrict = mahallasMap[tuman] || [];
    const mahallaList = Array.isArray(mahallasInDistrict) 
      ? mahallasInDistrict 
      : Object.values(mahallasInDistrict).flatMap((v) => Array.isArray(v) ? v : []);
      
    const mahalla = mahallaList.length ? getRandomItem(mahallaList) : "Markaz MFY";

    const telegramId = `fake_${Date.now()}_${getRandomInt(10000, 99999)}`;
    const login = `fake_${firstName.toLowerCase()}_${getRandomInt(1000, 9999)}`;

    fakeUsers.push({
      telegramId,
      login,
      username: `${firstName.toLowerCase()}_${getRandomInt(100, 999)}`,
      firstName,
      lastName,
      phone: generatePhoneNumber(),
      region: FARGONA_REGION,
      viloyat: FARGONA_REGION,
      tuman,
      district: tuman,
      shahar: tuman.includes("shahri") ? tuman : null,
      mahalla,
      location: null as any,
      birthDate: generateDateOfBirth(),
      direction: getRandomItem([...DIRECTIONS]),
      status: "approved",
      role: "user",
      plan: "FREE",
      isAdmin: false
    });
  }

  return fakeUsers;
}

async function main() {
  console.log("Generating 1000 Fergana fake users...");
  const fakeUsers = await generateFakeUsers(1000);

  // Write to local SQL file
  console.log("Saving to local SQL file...");
  const sqlStatements = fakeUsers.map((user) => {
    return `INSERT INTO users (telegram_id, login, username, first_name, last_name, phone, region, viloyat, tuman, district, shahar, mahalla, birth_date, direction, status, role, plan, is_admin)
VALUES ('${user.telegramId}', '${user.login}', '${user.username}', '${user.firstName}', '${user.lastName}', '${user.phone}', '${user.region}', '${user.viloyat}', '${user.tuman}', '${user.district}', ${user.shahar ? `'${user.shahar}'` : 'NULL'}, '${user.mahalla}', '${user.birthDate}', '${user.direction}', '${user.status}', '${user.role}', '${user.plan}', false);`;
  }).join("\n");
  
  fs.writeFileSync(path.join(process.cwd(), "fake-users.sql"), sqlStatements);
  console.log("Saved to fake-users.sql!");

  // Ensure DB instance is valid, skip insertion if not connected
  try {
    console.log("Inserting users directly to Supabase via Drizzle...");
    // Split into chunks of 100 to avoid query size limits
    const chunkSize = 100;
    for (let i = 0; i < fakeUsers.length; i += chunkSize) {
      const chunk = fakeUsers.slice(i, i + chunkSize);
      await db.insert(users).values(chunk).onConflictDoNothing();
      console.log(`Inserted ${Math.min(i + chunkSize, fakeUsers.length)} / ${fakeUsers.length}`);
    }
    console.log("Successfully loaded strictly Fergana Fake Users into Supabase database.");
  } catch (error) {
    console.error("Failed to insert directly into Supabase:", error);
    console.log("Run the SQL file manually if you still need it in Supabase.");
  }
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
