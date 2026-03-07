import jwt from 'jsonwebtoken';

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "development-super-secret-key";

async function run() {
    const token = jwt.sign(
        { sub: 'test-user-id-123', email: 'test@example.com' },
        NEXTAUTH_SECRET,
        { expiresIn: "1h" }
    );

    console.log('--- Testing without token ---');
    const res1 = await fetch('http://localhost:3001/api/user/me');
    console.log(`Status: ${res1.status}`);

    console.log('\n--- Testing with valid token ---');
    const res2 = await fetch('http://localhost:3001/api/user/me', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`Status: ${res2.status}`);
    const data = await res2.json();
    console.log('Response:', data);
}

run();
