import { db } from './db';
import { users, tasks, taskAssignments, broadcasts } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function check() {
  try {
    const u = await db.select({count: sql`count(*)`}).from(users);
    const t = await db.select({count: sql`count(*)`}).from(tasks);
    const a = await db.select({count: sql`count(*)`}).from(taskAssignments);
    const b = await db.select({count: sql`count(*)`}).from(broadcasts);

    console.log('--- DATABASE STATUS ---');
    console.log('Users:', u[0].count);
    console.log('Tasks:', t[0].count);
    console.log('Assignments:', a[0].count);
    console.log('Broadcasts:', b[0].count);

    const lastUser = await db.select().from(users).orderBy(users.id).limit(5);
    if (lastUser.length > 0) {
      console.log('--- SAMPLE USERS ---');
      lastUser.forEach(usr => {
        console.log(`- ${usr.firstName || usr.username} (${usr.id})`);
      });
    }
  } catch (error) {
    console.error('Error during DB check:', error);
  } finally {
    process.exit(0);
  }
}

check();
