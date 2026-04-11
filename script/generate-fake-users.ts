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
  "Nodir", "Sherzod", "Akmal", "Javohir", "Murod", "Bekzod", "Shuxrat", "Zafar",
  "Sirojiddin", "Eldor", "Behruz", "Komiljon", "Muzaffar", "Odil", "Ravshan",
  "Sarvar", "Ulugbek", "Vohid", "Xamza", "Yoqub", "Zohid", "Asliddin", "Bahodir",
  "Doniyor", "Erkin", "Firdavs", "Husan", "Islom", "Kamol", "Laziz", "Mansur",
  "Nurbek", "Obid", "Parviz", "Qodir", "Rauf", "Sulton", "Tohir", "Ulfat"
];
const UZBEK_FIRST_NAMES_FEMALE = [
  "Sevara", "Nargiza", "Dilnoza", "Zilola", "Malika", "Shohida", "Nilufar",
  "Gulnora", "Feruza", "Zamira", "Shahnoza", "Umida", "Dinora", "Nigora",
  "Salima", "Gozal", "Madina", "Shirin", "Oydin", "Guli",
  "Adolat", "Barno", "Dilorom", "Farzona", "Hulkar",
  "Iroda", "Kamola", "Laylo", "Maftuna", "Nodira", "Ozoda", "Parizod",
  "Rohila", "Sarvinoz", "Tabassum", "Vasila",
  "Yulduz", "Zulfiya", "Aziza", "Dildora"
];

const UZBEK_LAST_NAMES = [
  "Abdullaev", "Karimov", "Rahimov", "Usmonov", "Ibragimov", "Yusupov",
  "Nazarov", "Xabibullaev", "Toshmatov", "Eshmatov", "Sodikov", "Jalilov",
  "Aliyev", "Valiyev", "Qodirov", "Nuriddinov", "Tursunov", "Olimov",
  "Mirzayev", "Xolmatov", "Rashidov", "Sobirov", "Haydarov", "Ismoilov",
  "Umarov", "Yunusov", "Zokirov", "Axtamov", "Boymurodov", "Choriyev",
  "Ergashev", "Fayzullayev", "Ganiyev", "Holiqov", "Jourayev",
  "Komilov", "Latipov", "Mamatov", "Nishonov", "Ortiqov",
  "Pulatov", "Rajabov", "Saidov", "Tillayev",
  "Yoldoshev", "Ziyodullayev", "Askarov", "Baxtiyorov", "Dehqonov",
  "Hamidov", "Inomov", "Qosimov", "Toxtayev", "Xudoyberdiyev"
];

// USERNAME_SUFFIXES — realistic Telegram username components
const USERNAME_SUFFIXES = [
  "fgn", "uz", "fergana", "farg", "bek", "jan",
  "pro", "real", "new", "07", "01", "99", "98", "97",
  "2003", "2004", "2005", "2002", "2001", "2000",
  "12", "21", "7", "777", "007", "999", "09", "04"
];

const USERNAME_PREFIXES = ["mr", "the", "its", "im", "hey"];

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem<T>(arr: T[]): T {
  return arr[getRandomInt(0, arr.length - 1)];
}

function generateDateOfBirth() {
  const year = getRandomInt(1985, 2007);
  const month = getRandomInt(1, 12).toString().padStart(2, "0");
  const day = getRandomInt(1, 28).toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function generatePhoneNumber() {
  const prefixes = ["90", "91", "93", "94", "95", "97", "98", "99"];
  const prefix = getRandomItem(prefixes);
  const number = getRandomInt(1000000, 9999999);
  return `+998${prefix}${number}`;
}

/**
 * Generates a unique Telegram-style username using various realistic patterns.
 * Ensures no two users share the same username via the `usedUsernames` Set.
 */
function generateUniqueUsername(
  firstName: string,
  lastName: string,
  usedUsernames: Set<string>
): string {
  const fn = firstName.toLowerCase().replace(/[^a-z]/g, "");
  const ln = lastName.toLowerCase().replace(/[^a-z]/g, "").slice(0, 5);

  const strategies = [
    () => `${fn}${getRandomItem(USERNAME_SUFFIXES)}`,              // sardor99
    () => `${fn}_${getRandomItem(USERNAME_SUFFIXES)}`,             // sardor_fgn
    () => `${fn}_${ln.slice(0, 3)}${getRandomInt(10, 99)}`,        // aziz_usm73
    () => `${fn.charAt(0)}_${ln}${getRandomInt(1, 99)}`,           // s_usmonov7
    () => `${getRandomItem(USERNAME_PREFIXES)}_${fn}`,             // mr_sardor
    () => `${getRandomItem(USERNAME_PREFIXES)}_${fn}${getRandomInt(10, 99)}`, // its_aziz22
    () => `${fn.slice(0, 4)}${ln.slice(0, 3)}${getRandomInt(10, 99)}`,        // sardusm88
    () => `${fn}${ln.slice(0, 3)}${getRandomItem(["fgn", "uz", "1", "7"])}`,  // sardusmonuzm
    () => `${fn}_${getRandomInt(100, 9999)}`,                      // rustam_7821
    () => `${fn.slice(0, 5)}${getRandomInt(10000, 99999)}`,        // laziz94521
  ];

  for (let attempt = 0; attempt < 30; attempt++) {
    const strategy = getRandomItem(strategies);
    const candidate = strategy().slice(0, 32);
    if (!usedUsernames.has(candidate) && candidate.length >= 5) {
      usedUsernames.add(candidate);
      return candidate;
    }
  }

  // Guaranteed unique fallback
  const fallback = `u${Date.now()}${getRandomInt(100, 999)}`.slice(0, 32);
  usedUsernames.add(fallback);
  return fallback;
}

export async function generateFakeUsers(count: number = 222) {
  const fakeUsers: InsertUser[] = [];
  const usedUsernames = new Set<string>();
  const usedPhones = new Set<string>();

  for (let i = 0; i < count; i++) {
    const isMale = Math.random() > 0.45;
    const firstName = isMale
      ? getRandomItem(UZBEK_FIRST_NAMES_MALE)
      : getRandomItem(UZBEK_FIRST_NAMES_FEMALE);
    let lastName = getRandomItem(UZBEK_LAST_NAMES);
    if (!isMale && !lastName.endsWith("a")) {
      lastName += "a";
    }

    const tuman = getRandomItem(districts);
    const mahallasInDistrict = mahallasMap[tuman] || [];
    const mahallaList = Array.isArray(mahallasInDistrict)
      ? mahallasInDistrict
      : Object.values(mahallasInDistrict).flatMap((v) =>
          Array.isArray(v) ? v : []
        );

    const mahalla = mahallaList.length ? getRandomItem(mahallaList) : "Markaz MFY";

    // Generate unique phone
    let phone = generatePhoneNumber();
    let phoneAttempts = 0;
    while (usedPhones.has(phone) && phoneAttempts < 20) {
      phone = generatePhoneNumber();
      phoneAttempts++;
    }
    usedPhones.add(phone);

    const uniqueSuffix = `${Date.now()}_${getRandomInt(10000, 99999)}`;
    const telegramId = `fake_${uniqueSuffix}`;
    const username = generateUniqueUsername(firstName, lastName, usedUsernames);
    const login = `fake_${username}_${getRandomInt(100, 999)}`;

    fakeUsers.push({
      telegramId,
      login,
      username,
      firstName,
      lastName,
      phone,
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
      isAdmin: false,
    });
  }

  return fakeUsers;
}

async function main() {
  const COUNT = 222;
  console.log(`\n🚀 Generating ${COUNT} new fake Fergana users with unique Telegram-style usernames...`);
  const fakeUsers = await generateFakeUsers(COUNT);

  console.log("💾 Inserting into Supabase via Drizzle...\n");
  try {
    const chunkSize = 50;
    for (let i = 0; i < fakeUsers.length; i += chunkSize) {
      const chunk = fakeUsers.slice(i, i + chunkSize);
      await db.insert(users).values(chunk).onConflictDoNothing();
      console.log(`  ✅ ${Math.min(i + chunkSize, fakeUsers.length)} / ${fakeUsers.length} qo'shildi`);
    }
    console.log(`\n🎉 Tayyor! ${COUNT} ta yangi fake foydalanuvchi qo'shildi.`);

    // Show sample usernames
    console.log("\n📋 Sample usernames:");
    fakeUsers.slice(0, 10).forEach(u =>
      console.log(`  @${u.username}  —  ${u.firstName} ${u.lastName}`)
    );
  } catch (error) {
    console.error("❌ Xatolik:", error);
    // Write SQL fallback
    const sqlStatements = fakeUsers.map((user) => {
      return `INSERT INTO users (telegram_id, login, username, first_name, last_name, phone, region, viloyat, tuman, district, shahar, mahalla, birth_date, direction, status, role, plan, is_admin)
VALUES ('${user.telegramId}', '${user.login}', '${user.username}', '${user.firstName}', '${user.lastName}', '${user.phone}', '${user.region}', '${user.viloyat}', '${user.tuman}', '${user.district}', ${user.shahar ? `'${user.shahar}'` : "NULL"}, '${user.mahalla}', '${user.birthDate}', '${user.direction}', '${user.status}', '${user.role}', '${user.plan}', false);`;
    }).join("\n");
    fs.writeFileSync(path.join(process.cwd(), "fake-users-new.sql"), sqlStatements);
    console.log("📄 SQL fayl saqlanadi: fake-users-new.sql");
    process.exit(1);
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
