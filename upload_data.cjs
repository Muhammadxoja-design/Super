const fs = require('fs');
const { Client } = require('pg');

const run = async () => {
    // Check if URL exists directly
    const connectionString = 'postgresql://postgres.mtwfafdyyqdepvfiffjt:654285Armen1@aws-0-us-west-2.pooler.supabase.com:6543/postgres';
    
    console.log('Connecting to Supabase PostgreSQL database...');
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected! Reading fake-users.sql...');
        
        let sqlQuery = fs.readFileSync('fake-users.sql', 'utf8');
        if (sqlQuery.charCodeAt(0) === 0xFEFF) sqlQuery = sqlQuery.slice(1);
        sqlQuery = sqlQuery.replace(/([a-zA-Z])'([a-zA-Z])/g, "$1''$2");
        console.log("Uploading 1000 fake Farg'ona users directly to the DB...");

        await client.query(sqlQuery);

        console.log('Successfully added all 1000 users to the database!');
    } catch (err) {
        console.error('Error occurred:', err.message);
    } finally {
        await client.end();
    }
};

run();
