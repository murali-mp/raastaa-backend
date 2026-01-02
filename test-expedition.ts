import { db } from './src/config/database';
import { expeditionService } from './src/services/expedition.service';
import { generateAccessToken } from './src/utils/jwt';

async function test() {
  try {
    // Find a user
    const user = await db.user.findFirst();
    if (!user) {
      console.log('No users found in database');
      return;
    }
    console.log('Found user:', user.id, user.name);

    // Generate proper access token
    const token = generateAccessToken(user.id);
    console.log('\n✓ Access Token:', token);
    
    console.log('\n✅ Test the API with this token!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await db.$disconnect();
  }
}

test();
