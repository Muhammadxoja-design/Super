# architecture_rules.md - System Design & Agent Constraints

Ushbu hujjat "Super" loyihasi doirasida barcha Agentlar va Dasturchilar amal qilishi shart bo'lgan arxitektura qoidalari to'plamidir. Maqsad: 20k+ foydalanuvchiga xizmat ko'rsatish va kod bazasini tartibli saqlash.

## 1. Clean Architecture & Modularization
Loyihada "God File" (masalan, `routes.ts`) anti-patternlaridan voz kechiladi.

- **Separation of Concerns:** 
  - `routes/`: Faqat HTTP endpointlarni qabul qilish va validatsiya (Zod).
  - `services/`: Biznes mantiq (Business Logic).
  - `repositories/` (hozirgi `storage.ts` o'rniga): Ma'lumotlar bazasi bilan ishlash.
- **Dependency Rule:** Tashqi qatlamlar ichki qatlamlarga bog'lanishi mumkin, lekin teskarisi emas.
- **Service Layer:** Barcha bot va API mantiqlari Service'larga ko'chirilishi shart. `routes.ts` ichida `db` ga to'g'ridan-to'g'ri murojaat qilish TQIQLANADI.

## 2. Database & Data Integrity
- **Migrations First:** Ma'lumotlar bazasi sxemasini o'zgartirish faqat `drizzle-kit` migratsiyalari orqali amalga oshiriladi. `db.ts` ichidagi `ensurePostgresSchema` fallback tizimi o'chirib tashlanishi kerak.
- **Consistency:** Loyihada faqat bitta ma'lumot manbai bolishi kerak (Single Source of Truth). Supabase va Local Postgres o'rtasidagi "Dual Sync" mantiqsiz va xavfli. Biz faqat Local Postgres (Drizzle) dan foydalanamiz.
- **Indexes:** Har bir yangi qidiruv maydoni uchun Index qo'shishdan oldin uning performance'ga ta'sirini baholang.

## 3. Asynchronous Tasks & Queues
- **Standardization:** Fon topshiriqlari (Broadcast, Task assignment) uchun bitta tizim - **BullMQ (Redis)** ishlatilishi shart. Polling (`setInterval`) tizimlari bekor qilinadi.
- **Idempotency:** Har bir fon topshirig'i (Job) idempotency keyga ega bo'lishi va qayta ishlaganda xatolik bermasligi shart.

## 4. Agent Interaction Rules (Concurrency)
- **File Locking Logic:** Bir vaqtning o'zida bir nechta agent bitta faylni tahrirlamasligi uchun kodni kichikroq modullarga (Slice-based architecture) bo'lish kerak.
- **Validation:** Har qanday kiruvchi ma'lumot (vazifa topshirish, foydalanuvchi qidirish) uchun qat'iy Zod schema validatsiyasi bo'lishi shart.

## 5. Coding Standards
- **Naming:** CamelCase (fayl nomlari dash-case), o'zgaruvchilar va funksiyalar nomlari tushunarli va ma'noli bo'lishi kerak.
- **No Placeholders:** Agentlar hech qachon "to-be-implemented" yoki placeholder izohlar qoldirmasligi, balki to'liq ishlaydigan mantiq yozishi shart.
- **Logging:** Barcha muhim operatsiyalar (DB write, API call, Job result) uchun tizimli loglar yozilishi kerak.
